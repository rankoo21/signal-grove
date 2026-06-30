"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { useGroveStore } from "@/store/useGroveStore";
import { GlyphButton } from "@/components/ui/GlyphButton";
import { MotionText } from "@/components/ui/MotionText";

const PLACEHOLDERS = [
  "Wake when GenLayer announces a builder opportunity.",
  "Stir when docs about Intelligent Contracts change.",
  "Bloom when a new Spanish community initiative appears.",
  "Listen for hackathons, grants, or ecosystem calls.",
  "Watch for new testnet activity.",
];

// Entry zone. Replaces the landing page. Write an intent into a glowing soil
// fissure; words fall as pollen; on plant, transition to the Sculptor.
export function DarkSoil() {
  const draft = useGroveStore((s) => s.draft);
  const setDraft = useGroveStore((s) => s.setDraft);
  const plantSeed = useGroveStore((s) => s.plantSeed);
  const setZone = useGroveStore((s) => s.setZone);
  const busy = useGroveStore((s) => s.busy);
  const error = useGroveStore((s) => s.error);
  const [placeholder] = useState(
    () => PLACEHOLDERS[Math.floor(Math.random() * PLACEHOLDERS.length)],
  );

  const handlePlant = async () => {
    await plantSeed();
    if (useGroveStore.getState().activeSeedId && !useGroveStore.getState().error) {
      setZone("sculptor");
    }
  };

  return (
    <section className="relative mx-auto flex min-h-[calc(100vh-7rem)] max-w-3xl flex-col items-center justify-center px-6 text-center">
      {/* glossy soil field with central crack */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 -z-0 h-[420px] w-[680px] -translate-x-1/2 -translate-y-1/2 rounded-[50%]"
        style={{
          background:
            "radial-gradient(circle at 50% 60%, rgba(124,255,178,0.1), transparent 65%)",
        }}
        animate={{ opacity: [0.5, 0.9, 0.5] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.h1
        className="font-display text-4xl font-medium leading-tight text-bio-mist sm:text-6xl"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        Plant your first signal.
      </motion.h1>

      <p className="mt-5 max-w-md font-body text-sm text-bio-mist/55 sm:text-base">
        <MotionText
          text="Write an intent. The garden will grow around it."
          delay={0.3}
        />
      </p>

      <div className="relative mt-12 w-full">
        <textarea
          value={draft.intent}
          onChange={(e) => setDraft({ intent: e.target.value })}
          placeholder={placeholder}
          rows={3}
          dir="auto"
          aria-label="Write your intent into the soil"
          className="soil-fissure w-full resize-none px-7 py-6 text-center font-display text-lg leading-relaxed sm:text-xl"
        />
        {/* falling pollen when typing */}
        {draft.intent.length > 0 && (
          <motion.div
            aria-hidden
            className="pointer-events-none absolute -bottom-2 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-bio-green"
            animate={{ y: [0, 24], opacity: [1, 0] }}
            transition={{ duration: 1.4, repeat: Infinity }}
            style={{ boxShadow: "0 0 8px 2px rgba(124,255,178,0.8)" }}
          />
        )}
      </div>

      {error && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-4 font-body text-sm text-bio-amber"
        >
          {error}
        </motion.p>
      )}

      <div className="mt-10">
        <GlyphButton onClick={handlePlant} disabled={busy} large tone="green">
          {busy ? "planting..." : "Plant Signal"}
        </GlyphButton>
      </div>

      <p className="mt-8 font-body text-xs tracking-wide text-bio-mist/35">
        A seed begins with intent.
      </p>
    </section>
  );
}
