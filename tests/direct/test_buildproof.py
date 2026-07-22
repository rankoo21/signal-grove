import json

import pytest

from conftest import model_response, payload


def set_response(direct_vm, response):
    direct_vm.clear_mocks()
    direct_vm.mock_llm(r".*", response)


def submit(contract, request_id="req-1", body=None, now_ms=1000):
    return contract.submit_check(request_id, body or payload(), now_ms)


def test_persists_canonical_result_and_views(deploy):
    result = submit(deploy, "req-pass")
    assert result == deploy.get_result("req-pass")
    assert result["requestId"] == "req-pass"
    assert result["verdict"] == "pass"
    assert result["confidence"] == "high"
    assert result["createdAt"] == 1000
    assert result["criteria"][0]["evidenceExcerpt"] == "Automated tests pass"
    assert result["evidenceExcerpts"] == ["Automated tests pass"]
    assert deploy.get_results(0, 20) == [result]
    assert deploy.get_summary() == {"total": 1, "pass": 1, "partial": 0, "fail": 0}


@pytest.mark.parametrize(
    "request_id,body,now_ms,expected",
    [
        ("", payload(), 1, "request_id is required"),
        ("x" * 97, payload(), 1, "request_id exceeds 96"),
        ("ok", "not-json", 1, "valid JSON"),
        ("ok", json.dumps([]), 1, "encode an object"),
        ("ok", json.dumps({"requirements": [], "evidence": "x"}), 1, "non-empty array"),
        ("ok", payload(), -1, "now_ms is out of range"),
    ],
)
def test_rejects_malformed_inputs(deploy, direct_vm, request_id, body, now_ms, expected):
    with direct_vm.expect_revert(expected):
        deploy.submit_check(request_id, body, now_ms)


def test_accepts_maximum_bounds(deploy, direct_vm):
    requirements = [{"id": f"criterion-{i + 1}", "text": "r" * 1000} for i in range(12)]
    evidence = "e" * 20000
    response = model_response("pass", "medium", ["pass"] * 12, ["e"] * 12)
    set_response(direct_vm, response)
    result = deploy.submit_check(
        "q" * 96,
        json.dumps({"requirements": requirements, "evidence": evidence, "context": "c" * 8000}),
        18446744073709551615,
    )
    assert len(result["criteria"]) == 12
    assert result["createdAt"] == 18446744073709551615


def test_rejects_duplicate_requirement_ids(deploy, direct_vm):
    body = json.dumps({
        "requirements": [{"id": "same", "text": "one"}, {"id": "same", "text": "two"}],
        "evidence": "evidence",
        "context": "",
    })
    with direct_vm.expect_revert("requirement ids must be unique"):
        submit(deploy, body=body)


def test_request_id_is_idempotent_per_sender(deploy, direct_vm):
    submit(deploy, "same")
    with direct_vm.expect_revert("request_id already exists for this sender"):
        submit(deploy, "same", now_ms=2000)


def test_same_request_id_allowed_for_another_sender(deploy, direct_vm, direct_bob):
    first = submit(deploy, "shared")
    with direct_vm.prank(direct_bob):
        second = submit(deploy, "shared", now_ms=2000)
        assert deploy.get_result("shared") == second
    assert first["sender"] != second["sender"]
    assert deploy.get_result("shared") == first
    assert deploy.get_summary()["total"] == 2


def test_reverse_paging_and_summary_counts(deploy, direct_vm):
    submit(deploy, "pass", now_ms=1)
    set_response(direct_vm, model_response("partial", "medium", ["partial"], ["Automated tests pass"]))
    submit(deploy, "partial", now_ms=2)
    set_response(direct_vm, model_response("fail", "high", ["fail"], ["Automated tests pass"]))
    submit(deploy, "fail", now_ms=3)
    assert [item["requestId"] for item in deploy.get_results(0, 2)] == ["fail", "partial"]
    assert [item["requestId"] for item in deploy.get_results(2, 2)] == ["pass"]
    assert deploy.get_summary() == {"total": 3, "pass": 1, "partial": 1, "fail": 1}


def test_result_is_sender_scoped(deploy, direct_vm, direct_bob):
    submit(deploy, "private")
    with direct_vm.prank(direct_bob):
        assert deploy.get_result("private") == {}


def test_rejects_invalid_llm_json(deploy, direct_vm):
    set_response(direct_vm, "not-json")
    with direct_vm.expect_revert("[LLM_ERROR] model returned invalid JSON"):
        submit(deploy)


@pytest.mark.parametrize(
    "response,expected",
    [
        (json.dumps({"verdict": "maybe", "confidence": "high", "explanation": "x", "criteria": []}), "invalid verdict"),
        (model_response("pass", "certain"), "invalid confidence"),
        (model_response("pass", "high", ["pass"], [""]), "require a grounded evidence excerpt"),
        (model_response("pass", "high", ["pass"], ["automated tests pass"]), "exact contiguous copy"),
        (model_response("pass", "high", ["pass"], ["text not in evidence"]), "exact contiguous copy"),
        (model_response("pass", "high", ["fail"], ["Automated tests pass"]), "overall verdict conflicts"),
    ],
)
def test_rejects_invalid_or_ungrounded_assessments(deploy, direct_vm, response, expected):
    set_response(direct_vm, response)
    with direct_vm.expect_revert(expected):
        submit(deploy)


def test_validator_agrees_with_independent_matching_assessment(deploy, direct_vm):
    submit(deploy, "validator-agrees")
    assert direct_vm.run_validator() is True


def test_validator_rejects_divergent_verdict(deploy, direct_vm):
    result = submit(deploy, "validator-verdict")
    divergent = dict(result)
    divergent["verdict"] = "fail"
    divergent["criteria"] = [dict(result["criteria"][0], status="fail")]
    assert direct_vm.run_validator(leader_result=divergent) is False


def test_validator_rejects_divergent_criterion_status(deploy, direct_vm):
    result = submit(deploy, "validator-criterion")
    divergent = dict(result)
    divergent["criteria"] = [dict(result["criteria"][0], status="partial")]
    assert direct_vm.run_validator(leader_result=divergent) is False


def test_validator_rejects_confidence_more_than_one_band_apart(deploy, direct_vm):
    result = submit(deploy, "validator-confidence")
    divergent = dict(result)
    divergent["confidence"] = "low"
    assert direct_vm.run_validator(leader_result=divergent) is False


def test_page_bounds_are_validated(deploy, direct_vm):
    with direct_vm.expect_revert("offset must be non-negative"):
        deploy.get_results(-1, 1)
    with direct_vm.expect_revert("limit must be between 1 and 20"):
        deploy.get_results(0, 21)
