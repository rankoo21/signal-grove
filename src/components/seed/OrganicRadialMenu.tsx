"use client";

import { AnimatePresence, motion } from "framer-motion";

export interface RadialAction {
  id: string;
  label: string;
  tone?: "green" | "ice" | "gold" | "violet";
  onSelect: () => void;
}

interface OrganicRadialMenuProps {
  open: boolean;
  actions: RadialAction[];
  radius?: number;
}

const TONE_COLOR: Record<string, string> = {
  green: "#7CFFB2",
  ice: "#8DDCFF",
  gold: "#FFD978",
  violet: "#C9B3FF",
};

// Small organic controls that orbit a seed instead of a button row.
export function OrganicRadialMenu({
  open,
  actions,
  radius = 86,
}: OrganicRadialMenuProps) {
  const step = (2 * Math.PI) / Math.max(actions.length, 1);
  return (
    <AnimatePresence>
      {open && (
        <div className="pointer-events-none absolute inset-0">
          {actions.map((a, i) => {
            const angle = -Math.PI / 2 + i * step;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            const color = TONE_COLOR[a.tone ?? "green"];
            return (
              <motion.button
                key={a.id}
                initial={{ opacity: 0, x: 0, y: 0, scale: 0.4 }}
                animate={{ opacity: 1, x, y, scale: 1 }}
                exit={{ opacity: 0, x: 0, y: 0, scale: 0.4 }}
                transition={{ delay: i * 0.04, type: "spring", stiffness: 200, damping: 18 }}
                onClick={(e) => {
                  e.stopPropagation();
                  a.onSelect();
                }}
                className="pointer-events-auto absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full px-3 py-1.5 font-display text-[11px] tracking-wide"
                style={{
                  color,
                  border: `1px solid ${color}66`,
                  background: "rgba(8,17,13,0.8)",
                  boxShadow: `0 0 16px -6px ${color}`,
                }}
              >
                {a.label}
              </motion.button>
            );
          })}
        </div>
      )}
    </AnimatePresence>
  );
}
