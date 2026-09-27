"""Word-pattern helpers used by the dictionary-aware solver."""
from __future__ import annotations

from collections import defaultdict
from typing import Iterable


def word_pattern(word: str) -> tuple[int, ...]:
    """Return the canonical first-occurrence pattern for a word.

    ``TREE`` becomes ``(0, 1, 2, 2)`` and ``AREA`` becomes ``(0, 1, 2, 0)``.
    """
    seen: dict[str, int] = {}
    return tuple(seen.setdefault(char, len(seen)) for char in word.upper())


def build_pattern_index(words: Iterable[str]) -> dict[tuple[int, ...], list[str]]:
    index: dict[tuple[int, ...], list[str]] = defaultdict(list)
    for word in words:
        normalized = word.strip().upper()
        if normalized.isalpha():
            index[word_pattern(normalized)].append(normalized)
    return dict(index)
