import re
from typing import List, Dict, Any
from .base import BaseModule
from models.schemas import RawPost, Claim

class ClaimModelingModule(BaseModule):
    def __init__(self):
        super().__init__(name="3.2 Claim & Context Modeling")
        
    def _extract_environment_context(self, text: str) -> Dict[str, Any]:
        """Extract real version, library, and environment mentions using regex patterns"""
        version_pattern = r'\b(v?\d+(\.\d+)+[a-zA-Z0-9_-]*)\b'
        framework_pattern = r'\b(react|python|node|asyncio|typescript|javascript|pytorch|cuda|docker|kubernetes|k8s|fastapi|vite)\b'
        
        found_versions = re.findall(version_pattern, text, re.IGNORECASE)
        found_frameworks = re.findall(framework_pattern, text, re.IGNORECASE)
        
        versions = [v[0] if isinstance(v, tuple) else v for v in found_versions]
        frameworks = list(set(f.lower() for f in found_frameworks))
        
        return {
            "target_versions": versions[:3] if versions else ["General LTS"],
            "detected_stacks": frameworks if frameworks else ["General Software"],
            "character_count": len(text),
            "word_count": len(text.split())
        }

    async def process(self, posts: List[RawPost]) -> List[Claim]:
        await self.publish_event("started", {
            "post_count": len(posts),
            "operations": ["Decomposing real post text", "Regex entity & version context extraction", "Semantic claim formalization"]
        })
        
        claims: List[Claim] = []
        for i, post in enumerate(posts):
            text_source = post.title if post.title else post.body
            clean_text = text_source.strip().replace("\n", " ")
            env_metadata = self._extract_environment_context(f"{post.title} {post.body}")
            
            claims.append(
                Claim(
                    claim_id=f"CLM-{post.post_id}",
                    text=clean_text[:180] + ("..." if len(clean_text) > 180 else ""),
                    source_post_id=post.post_id,
                    platform=post.platform,
                    metadata={
                        "platform": post.platform,
                        "source_url": post.url,
                        "author_reputation": post.author.reputation,
                        "environment": env_metadata["target_versions"][0],
                        "frameworks": env_metadata["detected_stacks"],
                        "raw_score": post.score,
                        "is_accepted": post.is_accepted
                    }
                )
            )
            
        await self.publish_event("completed", {
            "claims_extracted": len(claims),
            "claims": [
                {
                    "claim_id": c.claim_id,
                    "platform": c.platform,
                    "text": c.text[:70] + "...",
                    "frameworks": c.metadata.get("frameworks", [])
                }
                for c in claims
            ]
        })
        return claims
