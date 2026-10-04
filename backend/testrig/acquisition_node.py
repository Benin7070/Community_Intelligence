from pipeline.sources import AVAILABLE_SOURCES
from config import settings
from llm.provider import LLMProvider
import httpx
import asyncio

async def execute_acquisition_node(query: str, active_sources: list[str]) -> dict:
    """Execute the data acquisition logic using AI Multi-Query (Perplexity Style)."""
    results = {}
    
    # 1. AI MULTI-QUERY FORMULATION
    try:
        provider = LLMProvider()
        prompt = (
            f"You are an AI Search Agent. Generate 3 different search queries for a Lexical API based on this user query: '{query}'\n"
            f"1. A broad 2-keyword query.\n"
            f"2. A highly specific technical 3-keyword query.\n"
            f"3. A 4-keyword query focused on errors, bugs, or production usage.\n"
            f"Output ONLY the 3 queries separated by the pipe character '|' and nothing else."
        )
        llm_resp = await provider.generate_completion(prompt)
        optimized_queries = [q.strip().replace('"', '') for q in llm_resp.split('|') if q.strip()][:3]
        if not optimized_queries:
            optimized_queries = [query]
    except Exception:
        optimized_queries = [query]
        
    results["_meta"] = {
        "original_query": query,
        "ai_generated_queries": optimized_queries,
        "note": "AI Multi-Query Engine: Firing multiple tailored queries to guarantee lexical hits."
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        tasks = []
        
        for src in AVAILABLE_SOURCES:
            if src["id"] in active_sources:
                headers = {"User-Agent": "CommunityIntelligencePlatform/2.0 (Research FYP Project)"}
                if src["id"] == "GitHub" and settings.GITHUB_TOKEN:
                    headers["Authorization"] = f"Bearer {settings.GITHUB_TOKEN}"
                    
                async def fetch_src_multiple(sid=src["id"], u=src["search_url"], h=headers):
                    combined_items = []
                    query_statuses = []
                    try:
                        # Fire all queries for this source in parallel
                        src_tasks = []
                        for q in optimized_queries:
                            p = {}
                            if sid == "Stack Overflow":
                                p = {"order": "desc", "sort": "relevance", "site": "stackoverflow", "q": q, "pagesize": 2}
                            elif sid == "GitHub":
                                p = {"q": q, "sort": "relevance", "order": "desc", "per_page": 2}
                            elif sid == "HackerNews":
                                p = {"query": q, "hitsPerPage": 2}
                                
                            src_tasks.append((q, client.get(u, params=p, headers=h)))
                            
                        # Await parallel queries for this source
                        for q, t in src_tasks:
                            resp = await t
                            if resp.status_code == 200:
                                data = resp.json()
                                # Handle different API response shapes
                                items = data.get("items", []) or data.get("hits", [])
                                combined_items.extend(items)
                                query_statuses.append({"query": q, "hits_found": len(items)})
                            else:
                                query_statuses.append({"query": q, "error": resp.status_code})
                                
                        return sid, {"status": "success", "queries_run": query_statuses, "data": {"items": combined_items}}
                    except Exception as e:
                        return sid, {"status": "error", "error": str(e)}
                        
                tasks.append(fetch_src_multiple())
                
                # GitHub Discussions GraphQL
                if src["id"] == "GitHub" and settings.GITHUB_TOKEN:
                    async def fetch_gh_discussions():
                        combined_nodes = []
                        query_statuses = []
                        try:
                            gql_query = """
                            query($q: String!) {
                              search(query: $q, type: DISCUSSION, first: 2) {
                                nodes {
                                  ... on Discussion { title url upvoteCount author { login } }
                                }
                              }
                            }
                            """
                            disc_tasks = []
                            for q in optimized_queries:
                                disc_tasks.append((q, client.post("https://api.github.com/graphql", json={"query": gql_query, "variables": {"q": q}}, headers=headers)))
                            
                            for q, t in disc_tasks:
                                resp = await t
                                if resp.status_code == 200:
                                    nodes = resp.json().get("data", {}).get("search", {}).get("nodes", [])
                                    combined_nodes.extend(nodes)
                                    query_statuses.append({"query": q, "hits_found": len(nodes)})
                                else:
                                    query_statuses.append({"query": q, "error": resp.status_code})
                                    
                            return "GitHub Discussions", {"status": "success", "queries_run": query_statuses, "data": {"items": combined_nodes}}
                        except Exception as e:
                            return "GitHub Discussions", {"status": "error", "error": str(e)}
                    
                    tasks.append(fetch_gh_discussions())
        
        responses = await asyncio.gather(*tasks)
        for sid, data in responses:
            results[sid] = data
            
    return results
