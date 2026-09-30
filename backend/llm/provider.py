import os
import httpx
from typing import Optional
from config import settings

class LLMProvider:
    def __init__(self):
        self.openai_key = os.getenv("OPENAI_API_KEY", settings.OPENAI_API_KEY)
        self.gemini_key = os.getenv("GEMINI_API_KEY", settings.GEMINI_API_KEY)
        self.anthropic_key = os.getenv("ANTHROPIC_API_KEY", settings.ANTHROPIC_API_KEY)
        
    async def generate_completion(self, prompt: str, system_prompt: Optional[str] = None) -> Optional[str]:
        # 1. Try OpenAI if API key available
        if self.openai_key:
            try:
                from openai import AsyncOpenAI
                client = AsyncOpenAI(api_key=self.openai_key)
                messages = []
                if system_prompt:
                    messages.append({"role": "system", "content": system_prompt})
                messages.append({"role": "user", "content": prompt})
                
                resp = await client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=messages,
                    temperature=0.3
                )
                return resp.choices[0].message.content
            except Exception as e:
                print(f"[LLMProvider] OpenAI generation failed: {e}")

        # 2. Try Gemini if API key available
        if self.gemini_key:
            try:
                from google import genai
                client = genai.Client(api_key=self.gemini_key)
                response = client.models.generate_content(
                    model="gemini-2.0-flash",
                    contents=prompt
                )
                return response.text
            except Exception as e:
                print(f"[LLMProvider] Gemini generation failed: {e}")

        # 3. Try Anthropic if API key available
        if self.anthropic_key:
            try:
                from anthropic import AsyncAnthropic
                client = AsyncAnthropic(api_key=self.anthropic_key)
                resp = await client.messages.create(
                    model="claude-3-haiku-20240307",
                    max_tokens=1024,
                    messages=[{"role": "user", "content": prompt}]
                )
                return resp.content[0].text
            except Exception as e:
                print(f"[LLMProvider] Anthropic generation failed: {e}")

        # 4. Try local Ollama if available
        try:
            async with httpx.AsyncClient(timeout=4.0) as client:
                res = await client.post(
                    "http://localhost:11434/api/generate",
                    json={"model": "llama3", "prompt": prompt, "stream": False}
                )
                if res.status_code == 200:
                    return res.json().get("response")
        except Exception:
            pass

        # If no external LLM API key is configured, return None to signal algorithmic synthesis
        return None
