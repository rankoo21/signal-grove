# Signal Grove Test Report

## Contract: SignalGroveContract.py

Lint: passed (genvm-lint check). 11 methods, 6 view, 5 write, 0 ctor params.

## Direct mode tests (tests/direct/test_signal_grove.py)

Command: `python -m pytest tests/direct/ -p gltest_direct -q`

Result: 18 passed.

Coverage:
- plant_seed: creates a dormant seed, derives visual DNA, requires an intent,
  requires at least one category, rejects an unknown sensitivity.
- attach_root: moves a dormant seed to rooting, owner-only guard, infers broken
  health from a non-http url.
- pulse_seed: requires a living root, blooms on a strong signal, refuses to
  bloom when category keywords are absent even if the model proposes blooming
  (deterministic backstop), returns rooting on no signal, owner-only guard,
  rejects pulsing a withered seed.
- preserve_bloom: creates a spore, archives the seed, snapshots categories,
  rejects a double preserve.
- wither_seed: withers a seed, owner-only guard.
- views: get_seeds paged newest-first, get_summary counts.

LLM responses are mocked in direct mode (the validator function is not
exercised there; consensus is verified live below).

## Live integration (studionet)

Contract address: 0x5ba9fB3600667559e57641931750B70F328CDb48
Network: studionet (gasless)

Command: `node scripts/smoke.mjs`

Verified end-to-end against real validators:
1. plant_seed -> seed_0, state dormant.
2. attach_root -> root_0, health fresh.
3. pulse_seed -> validators agreed, seed transitioned to blooming, bloom_0
   created (the AI consensus path).
4. Reads: get_seed, get_seeds, get_roots, get_summary all return correctly;
   visual DNA integers rescale to 0..1 in the frontend adapter.

## Notes

- GenVM calldata does not serialize Python floats in return values. Visual DNA
  is stored and returned as scaled integers; the frontend adapter rescales.
- Time is passed in from the caller (now_ms) so the value is deterministic
  across validators rather than read from a nondeterministic clock.
