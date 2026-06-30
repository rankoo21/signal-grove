"use client";

import { useId } from "react";

interface LivingInputProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  tone?: "soil" | "glass";
}

// A labelled input styled as living tissue rather than a form field.
export function LivingInput({
  label,
  value,
  onChange,
  placeholder,
  multiline,
  tone = "glass",
}: LivingInputProps) {
  const id = useId();
  const base =
    tone === "soil"
      ? "soil-fissure px-6 py-5 text-lg rounded-2xl"
      : "px-4 py-3 rounded-2xl bg-black/30 border border-bio-green/15 focus:border-bio-green/40 outline-none text-mist transition-colors";
  return (
    <label htmlFor={id} className="block">
      <span className="mb-2 block font-display text-xs uppercase tracking-[0.25em] text-bio-green/70">
        {label}
      </span>
      {multiline ? (
        <textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className={`w-full resize-none text-bio-mist ${base}`}
        />
      ) : (
        <input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full text-bio-mist ${base}`}
        />
      )}
    </label>
  );
}
