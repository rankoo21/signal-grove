"use client";

import { create } from "zustand";
import { getAdapter } from "@/lib/genlayer";
import type {
  AttachRootInput,
  Bloom,
  PlantSeedInput,
  Root,
  Seed,
  Spore,
} from "@/lib/genlayer/types";
import { shortAddress } from "@/utils/format";

export type Zone =
  | "soil"
  | "sculptor"
  | "roots"
  | "grove"
  | "bloom"
  | "spores";

interface DraftSeed {
  name: string;
  intent: string;
  sensitivity: Seed["sensitivity"];
  preferredLanguage: Seed["preferredLanguage"];
  categories: Seed["categories"];
  lifespan: Seed["lifespan"];
}

const EMPTY_DRAFT: DraftSeed = {
  name: "",
  intent: "",
  sensitivity: "balanced",
  preferredLanguage: "english",
  categories: ["builder"],
  lifespan: "30-days",
};

interface GroveState {
  // navigation
  zone: Zone;
  setZone: (z: Zone) => void;

  // wallet / firefly
  walletAddress: string | null;
  walletLabel: string;
  callFirefly: () => Promise<void>;
  releaseFirefly: () => void;

  // data
  seeds: Seed[];
  spores: Spore[];
  rootsBySeed: Record<string, Root[]>;
  activeSeedId: string | null;
  activeBloom: Bloom | null;
  busy: boolean;
  error: string | null;
  notice: string | null;

  // draft used by Dark Soil + Seed Sculptor
  draft: DraftSeed;
  setDraft: (patch: Partial<DraftSeed>) => void;
  resetDraft: () => void;

  // lifecycle
  refresh: () => Promise<void>;
  plantSeed: () => Promise<void>;
  setActiveSeed: (id: string | null) => void;
  attachRoot: (input: Omit<AttachRootInput, "seedId">) => Promise<void>;
  pulseSeed: (seedId: string) => Promise<void>;
  pulseGrove: () => Promise<void>;
  preserveActiveBloom: () => Promise<void>;
  witherSeed: (seedId: string) => Promise<void>;
  clearBloom: () => void;
  clearMessages: () => void;
}

const adapter = getAdapter();

export const useGroveStore = create<GroveState>((set, get) => ({
  zone: "soil",
  setZone: (z) => set({ zone: z }),

  walletAddress: null,
  walletLabel: "Call your firefly",
  callFirefly: async () => {
    // In contract mode with a browser wallet available, connect the real
    // wallet (MetaMask + GenLayer Snap). Otherwise use the adapter identity
    // (burner key in contract mode, synthetic in mock mode).
    if (
      adapter.mode === "contract" &&
      adapter.hasInjectedWallet?.() &&
      adapter.connectWallet
    ) {
      set({ busy: true, error: null });
      try {
        const addr = await adapter.connectWallet();
        set({ walletAddress: addr, walletLabel: shortAddress(addr) });
        return;
      } catch (e) {
        set({ error: (e as Error).message });
        // Fall through to burner identity below.
      } finally {
        set({ busy: false });
      }
    }
    const real = adapter.getIdentityAddress();
    if (adapter.mode === "contract" && real) {
      set({ walletAddress: real, walletLabel: shortAddress(real) });
      return;
    }
    const addr =
      "0x" +
      Array.from({ length: 40 }, () =>
        "0123456789abcdef"[Math.floor(Math.random() * 16)],
      ).join("");
    set({ walletAddress: addr, walletLabel: shortAddress(addr) });
  },
  releaseFirefly: () => {
    adapter.disconnectWallet?.();
    set({ walletAddress: null, walletLabel: "Call your firefly" });
  },

  seeds: [],
  spores: [],
  rootsBySeed: {},
  activeSeedId: null,
  activeBloom: null,
  busy: false,
  error: null,
  notice: null,

  draft: { ...EMPTY_DRAFT },
  setDraft: (patch) => set({ draft: { ...get().draft, ...patch } }),
  resetDraft: () => set({ draft: { ...EMPTY_DRAFT } }),

  refresh: async () => {
    const [seeds, spores] = await Promise.all([
      adapter.getSeeds(),
      adapter.getSpores(),
    ]);
    const rootsBySeed: Record<string, Root[]> = {};
    await Promise.all(
      seeds.map(async (s) => {
        rootsBySeed[s.id] = await adapter.getRoots(s.id);
      }),
    );
    set({ seeds, spores, rootsBySeed });
  },

  plantSeed: async () => {
    const { draft, walletAddress } = get();
    if (!draft.intent.trim()) {
      set({ error: "The seed needs an intent before it can grow." });
      return;
    }
    set({ busy: true, error: null });
    try {
      const seed = await adapter.plantSeed({
        owner: walletAddress ?? "",
        name: draft.name.trim() || "Unnamed Seed",
        intent: draft.intent.trim(),
        sensitivity: draft.sensitivity,
        preferredLanguage: draft.preferredLanguage,
        categories: draft.categories,
        lifespan: draft.lifespan,
      } satisfies PlantSeedInput);
      await get().refresh();
      set({ activeSeedId: seed.id, notice: "A seed dropped into the soil." });
    } catch (e) {
      set({ error: (e as Error).message });
    } finally {
      set({ busy: false });
    }
  },

  setActiveSeed: (id) => set({ activeSeedId: id }),

  attachRoot: async (input) => {
    const seedId = get().activeSeedId;
    if (!seedId) {
      set({ error: "Plant or select a seed before attaching roots." });
      return;
    }
    set({ busy: true, error: null });
    try {
      await adapter.attachRoot({ ...input, seedId });
      await get().refresh();
      set({ notice: "A root grew from the chamber wall and plugged into the seed." });
    } catch (e) {
      set({ error: (e as Error).message });
    } finally {
      set({ busy: false });
    }
  },

  pulseSeed: async (seedId) => {
    set({ busy: true, error: null });
    try {
      const result = await adapter.pulseSeed(seedId);
      await get().refresh();
      if (result.bloom) {
        set({ activeBloom: result.bloom, notice: "A bloom appeared." });
      } else {
        set({ notice: result.note });
      }
    } catch (e) {
      set({ error: (e as Error).message });
    } finally {
      set({ busy: false });
    }
  },

  pulseGrove: async () => {
    const { seeds } = get();
    const active = seeds.filter(
      (s) => s.state !== "withered" && s.state !== "archived" && s.rootIds.length > 0,
    );
    if (active.length === 0) {
      set({ notice: "No rooted seeds to pulse. Attach roots first." });
      return;
    }
    set({ busy: true, error: null });
    let firstBloom: Bloom | null = null;
    try {
      for (const s of active) {
        try {
          const result = await adapter.pulseSeed(s.id);
          if (result.bloom && !firstBloom) firstBloom = result.bloom;
        } catch {
          // a single seed failing should not stop the wave
        }
      }
      await get().refresh();
      set({
        activeBloom: firstBloom,
        notice: firstBloom
          ? "The grove pulsed. A bloom opened."
          : "The grove pulsed. The soil shifted.",
      });
    } finally {
      set({ busy: false });
    }
  },

  preserveActiveBloom: async () => {
    const bloom = get().activeBloom;
    if (!bloom) return;
    set({ busy: true, error: null });
    try {
      await adapter.preserveBloom(bloom.id);
      await get().refresh();
      set({ activeBloom: null, notice: "This bloom was kept as a spore." });
    } catch (e) {
      set({ error: (e as Error).message });
    } finally {
      set({ busy: false });
    }
  },

  witherSeed: async (seedId) => {
    set({ busy: true, error: null });
    try {
      await adapter.witherSeed(seedId);
      await get().refresh();
      set({ notice: "The seed returned softly to the soil." });
    } catch (e) {
      set({ error: (e as Error).message });
    } finally {
      set({ busy: false });
    }
  },

  clearBloom: () => set({ activeBloom: null }),
  clearMessages: () => set({ error: null, notice: null }),
}));
