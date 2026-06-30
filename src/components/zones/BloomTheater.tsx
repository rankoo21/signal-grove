"use client";

import { motion } from "framer-motion";
import { useGroveStore } from "@/store/useGroveStore";
import { GlyphButton } from "@/components/ui/GlyphButton";
import { BloomPetal } from "@/components/seed/BloomPetal";

// Cinematic flower opening. Not a modal: a dark theater the camera moves into,
// with petals that unfold one by one.
export function BloomTheater() {
  const activeBloom = useGroveStore((s) => s.activeBloom);
  const seeds = useGroveStore((s) => s.seeds);
  const preserveActiveBloom = useGroveStore((s) => s.preserveActiveBloom);
  const clearBloom = useGroveStore((s) => s.clearBloom);
  const setActiveSeed = useGroveStore((s) => s.setActiveSeed);
  const setZone = useGroveStore((s) => s.setZone);
  const busy = useGroveStore((s) => s.busy);

  if (!activeBloom) {
    // Find the most recent unpreserved bloom across seeds, if any.
    return (
      <section className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-6 text-center">
        <p className="font-display text-2xl text-bio-mist/60">
          No bloom is open right now.
        </p>
        <p className="mt-3 font-body text-sm text-bio-mist/40">
          Pulse a rooted seed in the grove. When a signal resonates, the flower will open here.
        </p>
        <div className="mt-8">
          <GlyphButton tone="green" onClick={() => setZone("grove")}>
            Return to grove
          </GlyphButton>
        </div>
      </section>
    );
  }

  const seed = seeds.find((s) => s.id === activeBloom.seedId);

  const petals = [
    { label: "What surfaced", body: activeBloom.whatSurfaced, tone: "#7CFFB2" },
    { label: "Source trail", body: activeBloom.sourceTrail, tone: "#8DDCFF" },
    { label: "Why it matches your intent", body: activeBloom.whyItMatches, tone: "#FFD978" },
    { label: "Suggested next move", body: activeBloom.suggestedNextMove, tone: "#C9B3FF" },
  ];

  return (
    <section className="relative mx-auto max-w-4xl px-6 py-16">
      {/* theater glow, camera moving into the flower */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-24 -z-0 h-[400px] w-[400px] -translate-x-1/2 rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(124,255,178,0.18), transparent 70%)",
        }}
        initial={{ scale: 0.4, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1 }}
      />

      <motion.header
        className="mb-10 text-center"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8 }}
      >
        <p className="font-body text-xs uppercase tracking-[0.3em] text-bio-green/60">
          A bloom appeared
        </p>
        <h2 className="mt-3 font-display text-4xl text-bio-mist text-glow">
          {activeBloom.title}
        </h2>
        {seed && (
          <p className="mt-2 font-body text-sm text-bio-mist/45">
            from {seed.name}
          </p>
        )}
      </motion.header>

      <div className="grid gap-5 sm:grid-cols-2">
        {petals.map((p, i) => (
          <BloomPetal key={p.label} index={i} label={p.label} body={p.body} tone={p.tone} />
        ))}
      </div>

      <motion.div
        className="mt-10 flex flex-wrap items-center justify-center gap-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
      >
        <GlyphButton tone="green" onClick={preserveActiveBloom} disabled={busy}>
          {busy ? "preserving..." : "Preserve bloom as spore"}
        </GlyphButton>
        <GlyphButton
          tone="ice"
          onClick={() => {
            if (seed) setActiveSeed(seed.id);
            setZone("roots");
          }}
        >
          Attach more roots
        </GlyphButton>
        <button
          onClick={() => {
            clearBloom();
            setZone("grove");
          }}
          className="font-body text-xs text-bio-mist/45 hover:text-bio-mist/80"
        >
          let bloom fade
        </button>
      </motion.div>
    </section>
  );
}
