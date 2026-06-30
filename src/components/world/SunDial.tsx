"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { useGroveStore, type Zone } from "@/store/useGroveStore";

interface ZoneDef {
  id: Zone;
  label: string;
  glyph: JSX.Element;
}

// Custom glyphs (not generic icons) for each living zone.
const G = {
  soil: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M3 16h18M5 16c1-3 3-4 4-2M11 16c1-4 4-5 5-2M17 16c.5-2 2-3 3-2" strokeLinecap="round" />
    </svg>
  ),
  sculptor: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.4">
      <ellipse cx="12" cy="12" rx="5" ry="7" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" />
    </svg>
  ),
  roots: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M12 3v8M12 11c0 4-3 5-4 9M12 11c0 4 3 5 4 9M12 11c-3 1-5 3-7 4M12 11c3 1 5 3 7 4" strokeLinecap="round" />
    </svg>
  ),
  grove: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.4">
      <circle cx="7" cy="9" r="2.4" />
      <circle cx="16" cy="7" r="2" />
      <circle cx="13" cy="15" r="2.6" />
      <path d="M7 11v4M16 9v3M13 18v3" strokeLinecap="round" />
    </svg>
  ),
  bloom: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.4">
      <circle cx="12" cy="12" r="2" />
      <path d="M12 12c0-4 2-6 0-9M12 12c0-4-2-6 0-9M12 12c4 0 6 2 9 0M12 12c4 0 6-2 9 0M12 12c0 4 2 6 0 9M12 12c0 4-2 6 0 9M12 12c-4 0-6 2-9 0M12 12c-4 0-6-2-9 0" />
    </svg>
  ),
  spores: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.4">
      <circle cx="8" cy="9" r="1.6" />
      <circle cx="15" cy="7" r="1.2" />
      <circle cx="16" cy="14" r="1.8" />
      <circle cx="9" cy="16" r="1.3" />
      <circle cx="12" cy="11" r="1" />
    </svg>
  ),
};

const ZONES: ZoneDef[] = [
  { id: "soil", label: "Soil", glyph: G.soil },
  { id: "sculptor", label: "Sculptor", glyph: G.sculptor },
  { id: "roots", label: "Roots", glyph: G.roots },
  { id: "grove", label: "Grove", glyph: G.grove },
  { id: "bloom", label: "Blooms", glyph: G.bloom },
  { id: "spores", label: "Spores", glyph: G.spores },
];

// A small artificial sun. Idle: breathes. Hover/tap: expands into zone glyphs.
export function SunDial() {
  const [open, setOpen] = useState(false);
  const zone = useGroveStore((s) => s.zone);
  const setZone = useGroveStore((s) => s.setZone);
  const activeIndex = ZONES.findIndex((z) => z.id === zone);

  return (
    <div
      className="fixed right-6 top-6 z-40 sm:right-8 sm:top-8"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <div className="relative flex h-16 w-16 items-center justify-center">
        {/* rotating rings */}
        <motion.div
          aria-hidden
          className="absolute inset-0 rounded-full border border-bio-gold/30"
          animate={{ rotate: 360 }}
          transition={{ duration: 50, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          aria-hidden
          className="absolute inset-2 rounded-full border border-bio-green/25"
          animate={{ rotate: -360 }}
          transition={{ duration: 38, repeat: Infinity, ease: "linear" }}
        />
        {/* the sun core */}
        <motion.button
          aria-label="Sun Dial navigation"
          onClick={() => setOpen((o) => !o)}
          className="relative h-9 w-9 rounded-full"
          style={{
            background:
              "radial-gradient(circle at 35% 30%, #FFF4CE, #FFD978 45%, #FFB86B 80%)",
            boxShadow: "0 0 28px -4px rgba(255,217,120,0.7)",
          }}
          animate={{ scale: [1, 1.08, 1], opacity: [0.85, 1, 0.85] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* orbiting spore showing active zone direction */}
        <motion.div
          aria-hidden
          className="absolute inset-0"
          animate={{ rotate: activeIndex * 60 }}
          transition={{ type: "spring", stiffness: 60, damping: 14 }}
        >
          <span
            className="absolute left-1/2 top-0 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-bio-green"
            style={{ boxShadow: "0 0 10px 2px rgba(124,255,178,0.8)" }}
          />
        </motion.div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.nav
            aria-label="Zones"
            initial={{ opacity: 0, scale: 0.9, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -6 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="organic-glass absolute right-0 top-20 flex flex-col gap-1 rounded-2xl p-2"
          >
            {ZONES.map((z) => {
              const active = z.id === zone;
              return (
                <button
                  key={z.id}
                  onClick={() => {
                    setZone(z.id);
                    setOpen(false);
                  }}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors ${
                    active
                      ? "bg-bio-green/15 text-bio-green"
                      : "text-bio-mist/70 hover:bg-white/5 hover:text-bio-mist"
                  }`}
                >
                  <span
                    style={{
                      filter: active
                        ? "drop-shadow(0 0 6px rgba(124,255,178,0.8))"
                        : "none",
                    }}
                  >
                    {z.glyph}
                  </span>
                  <span className="font-display text-sm tracking-wide">{z.label}</span>
                </button>
              );
            })}
          </motion.nav>
        )}
      </AnimatePresence>
    </div>
  );
}
