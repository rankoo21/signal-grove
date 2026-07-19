"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useGroveStore } from "@/store/useGroveStore";

// Living wallet object. A dim firefly before connection; a glowing one that
// trails the cursor subtly after. Address shows only on hover.
export function FireflyIdentity() {
  const walletAddress = useGroveStore((s) => s.walletAddress);
  const walletLabel = useGroveStore((s) => s.walletLabel);
  const callFirefly = useGroveStore((s) => s.callFirefly);
  const releaseFirefly = useGroveStore((s) => s.releaseFirefly);
  const [hover, setHover] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!walletAddress) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const onMove = (e: MouseEvent) => {
      // subtle drift toward cursor, not glued to it
      setPos({ x: (e.clientX - window.innerWidth / 2) * 0.01, y: (e.clientY - 80) * 0.01 });
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [walletAddress]);

  const connected = Boolean(walletAddress);

  return (
    <div
      className="fixed left-6 top-7 z-40 sm:left-8"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <button
        onClick={connected ? releaseFirefly : callFirefly}
        // Before connection this reads as a clear, bordered "Connect wallet"
        // pill so a first-time visitor immediately sees where to connect.
        // After connection it becomes the quiet firefly mark with the address.
        className={
          connected
            ? "flex items-center gap-3"
            : "flex items-center gap-2 rounded-full border border-bio-mist/40 bg-black/30 px-4 py-2 backdrop-blur-sm transition-colors duration-300 hover:border-bio-mist/70"
        }
        aria-label={connected ? "Release firefly (disconnect)" : "Connect wallet"}
      >
        <motion.span
          className="relative block h-3 w-3 rounded-full"
          animate={{
            x: connected ? pos.x : 0,
            y: connected ? pos.y : 0,
            opacity: connected ? [0.7, 1, 0.7] : [0.5, 0.9, 0.5],
          }}
          transition={{
            opacity: { duration: connected ? 2 : 3, repeat: Infinity, ease: "easeInOut" },
            x: { type: "spring", stiffness: 40, damping: 12 },
            y: { type: "spring", stiffness: 40, damping: 12 },
          }}
          style={{
            background: connected ? "#FFD978" : "#7CFFB2",
            boxShadow: connected
              ? "0 0 16px 4px rgba(255,217,120,0.8)"
              : "0 0 10px 2px rgba(124,255,178,0.6)",
          }}
        />
        <motion.span
          initial={false}
          animate={{ opacity: hover || !connected ? 1 : 0.45 }}
          className="font-display text-sm tracking-wide text-bio-mist/90"
        >
          {connected ? (hover ? `${walletLabel} · release` : "firefly lit") : "Connect wallet"}
        </motion.span>
      </button>
      {!connected && (
        <p
          className="mt-2 max-w-[15rem] font-display text-xs leading-relaxed text-bio-mist/50"
          style={{ letterSpacing: "0.04em" }}
        >
          Connect a Bradbury-funded wallet to plant and tend seeds. Viewing needs no wallet.
        </p>
      )}
    </div>
  );
}
