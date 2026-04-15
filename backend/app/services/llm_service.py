import time

import httpx


DEFAULT_GEMINI_MODELS = [
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-1.5-flash-latest",
    "gemini-1.5-flash",
]
DETAILED_GEMINI_MODELS = [
    "gemini-2.5-pro",
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-1.5-pro",
    "gemini-1.5-flash-latest",
    "gemini-1.5-flash",
]


def _extract_text(payload: dict) -> str:
    candidates = payload.get("candidates", [])
    if not candidates:
        return ""

    parts = candidates[0].get("content", {}).get("parts", [])
    text_chunks = [part.get("text", "") for part in parts if isinstance(part, dict)]
    return " ".join(chunk.strip() for chunk in text_chunks if chunk.strip()).strip()


def _request_gemini(
    api_key: str,
    prompt: str,
    model: str,
    system_instruction: str | None = None,
) -> str:
    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
        f"?key={api_key}"
    )

    body = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.4,
            "topP": 0.9,
            "maxOutputTokens": 1200,
            "responseMimeType": "text/plain",
        },
    }

    if system_instruction:
        body["systemInstruction"] = {"parts": [{"text": system_instruction}]}

    with httpx.Client(timeout=20.0) as client:
        response = client.post(url, json=body)
        response.raise_for_status()
        payload = response.json()

    text = _extract_text(payload)
    if not text:
        raise RuntimeError("Gemini returned empty content")

    return text


def generate_with_gemini(
    api_key: str,
    prompt: str,
    detailed: bool = False,
    system_instruction: str | None = None,
) -> str:
    last_error: Exception | None = None
    models = DETAILED_GEMINI_MODELS if detailed else DEFAULT_GEMINI_MODELS

    for model in models:
        for attempt in range(3):
            try:
                return _request_gemini(
                    api_key=api_key,
                    prompt=prompt,
                    model=model,
                    system_instruction=system_instruction,
                )
            except httpx.HTTPStatusError as exc:
                last_error = exc
                status = exc.response.status_code

                # Retry transient provider errors/rate limits.
                if status in {429, 500, 502, 503, 504} and attempt < 2:
                    time.sleep(0.8 * (attempt + 1))
                    continue

                # For model not found, move to next model without retry loop.
                if status == 404:
                    break

                # Permanent error for this model.
                break
            except Exception as exc:  # pragma: no cover - defensive fallback
                last_error = exc
                if attempt < 2:
                    time.sleep(0.8 * (attempt + 1))
                    continue
                break

    raise RuntimeError(f"Gemini call failed after retries: {last_error}")