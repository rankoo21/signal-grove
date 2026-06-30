"use client";

import { motion } from "framer-motion";

interface BloomPetalProps {
  index: number;
  label: string;
  body: string;
  tone: string;
}

// One holographic petal panel in the Bloom Theater.
export function BloomPetal({ index, label, body, tone }: BloomPetalProps) {
  return (
    <motion.div
      initial={{ opacity: 0, rotateX: -40, y: 20 }}
      animate={{ opacity: 1, rotateX: 0, y: 0 }}
      transition={{ delay: 0.3 + index * 0.18, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className="organic-glass relative overflow-hidden rounded-3xl p-6"
      style={{ transformPerspective: 800 }}
    >
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-[2px]"
        style={{ background: `linear-gradient(90deg, transparent, ${tone}, transparent)` }}
      />
      <p
        className="font-display text-xs uppercase tracking-[0.3em]"
        style={{ color: tone }}
      >
        {label}
      </p>
      <p className="mt-3 font-body text-sm leading-relaxed text-bio-mist/85">{body}</p>
    </motion.div>
  );
}
