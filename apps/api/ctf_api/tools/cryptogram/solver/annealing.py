"""Constraint-respecting simulated annealing for substitution keys."""
from __future__ import annotations

from dataclasses import dataclass
from math import exp
import random
import string
from typing import Callable

ALPHABET = string.ascii_uppercase


def decrypt(ciphertext: str, key: list[str]) -> str:
    result: list[str] = []
    for char in ciphertext:
        upper = char.upper()
        if upper in ALPHABET:
            plain = key[ord(upper) - 65]
            result.append(plain if char.isupper() else plain.lower())
        else:
            result.append(char)
    return "".join(result)


def validate_constraints(constraints: dict[str, str] | None) -> dict[str, str]:
    cleaned: dict[str, str] = {}
    for cipher, plain in (constraints or {}).items():
        cipher, plain = str(cipher).upper(), str(plain).upper()
        if len(cipher) != 1 or len(plain) != 1 or cipher not in ALPHABET or plain not in ALPHABET:
            raise ValueError("Constraints must map one A-Z ciphertext letter to one A-Z plaintext letter.")
        if cipher in cleaned and cleaned[cipher] != plain:
            raise ValueError(f"Conflicting mapping for {cipher}.")
        cleaned[cipher] = plain
    if len(set(cleaned.values())) != len(cleaned):
        raise ValueError("Constraints must be bijective: a plaintext letter cannot be assigned twice.")
    return cleaned


def random_key(constraints: dict[str, str], rng: random.Random, seed_key: list[str] | None = None) -> list[str]:
    key: list[str | None] = [None] * 26
    for cipher, plain in constraints.items():
        key[ord(cipher) - 65] = plain
    used = set(constraints.values())
    free_indices = [index for index, value in enumerate(key) if value is None]
    available = [char for char in ALPHABET if char not in used]
    if seed_key:
        preferred = [seed_key[index] for index in free_indices if seed_key[index] in available]
        if len(set(preferred)) == len(preferred) == len(free_indices):
            available = preferred
        else:
            rng.shuffle(available)
    else:
        rng.shuffle(available)
    for index, plain in zip(free_indices, available):
        key[index] = plain
    return [char for char in key if char is not None]


@dataclass(frozen=True)
class AnnealResult:
    plaintext: str
    score: float
    key: list[str]


def anneal(ciphertext: str, scorer: Callable[[str], float], constraints: dict[str, str], *,
           iterations: int, initial_temperature: float, cooling_rate: float,
           rng: random.Random, seed_key: list[str] | None = None) -> AnnealResult:
    current_key = random_key(constraints, rng, seed_key)
    unlocked = [index for index in range(26) if chr(index + 65) not in constraints]
    current_plaintext = decrypt(ciphertext, current_key)
    current_score = scorer(current_plaintext)
    best = AnnealResult(current_plaintext, current_score, current_key[:])
    temperature = initial_temperature
    for _ in range(iterations):
        first, second = rng.sample(unlocked, 2) if len(unlocked) >= 2 else (0, 0)
        current_key[first], current_key[second] = current_key[second], current_key[first]
        candidate_plaintext = decrypt(ciphertext, current_key)
        candidate_score = scorer(candidate_plaintext)
        delta = candidate_score - current_score
        if delta >= 0 or rng.random() < exp(delta / max(temperature, 0.001)):
            current_score, current_plaintext = candidate_score, candidate_plaintext
            if current_score > best.score:
                best = AnnealResult(current_plaintext, current_score, current_key[:])
        else:
            current_key[first], current_key[second] = current_key[second], current_key[first]
        temperature *= cooling_rate
    return best
