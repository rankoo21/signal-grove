"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";
import { useGroveStore } from "@/store/useGroveStore";

// Transient living message (notice or error) that breathes in near the top.
export function NoticeBreath() {
  const notice = useGroveStore((s) => s.notice);
  const error = useGroveStore((s) => s.error);
  const clearMessages = useGroveStore((s) => s.clearMessages);

  useEffect(() => {
    if (notice || error) {
      const t = setTimeout(clearMessages, 3600);
      return () => clearTimeout(t);
    }
  }, [notice, error, clearMessages]);

  const message = error ?? notice;
  const isError = Boolean(error);

  return (
    <div className="pointer-events-none fixed left-1/2 top-24 z-50 -translate-x-1/2">
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.96 }}
            className="organic-glass rounded-full px-5 py-2.5"
            style={{
              borderColor: isError ? "rgba(255,184,107,0.4)" : "rgba(124,255,178,0.3)",
            }}
          >
            <p
              className="font-body text-sm"
              style={{ color: isError ? "#FFB86B" : "#7CFFB2" }}
            >
              {message}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
