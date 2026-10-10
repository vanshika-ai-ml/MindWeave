import json
import logging
import time
from typing import Optional, Dict, Any, List

from google import genai
from google.genai import types
from google.genai.errors import APIError
from backend.config import settings

logger = logging.getLogger("mindweave.ai")

class GeminiClient:
    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY
        self.primary_model = settings.GEMINI_MODEL or "gemini-3.8-flash"

        self.candidate_models: List[str] = [
            self.primary_model,
            "gemini-flash-latest",
            "gemini-3.5-flash-lite",
        ]
        self.candidate_models = list(dict.fromkeys(self.candidate_models))

        self._client: Optional[genai.Client] = None

        if self.api_key:
            try:
                self._client = genai.Client(api_key=self.api_key)
                logger.info(
                    "Gemini client initialized. Models: %s",
                    self.candidate_models,
                )
            except Exception as e:
                logger.error("Failed to initialize Gemini client: %s", e)

    @property
    def client(self) -> genai.Client:
        if not self._client:
            if not self.api_key:
                raise ValueError(
                    "GEMINI_API_KEY is not set. "
                    "Please configure it in your .env file."
                )
            self._client = genai.Client(api_key=self.api_key)

        return self._client

    def generate_json(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        max_retries: int = 3,
    ) -> Dict[str, Any]:
        """Generate JSON with model fallback and retry handling."""

        config = types.GenerateContentConfig(
            response_mime_type="application/json",
            temperature=0.2,
            system_instruction=system_instruction,
        )

        last_error = None

        for model in self.candidate_models:
            for attempt in range(1, max_retries + 1):
                try:
                    response = self.client.models.generate_content(
                        model=model,
                        contents=prompt,
                        config=config,
                    )

                    response_text = (response.text or "{}").strip()

                    if response_text.startswith("```"):
                        response_text = (
                            response_text.replace("```json", "")
                            .replace("```", "")
                            .strip()
                        )

                    result = json.loads(response_text)

                    if not isinstance(result, dict):
                        raise ValueError("Gemini response must be a JSON object.")

                    return result

                except APIError as e:
                    last_error = e
                    status_code = getattr(e, "code", 500)

                    if status_code in (429, 503):
                        logger.warning(
                            "Model %s returned %s on attempt %s/%s",
                            model,
                            status_code,
                            attempt,
                            max_retries,
                        )

                        if attempt < max_retries:
                            time.sleep(attempt * 2)
                        else:
                            logger.info("Trying the next fallback model.")
                            break
                    else:
                        logger.error("API error from %s: %s", model, e)
                        break

                except json.JSONDecodeError as e:
                    last_error = e
                    logger.warning("Invalid JSON from %s: %s", model, e)

                    if attempt < max_retries:
                        time.sleep(1)
                    else:
                        break

                except Exception as e:
                    last_error = e
                    logger.error("Unexpected error with %s: %s", model, e)

                    if attempt < max_retries:
                        time.sleep(1)
                    else:
                        break

        raise last_error or RuntimeError(
            "Failed to generate valid content from Gemini."
        )

gemini_client = GeminiClient()