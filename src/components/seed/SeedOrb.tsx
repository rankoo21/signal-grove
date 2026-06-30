"use client";

import { motion } from "framer-motion";
import type { Seed, SeedState } from "@/lib/genlayer/types";

interface SeedOrbProps {
  seed: Seed;
  size?: number;
  emphasis?: boolean;
}

const STATE_GLOW: Record<SeedState, string> = {
  dormant: "rgba(141,220,255,0.25)",
  stirring: "rgba(255,217,120,0.4)",
  rooting: "rgba(124,255,178,0.45)",
  blooming: "rgba(124,255,178,0.8)",
  withered: "rgba(120,100,90,0.25)",
  archived: "rgba(160,120,235,0.4)",
};

// A glass seed with a glowing internal embryo. Its breathing speed and glow are
// driven by visualDNA and state, so each seed reads as individual and alive.
export function SeedOrb({ seed, size = 120, emphasis }: SeedOrbProps) {
  const { visualDNA: dna, state } = seed;
  const withered = state === "withered";
  const pulse = withered ? 12 : dna.pulseSpeed;
  const glow = STATE_GLOW[state];

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      {/* outer aura */}
      <motion.div
        aria-hidden
        className="absolute rounded-full"
        style={{
          width: size,
          height: size,
          background: `radial-gradient(circle at 50% 45%, ${glow}, transparent 70%)`,
        }}
        animate={{ scale: [1, emphasis ? 1.18 : 1.08, 1], opacity: [0.6, 1, 0.6] }}
        transition={{ duration: pulse, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* glass shell */}
      <motion.div
        className="relative rounded-full"
        style={{
          width: size * 0.62,
          height: size * 0.72,
          borderRadius: `${48 + dna.seedShape * 14}% ${48 - dna.seedShape * 10}% ${50 + dna.seedShape * 8}% ${50}% / ${56 + dna.seedShape * 10}% ${54}% ${48}% ${46 - dna.seedShape * 8}%`,
          background:
            "linear-gradient(160deg, rgba(234,251,242,0.16), rgba(8,17,13,0.5))",
          border: "1px solid rgba(234,251,242,0.18)",
          boxShadow: `inset 0 0 24px ${glow}, 0 0 30px -8px ${glow}`,
          opacity: withered ? 0.4 : 1,
        }}
        animate={{ scale: [1, 1.03, 1] }}
        transition={{ duration: pulse, repeat: Infinity, ease: "easeInOut" }}
      >
        {/* embryo */}
        <motion.div
          aria-hidden
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            width: size * 0.2,
            height: size * 0.2,
            background: dna.innerColor,
            boxShadow: `0 0 18px 4px ${dna.innerColor}`,
          }}
          animate={{
            opacity: withered ? 0.2 : [0.5, 1, 0.5],
            scale: state === "blooming" ? [1, 1.4, 1] : [1, 1.12, 1],
          }}
          transition={{ duration: pulse * 0.6, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* stirring crack lines */}
        {(state === "stirring" || state === "rooting" || state === "blooming") && (
          <motion.span
            aria-hidden
            className="absolute left-1/2 top-1/2 h-[60%] w-[1px] -translate-x-1/2 -translate-y-1/2"
            style={{ background: `linear-gradient(${dna.innerColor}, transparent)` }}
            animate={{ opacity: [0.2, 0.7, 0.2] }}
            transition={{ duration: pulse * 0.5, repeat: Infinity }}
          />
        )}
      </motion.div>
    </div>
  );
}
