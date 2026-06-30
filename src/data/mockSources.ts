import type { RootType } from "@/lib/genlayer/types";

export interface MockSourceSnapshot {
  type: RootType;
  label: string;
  url: string;
  content: string;
  trustNote: string;
}

// Preloaded source snapshots. Some are written to trigger blooms, some to keep
// seeds stirring or rooting, so the demo pulse produces visible variety.
export const MOCK_SOURCES: MockSourceSnapshot[] = [
  {
    type: "blog",
    label: "Official update stream",
    url: "https://example.org/genlayer/updates",
    content:
      "A new builder opportunity is open. The team announced a testnet task track and a small bounty for projects that submit working Intelligent Contracts during the growth season.",
    trustNote: "Primary source, mirrored locally for the demo.",
  },
  {
    type: "docs",
    label: "Intelligent Contract docs",
    url: "https://example.org/genlayer/docs/contracts",
    content:
      "Documentation for GenVM deploy flow updated. New reference pages cover storage annotations, equivalence principles, and contract view paging.",
    trustNote: "Versioned docs snapshot.",
  },
  {
    type: "social",
    label: "Community channel echo",
    url: "https://example.org/genlayer/social",
    content:
      "Lots of community chatter today about an upcoming meetup and an ambassador initiative. No hard dates yet.",
    trustNote: "Low signal, social noise.",
  },
  {
    type: "repository",
    label: "Tooling repository",
    url: "https://example.org/genlayer/tooling",
    content:
      "New release tagged. The SDK tooling shipped a version upgrade with an improved client and a few API changes.",
    trustNote: "Release notes from the repository.",
  },
  {
    type: "manual",
    label: "Hand-noted trace",
    url: "",
    content:
      "Heard a Spanish-speaking community content opportunity might appear soon. Keeping a note until it is public.",
    trustNote: "Manual note. Not yet confirmed.",
  },
];
