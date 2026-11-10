"""Lightweight frequency analysis for sensible annealing starting keys."""
from __future__ import annotations

from collections import Counter
import string

ENGLISH_FREQUENCY = "ETAOINSHRDLCUMWFGYPBVKJXQZ"
ALPHABET = string.ascii_uppercase


def ciphertext_frequency(text: str) -> list[str]:
    counts = Counter(char for char in text.upper() if char in ALPHABET)
    return sorted(ALPHABET, key=lambda char: (-counts[char], char))


def frequency_key(text: str, locked: dict[str, str] | None = None) -> list[str]:
    """Build cipher-indexed plaintext key, preserving any locked assignments."""
    locked = locked or {}
    key: list[str | None] = [None] * 26
    used = set(locked.values())
    for cipher, plain in locked.items():
        key[ord(cipher) - 65] = plain
    available = [char for char in ENGLISH_FREQUENCY if char not in used]
    for cipher in ciphertext_frequency(text):
        index = ord(cipher) - 65
        if key[index] is None:
            key[index] = available.pop(0)
    return [char if char is not None else "?" for char in key]
