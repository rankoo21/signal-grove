# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

from dataclasses import dataclass

from genlayer import *

import json

ERROR_EXPECTED = "[EXPECTED]"
ERROR_LLM = "[LLM_ERROR]"
VERDICTS = ("pass", "partial", "fail")
CONFIDENCE = ("low", "medium", "high")
MAX_REQUEST_ID = 96
MAX_PAYLOAD = 42000
MAX_REQUIREMENTS = 12
MAX_REQUIREMENT_TEXT = 1000
MAX_EVIDENCE = 20000
MAX_CONTEXT = 8000
MAX_EXPLANATION = 600
MAX_CHECK_EXPLANATION = 400
MAX_EXCERPT = 320
PAGE_MAX = 20
MAX_TIMESTAMP = 18446744073709551615


def _expected(message: str):
    raise gl.vm.UserError(ERROR_EXPECTED + " " + message)


def _llm_error(message: str):
    raise gl.vm.UserError(ERROR_LLM + " " + message)


def _text(value, name: str, maximum: int, required: bool = True) -> str:
    if not isinstance(value, str):
        _expected(name + " must be a string")
    clean = value.strip()
    if required and not clean:
        _expected(name + " is required")
    if len(clean) > maximum:
        _expected(name + " exceeds " + str(maximum) + " characters")
    return clean


def _contains_excerpt(evidence: str, excerpt: str) -> bool:
    return bool(excerpt) and excerpt in evidence


def _validate_payload(payload_json: str) -> dict:
    payload_text = _text(payload_json, "payload_json", MAX_PAYLOAD)
    try:
        payload = json.loads(payload_text)
    except Exception:
        _expected("payload_json must be valid JSON")
    if not isinstance(payload, dict):
        _expected("payload_json must encode an object")
    raw_requirements = payload.get("requirements")
    if not isinstance(raw_requirements, list) or not raw_requirements:
        _expected("requirements must be a non-empty array")
    if len(raw_requirements) > MAX_REQUIREMENTS:
        _expected("requirements exceeds " + str(MAX_REQUIREMENTS) + " items")
    requirements = []
    seen = {}
    for index, item in enumerate(raw_requirements):
        if not isinstance(item, dict):
            _expected("each requirement must be an object")
        criterion_id = _text(item.get("id"), "requirement id", MAX_REQUEST_ID)
        criterion_text = _text(item.get("text"), "requirement text", MAX_REQUIREMENT_TEXT)
        if criterion_id in seen:
            _expected("requirement ids must be unique")
        seen[criterion_id] = True
        requirements.append({"id": criterion_id, "text": criterion_text, "position": index})
    evidence = _text(payload.get("evidence"), "evidence", MAX_EVIDENCE)
    context = _text(payload.get("context", ""), "context", MAX_CONTEXT, False)
    return {"requirements": requirements, "evidence": evidence, "context": context}

def _parse_assessment(raw, payload: dict) -> dict:
    if isinstance(raw, str):
        try:
            raw = json.loads(raw)
        except Exception:
            _llm_error("model returned invalid JSON")
    if not isinstance(raw, dict):
        _llm_error("model response must be an object")
    verdict = raw.get("verdict")
    confidence = raw.get("confidence")
    if verdict not in VERDICTS:
        _llm_error("model returned an invalid verdict")
    if confidence not in CONFIDENCE:
        _llm_error("model returned invalid confidence")
    explanation = _text(raw.get("explanation"), "explanation", MAX_EXPLANATION)
    raw_checks = raw.get("criteria")
    if not isinstance(raw_checks, list) or len(raw_checks) != len(payload["requirements"]):
        _llm_error("model must return one check per requirement")
    by_id = {}
    for check in raw_checks:
        if not isinstance(check, dict):
            _llm_error("criterion check must be an object")
        criterion_id = check.get("id")
        if criterion_id in by_id:
            _llm_error("criterion ids must be unique")
        status = check.get("status")
        if status not in VERDICTS:
            _llm_error("criterion status is invalid")
        check_explanation = _text(
            check.get("explanation"), "criterion explanation", MAX_CHECK_EXPLANATION
        )
        excerpt = _text(check.get("evidence_excerpt", ""), "evidence excerpt", MAX_EXCERPT, False)
        if status in ("pass", "partial") and not excerpt:
            _llm_error("pass and partial checks require a grounded evidence excerpt")
        if excerpt and not _contains_excerpt(payload["evidence"], excerpt):
            _llm_error("evidence excerpt must be an exact contiguous copy of the submitted evidence")
        by_id[criterion_id] = {
            "id": criterion_id,
            "status": status,
            "explanation": check_explanation,
            "evidenceExcerpt": excerpt,
        }
    checks = []
    statuses = []
    for requirement in payload["requirements"]:
        criterion_id = requirement["id"]
        if criterion_id not in by_id:
            _llm_error("model omitted a requirement")
        checks.append(by_id[criterion_id])
        statuses.append(by_id[criterion_id]["status"])
    guarded_verdict = "pass"
    if "fail" in statuses:
        guarded_verdict = "fail"
    elif "partial" in statuses:
        guarded_verdict = "partial"
    if verdict != guarded_verdict:
        _llm_error("overall verdict conflicts with criterion checks")
    return {
        "verdict": guarded_verdict,
        "confidence": confidence,
        "explanation": explanation,
        "criteria": checks,
    }


def _assess(payload: dict) -> dict:
    prompt = """You are BuildProof, a strict software implementation verifier.
Compare every requirement with only the supplied implementation evidence and optional context.
Do not use URLs, APIs, or outside facts. Missing evidence is not a pass.
Return JSON only: {"verdict":"pass|partial|fail","confidence":"low|medium|high","explanation":"grounded summary","criteria":[{"id":"exact input id","status":"pass|partial|fail","explanation":"grounded reason","evidence_excerpt":"exact contiguous excerpt copied from evidence; required for pass or partial, optional for fail"}]}.
Overall verdict must be fail if any criterion fails, partial if none fail and any is partial, otherwise pass.
REQUIREMENTS: """ + json.dumps(payload["requirements"], sort_keys=True) + "\nEVIDENCE: " + payload["evidence"] + "\nCONTEXT: " + payload["context"]
    raw = gl.nondet.exec_prompt(prompt, response_format="json")
    return _parse_assessment(raw, payload)


def _handle_leader_error(leaders_res, leader_fn) -> bool:
    leader_message = leaders_res.message if hasattr(leaders_res, "message") else ""
    try:
        leader_fn()
        return False
    except gl.vm.UserError as error:
        validator_message = error.message if hasattr(error, "message") else str(error)
        if validator_message.startswith(ERROR_EXPECTED):
            return validator_message == leader_message
        return False
    except Exception:
        return False


def _consensus_assessment(payload: dict) -> dict:
    def leader_fn():
        return _assess(payload)

    def validator_fn(leaders_res: gl.vm.Result) -> bool:
        if not isinstance(leaders_res, gl.vm.Return):
            return _handle_leader_error(leaders_res, leader_fn)
        validator = leader_fn()
        leader = leaders_res.calldata
        if not isinstance(leader, dict):
            return False
        if leader.get("verdict") != validator.get("verdict"):
            return False
        leader_checks = leader.get("criteria", [])
        validator_checks = validator.get("criteria", [])
        if len(leader_checks) != len(validator_checks):
            return False
        for index in range(len(leader_checks)):
            left = leader_checks[index]
            right = validator_checks[index]
            if left.get("id") != right.get("id") or left.get("status") != right.get("status"):
                return False
        confidence_distance = abs(
            CONFIDENCE.index(leader.get("confidence")) - CONFIDENCE.index(validator.get("confidence"))
        )
        return confidence_distance <= 1

    return gl.vm.run_nondet_unsafe(leader_fn, validator_fn)


class BuildProofContract(gl.Contract):
    results: TreeMap[str, str]
    result_order: DynArray[str]
    total_results: u256
    pass_results: u256
    partial_results: u256
    fail_results: u256

    def __init__(self):
        self.total_results = u256(0)
        self.pass_results = u256(0)
        self.partial_results = u256(0)
        self.fail_results = u256(0)

    def _key(self, sender: str, request_id: str) -> str:
        return sender.lower() + ":" + request_id

    @gl.public.write
    def submit_check(self, request_id: str, payload_json: str, now_ms: int) -> dict:
        clean_id = _text(request_id, "request_id", MAX_REQUEST_ID)
        if now_ms < 0 or now_ms > MAX_TIMESTAMP:
            _expected("now_ms is out of range")
        sender = gl.message.sender_address.as_hex
        key = self._key(sender, clean_id)
        if key in self.results:
            _expected("request_id already exists for this sender")
        payload = _validate_payload(payload_json)
        assessment = _consensus_assessment(payload)
        canonical = {
            "requestId": clean_id,
            "sender": sender,
            "verdict": assessment["verdict"],
            "confidence": assessment["confidence"],
            "criteria": assessment["criteria"],
            "explanation": assessment["explanation"],
            "evidenceExcerpts": [
                item["evidenceExcerpt"] for item in assessment["criteria"] if item["evidenceExcerpt"]
            ],
            "createdAt": now_ms,
        }
        encoded = json.dumps(canonical, sort_keys=True, separators=(",", ":"))
        self.results[key] = encoded
        self.result_order.append(key)
        self.total_results += u256(1)
        if canonical["verdict"] == "pass":
            self.pass_results += u256(1)
        elif canonical["verdict"] == "partial":
            self.partial_results += u256(1)
        else:
            self.fail_results += u256(1)
        return canonical

    @gl.public.view
    def get_result(self, request_id: str) -> dict:
        clean_id = _text(request_id, "request_id", MAX_REQUEST_ID)
        key = self._key(gl.message.sender_address.as_hex, clean_id)
        if key not in self.results:
            return {}
        return json.loads(self.results[key])

    @gl.public.view
    def get_results(self, offset: int, limit: int) -> list:
        if offset < 0:
            _expected("offset must be non-negative")
        if limit < 1 or limit > PAGE_MAX:
            _expected("limit must be between 1 and " + str(PAGE_MAX))
        output = []
        total = len(self.result_order)
        cursor = total - 1 - offset
        while cursor >= 0 and len(output) < limit:
            output.append(json.loads(self.results[self.result_order[cursor]]))
            cursor -= 1
        return output

    @gl.public.view
    def get_summary(self) -> dict:
        return {
            "total": int(self.total_results),
            "pass": int(self.pass_results),
            "partial": int(self.partial_results),
            "fail": int(self.fail_results),
        }
