import asyncio
import html
import time
from typing import List, Dict, Any
import httpx
from .base import BaseModule
from models.schemas import RawPost, UserProfile
from config import settings

class DataAcquisitionModule(BaseModule):
    def __init__(self):
        super().__init__(name="3.1 Community Data Acquisition")
        self.headers = {
            "User-Agent": "CommunityIntelligencePlatform/2.0 (Research FYP Project; contact: dev@fyp.local)"
        }
        
    async def _fetch_stackoverflow(self, client: httpx.AsyncClient, query: str) -> List[RawPost]:
        posts = []
        try:
            # Query StackExchange API for relevant StackOverflow questions
            url = "https://api.stackexchange.com/2.3/search/advanced"
            params = {
                "order": "desc",
                "sort": "relevance",
                "q": query,
                "site": "stackoverflow",
                "pagesize": 3
            }
            if settings.STACK_EXCHANGE_API_KEY:
                params["key"] = settings.STACK_EXCHANGE_API_KEY
            resp = await client.get(url, params=params, headers=self.headers, timeout=8.0)
            if resp.status_code == 200:
                data = resp.json()
                for item in data.get("items", []):
                    owner = item.get("owner", {})
                    badges = owner.get("badge_counts", {})
                    post_id = str(item.get("question_id", ""))
                    title = html.unescape(item.get("title", ""))
                    
                    posts.append(RawPost(
                        post_id=f"SO-{post_id}",
                        platform="Stack Overflow",
                        title=title,
                        body=f"{title}. Tags: {', '.join(item.get('tags', []))}. Views: {item.get('view_count', 0)}, Answers: {item.get('answer_count', 0)}",
                        score=item.get("score", 0),
                        is_accepted=bool(item.get("accepted_answer_id")),
                        author=UserProfile(
                            user_id=str(owner.get("user_id", "u_so")),
                            username=owner.get("display_name", "SO_Contributor"),
                            reputation=owner.get("reputation", 100),
                            gold_badges=badges.get("gold", 0),
                            silver_badges=badges.get("silver", 0),
                            bronze_badges=badges.get("bronze", 0),
                            total_answers=item.get("answer_count", 1)
                        ),
                        creation_date=item.get("creation_date", int(time.time())),
                        url=item.get("link", f"https://stackoverflow.com/questions/{post_id}")
                    ))
        except Exception as e:
            print(f"[DataAcquisition] Stack Overflow fetch failed: {e}")
        return posts

    async def _fetch_github(self, client: httpx.AsyncClient, query: str) -> List[RawPost]:
        posts = []
        try:
            url = "https://api.github.com/search/issues"
            params = {
                "q": f"{query} type:issue",
                "sort": "relevance",
                "order": "desc",
                "per_page": 2
            }
            gh_headers = dict(self.headers)
            if settings.GITHUB_TOKEN:
                gh_headers["Authorization"] = f"Bearer {settings.GITHUB_TOKEN}"
            resp = await client.get(url, params=params, headers=gh_headers, timeout=8.0)
            if resp.status_code == 200:
                data = resp.json()
                for item in data.get("items", []):
                    user = item.get("user", {})
                    reactions = item.get("reactions", {})
                    total_reactions = reactions.get("total_count", 0) if isinstance(reactions, dict) else 0
                    score = total_reactions + item.get("comments", 0)
                    body_text = item.get("body", "") or ""
                    # Sanitize body snippet
                    snippet = body_text.replace("\r", " ").replace("\n", " ")[:200]
                    title = item.get("title", "")
                    
                    posts.append(RawPost(
                        post_id=f"GH-{item.get('id', '')}",
                        platform="GitHub",
                        title=title,
                        body=f"{title}. Discussion excerpt: {snippet}",
                        score=max(1, score),
                        is_accepted=(item.get("state") == "closed"),
                        author=UserProfile(
                            user_id=str(user.get("id", "u_gh")),
                            username=user.get("login", "GH_Contributor"),
                            reputation=max(200, item.get("comments", 1) * 150),
                            gold_badges=1 if item.get("author_association") in ("MEMBER", "OWNER") else 0,
                            silver_badges=min(10, item.get("comments", 1)),
                            bronze_badges=5,
                            total_answers=item.get("comments", 1)
                        ),
                        creation_date=int(time.time()) - 86400 * 30,
                        url=item.get("html_url", "")
                    ))
        except Exception as e:
            print(f"[DataAcquisition] GitHub fetch failed: {e}")
        return posts

    async def _fetch_hackernews(self, client: httpx.AsyncClient, query: str) -> List[RawPost]:
        posts = []
        try:
            url = "https://hn.algolia.com/api/v1/search"
            params = {
                "query": query,
                "hitsPerPage": 2
            }
            resp = await client.get(url, params=params, headers=self.headers, timeout=8.0)
            if resp.status_code == 200:
                data = resp.json()
                for item in data.get("hits", []):
                    title = item.get("title") or item.get("story_title") or ""
                    if not title:
                        continue
                    post_id = str(item.get("objectID", ""))
                    points = item.get("points") or item.get("num_comments") or 1
                    
                    posts.append(RawPost(
                        post_id=f"HN-{post_id}",
                        platform="HackerNews",
                        title=title,
                        body=f"{title}. Points: {points}, Comments: {item.get('num_comments', 0)}",
                        score=points,
                        is_accepted=points > 50,
                        author=UserProfile(
                            user_id=item.get("author", "hn_user"),
                            username=item.get("author", "HN_Dev"),
                            reputation=points * 15,
                            gold_badges=1 if points > 100 else 0,
                            silver_badges=min(10, points // 20),
                            bronze_badges=min(20, points // 5),
                            total_answers=item.get("num_comments", 1)
                        ),
                        creation_date=item.get("created_at_i", int(time.time())),
                        url=item.get("url") or f"https://news.ycombinator.com/item?id={post_id}"
                    ))
        except Exception as e:
            print(f"[DataAcquisition] HackerNews fetch failed: {e}")
        return posts

    async def process(self, query: str) -> List[RawPost]:
        await self.publish_event("started", {
            "query": query,
            "fetching_sources": ["Stack Overflow API", "GitHub Issues API", "HackerNews Algolia API"]
        })
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            so_task = self._fetch_stackoverflow(client, query)
            gh_task = self._fetch_github(client, query)
            hn_task = self._fetch_hackernews(client, query)
            
            results = await asyncio.gather(so_task, gh_task, hn_task, return_exceptions=True)
            
        real_posts: List[RawPost] = []
        for res in results:
            if isinstance(res, list):
                real_posts.extend(res)
                
        # If external networks are completely unreachable or returned empty, query with broader keywords
        if not real_posts:
            # Fallback search with primary terms
            simplified = " ".join([w for w in query.split() if len(w) > 3][:2])
            if simplified and simplified != query:
                async with httpx.AsyncClient(timeout=8.0) as client:
                    real_posts = await self._fetch_stackoverflow(client, simplified)
        
        sources_summary = {}
        for p in real_posts:
            sources_summary[p.platform] = sources_summary.get(p.platform, 0) + 1
            
        await self.publish_event("completed", {
            "real_posts_retrieved": len(real_posts),
            "sources_breakdown": sources_summary,
            "posts": [
                {
                    "id": p.post_id,
                    "platform": p.platform,
                    "title": p.title[:65] + "...",
                    "author": p.author.username,
                    "score": p.score,
                    "url": p.url
                }
                for p in real_posts
            ]
        })
        return real_posts
