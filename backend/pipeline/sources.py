import httpx
import asyncio
from typing import List, Dict, Any
from config import settings

AVAILABLE_SOURCES = [
    {
        "id": "Stack Overflow",
        "name": "Stack Overflow API",
        "search_url": "https://api.stackexchange.com/2.3/search/advanced",
        "health_url": "https://api.stackexchange.com/2.3/info?site=stackoverflow",
        "active": True
    },
    {
        "id": "GitHub",
        "name": "GitHub Issues API",
        "search_url": "https://api.github.com/search/issues",
        "health_url": "https://api.github.com/rate_limit",
        "active": True
    },
    {
        "id": "HackerNews",
        "name": "HackerNews Algolia API",
        "search_url": "https://hn.algolia.com/api/v1/search",
        "health_url": "https://hn.algolia.com/api/v1/search?query=test&hitsPerPage=1",
        "active": True
    }
]

async def check_sources_health() -> Dict[str, str]:
    """Check health of all available sources concurrently."""
    results = {}
    async with httpx.AsyncClient(timeout=5.0) as client:
        tasks = []
        for source in AVAILABLE_SOURCES:
            headers = {}
            if source["id"] == "GitHub" and settings.GITHUB_TOKEN:
                headers["Authorization"] = f"Bearer {settings.GITHUB_TOKEN}"
            
            # Using a closure to capture variables properly for each task
            async def _check(sid=source["id"], url=source["health_url"], hdrs=headers):
                try:
                    resp = await client.get(url, headers=hdrs)
                    return sid, "OK" if resp.status_code == 200 else "Failed"
                except Exception:
                    return sid, "Failed"
                    
            tasks.append(_check())
        
        responses = await asyncio.gather(*tasks)
        for sid, status in responses:
            # Format key as lowercase without spaces to match existing system health logic
            results[sid.lower().replace(" ", "")] = status
            
    return results

def get_m1_sources() -> List[Dict[str, Any]]:
    """Return sources formatted for the frontend test rig."""
    return [
        {
            "id": s["id"],
            "name": s["name"],
            "url": s["search_url"],
            "active": s["active"]
        } for s in AVAILABLE_SOURCES
    ]
