import os
import httpx
from typing import Optional
from config import settings

class LLMProvider:
    def __init__(self):
        self.openai_key = os.getenv("OPENAI_API_KEY", settings.OPENAI_API_KEY)
        self.gemini_key = os.getenv("GEMINI_API_KEY", settings.GEMINI_API_KEY)
        self.anthropic_key = os.getenv("ANTHROPIC_API_KEY", settings.ANTHROPIC_API_KEY)
        
    async def generate_completion_with_usage(self, prompt: str, system_prompt: Optional[str] = None, model_preference: Optional[str] = None) -> tuple[Optional[str], int]:
        # Fallback to standard generation if usage isn't supported easily by provider, but for OpenAI we can extract it
        use_openai = True if (model_preference and "gpt" in model_preference.lower()) else False
        if not use_openai and self.openai_key: use_openai = True
        
        if use_openai and self.openai_key:
            try:
                from openai import AsyncOpenAI
                client = AsyncOpenAI(api_key=self.openai_key)
                messages = []
                if system_prompt: messages.append({"role": "system", "content": system_prompt})
                messages.append({"role": "user", "content": prompt})
                resp = await client.chat.completions.create(model="gpt-4o", messages=messages, temperature=0.3)
                tokens = resp.usage.total_tokens if hasattr(resp, 'usage') and resp.usage else 0
                return resp.choices[0].message.content, tokens
            except Exception as e:
                print(f"[LLMProvider] Usage gen failed: {e}")
        
        # Fallback
        res = await self.generate_completion(prompt, system_prompt, model_preference)
        return res, 0

    async def generate_completion(self, prompt: str, system_prompt: Optional[str] = None, model_preference: Optional[str] = None) -> Optional[str]:
        use_openai = False
        use_gemini = False
        use_anthropic = False
        
        if model_preference:
            pref = model_preference.lower()
            if "gpt" in pref:
                use_openai = True
            elif "gemini" in pref:
                use_gemini = True
            elif "claude" in pref:
                use_anthropic = True
        
        # Fallback logic if preference fails or is not provided
        if not use_openai and not use_gemini and not use_anthropic:
            if self.openai_key: use_openai = True
            elif self.gemini_key: use_gemini = True
            elif self.anthropic_key: use_anthropic = True

        # 1. Try OpenAI
        if use_openai and self.openai_key:
            try:
                from openai import AsyncOpenAI
                client = AsyncOpenAI(api_key=self.openai_key)
                messages = []
                if system_prompt:
                    messages.append({"role": "system", "content": system_prompt})
                messages.append({"role": "user", "content": prompt})
                
                resp = await client.chat.completions.create(
                    model="gpt-4o",
                    messages=messages,
                    temperature=0.3
                )
                return resp.choices[0].message.content
            except Exception as e:
                print(f"[LLMProvider] OpenAI generation failed: {e}")

        # 2. Try Gemini with Google Search Grounding
        if use_gemini and self.gemini_key:
            try:
                from google import genai
                from google.genai import types
                client = genai.Client(api_key=self.gemini_key)
                
                # Enable Web Search Grounding for the competitor baseline
                config = types.GenerateContentConfig(
                    tools=[{"google_search": {}}],
                    temperature=0.3
                )
                
                response = client.models.generate_content(
                    model="gemini-2.0-flash",
                    contents=prompt,
                    config=config
                )
                return response.text
            except Exception as e:
                print(f"[LLMProvider] Gemini generation failed: {e}")

        # 3. Try Anthropic
        if use_anthropic and self.anthropic_key:
            try:
                from anthropic import AsyncAnthropic
                client = AsyncAnthropic(api_key=self.anthropic_key)
                resp = await client.messages.create(
                    model="claude-3-5-sonnet-20241022",
                    max_tokens=1024,
                    messages=[{"role": "user", "content": prompt}]
                )
                return resp.content[0].text
            except Exception as e:
                print(f"[LLMProvider] Anthropic generation failed: {e}")



        # If no external LLM API key is configured, return None to signal algorithmic synthesis
        return None
