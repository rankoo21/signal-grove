import type { SeedLanguage, Sensitivity, VisualDNA } from "./types";

const LANGUAGE_COLOR: Record<SeedLanguage, string> = {
  english: "#7CFFB2",
  spanish: "#FFD978",
  arabic: "#8DDCFF",
  french: "#B79CFF",
  custom: "#FFB86B",
};

const SENSITIVITY_PULSE: Record<Sensitivity, number> = {
  quiet: 8,
  balanced: 6,
  hungry: 4,
  wild: 2.2,
};

// Derive a stable-ish visual fingerprint for a seed from its config plus a small
// random component, so every seed looks individual in the grove.
export function deriveVisualDNA(
  language: SeedLanguage,
  sensitivity: Sensitivity,
): VisualDNA {
  const r = () => Math.round(Math.random() * 100) / 100;
  return {
    seedShape: r(),
    innerColor: LANGUAGE_COLOR[language],
    pulseSpeed: SENSITIVITY_PULSE[sensitivity],
    rootPattern: r(),
    bloomForm: r(),
    particleDensity:
      sensitivity === "wild" ? 0.9 : sensitivity === "hungry" ? 0.7 : 0.45,
  };
}
