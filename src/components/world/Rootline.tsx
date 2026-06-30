"use client";

import { motion } from "framer-motion";
import { useGroveStore } from "@/store/useGroveStore";

const SAP_TEXT =
  "GenLayer \u00b7 Signal Grove \u00b7 Intelligent Contract Pulse \u00b7 Testnet Growth Mode";

// Footer replacement: a thin living root network with text flowing like sap.
// Dims while the user is acting (busy), breathes while idle.
export function Rootline() {
  const busy = useGroveStore((s) => s.busy);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 h-16">
      <svg
        viewBox="0 0 1200 60"
        preserveAspectRatio="none"
        className="absolute inset-x-0 bottom-0 h-12 w-full"
        aria-hidden
      >
        <defs>
          <linearGradient id="sap" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#7CFFB2" stopOpacity="0" />
            <stop offset="50%" stopColor="#7CFFB2" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#8DDCFF" stopOpacity="0" />
          </linearGradient>
        </defs>
        <motion.path
          d="M0 50 C 150 50 180 26 320 28 C 460 30 520 50 660 46 C 800 42 860 22 1000 26 C 1100 28 1160 46 1200 44"
          fill="none"
          stroke="rgba(124,255,178,0.18)"
          strokeWidth="1.2"
        />
        <motion.path
          d="M0 50 C 150 50 180 26 320 28 C 460 30 520 50 660 46 C 800 42 860 22 1000 26 C 1100 28 1160 46 1200 44"
          fill="none"
          stroke="url(#sap)"
          strokeWidth="2"
          strokeDasharray="120 1080"
          animate={{ strokeDashoffset: [0, -1200] }}
          transition={{ duration: 9, repeat: Infinity, ease: "linear" }}
        />
        {/* small branch roots */}
        <path d="M320 28 l-12 18 M660 46 l10 12 M1000 26 l-8 16" stroke="rgba(124,255,178,0.12)" strokeWidth="1" fill="none" />
      </svg>
      <motion.p
        animate={{ opacity: busy ? 0.18 : [0.4, 0.7, 0.4] }}
        transition={{ duration: busy ? 0.4 : 6, repeat: busy ? 0 : Infinity, ease: "easeInOut" }}
        className="absolute inset-x-0 bottom-2 text-center font-display text-[11px] tracking-[0.3em] text-bio-green/70"
      >
        {SAP_TEXT}
      </motion.p>
    </div>
  );
}
