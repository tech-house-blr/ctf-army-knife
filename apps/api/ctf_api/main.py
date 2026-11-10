"""FastAPI entry point. Each tool that needs server-side work registers a router here."""
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from ctf_api.core.external_tools import router as capabilities_router
from ctf_api.tools.aperisolve.router import router as aperisolve_router
from ctf_api.tools.cryptogram.router import router as cryptogram_router

VERSION = "0.1.0"
DEFAULT_ORIGINS = "http://localhost:4000,http://127.0.0.1:4000,http://localhost:8000,http://127.0.0.1:8000"

app = FastAPI(title="CTF Army Knife API", version=VERSION)

origins = [origin.strip() for origin in os.getenv("CORS_ORIGINS", DEFAULT_ORIGINS).split(",") if origin.strip()]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=False, allow_methods=["GET", "POST"], allow_headers=["Content-Type"])

app.include_router(capabilities_router)
app.include_router(cryptogram_router)
app.include_router(aperisolve_router)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/version")
def version() -> dict[str, str]:
    return {"version": VERSION}
