import type { BuildProofAdapter } from "./types";
import { ContractAdapter } from "./contractAdapter";
import { MockAdapter } from "./mockAdapter";

let cached: BuildProofAdapter | null = null;

export function getAdapter(): BuildProofAdapter {
  if (cached) return cached;

  const mode = process.env.NEXT_PUBLIC_BUILDPROOF_MODE ?? "mock";
  const contractAddress = process.env.NEXT_PUBLIC_BUILDPROOF_CONTRACT ?? "";
  const network = process.env.NEXT_PUBLIC_BUILDPROOF_NETWORK ?? "bradbury";

  cached =
    mode === "contract" && contractAddress
      ? new ContractAdapter({ contractAddress, network })
      : new MockAdapter();
  return cached;
}

export * from "./types";
