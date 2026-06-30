"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface GlyphButtonProps {
  children: ReactNode;
  onClick?: () => void;
  tone?: "green" | "ice" | "gold" | "violet";
  disabled?: boolean;
  ariaLabel?: string;
  large?: boolean;
}

const TONES = {
  green: { ring: "rgba(124,255,178,0.5)", glow: "rgba(124,255,178,0.4)", text: "#7CFFB2" },
  ice: { ring: "rgba(141,220,255,0.5)", glow: "rgba(141,220,255,0.4)", text: "#8DDCFF" },
  gold: { ring: "rgba(255,217,120,0.5)", glow: "rgba(255,217,120,0.4)", text: "#FFD978" },
  violet: { ring: "rgba(160,120,235,0.55)", glow: "rgba(120,80,210,0.45)", text: "#C9B3FF" },
};

// A glowing organic "press" rather than a rectangular button.
export function GlyphButton({
  children,
  onClick,
  tone = "green",
  disabled,
  ariaLabel,
  large,
}: GlyphButtonProps) {
  const t = TONES[tone];
  return (
    <motion.button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      disabled={disabled}
      whileHover={disabled ? undefined : { scale: 1.04 }}
      whileTap={disabled ? undefined : { scale: 0.97 }}
      className={`group relative inline-flex items-center justify-center rounded-full font-display tracking-wide transition-opacity ${
        large ? "px-9 py-4 text-lg" : "px-6 py-2.5 text-sm"
      } ${disabled ? "opacity-40" : "opacity-100"}`}
      style={{
        color: t.text,
        border: `1px solid ${t.ring}`,
        background:
          "linear-gradient(150deg, rgba(234,251,242,0.05), rgba(8,17,13,0.55))",
        boxShadow: disabled ? "none" : `0 0 26px -10px ${t.glow}`,
      }}
    >
      <span
        className="absolute inset-0 rounded-full opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{ boxShadow: `inset 0 0 26px -4px ${t.glow}` }}
      />
      <span className="relative">{children}</span>
    </motion.button>
  );
}
