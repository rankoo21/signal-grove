"use client";

import { motion } from "framer-motion";

interface MotionTextProps {
  text: string;
  className?: string;
  delay?: number;
}

// Reveals a line word by word, like veins lighting up.
export function MotionText({ text, className = "", delay = 0 }: MotionTextProps) {
  const words = text.split(" ");
  return (
    <span className={className} aria-label={text}>
      {words.map((w, i) => (
        <motion.span
          key={`${w}-${i}`}
          aria-hidden
          className="inline-block"
          initial={{ opacity: 0, y: 8, filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ delay: delay + i * 0.04, duration: 0.5 }}
        >
          {w}
          {i < words.length - 1 ? "\u00a0" : ""}
        </motion.span>
      ))}
    </span>
  );
}
