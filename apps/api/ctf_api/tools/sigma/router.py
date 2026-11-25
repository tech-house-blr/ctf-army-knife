"""API for converting Sigma YAML rules to supported SIEM query languages."""

from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from sigma.backends.elasticsearch import LuceneBackend
from sigma.backends.splunk import SplunkBackend
from sigma.collection import SigmaCollection

router = APIRouter(prefix="/api/sigma", tags=["sigma"])
MAX_RULE_BYTES = 64 * 1024
BACKENDS = {
    "splunk": ("Splunk SPL", SplunkBackend),
    "elasticsearch": ("Elasticsearch Lucene", LuceneBackend),
}


class ConvertRequest(BaseModel):
    rule: str = Field(min_length=1, max_length=MAX_RULE_BYTES)
    target: Literal["splunk", "elasticsearch"]


class ConvertResponse(BaseModel):
    target: str
    query: str
    title: str | None = None
    rule_count: int


@router.post("/convert", response_model=ConvertResponse)
def convert_rule(request: ConvertRequest) -> ConvertResponse:
    """Parse and convert one Sigma rule without retaining submitted content."""
    if len(request.rule.encode("utf-8")) > MAX_RULE_BYTES:
        raise HTTPException(status_code=413, detail="Sigma rule must be 64 KB or smaller.")

    try:
        collection = SigmaCollection.from_yaml(request.rule)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Could not parse Sigma YAML: {exc}") from exc

    if not collection.rules:
        raise HTTPException(status_code=422, detail="The input does not contain a convertible Sigma rule.")

    label, backend_type = BACKENDS[request.target]
    try:
        converted = backend_type().convert(collection)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Conversion to {label} failed: {exc}") from exc

    queries = [str(query) for query in converted if str(query).strip()]
    if not queries:
        raise HTTPException(status_code=422, detail=f"pySigma produced no {label} query for this rule.")

    titles = [rule.title for rule in collection.rules if getattr(rule, "title", None)]
    return ConvertResponse(
        target=label,
        query="\n\n".join(queries),
        title=titles[0] if titles else None,
        rule_count=len(collection.rules),
    )
