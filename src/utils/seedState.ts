import type {
  Lifespan,
  Root,
  Seed,
  SeedState,
  Sensitivity,
  SignalCategory,
} from "@/lib/genlayer/types";

// Human-facing copy for each state. No status-badge language: these read like
// living descriptions of a plant.
export const STATE_COPY: Record<SeedState, { label: string; whisper: string }> = {
  dormant: { label: "Dormant", whisper: "Closed seed. Slow breathing." },
  stirring: { label: "Stirring", whisper: "Something is moving under the soil." },
  rooting: { label: "Rooting", whisper: "Roots are reaching toward the source." },
  blooming: { label: "Blooming", whisper: "A bloom has opened." },
  withered: { label: "Withered", whisper: "Returned softly to dust." },
  archived: { label: "Archived", whisper: "Kept as spore memory." },
};

// Allowed transitions for the living state machine.
const TRANSITIONS: Record<SeedState, SeedState[]> = {
  dormant: ["stirring", "rooting", "withered"],
  stirring: ["rooting", "blooming", "dormant", "withered"],
  rooting: ["blooming", "dormant", "withered"],
  blooming: ["archived", "withered", "rooting"],
  withered: [],
  archived: [],
};

export function canTransition(from: SeedState, to: SeedState): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

// Maps category enum to the words a source snapshot might contain.
const CATEGORY_KEYWORDS: Record<SignalCategory, string[]> = {
  builder: ["builder", "build", "hackathon", "bounty", "submission", "opportunity"],
  documentation: ["docs", "documentation", "guide", "reference", "genvm", "deploy"],
  testnet: ["testnet", "bradbury", "studionet", "faucet", "network", "task"],
  community: ["community", "event", "meetup", "ambassador", "initiative"],
  grants: ["grant", "bounty", "funding", "prize", "reward"],
  ecosystem: ["ecosystem", "partner", "integration", "release", "launch"],
  technical: ["release", "sdk", "tooling", "version", "upgrade", "api"],
  custom: [],
};

export interface MatchResult {
  score: number; // 0..1 strength of overlap
  matched: SignalCategory[];
}

// Deterministic keyword overlap. This mirrors the deterministic backstop in the
// contract: even when the LLM does the reasoning on-chain, the UI can preview a
// plausible match locally in mock mode.
export function scoreMatch(
  text: string,
  categories: SignalCategory[],
  customPhrase?: string,
): MatchResult {
  const haystack = text.toLowerCase();
  const matched: SignalCategory[] = [];

  for (const cat of categories) {
    const keywords = [...CATEGORY_KEYWORDS[cat]];
    if (cat === "custom" && customPhrase) {
      keywords.push(...customPhrase.toLowerCase().split(/\s+/).filter(Boolean));
    }
    if (keywords.some((k) => k && haystack.includes(k))) {
      matched.push(cat);
    }
  }

  const score = categories.length === 0 ? 0 : matched.length / categories.length;
  return { score, matched };
}

const SENSITIVITY_THRESHOLD: Record<Sensitivity, number> = {
  quiet: 0.8,
  balanced: 0.55,
  hungry: 0.35,
  wild: 0.18,
};

const LIFESPAN_MS: Record<Lifespan, number | null> = {
  "one-bloom": null, // expires after first bloom, handled separately
  "7-days": 7 * 24 * 60 * 60 * 1000,
  "30-days": 30 * 24 * 60 * 60 * 1000,
  seasonal: 90 * 24 * 60 * 60 * 1000,
  permanent: null,
};

export function isExpired(seed: Seed, now: number): boolean {
  const span = LIFESPAN_MS[seed.lifespan];
  if (span === null) return false;
  return now - seed.createdAt > span;
}

// Decide the next state from current state + active roots + their snapshots.
// This is the mock pulse brain. The real contract performs the equivalent
// interpretation through validator consensus.
export function decidePulse(
  seed: Seed,
  roots: Root[],
  now: number,
): { nextState: SeedState; strongestMatch: MatchResult; note: string } {
  if (isExpired(seed, now)) {
    return {
      nextState: "withered",
      strongestMatch: { score: 0, matched: [] },
      note: "This seed reached the end of its lifespan and returned to the soil.",
    };
  }

  const activeRoots = roots.filter((r) => r.active && r.health !== "broken");
  if (activeRoots.length === 0) {
    return {
      nextState: "dormant",
      strongestMatch: { score: 0, matched: [] },
      note: "No living roots are feeding this seed. It rests in dormancy.",
    };
  }

  let best: MatchResult = { score: 0, matched: [] };
  for (const root of activeRoots) {
    const m = scoreMatch(root.contentSnapshot, seed.categories);
    if (m.score > best.score) best = m;
  }

  const threshold = SENSITIVITY_THRESHOLD[seed.sensitivity];

  if (best.score >= threshold && best.matched.length > 0) {
    return {
      nextState: "blooming",
      strongestMatch: best,
      note: "The signal resonated with your intent. A bloom is opening.",
    };
  }

  if (best.score > 0) {
    return {
      nextState: "stirring",
      strongestMatch: best,
      note: "A partial trace surfaced. The seed is stirring.",
    };
  }

  return {
    nextState: "rooting",
    strongestMatch: best,
    note: "Roots are active but nothing has surfaced yet.",
  };
}
