"""Offline, composable English-language scoring."""
from __future__ import annotations

from collections import Counter
from functools import lru_cache
import json
from math import log
from pathlib import Path
import re

from .dictionary import dictionary_score, load_words

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
LETTERS = re.compile(r"[A-Z]")


@lru_cache(maxsize=4)
def load_ngrams(size: int) -> dict[str, float]:
    filename = DATA_DIR / ("tetragrams.json" if size == 4 else "trigrams.json")
    raw = json.loads(filename.read_text(encoding="utf-8"))
    return {gram.upper(): float(value) for gram, value in raw.items()}


def ngram_score(text: str, size: int = 4) -> float:
    letters = "".join(LETTERS.findall(text.upper()))
    if len(letters) < size:
        return -8.0 * max(0, size - len(letters))
    table = load_ngrams(size)
    floor = min(table.values(), default=-12.0) - 3.0
    # Compare average log likelihood, not the raw sum. The sum scales with message
    # length and can swamp the dictionary signal, especially for unseen grams in
    # the compact bundled table.
    windows = len(letters) - size + 1
    return sum(table.get(letters[index:index + size], floor) for index in range(windows)) / windows


def pattern_score(text: str) -> float:
    words = re.findall(r"[A-Z]+", text.upper())
    known = load_words()
    if not words:
        return 0.0
    return sum(1.0 for word in words if len(word) > 1 and word in known) / len(words)


class LanguageScorer:
    """Weighted score with deliberately explicit, configurable components."""

    def __init__(self, ngram_weight: float = 1.0, dictionary_weight: float = 12.0,
                 pattern_weight: float = 2.0, ngram_size: int = 4) -> None:
        self.ngram_weight = ngram_weight
        self.dictionary_weight = dictionary_weight
        self.pattern_weight = pattern_weight
        self.ngram_size = ngram_size

    def score(self, plaintext: str) -> float:
        return (
            self.ngram_weight * ngram_score(plaintext, self.ngram_size)
            + self.dictionary_weight * dictionary_score(plaintext)
            + self.pattern_weight * pattern_score(plaintext)
        )
