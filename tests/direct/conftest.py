import json
import os
from pathlib import Path

import pytest

_real_unlink = os.unlink


def _tolerant_unlink(path, *args, **kwargs):
    try:
        return _real_unlink(path, *args, **kwargs)
    except PermissionError:
        return None


os.unlink = _tolerant_unlink
CONTRACT = str(Path(__file__).resolve().parents[2] / "contracts" / "BuildProofContract.py")


def model_response(verdict="pass", confidence="high", statuses=None, excerpts=None):
    statuses = statuses or [verdict]
    excerpts = excerpts or ["Automated tests pass"] * len(statuses)
    return json.dumps(
        {
            "verdict": verdict,
            "confidence": confidence,
            "explanation": "The evidence was checked against every stated requirement.",
            "criteria": [
                {
                    "id": f"criterion-{index + 1}",
                    "status": status,
                    "explanation": "The submitted evidence supports this assessment.",
                    "evidence_excerpt": excerpts[index],
                }
                for index, status in enumerate(statuses)
            ],
        }
    )


def payload(requirements=None, evidence="Automated tests pass for the production build.", context=""):
    requirements = requirements or ["The production build must pass automated tests."]
    return json.dumps(
        {
            "requirements": [
                {"id": f"criterion-{index + 1}", "text": text}
                for index, text in enumerate(requirements)
            ],
            "evidence": evidence,
            "context": context,
        }
    )


@pytest.fixture
def deploy(direct_deploy, direct_vm, direct_alice):
    contract = direct_deploy(CONTRACT)
    direct_vm.sender = direct_alice
    direct_vm.mock_llm(r".*", model_response())
    return contract
