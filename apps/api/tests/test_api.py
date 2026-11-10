from fastapi.testclient import TestClient

from ctf_api.main import VERSION, app
from ctf_api.tools.cryptogram.solver import SolverConfig, SubstitutionSolver

client = TestClient(app)

PLAINTEXT = "THE QUICK BROWN FOX JUMPS OVER THE LAZY DOG"
CAESAR_3 = "WKH TXLFN EURZQ IRA MXPSV RYHU WKH ODCB GRJ"


def test_health_and_version():
    assert client.get("/api/health").json() == {"status": "ok"}
    assert client.get("/api/version").json() == {"version": VERSION}


def test_solver_finds_caesar_shift():
    results = SubstitutionSolver(SolverConfig(iterations=200, restarts=1, seed=1)).solve(CAESAR_3)
    assert results[0]["plaintext"] == PLAINTEXT


def test_solve_endpoint_returns_ranked_solutions():
    response = client.post("/api/solve", json={"ciphertext": CAESAR_3, "iterations": 200, "restarts": 1, "seed": 1, "solutions": 3})
    assert response.status_code == 200
    body = response.json()
    assert body["solutions"][0]["plaintext"] == PLAINTEXT
    assert len(body["solutions"]) <= 3
    assert body["metadata"] == {"iterations": 200, "restarts": 1, "mode": "hybrid"}


def test_solve_endpoint_rejects_blank_input():
    assert client.post("/api/solve", json={"ciphertext": "   "}).status_code == 422
