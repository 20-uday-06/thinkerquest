import json
import re
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Any


@dataclass
class RetrievedFact:
    source: str
    score: float
    content: dict[str, Any]


def _tokenize(text: str) -> set[str]:
    normalized = text.strip().lower()
    normalized = re.sub(r"[^\w\sऀ-ॿ]", " ", normalized)
    return {token for token in normalized.split() if token}


@lru_cache
def _load_kb() -> dict[str, list[dict[str, Any]]]:
    base_path = Path(__file__).resolve().parents[1] / "knowledge_base"
    kb: dict[str, list[dict[str, Any]]] = {}

    for path in base_path.glob("*.json"):
        with path.open("r", encoding="utf-8") as file:
            data = json.load(file)
            kb[path.name] = data if isinstance(data, list) else []

    return kb


def _record_to_text(record: dict[str, Any]) -> str:
    values: list[str] = []
    for value in record.values():
        if isinstance(value, list):
            values.extend([str(item) for item in value])
        else:
            values.append(str(value))
    return " ".join(values)


def retrieve_facts(
    query: str, top_k: int = 3, boost_terms: list[str] | None = None
) -> list[RetrievedFact]:
    query_tokens = _tokenize(query)
    if not query_tokens:
        return []

    boost_tokens = _tokenize(" ".join(boost_terms or []))

    results: list[RetrievedFact] = []
    kb = _load_kb()

    for source_name, records in kb.items():
        for record in records:
            record_tokens = _tokenize(_record_to_text(record))
            if not record_tokens:
                continue

            overlap = len(query_tokens.intersection(record_tokens))
            if overlap == 0:
                continue

            score = overlap / max(len(query_tokens), 1)
            boost_overlap = len(boost_tokens.intersection(record_tokens))
            if boost_overlap > 0:
                score += 0.25 * (boost_overlap / max(len(boost_tokens), 1))
            results.append(RetrievedFact(source=source_name, score=score, content=record))

    results.sort(key=lambda item: item.score, reverse=True)
    return results[:top_k]
