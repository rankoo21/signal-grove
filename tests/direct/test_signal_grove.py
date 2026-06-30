import json

from conftest import bloom_llm_response, rooting_llm_response


# ---------------------------------------------------------------------------
# plant_seed
# ---------------------------------------------------------------------------

def test_plant_seed_creates_dormant_seed(deploy, direct_vm):
    seed_id = deploy.plant_seed(
        "Builder Watch",
        "Wake when a builder opportunity appears.",
        "balanced",
        "english",
        ["builder", "testnet"],
        "30-days",
        1000,
    )
    seed = deploy.get_seed(seed_id)
    assert seed is not None
    assert seed["state"] == "dormant"
    assert seed["name"] == "Builder Watch"
    assert seed["categories"] == ["builder", "testnet"]
    assert seed["lastPulseAt"] is None
    # Visual DNA mirrors the frontend derivation.
    assert seed["visualDNA"]["innerColor"] == "#7CFFB2"


def test_plant_seed_requires_intent(deploy, direct_vm):
    with direct_vm.expect_revert("The seed needs an intent"):
        deploy.plant_seed("No Intent", "   ", "balanced", "english", ["builder"], "30-days", 0)


def test_plant_seed_requires_a_category(deploy, direct_vm):
    with direct_vm.expect_revert("at least one signal category"):
        deploy.plant_seed("Empty", "watch things", "balanced", "english", [], "30-days", 0)


def test_plant_seed_rejects_bad_sensitivity(deploy, direct_vm):
    with direct_vm.expect_revert("Unknown sensitivity"):
        deploy.plant_seed("Bad", "watch things", "loud", "english", ["builder"], "30-days", 0)


# ---------------------------------------------------------------------------
# attach_root
# ---------------------------------------------------------------------------

def test_attach_root_moves_dormant_to_rooting(deploy):
    seed_id = deploy.plant_seed(
        "Docs Watch", "watch docs", "balanced", "english", ["documentation"], "30-days", 1000
    )
    root_id = deploy.attach_root(
        seed_id,
        "docs",
        "Docs snapshot",
        "https://example.org/docs",
        "Documentation about genvm deploy flow updated.",
        "versioned snapshot",
        2000,
    )
    seed = deploy.get_seed(seed_id)
    assert seed["state"] == "rooting"
    assert root_id in seed["rootIds"]
    roots = deploy.get_roots(seed_id)
    assert roots[0]["health"] == "fresh"


def test_attach_root_only_owner(deploy, direct_vm, direct_bob):
    seed_id = deploy.plant_seed(
        "Mine", "watch", "balanced", "english", ["builder"], "30-days", 1000
    )
    direct_vm.sender = direct_bob
    with direct_vm.expect_revert("Only the seed owner"):
        deploy.attach_root(seed_id, "blog", "x", "https://x.org", "content", "note", 2000)


def test_attach_root_infers_broken_health(deploy):
    seed_id = deploy.plant_seed(
        "Watch", "watch", "balanced", "english", ["builder"], "30-days", 1000
    )
    deploy.attach_root(seed_id, "blog", "bad url", "not-a-url", "some content", "note", 2000)
    roots = deploy.get_roots(seed_id)
    assert roots[0]["health"] == "broken"


# ---------------------------------------------------------------------------
# pulse_seed
# ---------------------------------------------------------------------------

def test_pulse_requires_a_living_root(deploy, direct_vm):
    seed_id = deploy.plant_seed(
        "Watch", "watch", "balanced", "english", ["builder"], "30-days", 1000
    )
    with direct_vm.expect_revert("at least one living root"):
        deploy.pulse_seed(seed_id, 3000)


def test_pulse_blooms_on_strong_signal(deploy, direct_vm):
    direct_vm.clear_mocks()
    direct_vm.mock_llm(r".*", bloom_llm_response())

    seed_id = deploy.plant_seed(
        "Builder Watch",
        "Wake when a builder opportunity or testnet task appears.",
        "hungry",
        "english",
        ["builder", "testnet", "ecosystem"],
        "permanent",
        1000,
    )
    deploy.attach_root(
        seed_id,
        "blog",
        "Update stream",
        "https://example.org/updates",
        "A new builder opportunity is open with a testnet task track and a bounty for ecosystem projects.",
        "primary source",
        2000,
    )
    result = deploy.pulse_seed(seed_id, 3000)
    assert result["nextState"] == "blooming"
    assert result["bloomId"] is not None

    seed = deploy.get_seed(seed_id)
    assert seed["state"] == "blooming"
    assert seed["lastPulseAt"] == 3000

    bloom = deploy.get_bloom(result["bloomId"])
    assert bloom["title"] != ""
    assert bloom["preserved"] is False


def test_pulse_will_not_bloom_when_keywords_absent(deploy, direct_vm):
    # Even if the model claims blooming, the deterministic backstop blocks it
    # when no category keywords appear in the source.
    direct_vm.clear_mocks()
    direct_vm.mock_llm(r".*", bloom_llm_response())

    seed_id = deploy.plant_seed(
        "Builder Watch",
        "Wake on builder opportunities.",
        "quiet",
        "english",
        ["builder"],
        "permanent",
        1000,
    )
    deploy.attach_root(
        seed_id,
        "social",
        "Noise",
        "https://example.org/social",
        "Just some unrelated chatter about the weather today.",
        "low signal",
        2000,
    )
    result = deploy.pulse_seed(seed_id, 3000)
    assert result["nextState"] != "blooming"
    assert result["bloomId"] is None


def test_pulse_rooting_when_no_signal(deploy, direct_vm):
    direct_vm.clear_mocks()
    direct_vm.mock_llm(r".*", rooting_llm_response())

    seed_id = deploy.plant_seed(
        "Watch", "watch builder", "balanced", "english", ["builder"], "permanent", 1000
    )
    deploy.attach_root(
        seed_id, "blog", "x", "https://x.org", "nothing relevant here at all", "note", 2000
    )
    result = deploy.pulse_seed(seed_id, 3000)
    assert result["nextState"] == "rooting"
    assert result["bloomId"] is None


# ---------------------------------------------------------------------------
# preserve_bloom + spores
# ---------------------------------------------------------------------------

def test_preserve_bloom_creates_spore_and_archives(deploy, direct_vm):
    direct_vm.clear_mocks()
    direct_vm.mock_llm(r".*", bloom_llm_response())

    seed_id = deploy.plant_seed(
        "Builder Watch",
        "Wake when a builder opportunity or testnet task appears.",
        "hungry",
        "english",
        ["builder", "testnet"],
        "permanent",
        1000,
    )
    deploy.attach_root(
        seed_id,
        "blog",
        "Update stream",
        "https://example.org/updates",
        "A new builder opportunity is open with a testnet task track and a bounty.",
        "primary source",
        2000,
    )
    result = deploy.pulse_seed(seed_id, 3000)
    bloom_id = result["bloomId"]

    spore_id = deploy.preserve_bloom(bloom_id, "0xdeadbeef", 4000)
    assert spore_id is not None

    seed = deploy.get_seed(seed_id)
    assert seed["state"] == "archived"

    spores = deploy.get_spores(0, 20)
    assert len(spores) == 1
    assert spores[0]["bloomId"] == bloom_id
    assert spores[0]["categories"] == ["builder", "testnet"]
    assert spores[0]["mockTxHash"] == "0xdeadbeef"


def test_preserve_twice_fails(deploy, direct_vm):
    direct_vm.clear_mocks()
    direct_vm.mock_llm(r".*", bloom_llm_response())

    seed_id = deploy.plant_seed(
        "Builder Watch", "Wake on builder opportunity and testnet.", "hungry",
        "english", ["builder", "testnet"], "permanent", 1000,
    )
    deploy.attach_root(
        seed_id, "blog", "Update", "https://example.org/u",
        "A new builder opportunity is open with a testnet task and bounty.", "src", 2000,
    )
    bloom_id = deploy.pulse_seed(seed_id, 3000)["bloomId"]
    deploy.preserve_bloom(bloom_id, "0x1", 4000)
    with direct_vm.expect_revert("already kept as a spore"):
        deploy.preserve_bloom(bloom_id, "0x2", 5000)


# ---------------------------------------------------------------------------
# wither
# ---------------------------------------------------------------------------

def test_wither_seed(deploy, direct_vm):
    seed_id = deploy.plant_seed(
        "Watch", "watch", "balanced", "english", ["builder"], "30-days", 1000
    )
    deploy.wither_seed(seed_id)
    assert deploy.get_seed(seed_id)["state"] == "withered"


def test_wither_only_owner(deploy, direct_vm, direct_bob):
    seed_id = deploy.plant_seed(
        "Watch", "watch", "balanced", "english", ["builder"], "30-days", 1000
    )
    direct_vm.sender = direct_bob
    with direct_vm.expect_revert("Only the seed owner"):
        deploy.wither_seed(seed_id)


def test_cannot_pulse_withered_seed(deploy, direct_vm):
    seed_id = deploy.plant_seed(
        "Watch", "watch", "balanced", "english", ["builder"], "30-days", 1000
    )
    deploy.attach_root(seed_id, "blog", "x", "https://x.org", "builder content", "n", 2000)
    deploy.wither_seed(seed_id)
    with direct_vm.expect_revert("no longer living"):
        deploy.pulse_seed(seed_id, 3000)


# ---------------------------------------------------------------------------
# paged views + summary
# ---------------------------------------------------------------------------

def test_get_seeds_paged_newest_first(deploy):
    ids = []
    for i in range(3):
        ids.append(
            deploy.plant_seed(
                f"Seed {i}", f"watch {i}", "balanced", "english", ["builder"], "30-days", 1000 + i
            )
        )
    seeds = deploy.get_seeds(0, 20)
    assert len(seeds) == 3
    # Newest first.
    assert seeds[0]["id"] == ids[-1]


def test_summary_counts(deploy, direct_vm):
    direct_vm.clear_mocks()
    direct_vm.mock_llm(r".*", bloom_llm_response())
    seed_id = deploy.plant_seed(
        "Builder Watch", "Wake on builder opportunity and testnet.", "hungry",
        "english", ["builder", "testnet"], "permanent", 1000,
    )
    deploy.attach_root(
        seed_id, "blog", "Update", "https://example.org/u",
        "A new builder opportunity is open with a testnet task and bounty.", "src", 2000,
    )
    deploy.pulse_seed(seed_id, 3000)

    summary = deploy.get_summary()
    assert summary["seeds"] == 1
    assert summary["roots"] == 1
    assert summary["blooms"] == 1
