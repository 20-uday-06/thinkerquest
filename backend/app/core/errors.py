from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(_: Request, exc: RequestValidationError):
        return JSONResponse(
            status_code=422,
            content={
                "error": {
                    "code": "validation_error",
                    "message": "इनपुट अमान्य है। कृपया सही जानकारी दें।",
                    "details": exc.errors(),
                }
            },
        )

    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, _: Exception):
        request_id = getattr(request.state, "request_id", "unknown")
        return JSONResponse(
            status_code=500,
            content={
                "error": {
                    "code": "internal_error",
                    "message": "सर्वर में समस्या आई। कृपया पुनः प्रयास करें।",
                    "request_id": request_id,
                }
            },
        )
