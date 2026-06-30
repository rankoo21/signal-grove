"use client";

import { motion } from "framer-motion";
import { useGroveStore } from "@/store/useGroveStore";
import { GlyphButton } from "@/components/ui/GlyphButton";
import { LivingInput } from "@/components/ui/LivingInput";
import { SeedOrb } from "@/components/seed/SeedOrb";
import { CATEGORY_LABELS, LANGUAGE_LABELS } from "@/utils/format";
import { deriveVisualDNA } from "@/lib/genlayer/visualDNA";
import type {
  Lifespan,
  SeedLanguage,
  Sensitivity,
  SignalCategory,
} from "@/lib/genlayer/types";

const SENSITIVITY: { id: Sensitivity; label: string; hint: string }[] = [
  { id: "quiet", label: "Quiet", hint: "dim slow pulse" },
  { id: "balanced", label: "Balanced", hint: "stable green pulse" },
  { id: "hungry", label: "Hungry", hint: "active root movement" },
  { id: "wild", label: "Wild", hint: "fast particle orbit" },
];

const LIFESPANS: { id: Lifespan; label: string }[] = [
  { id: "one-bloom", label: "One bloom only" },
  { id: "7-days", label: "7 days" },
  { id: "30-days", label: "30 days" },
  { id: "seasonal", label: "Seasonal" },
  { id: "permanent", label: "Permanent testnet seed" },
];

const LANGUAGES: SeedLanguage[] = ["english", "spanish", "arabic", "french", "custom"];
const CATEGORIES = Object.keys(CATEGORY_LABELS) as SignalCategory[];

// Sculpt the seed artifact. A living config experience, not a settings form:
// a central seed with orbiting biological fragment controls.
export function SeedSculptor() {
  const draft = useGroveStore((s) => s.draft);
  const setDraft = useGroveStore((s) => s.setDraft);
  const setZone = useGroveStore((s) => s.setZone);

  // Preview seed so the orb reflects choices live.
  const previewSeed = {
    id: "preview",
    owner: "",
    name: draft.name,
    intent: draft.intent,
    sensitivity: draft.sensitivity,
    preferredLanguage: draft.preferredLanguage,
    categories: draft.categories,
    lifespan: draft.lifespan,
    state: "stirring" as const,
    createdAt: Date.now(),
    lastPulseAt: null,
    rootIds: [],
    bloomIds: [],
    visualDNA: deriveVisualDNA(draft.preferredLanguage, draft.sensitivity),
  };

  const toggleCategory = (c: SignalCategory) => {
    const has = draft.categories.includes(c);
    setDraft({
      categories: has
        ? draft.categories.filter((x) => x !== c)
        : [...draft.categories, c],
    });
  };

  return (
    <section className="mx-auto max-w-5xl px-6 py-16">
      <header className="mb-10 text-center">
        <h2 className="font-display text-3xl text-bio-mist sm:text-4xl">Shape the seed</h2>
        <p className="mt-2 font-body text-sm text-bio-mist/50">
          Choose what it hungers for. Give the signal a language.
        </p>
      </header>

      <div className="grid items-center gap-10 lg:grid-cols-[320px_1fr]">
        {/* central seed with orbiting rings (lifespan) */}
        <div className="relative mx-auto flex h-[300px] w-[300px] items-center justify-center">
          {LIFESPANS.map((l, i) => {
            const active = draft.lifespan === l.id;
            const r = 60 + i * 22;
            return (
              <motion.div
                key={l.id}
                aria-hidden
                className="absolute rounded-full border"
                style={{
                  width: r * 2,
                  height: r * 2,
                  borderColor: active
                    ? "rgba(255,217,120,0.5)"
                    : "rgba(124,255,178,0.1)",
                }}
                animate={{ rotate: active ? 360 : 0 }}
                transition={{ duration: 30 - i * 3, repeat: Infinity, ease: "linear" }}
              />
            );
          })}
          <SeedOrb seed={previewSeed} size={170} emphasis />
        </div>

        {/* configuration fragments */}
        <div className="space-y-7">
          <LivingInput
            label="Seed Name"
            value={draft.name}
            onChange={(v) => setDraft({ name: v })}
            placeholder="GenLayer Builder Watch"
          />

          <LivingInput
            label="Intent"
            value={draft.intent}
            onChange={(v) => setDraft({ intent: v })}
            placeholder="The natural language goal of this seed."
            multiline
          />

          {/* sensitivity */}
          <div>
            <span className="mb-2 block font-display text-xs uppercase tracking-[0.25em] text-bio-green/70">
              Signal Sensitivity
            </span>
            <div className="flex flex-wrap gap-2">
              {SENSITIVITY.map((s) => {
                const active = draft.sensitivity === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => setDraft({ sensitivity: s.id })}
                    className={`rounded-full border px-4 py-2 text-left transition-all ${
                      active
                        ? "border-bio-green/60 bg-bio-green/10 text-bio-green"
                        : "border-white/10 text-bio-mist/60 hover:border-bio-green/30"
                    }`}
                  >
                    <span className="block font-display text-sm">{s.label}</span>
                    <span className="block text-[10px] tracking-wide opacity-60">
                      {s.hint}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* language */}
          <div>
            <span className="mb-2 block font-display text-xs uppercase tracking-[0.25em] text-bio-green/70">
              Preferred Language
            </span>
            <div className="flex flex-wrap gap-2">
              {LANGUAGES.map((l) => {
                const active = draft.preferredLanguage === l;
                return (
                  <button
                    key={l}
                    onClick={() => setDraft({ preferredLanguage: l })}
                    className={`rounded-full border px-4 py-1.5 font-display text-sm transition-all ${
                      active
                        ? "border-bio-gold/60 bg-bio-gold/10 text-bio-gold"
                        : "border-white/10 text-bio-mist/60 hover:border-bio-gold/30"
                    }`}
                  >
                    {LANGUAGE_LABELS[l]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* categories as petals */}
          <div>
            <span className="mb-2 block font-display text-xs uppercase tracking-[0.25em] text-bio-green/70">
              Signal Categories
            </span>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => {
                const active = draft.categories.includes(c);
                return (
                  <button
                    key={c}
                    onClick={() => toggleCategory(c)}
                    className={`rounded-full border px-3 py-1.5 text-xs transition-all ${
                      active
                        ? "border-bio-ice/60 bg-bio-ice/10 text-bio-ice"
                        : "border-white/10 text-bio-mist/55 hover:border-bio-ice/30"
                    }`}
                  >
                    {CATEGORY_LABELS[c]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* lifespan */}
          <div>
            <span className="mb-2 block font-display text-xs uppercase tracking-[0.25em] text-bio-green/70">
              Lifespan
            </span>
            <div className="flex flex-wrap gap-2">
              {LIFESPANS.map((l) => {
                const active = draft.lifespan === l.id;
                return (
                  <button
                    key={l.id}
                    onClick={() => setDraft({ lifespan: l.id })}
                    className={`rounded-full border px-3 py-1.5 text-xs transition-all ${
                      active
                        ? "border-bio-gold/60 bg-bio-gold/10 text-bio-gold"
                        : "border-white/10 text-bio-mist/55 hover:border-bio-gold/30"
                    }`}
                  >
                    {l.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-4 pt-2">
            <GlyphButton tone="green" onClick={() => setZone("roots")}>
              Seal and grow roots
            </GlyphButton>
            <button
              onClick={() => setZone("grove")}
              className="font-body text-xs text-bio-mist/40 hover:text-bio-mist/70"
            >
              skip to the grove
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
