import {
  AttachRootInput,
  Bloom,
  GroveAdapter,
  PlantSeedInput,
  PulseResult,
  Root,
  RootHealth,
  Seed,
  Spore,
} from "./types";
import { deriveVisualDNA } from "./visualDNA";
import { decidePulse } from "@/utils/seedState";
import { makeId, mockTxHash } from "@/utils/format";
import { pickBloomTemplate } from "@/data/mockBlooms";

const MOCK_OWNER = "0xF1re_fly_demo_grove_owner_0000";

// Health inferred from a root's content and type. Manual roots are paper-like,
// empty content is clouded, broken urls are broken, otherwise fresh.
function inferHealth(type: Root["type"], url: string, content: string): RootHealth {
  if (type === "manual") return "manual";
  if (!content.trim()) return "clouded";
  if (url && !/^https?:\/\//.test(url)) return "broken";
  return "fresh";
}

// In-memory store. Mirrors what the contract would hold authoritatively.
class MockStore {
  seeds = new Map<string, Seed>();
  roots = new Map<string, Root>();
  blooms = new Map<string, Bloom>();
  spores = new Map<string, Spore>();
  seeded = false;
}

const store = new MockStore();

function seedDefaults() {
  if (store.seeded) return;
  store.seeded = true;

  const presets: Array<Omit<PlantSeedInput, "owner">> = [
    {
      name: "GenLayer Builder Watch",
      intent:
        "Wake when GenLayer announces a new builder opportunity, bounty, testnet task, or hackathon.",
      sensitivity: "hungry",
      preferredLanguage: "english",
      categories: ["builder", "testnet", "ecosystem"],
      lifespan: "permanent",
    },
    {
      name: "Intelligent Contract Docs Watch",
      intent:
        "Stir when documentation about Intelligent Contracts, GenVM, or contract deployment changes.",
      sensitivity: "balanced",
      preferredLanguage: "english",
      categories: ["documentation", "technical"],
      lifespan: "30-days",
    },
    {
      name: "Spanish Community Signal",
      intent:
        "Bloom when there is a public opportunity for Spanish-speaking GenLayer community content.",
      sensitivity: "balanced",
      preferredLanguage: "spanish",
      categories: ["community", "grants"],
      lifespan: "seasonal",
    },
    {
      name: "Arabic Community Signal",
      intent:
        "Bloom when there is a public opportunity for Arabic educational content, quizzes, events, or onboarding.",
      sensitivity: "quiet",
      preferredLanguage: "arabic",
      categories: ["community", "ecosystem"],
      lifespan: "seasonal",
    },
    {
      name: "Ecosystem Release Watch",
      intent:
        "Wake when the ecosystem announces technical releases, new tooling, or developer resources.",
      sensitivity: "hungry",
      preferredLanguage: "english",
      categories: ["technical", "ecosystem"],
      lifespan: "permanent",
    },
  ];

  const states: Seed["state"][] = ["dormant", "rooting", "stirring", "dormant", "rooting"];

  presets.forEach((preset, i) => {
    const id = makeId("seed");
    const now = Date.now() - (presets.length - i) * 1000 * 60 * 60;
    const seed: Seed = {
      id,
      owner: MOCK_OWNER,
      ...preset,
      state: states[i],
      createdAt: now,
      lastPulseAt: i % 2 === 0 ? now + 1000 * 60 * 30 : null,
      rootIds: [],
      bloomIds: [],
      visualDNA: deriveVisualDNA(preset.preferredLanguage, preset.sensitivity),
    };
    store.seeds.set(id, seed);
  });
}

// Small artificial latency so transitions feel physical, not instant.
function delay<T>(value: T, ms = 420): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export class MockAdapter implements GroveAdapter {
  readonly mode = "mock" as const;

  constructor() {
    seedDefaults();
  }

  getIdentityAddress(): string | null {
    return MOCK_OWNER;
  }

  async plantSeed(input: PlantSeedInput): Promise<Seed> {
    const id = makeId("seed");
    const seed: Seed = {
      id,
      owner: input.owner || MOCK_OWNER,
      name: input.name,
      intent: input.intent,
      sensitivity: input.sensitivity,
      preferredLanguage: input.preferredLanguage,
      categories: input.categories,
      lifespan: input.lifespan,
      state: "dormant",
      createdAt: Date.now(),
      lastPulseAt: null,
      rootIds: [],
      bloomIds: [],
      visualDNA: deriveVisualDNA(input.preferredLanguage, input.sensitivity),
    };
    store.seeds.set(id, seed);
    return delay(seed);
  }

  async attachRoot(input: AttachRootInput): Promise<Root> {
    const seed = store.seeds.get(input.seedId);
    if (!seed) throw new Error("The seed could not be found in the soil.");

    const id = makeId("root");
    const root: Root = {
      id,
      seedId: input.seedId,
      type: input.type,
      label: input.label,
      url: input.url,
      contentSnapshot: input.contentSnapshot,
      trustNote: input.trustNote,
      health: inferHealth(input.type, input.url, input.contentSnapshot),
      active: true,
      lastCheckedAt: Date.now(),
    };
    store.roots.set(id, root);
    seed.rootIds.push(id);
    // Attaching a living root nudges a dormant seed into rooting.
    if (seed.state === "dormant" && root.health !== "broken") {
      seed.state = "rooting";
    }
    return delay(root);
  }

  async pulseSeed(seedId: string): Promise<PulseResult> {
    const seed = store.seeds.get(seedId);
    if (!seed) throw new Error("The grove could not pulse this seed.");

    const roots = seed.rootIds
      .map((rid) => store.roots.get(rid))
      .filter((r): r is Root => Boolean(r));

    if (roots.length === 0) {
      throw new Error("Attach at least one root before pulsing.");
    }

    const now = Date.now();
    const previousState = seed.state;
    const decision = decidePulse(seed, roots, now);

    seed.lastPulseAt = now;
    seed.state = decision.nextState;

    // Refresh root timestamps to feel alive.
    for (const r of roots) r.lastCheckedAt = now;

    const result: PulseResult = {
      seedId,
      previousState,
      nextState: decision.nextState,
      note: decision.note,
    };

    if (decision.nextState === "blooming") {
      const tpl = pickBloomTemplate(decision.strongestMatch.matched);
      const sourceTrail = roots
        .filter((r) => r.active)
        .map((r) => r.label)
        .join(" \u00b7 ");
      const bloom: Bloom = {
        id: makeId("bloom"),
        seedId,
        title: tpl.title,
        whatSurfaced: tpl.whatSurfaced,
        sourceTrail: sourceTrail || "Manual note",
        whyItMatches: tpl.whyItMatches,
        suggestedNextMove: tpl.suggestedNextMove,
        createdAt: now,
        preserved: false,
      };
      store.blooms.set(bloom.id, bloom);
      seed.bloomIds.push(bloom.id);
      result.bloom = bloom;
    }

    return delay(result);
  }

  async preserveBloom(bloomId: string): Promise<Spore> {
    const bloom = store.blooms.get(bloomId);
    if (!bloom) throw new Error("That bloom has already faded.");
    const seed = store.seeds.get(bloom.seedId);

    bloom.preserved = true;
    if (seed) seed.state = "archived";

    const spore: Spore = {
      id: makeId("spore"),
      bloomId,
      seedIntent: seed?.intent ?? "",
      title: bloom.title,
      memoryText: bloom.whatSurfaced,
      sourceTrail: bloom.sourceTrail,
      suggestedNextMove: bloom.suggestedNextMove,
      preservedAt: Date.now(),
      language: seed?.preferredLanguage ?? "english",
      categories: seed?.categories ?? [],
      mockTxHash: mockTxHash(),
    };
    store.spores.set(spore.id, spore);
    return delay(spore);
  }

  async witherSeed(seedId: string): Promise<Seed> {
    const seed = store.seeds.get(seedId);
    if (!seed) throw new Error("The seed could not be found in the soil.");
    seed.state = "withered";
    return delay(seed);
  }

  async getSeed(seedId: string): Promise<Seed | null> {
    return delay(store.seeds.get(seedId) ?? null, 80);
  }

  async getSeeds(): Promise<Seed[]> {
    return delay(
      [...store.seeds.values()].sort((a, b) => b.createdAt - a.createdAt),
      80,
    );
  }

  async getRoots(seedId: string): Promise<Root[]> {
    const seed = store.seeds.get(seedId);
    if (!seed) return delay([], 60);
    return delay(
      seed.rootIds.map((id) => store.roots.get(id)).filter((r): r is Root => Boolean(r)),
      60,
    );
  }

  async getSpores(): Promise<Spore[]> {
    return delay(
      [...store.spores.values()].sort((a, b) => b.preservedAt - a.preservedAt),
      80,
    );
  }
}
