"""Bundled dictionary loading and word-level scoring."""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path
import re

from .patterns import build_pattern_index

WORD_RE = re.compile(r"[A-Z]+")
DATA_DIR = Path(__file__).resolve().parent.parent / "data"


@lru_cache(maxsize=1)
def load_words() -> frozenset[str]:
    path = DATA_DIR / "words.txt"
    return frozenset(
        line.strip().upper() for line in path.read_text(encoding="utf-8").splitlines()
        if line.strip() and not line.startswith("#")
    )


@lru_cache(maxsize=1)
def pattern_index() -> dict[tuple[int, ...], list[str]]:
    return build_pattern_index(load_words())


def candidates_for(cipher_word: str, limit: int = 250) -> list[str]:
    from .patterns import word_pattern
    return pattern_index().get(word_pattern(cipher_word), [])[:limit]


def dictionary_score(text: str) -> float:
    words = WORD_RE.findall(text.upper())
    if not words:
        return 0.0
    dictionary = load_words()
    # Reward longer recognised words more strongly; never punish punctuation/numbers.
    known = sum(len(word) ** 1.2 for word in words if word in dictionary)
    return known / sum(max(1, len(word)) for word in words)
