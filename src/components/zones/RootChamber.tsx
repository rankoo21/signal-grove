"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { useGroveStore } from "@/store/useGroveStore";
import { GlyphButton } from "@/components/ui/GlyphButton";
import { LivingInput } from "@/components/ui/LivingInput";
import { MOCK_SOURCES } from "@/data/mockSources";
import { relativeTime } from "@/utils/format";
import type { Root, RootHealth, RootType } from "@/lib/genlayer/types";

const ROOT_TYPES: { id: RootType; label: string }[] = [
  { id: "blog", label: "Official blog root" },
  { id: "docs", label: "Docs root" },
  { id: "social", label: "X / social root" },
  { id: "repository", label: "Repository root" },
  { id: "manual", label: "Manual text root" },
  { id: "custom-url", label: "Custom URL root" },
];

const HEALTH_COLOR: Record<RootHealth, string> = {
  fresh: "#7CFFB2",
  quiet: "#8DDCFF",
  clouded: "#FFD978",
  broken: "#FFB86B",
  manual: "#C9B3FF",
};

const HEALTH_LABEL: Record<RootHealth, string> = {
  fresh: "Fresh, glowing root",
  quiet: "Quiet, dim root",
  clouded: "Clouded root",
  broken: "Broken root",
  manual: "Manual paper fiber",
};

// Underground source attachment. Roots visibly grow toward the seed.
export function RootChamber() {
  const activeSeedId = useGroveStore((s) => s.activeSeedId);
  const seeds = useGroveStore((s) => s.seeds);
  const rootsBySeed = useGroveStore((s) => s.rootsBySeed);
  const attachRoot = useGroveStore((s) => s.attachRoot);
  const setZone = useGroveStore((s) => s.setZone);
  const busy = useGroveStore((s) => s.busy);
  const error = useGroveStore((s) => s.error);

  const seed = seeds.find((s) => s.id === activeSeedId) ?? null;
  const roots: Root[] = activeSeedId ? rootsBySeed[activeSeedId] ?? [] : [];

  const [type, setType] = useState<RootType>("blog");
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [content, setContent] = useState("");
  const [trustNote, setTrustNote] = useState("");

  const loadMock = (i: number) => {
    const m = MOCK_SOURCES[i % MOCK_SOURCES.length];
    setType(m.type);
    setLabel(m.label);
    setUrl(m.url);
    setContent(m.content);
    setTrustNote(m.trustNote);
  };

  const submit = async () => {
    await attachRoot({
      type,
      label: label.trim() || "Unnamed root",
      url: url.trim(),
      contentSnapshot: content.trim(),
      trustNote: trustNote.trim() || "No trust note.",
    });
    if (!useGroveStore.getState().error) {
      setLabel("");
      setUrl("");
      setContent("");
      setTrustNote("");
    }
  };

  if (!seed) {
    return (
      <section className="mx-auto max-w-2xl px-6 py-24 text-center">
        <p className="font-display text-xl text-bio-mist/70">
          No seed is selected. Plant one in the soil, or choose a seed from the grove.
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <GlyphButton tone="green" onClick={() => setZone("soil")}>
            Return to the soil
          </GlyphButton>
          <GlyphButton tone="ice" onClick={() => setZone("grove")}>
            Open the grove
          </GlyphButton>
        </div>
      </section>
    );
  }

  return (
    <section className="relative mx-auto max-w-5xl px-6 py-16">
      {/* crystalline chamber backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-0 opacity-40"
        style={{
          background:
            "radial-gradient(600px 400px at 20% 30%, rgba(141,220,255,0.08), transparent 70%), radial-gradient(500px 500px at 80% 70%, rgba(75,44,122,0.18), transparent 70%)",
        }}
      />

      <header className="mb-10">
        <p className="font-body text-xs uppercase tracking-[0.3em] text-bio-ice/60">
          Root Chamber
        </p>
        <h2 className="mt-2 font-display text-3xl text-bio-mist">Attach a root</h2>
        <p className="mt-2 font-body text-sm text-bio-mist/50">
          Roots carry public traces into the seed: <span className="text-bio-mist/80">{seed.name}</span>
        </p>
      </header>

      <div className="grid gap-10 lg:grid-cols-2">
        {/* attach form styled as living tissue */}
        <div className="space-y-5">
          <div>
            <span className="mb-2 block font-display text-xs uppercase tracking-[0.25em] text-bio-green/70">
              Root type
            </span>
            <div className="flex flex-wrap gap-2">
              {ROOT_TYPES.map((r) => {
                const active = type === r.id;
                return (
                  <button
                    key={r.id}
                    onClick={() => setType(r.id)}
                    className={`rounded-full border px-3 py-1.5 text-xs transition-all ${
                      active
                        ? "border-bio-green/60 bg-bio-green/10 text-bio-green"
                        : "border-white/10 text-bio-mist/55 hover:border-bio-green/30"
                    }`}
                  >
                    {r.label}
                  </button>
                );
              })}
            </div>
          </div>

          <LivingInput label="Root name" value={label} onChange={setLabel} placeholder="Official update stream" />
          <LivingInput label="Source URL" value={url} onChange={setUrl} placeholder="https://..." />
          <LivingInput
            label="Pasted content / snapshot"
            value={content}
            onChange={setContent}
            placeholder="Paste the public text this root should remember."
            multiline
          />
          <LivingInput label="Trust note" value={trustNote} onChange={setTrustNote} placeholder="Where this came from and how much to trust it." />

          {error && <p className="font-body text-sm text-bio-amber">{error}</p>}

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <GlyphButton tone="green" onClick={submit} disabled={busy}>
              {busy ? "feeding..." : "Feed the roots"}
            </GlyphButton>
            <div className="flex gap-2">
              {MOCK_SOURCES.slice(0, 3).map((_, i) => (
                <button
                  key={i}
                  onClick={() => loadMock(i)}
                  className="rounded-full border border-white/10 px-3 py-1 text-[11px] text-bio-mist/50 hover:border-bio-ice/40 hover:text-bio-ice"
                >
                  sample {i + 1}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* living root list */}
        <div className="relative">
          <div className="space-y-3">
            {roots.length === 0 && (
              <p className="font-body text-sm text-bio-mist/40">
                No roots yet. A quiet root may still remember. Attach one to begin.
              </p>
            )}
            {roots.map((root, i) => (
              <motion.div
                key={root.id}
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="organic-glass relative rounded-2xl p-4"
              >
                {/* growing root connector */}
                <motion.span
                  aria-hidden
                  className="absolute -left-6 top-1/2 hidden h-[1px] w-6 lg:block"
                  style={{ background: HEALTH_COLOR[root.health] }}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: i * 0.05 + 0.2 }}
                />
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-base text-bio-mist">{root.label}</p>
                    <p className="mt-0.5 text-[11px] uppercase tracking-wide text-bio-mist/40">
                      {root.type} root
                    </p>
                  </div>
                  <span
                    className="flex items-center gap-1.5 whitespace-nowrap text-[11px]"
                    style={{ color: HEALTH_COLOR[root.health] }}
                  >
                    <span
                      className="inline-block h-2 w-2 rounded-full"
                      style={{
                        background: HEALTH_COLOR[root.health],
                        boxShadow: `0 0 8px ${HEALTH_COLOR[root.health]}`,
                      }}
                    />
                    {HEALTH_LABEL[root.health]}
                  </span>
                </div>
                {root.contentSnapshot && (
                  <p className="mt-2 line-clamp-2 font-body text-xs text-bio-mist/50">
                    {root.contentSnapshot}
                  </p>
                )}
                <p className="mt-2 text-[11px] text-bio-mist/35">
                  {root.trustNote} {"\u00b7"} last pulse {relativeTime(root.lastCheckedAt)}
                </p>
              </motion.div>
            ))}
          </div>

          {roots.length > 0 && (
            <div className="mt-8 flex gap-4">
              <GlyphButton tone="ice" onClick={() => setZone("grove")}>
                Carry into the grove
              </GlyphButton>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
