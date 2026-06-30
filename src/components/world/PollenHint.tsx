"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useGroveStore, type Zone } from "@/store/useGroveStore";

// Glowing pollen hints instead of an onboarding wizard. One soft line per zone.
const HINTS: Record<Zone, string> = {
  soil: "The soil is waiting for an intent.",
  sculptor: "Shape its sensitivity. Choose what it hungers for.",
  roots: "Roots give the seed something to listen to.",
  grove: "Pulse the grove to wake possible signals.",
  bloom: "Blooms are moments worth preserving.",
  spores: "Kept blooms drift here as spore memory.",
};

export function PollenHint() {
  const zone = useGroveStore((s) => s.zone);
  return (
    <div className="pointer-events-none fixed bottom-20 left-1/2 z-30 -translate-x-1/2">
      <AnimatePresence mode="wait">
        <motion.p
          key={zone}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 0.6, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.6 }}
          className="flex items-center gap-2 font-body text-xs tracking-wide text-bio-mist/60"
        >
          <span
            className="inline-block h-1.5 w-1.5 rounded-full bg-bio-green"
            style={{ boxShadow: "0 0 8px 2px rgba(124,255,178,0.7)" }}
          />
          {HINTS[zone]}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}
