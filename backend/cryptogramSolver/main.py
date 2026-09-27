"""Routes for the Cryptogram Solver API."""
from __future__ import annotations

import os
from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, field_validator

from backend.cryptogramSolver.solver.solver import SolverConfig, SubstitutionSolver

router = APIRouter(tags=["cryptogram-solver"])

MAX_CIPHERTEXT = int(os.getenv("CRYPTOGRAM_MAX_CIPHERTEXT_LENGTH", "10000"))
MAX_ITERATIONS = int(os.getenv("CRYPTOGRAM_MAX_ITERATIONS", "50000"))
MAX_RESTARTS = int(os.getenv("CRYPTOGRAM_MAX_RESTARTS", "100"))


class SolveRequest(BaseModel):
    ciphertext: str = Field(min_length=1, max_length=MAX_CIPHERTEXT)
    mode: Literal["statistics", "dictionary", "hybrid"] = "hybrid"
    iterations: int = Field(default=int(os.getenv("CRYPTOGRAM_DEFAULT_ITERATIONS", "6000")), ge=1, le=MAX_ITERATIONS)
    restarts: int = Field(default=int(os.getenv("CRYPTOGRAM_DEFAULT_RESTARTS", "12")), ge=1, le=MAX_RESTARTS)
    solutions: int = Field(default=10, ge=1, le=25)
    constraints: dict[str, str] = Field(default_factory=dict)
    seed: int | None = None

    @field_validator("ciphertext")
    @classmethod
    def nonblank_ciphertext(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Ciphertext cannot be blank.")
        return value

@router.post("/api/solve")
def solve(request: SolveRequest) -> dict:
    try:
        config = SolverConfig(iterations=request.iterations, restarts=request.restarts,
                              solutions=request.solutions, mode=request.mode, seed=request.seed)
        solutions = SubstitutionSolver(config).solve(request.ciphertext, request.constraints)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except Exception as error:  # Avoid leaking implementation details to API consumers.
        raise HTTPException(status_code=500, detail="Solver failed unexpectedly.") from error
    return {"solutions": solutions, "metadata": {"iterations": request.iterations, "restarts": request.restarts, "mode": request.mode}}
