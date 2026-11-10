"""Public orchestration layer for the monoalphabetic substitution solver."""
from __future__ import annotations

from dataclasses import asdict, dataclass
import random
import re
import string
from typing import Any

from .annealing import AnnealResult, anneal, decrypt, validate_constraints
from .dictionary import candidates_for
from .frequency import frequency_key
from .scoring import LanguageScorer

ALPHABET = string.ascii_uppercase
WORD_RE = re.compile(r"[A-Z]{2,}")


@dataclass
class SolverConfig:
    iterations: int = 6_000
    restarts: int = 12
    solutions: int = 10
    initial_temperature: float = 20.0
    cooling_rate: float = 0.9992
    seed: int | None = None
    mode: str = "hybrid"


def _atbash_key() -> list[str]:
    return list(ALPHABET[::-1])


def _caesar_key(shift: int) -> list[str]:
    return [ALPHABET[(index - shift) % 26] for index in range(26)]


def _compatible_key(key: list[str], constraints: dict[str, str]) -> bool:
    return all(key[ord(cipher) - 65] == plain for cipher, plain in constraints.items())


def _merge_mapping(mapping: dict[str, str], cipher_word: str, plain_word: str) -> dict[str, str] | None:
    candidate = mapping.copy()
    reverse = {plain: cipher for cipher, plain in candidate.items()}
    for cipher, plain in zip(cipher_word, plain_word):
        if cipher in candidate and candidate[cipher] != plain:
            return None
        if plain in reverse and reverse[plain] != cipher:
            return None
        candidate[cipher] = plain
        reverse[plain] = cipher
    return candidate


def dictionary_mappings(ciphertext: str, constraints: dict[str, str], limit: int = 16) -> list[dict[str, str]]:
    """Produce partial keys via bounded pattern-based constraint propagation."""
    words = sorted(set(WORD_RE.findall(ciphertext.upper())), key=lambda word: (-len(word), word))
    choices = [(word, candidates_for(word, 80)) for word in words]
    choices = [(word, options) for word, options in choices if options]
    choices.sort(key=lambda item: (len(item[1]), -len(item[0])))
    states = [constraints]
    # A small frontier is intentional: this seeds SA without becoming an exponential solver.
    for cipher_word, options in choices[:5]:
        expanded: list[dict[str, str]] = []
        for state in states:
            for plain_word in options:
                merged = _merge_mapping(state, cipher_word, plain_word)
                if merged is not None:
                    expanded.append(merged)
                    if len(expanded) >= limit:
                        break
            if len(expanded) >= limit:
                break
        if expanded:
            states = expanded
    return states[:limit]


class SubstitutionSolver:
    """Independent solver with frequency, dictionary, and SA search stages."""

    def __init__(self, config: SolverConfig | None = None) -> None:
        self.config = config or SolverConfig()
        if self.config.mode not in {"statistics", "dictionary", "hybrid"}:
            raise ValueError("Mode must be statistics, dictionary, or hybrid.")
        if self.config.iterations < 1 or self.config.restarts < 1 or self.config.solutions < 1:
            raise ValueError("Iterations, restarts, and solutions must all be positive.")
        self.scorer = LanguageScorer()

    def solve(self, ciphertext: str, constraints: dict[str, str] | None = None) -> list[dict[str, Any]]:
        if not ciphertext or not ciphertext.strip():
            raise ValueError("Ciphertext cannot be empty.")
        locked = validate_constraints(constraints)
        rng = random.Random(self.config.seed)
        candidates: list[AnnealResult] = []

        def add_key(key: list[str]) -> None:
            if _compatible_key(key, locked):
                plaintext = decrypt(ciphertext, key)
                candidates.append(AnnealResult(plaintext, self.scorer.score(plaintext), key))

        # Cheap deterministic candidates make common CTF transformations immediately useful.
        add_key(_atbash_key())
        add_key(list(ALPHABET))
        for shift in range(1, 26):
            add_key(_caesar_key(shift))
        frequency_seed = frequency_key(ciphertext, locked)

        seeded_constraints = [locked]
        if self.config.mode in {"dictionary", "hybrid"}:
            seeded_constraints.extend(dictionary_mappings(ciphertext, locked))

        for restart in range(self.config.restarts):
            partial = seeded_constraints[restart % len(seeded_constraints)]
            seed_key = frequency_seed if restart == 0 else None
            result = anneal(
                ciphertext, self.scorer.score, partial,
                iterations=self.config.iterations,
                initial_temperature=self.config.initial_temperature,
                cooling_rate=self.config.cooling_rate,
                rng=rng,
                seed_key=seed_key,
            )
            candidates.append(result)

        unique: dict[str, AnnealResult] = {}
        for candidate in candidates:
            existing = unique.get(candidate.plaintext)
            if existing is None or candidate.score > existing.score:
                unique[candidate.plaintext] = candidate
        ranked = sorted(unique.values(), key=lambda result: result.score, reverse=True)[:self.config.solutions]
        return [
            {
                "plaintext": result.plaintext,
                "score": round(result.score, 3),
                "key": {ALPHABET[index]: result.key[index] for index in range(26)},
            }
            for result in ranked
        ]


def solve_text(ciphertext: str, **kwargs: Any) -> list[dict[str, Any]]:
    constraints = kwargs.pop("constraints", None)
    return SubstitutionSolver(SolverConfig(**kwargs)).solve(ciphertext, constraints)


def main() -> None:
    import argparse
    parser = argparse.ArgumentParser(description="Solve an English monoalphabetic substitution cipher.")
    parser.add_argument("ciphertext", nargs="?", help="ciphertext to solve")
    parser.add_argument("--ciphertext", dest="ciphertext_option", help="ciphertext to solve")
    parser.add_argument("--iterations", type=int, default=6_000)
    parser.add_argument("--restarts", type=int, default=12)
    parser.add_argument("--solutions", type=int, default=5)
    parser.add_argument("--mode", choices=["statistics", "dictionary", "hybrid"], default="hybrid")
    parser.add_argument("--seed", type=int)
    args = parser.parse_args()
    ciphertext = args.ciphertext_option or args.ciphertext
    if not ciphertext:
        parser.error("ciphertext is required")
    config = SolverConfig(iterations=args.iterations, restarts=args.restarts, solutions=args.solutions,
                          mode=args.mode, seed=args.seed)
    for index, result in enumerate(SubstitutionSolver(config).solve(ciphertext), start=1):
        print(f"[{index}] {result['plaintext']}\n    score: {result['score']}")


if __name__ == "__main__":
    main()
