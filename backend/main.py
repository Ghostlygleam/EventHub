# backend/main.py

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from core.config import settings
from core.limiter import limiter
from routers import auth, clubs, events, registrations, admin


async def _rate_limit_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    """
    Return 429 with {"detail": "..."} body and Retry-After header.
    Matches the format used by manual per-email 429s in auth.py.
    """
    response = JSONResponse(
        status_code=429,
        content={"detail": "Too many requests. Please slow down and try again later."},
    )
    # Let slowapi inject X-RateLimit-* and Retry-After headers
    response = request.app.state.limiter._inject_headers(
        response, request.state.view_rate_limit
    )
    return response


app = FastAPI(
    title="EventHub API",
    description="Student event management platform",
    version="1.0.0",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_handler)
app.add_middleware(SlowAPIMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

app.include_router(auth.router,          prefix="/auth",          tags=["Auth"])
app.include_router(clubs.router,         prefix="/clubs",         tags=["Clubs"])
app.include_router(events.router,        prefix="/events",        tags=["Events"])
app.include_router(registrations.router, prefix="/registrations", tags=["Registrations"])
app.include_router(admin.router,         prefix="/admin",         tags=["Admin"])


@app.get("/health")
def health_check():
    return {"status": "ok"}
