# Signal Grove

Plant an intent. Let GenLayer sense the world.

Signal Grove is a living, spatial GenLayer dApp. You plant a "seed" that carries
a natural-language watch intent (for example, wake me when a builder
opportunity or testnet task appears). You grow "roots" that feed the seed
content snapshots from public sources. When you "pulse" a seed, GenLayer
validators independently interpret whether the current sources resonate with
your intent and agree on the seed's next living state. A strong, agreed signal
opens a "bloom"; you can keep a bloom forever as a "spore".

The Intelligent Contract owns all authoritative state. There is no traditional
backend.

## Why GenLayer is load-bearing

The core transition, does this source content meaningfully match this watch
intent, is a subjective semantic judgment. Multiple validators reproduce the
interpretation and must agree before the grove's shared state changes. The
contract keeps the model honest with deterministic guards:

- The model returns only a numeric `resonance` (0 to 100). The contract derives
  the state from that score plus a keyword backstop, so a bloom is reproducible
  and cannot be faked by a single node.
- A seed only blooms when the agreed resonance clears the seed's sensitivity
  threshold and a real keyword trace exists in the sources.
- Validators must agree on whether resonance clears the threshold and that the
  two scores are close, so a constant guess fails consensus.

## Architecture

- `contracts/SignalGroveContract.py` - the GenVM Python Intelligent Contract.
  Owns seeds, roots, blooms, spores, the living state machine, the consensus
  pulse, and paged view methods.
- `src/lib/genlayer/` - the adapter layer. `contractAdapter.ts` talks to the
  deployed contract through `genlayer-js`; `mockAdapter.ts` is a local preview
  that implements the same interface. `index.ts` selects between them from env.
- `src/components/` - the spatial interface: the Grove, Dark Soil, Seed
  Sculptor, Root Chamber, Bloom Theater, Spore Archive, Sun Dial, Rootline.
- `src/store/useGroveStore.ts` - client state and lifecycle actions.

## Live deployment

- Network: Testnet Bradbury
- Contract: `0x7fACa919C98Ea21026C81bb635c0017d3Acc1565`

## Run locally

```bash
npm install
npm run dev
```

By default the app runs in mock mode, no configuration needed, so you can
explore the full interface offline.

### Connect to the live contract

Create `.env.local`:

```
NEXT_PUBLIC_GROVE_MODE=contract
NEXT_PUBLIC_GROVE_CONTRACT=0x7fACa919C98Ea21026C81bb635c0017d3Acc1565
NEXT_PUBLIC_GROVE_NETWORK=bradbury
```

The identity (the "firefly") is a burner key generated in the browser and kept
in localStorage. Bradbury is a testnet; fund the key from the faucet if you want
to write.

## Contract development

```bash
# Lint
genvm-lint check contracts/SignalGroveContract.py

# Fast direct tests (no network)
python -m pytest tests/direct/ -p gltest_direct -q

# Deploy (reads .env.deploy, never commit that file)
node scripts/deploy.mjs

# Live end-to-end check against the deployed contract
node scripts/livecheck.mjs
```

See `tests/TEST_REPORT.md` for the test summary.

## Build for hosting

```bash
npm run build
```

Produces a static site in `out/` suitable for Cloudflare Pages or any static
host.

## Security notes

- The deploy private key lives only in `.env.deploy`, which is gitignored and
  never bundled into the frontend.
- The contract does not take deposits, hold value, or transfer funds. Users pay
  only network fees on a testnet.
