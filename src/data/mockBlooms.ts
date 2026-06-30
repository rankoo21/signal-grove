import type { SignalCategory } from "@/lib/genlayer/types";

export interface BloomTemplate {
  forCategories: SignalCategory[];
  title: string;
  whatSurfaced: string;
  whyItMatches: string;
  suggestedNextMove: string;
}

// Templates the mock adapter uses to compose a bloom once a match is strong
// enough. The real contract would compose this from validator-agreed reasoning.
export const BLOOM_TEMPLATES: BloomTemplate[] = [
  {
    forCategories: ["builder", "testnet", "ecosystem"],
    title: "Builder opportunity surfaced",
    whatSurfaced:
      "A new public update appears related to your seed intent. It mentions builders, testnet activity, and project submissions.",
    whyItMatches:
      "The language overlaps with your selected categories: builder opportunities, testnet updates, and ecosystem activity.",
    suggestedNextMove:
      "Prepare a project concept and save relevant proof before the window closes.",
  },
  {
    forCategories: ["documentation", "technical"],
    title: "Documentation shifted",
    whatSurfaced:
      "Reference material about Intelligent Contracts and the deploy flow has changed, with new pages on storage and views.",
    whyItMatches:
      "Your seed listens for documentation and technical changes, and the source trail confirms an update landed.",
    suggestedNextMove:
      "Review the changed pages and update any contract that relies on the old guidance.",
  },
  {
    forCategories: ["grants", "community"],
    title: "A community door opened",
    whatSurfaced:
      "A public initiative or funding window appears tied to community contribution.",
    whyItMatches:
      "The trace aligns with your grants and community categories.",
    suggestedNextMove:
      "Draft a short proposal and gather links that show prior work.",
  },
];

export function pickBloomTemplate(matched: SignalCategory[]): BloomTemplate {
  let best = BLOOM_TEMPLATES[0];
  let bestOverlap = -1;
  for (const tpl of BLOOM_TEMPLATES) {
    const overlap = tpl.forCategories.filter((c) => matched.includes(c)).length;
    if (overlap > bestOverlap) {
      bestOverlap = overlap;
      best = tpl;
    }
  }
  return best;
}
