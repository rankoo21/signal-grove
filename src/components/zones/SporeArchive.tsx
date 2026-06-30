"use client";

import { motion } from "framer-motion";
import { useGroveStore } from "@/store/useGroveStore";
import { GlyphButton } from "@/components/ui/GlyphButton";
import { SporeMemory } from "@/components/seed/SporeMemory";

// Preserved bloom memories as a floating spore cloud, not a history table.
export function SporeArchive() {
  const spores = useGroveStore((s) => s.spores);
  const setZone = useGroveStore((s) => s.setZone);

  return (
    <section className="relative mx-auto max-w-3xl px-6 py-16">
      {/* drifting cloud backdrop */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-0">
        {Array.from({ length: 14 }).map((_, i) => (
          <motion.span
            key={i}
            className="absolute h-1 w-1 rounded-full bg-bio-violet/40"
            style={{ left: `${(i * 37) % 100}%`, top: `${(i * 53) % 100}%` }}
            animate={{ y: [0, -16, 0], opacity: [0.2, 0.6, 0.2] }}
            transition={{ duration: 6 + (i % 5), repeat: Infinity, ease: "easeInOut" }}
          />
        ))}
      </div>

      <header className="mb-10">
        <p className="font-body text-xs uppercase tracking-[0.3em] text-bio-violet/60">
          Spore Archive
        </p>
        <h2 className="mt-2 font-display text-3xl text-bio-mist">Preserved spores</h2>
        <p className="mt-2 font-body text-sm text-bio-mist/50">
          Blooms worth keeping, folded into memory. Unfold one to read or carry it elsewhere.
        </p>
      </header>

      {spores.length === 0 ? (
        <div className="py-16 text-center">
          <p className="font-display text-lg text-bio-mist/55">
            No spores yet. Blooms are moments worth preserving.
          </p>
          <div className="mt-6">
            <GlyphButton tone="green" onClick={() => setZone("grove")}>
              Return to the grove
            </GlyphButton>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {spores.map((spore, i) => (
            <SporeMemory key={spore.id} spore={spore} index={i} />
          ))}
        </div>
      )}
    </section>
  );
}
