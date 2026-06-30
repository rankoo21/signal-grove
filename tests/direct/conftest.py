import json
import os
from pathlib import Path

import pytest

# Workaround for a gltest bug on Windows: the direct-mode loader redirects stdin
# to a temp file with os.dup2, then immediately calls os.unlink on it. Windows
# refuses to delete a file that is still open (the descriptor is now stdin),
# raising PermissionError [WinError 32]. We tolerate that single case; the temp
# file is harmless and gets reclaimed when the run ends.
_real_unlink = os.unlink


def _tolerant_unlink(path, *args, **kwargs):
    try:
        return _real_unlink(path, *args, **kwargs)
    except PermissionError:
        return None


os.unlink = _tolerant_unlink

CONTRACT = str(Path(__file__).resolve().parents[2] / "contracts" / "SignalGroveContract.py")


def bloom_llm_response() -> str:
    """A grounded, blooming interpretation the leader would return."""
    return json.dumps(
        {
            "resonance": 88,
            "next_state": "blooming",
            "matched_categories": ["builder", "testnet", "ecosystem"],
            "title": "Builder opportunity surfaced",
            "what_surfaced": "A new builder opportunity and testnet task track is open.",
            "why_it_matches": "The source mentions builders, a bounty, and testnet activity.",
            "suggested_next_move": "Prepare a project concept before the window closes.",
        }
    )


def rooting_llm_response() -> str:
    """A no-signal interpretation."""
    return json.dumps(
        {
            "resonance": 5,
            "next_state": "rooting",
            "matched_categories": [],
            "title": "",
            "what_surfaced": "",
            "why_it_matches": "",
            "suggested_next_move": "",
        }
    )


@pytest.fixture
def deploy(direct_deploy, direct_vm, direct_alice):
    """Deploy the grove contract with alice as owner and a sane default mock."""
    contract = direct_deploy(CONTRACT)
    direct_vm.sender = direct_alice
    # Default LLM mock: no signal, so tests that want a bloom opt in explicitly.
    direct_vm.mock_llm(r".*", rooting_llm_response())
    return contract
