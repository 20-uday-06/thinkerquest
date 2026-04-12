import time
import uuid
from collections import defaultdict, deque

from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.config import get_settings

settings = get_settings()


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id
        started = time.perf_counter()

        response = await call_next(request)

        elapsed_ms = (time.perf_counter() - started) * 1000
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Process-Time-Ms"] = f"{elapsed_ms:.2f}"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        return response


class QueryRateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app):
        super().__init__(app)
        self._bucket: dict[str, deque[float]] = defaultdict(deque)

    async def dispatch(self, request: Request, call_next):
        if request.url.path != "/api/query" or request.method.upper() != "POST":
            return await call_next(request)

        client_host = request.client.host if request.client else "unknown"
        now = time.time()
        timestamps = self._bucket[client_host]

        while timestamps and now - timestamps[0] > settings.rate_limit_window_sec:
            timestamps.popleft()

        if len(timestamps) >= settings.rate_limit_max_requests:
            return JSONResponse(
                status_code=429,
                content={
                    "error": {
                        "code": "rate_limit_exceeded",
                        "message": "बहुत अधिक अनुरोध। कृपया थोड़ी देर बाद फिर कोशिश करें।",
                    }
                },
            )

        timestamps.append(now)
        return await call_next(request)
