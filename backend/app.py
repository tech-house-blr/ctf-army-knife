import os

from backend.cryptogramSolver.solver.solver import main
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.cryptogramSolver.main import router as cryptogram_solver_router

app = FastAPI(title="CTF Army Knife API", version="0.1.0")

origins = [origin.strip() for origin in os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000,http://localhost:8000,http://127.0.0.1:8000").split(",") if origin.strip()]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=False, allow_methods=["GET", "POST"], allow_headers=["Content-Type"])
app.include_router(cryptogram_solver_router)

@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/version")
def version() -> dict[str, str]:
    return {"version": main.version}