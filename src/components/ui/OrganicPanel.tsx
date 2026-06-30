"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface OrganicPanelProps {
  children: ReactNode;
  className?: string;
}

export function OrganicPanel({ children, className = "" }: OrganicPanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={`organic-glass rounded-3xl ${className}`}
    >
      {children}
    </motion.div>
  );
}
