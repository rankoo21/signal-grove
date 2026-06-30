// Shared data models for Signal Grove.
// These types are the contract between the UI, the store, and any GenLayer adapter
// (mock today, real on-chain tomorrow). Keep them stable.

export type SeedState =
  | "dormant"
  | "stirring"
  | "rooting"
  | "blooming"
  | "withered"
  | "archived";

export type Sensitivity = "quiet" | "balanced" | "hungry" | "wild";

export type SeedLanguage = "english" | "spanish" | "arabic" | "french" | "custom";

export type SignalCategory =
  | "builder"
  | "documentation"
  | "testnet"
  | "community"
  | "grants"
  | "ecosystem"
  | "technical"
  | "custom";

export type Lifespan =
  | "one-bloom"
  | "7-days"
  | "30-days"
  | "seasonal"
  | "permanent";

export type RootType =
  | "blog"
  | "docs"
  | "social"
  | "repository"
  | "manual"
  | "custom-url";

export type RootHealth = "fresh" | "quiet" | "clouded" | "broken" | "manual";

export interface VisualDNA {
  seedShape: number; // 0..1 morph factor
  innerColor: string; // hex
  pulseSpeed: number; // seconds per breath
  rootPattern: number; // 0..1 branching density
  bloomForm: number; // 0..1 petal openness style
  particleDensity: number; // 0..1
}

export interface Root {
  id: string;
  seedId: string;
  type: RootType;
  label: string;
  url: string;
  contentSnapshot: string;
  trustNote: string;
  health: RootHealth;
  active: boolean;
  lastCheckedAt: number | null;
}

export interface Bloom {
  id: string;
  seedId: string;
  title: string;
  whatSurfaced: string;
  sourceTrail: string;
  whyItMatches: string;
  suggestedNextMove: string;
  createdAt: number;
  preserved: boolean;
}

export interface Spore {
  id: string;
  bloomId: string;
  seedIntent: string;
  title: string;
  memoryText: string;
  sourceTrail: string;
  suggestedNextMove: string;
  preservedAt: number;
  language: SeedLanguage;
  categories: SignalCategory[];
  mockTxHash: string;
}

export interface Seed {
  id: string;
  owner: string;
  name: string;
  intent: string;
  sensitivity: Sensitivity;
  preferredLanguage: SeedLanguage;
  categories: SignalCategory[];
  lifespan: Lifespan;
  state: SeedState;
  createdAt: number;
  lastPulseAt: number | null;
  rootIds: string[];
  bloomIds: string[];
  visualDNA: VisualDNA;
}

// Result returned by a pulse, describing the state transition and any bloom.
export interface PulseResult {
  seedId: string;
  previousState: SeedState;
  nextState: SeedState;
  note: string;
  bloom?: Bloom;
}

// The adapter interface. mockAdapter and contractAdapter both implement this so
// the UI never knows or cares which one is live.
export interface GroveAdapter {
  readonly mode: "mock" | "contract";
  // Address of the active identity (the firefly). In contract mode this is the
  // burner key address or a connected wallet; in mock mode a synthetic address.
  getIdentityAddress(): string | null;
  // Optional browser-wallet support (contract mode only).
  hasInjectedWallet?(): boolean;
  connectWallet?(): Promise<string>;
  disconnectWallet?(): void;
  isUsingWallet?(): boolean;
  plantSeed(input: PlantSeedInput): Promise<Seed>;
  attachRoot(input: AttachRootInput): Promise<Root>;
  pulseSeed(seedId: string): Promise<PulseResult>;
  preserveBloom(bloomId: string): Promise<Spore>;
  witherSeed(seedId: string): Promise<Seed>;
  getSeed(seedId: string): Promise<Seed | null>;
  getSeeds(): Promise<Seed[]>;
  getRoots(seedId: string): Promise<Root[]>;
  getSpores(): Promise<Spore[]>;
}

export interface PlantSeedInput {
  owner: string;
  name: string;
  intent: string;
  sensitivity: Sensitivity;
  preferredLanguage: SeedLanguage;
  categories: SignalCategory[];
  lifespan: Lifespan;
}

export interface AttachRootInput {
  seedId: string;
  type: RootType;
  label: string;
  url: string;
  contentSnapshot: string;
  trustNote: string;
}
