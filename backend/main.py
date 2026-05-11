from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import auth, events, registrations, admin

app = FastAPI(
    title="EventHub API",
    description="Student event management platform",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/auth", tags=["Auth"])
app.include_router(events.router, prefix="/events", tags=["Events"])
app.include_router(registrations.router, prefix="/registrations", tags=["Registrations"])
app.include_router(admin.router, prefix="/admin", tags=["Admin"])


@app.get("/health")
def health_check():
    return {"status": "ok"}
