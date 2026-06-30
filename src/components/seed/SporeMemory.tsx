"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import type { Spore } from "@/lib/genlayer/types";
import { CATEGORY_LABELS, LANGUAGE_LABELS, relativeTime } from "@/utils/format";

interface SporeMemoryProps {
  spore: Spore;
  index: number;
}

type ExportFormat = "markdown" | "json" | "text" | "discord" | "x";

function buildExport(spore: Spore, format: ExportFormat): string {
  switch (format) {
    case "json":
      return JSON.stringify(spore, null, 2);
    case "markdown":
      return `# ${spore.title}\n\n**Intent:** ${spore.seedIntent}\n\n${spore.memoryText}\n\n**Source trail:** ${spore.sourceTrail}\n\n**Next move:** ${spore.suggestedNextMove}\n\n_Preserved ${new Date(spore.preservedAt).toISOString()} \u00b7 tx ${spore.mockTxHash}_`;
    case "discord":
      return `**${spore.title}**\n${spore.memoryText}\nSource: ${spore.sourceTrail}\nNext: ${spore.suggestedNextMove}`;
    case "x":
      return `${spore.title}\n\n${spore.memoryText}\n\nNext: ${spore.suggestedNextMove}\n\n#GenLayer #SignalGrove`;
    default:
      return `${spore.title}\n${spore.memoryText}\nSource: ${spore.sourceTrail}\nNext: ${spore.suggestedNextMove}`;
  }
}

// A luminous memory object that unfolds into a transparent biological document.
export function SporeMemory({ spore, index }: SporeMemoryProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const copy = async (format: ExportFormat) => {
    try {
      await navigator.clipboard.writeText(buildExport(spore, format));
      setCopied(format);
      setTimeout(() => setCopied(null), 1400);
    } catch {
      setCopied("failed");
      setTimeout(() => setCopied(null), 1400);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.05 }}
      className="relative"
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className="group flex w-full items-center gap-4 rounded-2xl border border-white/8 bg-black/20 p-4 text-left transition-colors hover:border-bio-violet/40"
      >
        <motion.span
          aria-hidden
          className="relative block h-8 w-8 shrink-0 rounded-full"
          style={{
            background: "radial-gradient(circle at 35% 30%, #C9B3FF, #4B2C7A)",
            boxShadow: "0 0 16px -2px rgba(160,120,235,0.6)",
          }}
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-sm text-bio-mist">{spore.title}</p>
          <p className="text-[11px] text-bio-mist/40">
            preserved {relativeTime(spore.preservedAt)} {"\u00b7"} {LANGUAGE_LABELS[spore.language]}
          </p>
        </div>
        <span className="font-display text-[11px] text-bio-violet/70">
          {open ? "fold" : "Unfold memory"}
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.4 }}
            className="overflow-hidden"
          >
            <div className="organic-glass mt-2 rounded-2xl p-5">
              <p className="font-body text-xs uppercase tracking-[0.25em] text-bio-green/60">
                Original intent
              </p>
              <p className="mt-1 font-body text-sm text-bio-mist/75">{spore.seedIntent}</p>

              <p className="mt-4 font-body text-xs uppercase tracking-[0.25em] text-bio-ice/60">
                What was kept
              </p>
              <p className="mt-1 font-body text-sm text-bio-mist/75">{spore.memoryText}</p>

              <p className="mt-4 font-body text-xs uppercase tracking-[0.25em] text-bio-gold/60">
                Source trail
              </p>
              <p className="mt-1 font-body text-sm text-bio-mist/75">{spore.sourceTrail}</p>

              <p className="mt-4 font-body text-xs uppercase tracking-[0.25em] text-bio-violet/70">
                Suggested next move
              </p>
              <p className="mt-1 font-body text-sm text-bio-mist/75">{spore.suggestedNextMove}</p>

              <div className="mt-4 flex flex-wrap gap-2">
                {spore.categories.map((c) => (
                  <span
                    key={c}
                    className="rounded-full border border-bio-ice/20 px-2.5 py-1 text-[10px] text-bio-ice/70"
                  >
                    {CATEGORY_LABELS[c]}
                  </span>
                ))}
              </div>

              <p className="mt-4 break-all font-mono text-[10px] text-bio-mist/30">
                preserved hash: {spore.mockTxHash}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                {(["markdown", "json", "text", "discord", "x"] as ExportFormat[]).map(
                  (f) => (
                    <button
                      key={f}
                      onClick={() => copy(f)}
                      className="rounded-full border border-white/10 px-3 py-1 text-[11px] text-bio-mist/55 transition-colors hover:border-bio-green/40 hover:text-bio-green"
                    >
                      {copied === f ? "copied pollen" : `Export ${f}`}
                    </button>
                  ),
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
