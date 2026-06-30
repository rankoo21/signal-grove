"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { useGroveStore } from "@/store/useGroveStore";
import { SeedOrb } from "@/components/seed/SeedOrb";
import { OrganicRadialMenu, type RadialAction } from "@/components/seed/OrganicRadialMenu";
import { GlyphButton } from "@/components/ui/GlyphButton";
import { STATE_COPY } from "@/utils/seedState";
import { relativeTime } from "@/utils/format";
import type { Seed } from "@/lib/genlayer/types";

// Main operating area. A living garden of seeds in soil islands, not a card grid.
export function Grove() {
  const seeds = useGroveStore((s) => s.seeds);
  const rootsBySeed = useGroveStore((s) => s.rootsBySeed);
  const pulseSeed = useGroveStore((s) => s.pulseSeed);
  const pulseGrove = useGroveStore((s) => s.pulseGrove);
  const witherSeed = useGroveStore((s) => s.witherSeed);
  const setActiveSeed = useGroveStore((s) => s.setActiveSeed);
  const setZone = useGroveStore((s) => s.setZone);
  const busy = useGroveStore((s) => s.busy);

  const [openSeed, setOpenSeed] = useState<string | null>(null);
  const [hoverSeed, setHoverSeed] = useState<string | null>(null);
  const [wave, setWave] = useState(false);

  const handlePulseGrove = async () => {
    setWave(true);
    setTimeout(() => setWave(false), 1400);
    await pulseGrove();
  };

  const actionsFor = (seed: Seed): RadialAction[] => [
    {
      id: "pulse",
      label: "Pulse",
      tone: "green",
      onSelect: () => {
        setOpenSeed(null);
        pulseSeed(seed.id);
      },
    },
    {
      id: "roots",
      label: "Open roots",
      tone: "ice",
      onSelect: () => {
        setActiveSeed(seed.id);
        setZone("roots");
      },
    },
    {
      id: "bloom",
      label: "Watch bloom",
      tone: "gold",
      onSelect: () => {
        setActiveSeed(seed.id);
        setZone("bloom");
      },
    },
    {
      id: "wither",
      label: "Let it wither",
      tone: "violet",
      onSelect: () => {
        setOpenSeed(null);
        witherSeed(seed.id);
      },
    },
  ];

  return (
    <section className="relative mx-auto max-w-6xl px-6 py-14">
      <header className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-body text-xs uppercase tracking-[0.3em] text-bio-green/60">
            The Grove
          </p>
          <h2 className="mt-2 font-display text-3xl text-bio-mist">
            Something is moving under the soil.
          </h2>
        </div>
        <GlyphButton tone="green" onClick={handlePulseGrove} disabled={busy}>
          {busy ? "pulsing..." : "Pulse the grove"}
        </GlyphButton>
      </header>

      {/* pulse wave overlay */}
      <AnimatePresence>
        {wave && (
          <motion.div
            aria-hidden
            className="pointer-events-none fixed inset-0 z-20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{ border: "2px solid rgba(124,255,178,0.6)" }}
              animate={{ scale: [1, 60], opacity: [0.8, 0] }}
              transition={{ duration: 1.3, ease: "easeOut" }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {seeds.length === 0 ? (
        <div className="py-20 text-center">
          <p className="font-display text-xl text-bio-mist/60">
            The soil is waiting for an intent.
          </p>
          <div className="mt-6">
            <GlyphButton tone="green" onClick={() => setZone("soil")}>
              Plant your first signal
            </GlyphButton>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-x-6 gap-y-16 sm:grid-cols-2 lg:grid-cols-3">
          {seeds.map((seed) => {
            const isOpen = openSeed === seed.id;
            const isHover = hoverSeed === seed.id;
            const rootCount = (rootsBySeed[seed.id] ?? []).length;
            return (
              <div
                key={seed.id}
                className="relative flex flex-col items-center"
                onMouseEnter={() => setHoverSeed(seed.id)}
                onMouseLeave={() => setHoverSeed(null)}
              >
                {/* soil island */}
                <div
                  aria-hidden
                  className="absolute bottom-10 h-8 w-44 rounded-[50%]"
                  style={{
                    background:
                      "radial-gradient(circle, rgba(60,43,31,0.6), transparent 70%)",
                  }}
                />

                <div className="relative">
                  <button
                    aria-label={`Open actions for ${seed.name}`}
                    onClick={() => setOpenSeed(isOpen ? null : seed.id)}
                  >
                    <SeedOrb seed={seed} size={140} emphasis={isOpen} />
                  </button>
                  <OrganicRadialMenu open={isOpen} actions={actionsFor(seed)} />
                </div>

                <p className="mt-3 font-display text-sm text-bio-mist">{seed.name}</p>
                <p className="text-[11px] tracking-wide text-bio-green/60">
                  {STATE_COPY[seed.state].label}
                </p>

                {/* living tooltip */}
                <AnimatePresence>
                  {isHover && !isOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 6 }}
                      className="organic-glass absolute -bottom-2 z-10 w-56 translate-y-full rounded-2xl p-3 text-left"
                    >
                      <p className="font-body text-xs text-bio-mist/70">{seed.intent}</p>
                      <p className="mt-2 text-[10px] text-bio-mist/40">
                        {STATE_COPY[seed.state].whisper}
                      </p>
                      <p className="mt-1 text-[10px] text-bio-mist/40">
                        {rootCount} root{rootCount === 1 ? "" : "s"} {"\u00b7"} pulsed{" "}
                        {relativeTime(seed.lastPulseAt)}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
