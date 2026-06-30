import { createClient, createAccount, generatePrivateKey } from "genlayer-js";
import { studionet, testnetBradbury, localnet } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";
import type {
  AttachRootInput,
  Bloom,
  GroveAdapter,
  PlantSeedInput,
  PulseResult,
  Root,
  Seed,
  SeedState,
  Spore,
} from "./types";

// Real GenLayer adapter. Implements the exact same GroveAdapter interface as the
// mock, so swapping it in does not touch a single line of UI code.
//
// To go live:
//   1. Deploy contracts/SignalGroveContract.py (see scripts/deploy.mjs).
//   2. Set NEXT_PUBLIC_GROVE_MODE=contract and NEXT_PUBLIC_GROVE_CONTRACT=0x...
//   3. Optionally set NEXT_PUBLIC_GROVE_NETWORK (studionet | bradbury | localnet).
//
// Wallet model: studionet is gasless, so the "firefly" is a burner identity. A
// private key is generated in the browser and kept in localStorage. No secret is
// ever bundled. The deploy key in .env.deploy is server-side only.

type AnyClient = ReturnType<typeof createClient>;

const ACCEPTED = TransactionStatus.ACCEPTED;
const BURNER_KEY_STORAGE = "signal-grove.firefly.key";

export interface ContractAdapterConfig {
  contractAddress: string;
  network?: string;
}

function pickChain(network?: string) {
  switch ((network ?? "studionet").toLowerCase()) {
    case "bradbury":
    case "testnet-bradbury":
    case "testnetbradbury":
      return testnetBradbury;
    case "localnet":
      return localnet;
    case "studionet":
    default:
      return studionet;
  }
}

// Recursively turn Maps (genlayer calldata) into plain objects so the UI can
// read fields with dot access regardless of how the value was decoded.
function toPlain(value: unknown): any {
  if (value instanceof Map) {
    const obj: Record<string, unknown> = {};
    for (const [k, v] of value.entries()) obj[String(k)] = toPlain(v);
    return obj;
  }
  if (Array.isArray(value)) return value.map(toPlain);
  if (typeof value === "bigint") return Number(value);
  return value;
}

export class ContractAdapter implements GroveAdapter {
  readonly mode = "contract" as const;
  private readonly config: ContractAdapterConfig;
  private readonly chain: ReturnType<typeof pickChain>;
  private client: AnyClient | null = null;
  private account: ReturnType<typeof createAccount> | null = null;

  constructor(config: ContractAdapterConfig) {
    this.config = config;
    this.chain = pickChain(config.network);
  }

  // -- identity (the firefly) -----------------------------------------

  private loadBurnerKey(): `0x${string}` {
    if (typeof window !== "undefined") {
      const existing = window.localStorage.getItem(BURNER_KEY_STORAGE);
      if (existing) return existing as `0x${string}`;
      const fresh = generatePrivateKey();
      window.localStorage.setItem(BURNER_KEY_STORAGE, fresh);
      return fresh;
    }
    // Server render: ephemeral key, only used for read-only client creation.
    return generatePrivateKey();
  }

  private getClient(): AnyClient {
    if (this.client) return this.client;
    this.account = createAccount(this.loadBurnerKey());
    this.client = createClient({ chain: this.chain, account: this.account });
    return this.client;
  }

  /** Address of the active firefly identity, or null on the server. */
  get ownerAddress(): string | null {
    if (typeof window === "undefined") return null;
    this.getClient();
    return this.account?.address ?? null;
  }

  getIdentityAddress(): string | null {
    return this.ownerAddress;
  }

  private get address(): `0x${string}` {
    return this.config.contractAddress as `0x${string}`;
  }

  // -- low level -------------------------------------------------------

  private async read<T>(functionName: string, args: unknown[] = []): Promise<T> {
    const client = this.getClient();
    const raw = await client.readContract({
      address: this.address,
      functionName,
      args: args as any,
    });
    return toPlain(raw) as T;
  }

  private async writeAndWait(functionName: string, args: unknown[]): Promise<void> {
    const client = this.getClient();
    const hash = await client.writeContract({
      address: this.address,
      functionName,
      args: args as any,
      value: 0n,
    });
    await client.waitForTransactionReceipt({ hash, status: ACCEPTED });
  }

  // -- writes ----------------------------------------------------------

  async plantSeed(input: PlantSeedInput): Promise<Seed> {
    const client = this.getClient();
    const hash = await client.writeContract({
      address: this.address,
      functionName: "plant_seed",
      args: [
        input.name,
        input.intent,
        input.sensitivity,
        input.preferredLanguage,
        input.categories,
        input.lifespan,
        Date.now(),
      ] as any,
      value: 0n,
    });
    const receipt = await client.waitForTransactionReceipt({ hash, status: ACCEPTED });
    const seedId = this.extractReturn<string>(receipt);
    const seed = seedId ? await this.getSeed(seedId) : null;
    if (seed) return seed;
    // Fallback: newest seed owned by this firefly.
    const seeds = await this.getSeeds();
    const mine = seeds.find((s) => s.owner === this.ownerAddress);
    if (!mine) throw new Error("The seed was planted but could not be read back.");
    return mine;
  }

  async attachRoot(input: AttachRootInput): Promise<Root> {
    const client = this.getClient();
    const hash = await client.writeContract({
      address: this.address,
      functionName: "attach_root",
      args: [
        input.seedId,
        input.type,
        input.label,
        input.url,
        input.contentSnapshot,
        input.trustNote,
        Date.now(),
      ] as any,
      value: 0n,
    });
    const receipt = await client.waitForTransactionReceipt({ hash, status: ACCEPTED });
    const rootId = this.extractReturn<string>(receipt);
    const roots = await this.getRoots(input.seedId);
    const found = roots.find((r) => r.id === rootId) ?? roots[roots.length - 1];
    if (!found) throw new Error("The root was attached but could not be read back.");
    return found;
  }

  async pulseSeed(seedId: string): Promise<PulseResult> {
    const client = this.getClient();
    const hash = await client.writeContract({
      address: this.address,
      functionName: "pulse_seed",
      args: [seedId, Date.now()] as any,
      value: 0n,
    });
    const receipt = await client.waitForTransactionReceipt({ hash, status: ACCEPTED });
    const out = toPlain(this.extractReturn<any>(receipt)) ?? {};

    const result: PulseResult = {
      seedId,
      previousState: (out.previousState ?? "rooting") as SeedState,
      nextState: (out.nextState ?? "rooting") as SeedState,
      note: out.note ?? "",
    };
    if (out.bloomId) {
      const bloom = await this.read<Bloom | null>("get_bloom", [out.bloomId]);
      if (bloom) result.bloom = bloom;
    }
    return result;
  }

  async preserveBloom(bloomId: string): Promise<Spore> {
    await this.writeAndWait("preserve_bloom", [bloomId, "", Date.now()]);
    const spores = await this.getSpores();
    const found = spores.find((s) => s.bloomId === bloomId) ?? spores[0];
    if (!found) throw new Error("The bloom was preserved but the spore could not be read back.");
    return found;
  }

  async witherSeed(seedId: string): Promise<Seed> {
    await this.writeAndWait("wither_seed", [seedId]);
    const seed = await this.getSeed(seedId);
    if (!seed) throw new Error("The seed could not be read back after withering.");
    return seed;
  }

  // -- reads -----------------------------------------------------------

  // Rescale the contract's integer visual fields back to the 0..1 / seconds the
  // UI expects. The contract returns integers because GenVM calldata cannot
  // serialize floats in return values.
  private normalizeSeed(seed: any): Seed {
    if (seed && seed.visualDNA) {
      const v = seed.visualDNA;
      seed.visualDNA = {
        seedShape: Number(v.seedShape) / 1000,
        innerColor: v.innerColor,
        pulseSpeed: Number(v.pulseSpeed) / 10,
        rootPattern: Number(v.rootPattern) / 1000,
        bloomForm: Number(v.bloomForm) / 1000,
        particleDensity: Number(v.particleDensity) / 1000,
      };
    }
    return seed as Seed;
  }

  async getSeed(seedId: string): Promise<Seed | null> {
    const seed = await this.read<any>("get_seed", [seedId]);
    return seed ? this.normalizeSeed(seed) : null;
  }

  async getSeeds(): Promise<Seed[]> {
    // Page through the contract view (page size <= 20) to avoid per-item loops.
    const all: Seed[] = [];
    const limit = 20;
    let offset = 0;
    for (;;) {
      const page = await this.read<any[]>("get_seeds", [offset, limit]);
      if (!page || page.length === 0) break;
      all.push(...page.map((s) => this.normalizeSeed(s)));
      if (page.length < limit) break;
      offset += limit;
    }
    return all;
  }

  async getRoots(seedId: string): Promise<Root[]> {
    return (await this.read<Root[]>("get_roots", [seedId])) ?? [];
  }

  async getSpores(): Promise<Spore[]> {
    const all: Spore[] = [];
    const limit = 20;
    let offset = 0;
    for (;;) {
      const page = await this.read<Spore[]>("get_spores", [offset, limit]);
      if (!page || page.length === 0) break;
      all.push(...page);
      if (page.length < limit) break;
      offset += limit;
    }
    return all;
  }

  // -- receipt helpers -------------------------------------------------

  // Pull the contract return value out of a transaction receipt across the
  // shapes genlayer-js may expose.
  private extractReturn<T>(receipt: any): T | undefined {
    if (!receipt) return undefined;
    const candidates = [
      receipt?.consensus_data?.leader_receipt?.[0]?.result,
      receipt?.consensus_data?.leader_receipt?.result,
      receipt?.result,
      receipt?.returnValue,
      receipt?.data,
    ];
    for (const c of candidates) {
      if (c !== undefined && c !== null) return toPlain(c) as T;
    }
    return undefined;
  }
}
