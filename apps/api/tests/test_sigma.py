import pytest
from fastapi.testclient import TestClient

from ctf_api.main import app

client = TestClient(app)

VALID_RULE = """title: Detect whoami execution
id: 4c3b1f90-6f59-4bb6-8d98-6b7b23bdf9c4
status: test
logsource:
  product: windows
  category: process_creation
detection:
  selection:
    CommandLine|contains: whoami
  condition: selection
"""


@pytest.mark.parametrize(
    ("target", "expected_target"),
    [
        ("splunk", "Splunk SPL"),
        ("elasticsearch", "Elasticsearch Lucene"),
    ],
)
def test_convert_endpoint_converts_valid_rule_for_each_target(target, expected_target):
    response = client.post("/api/sigma/convert", json={"rule": VALID_RULE, "target": target})

    assert response.status_code == 200
    result = response.json()
    assert result["target"] == expected_target
    assert result["query"]
    assert result["title"] == "Detect whoami execution"
    assert result["rule_count"] == 1


def test_convert_endpoint_rejects_invalid_yaml():
    response = client.post(
        "/api/sigma/convert",
        json={"rule": "title: [unterminated", "target": "splunk"},
    )

    assert response.status_code == 422
    assert "Could not parse Sigma YAML" in response.json()["detail"]


def test_convert_endpoint_rejects_empty_rule():
    response = client.post("/api/sigma/convert", json={"rule": "", "target": "splunk"})

    assert response.status_code == 422


def test_convert_endpoint_rejects_rule_over_byte_limit():
    # Pydantic's character limit allows this input; its UTF-8 size exceeds 64 KiB.
    oversized_rule = "é" * (64 * 1024 // 2 + 1)
    response = client.post(
        "/api/sigma/convert",
        json={"rule": oversized_rule, "target": "splunk"},
    )

    assert response.status_code == 413
    assert response.json()["detail"] == "Sigma rule must be 64 KB or smaller."


def test_convert_endpoint_rejects_rule_without_detection():
    rule_without_detection = """title: Correlation without detection
id: 5601e065-a9be-4f0f-9dfb-071ab59c7728
status: test
correlation:
  type: event_count
  rules: [4c3b1f90-6f59-4bb6-8d98-6b7b23bdf9c4]
  timespan: 5m
  condition:
    gte: 2
---
title: Referenced detection rule
id: 4c3b1f90-6f59-4bb6-8d98-6b7b23bdf9c4
status: test
logsource:
  product: windows
  category: process_creation
detection:
  selection:
    CommandLine|contains: whoami
  condition: selection
"""
    response = client.post(
        "/api/sigma/convert",
        json={"rule": rule_without_detection, "target": "splunk"},
    )

    assert response.status_code == 422
    assert "do not contain a detection block" in response.json()["detail"].lower()
