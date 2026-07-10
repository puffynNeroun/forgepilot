"use client";

import { useState } from "react";

type CopyState = "idle" | "copied" | "failed";

type HandoffCopyBlockProps = {
  value: string;
};

export function HandoffCopyBlock({ value }: HandoffCopyBlockProps) {
  const [copyState, setCopyState] = useState<CopyState>("idle");

  async function copyHandoff() {
    try {
      await navigator.clipboard.writeText(value);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-xl shadow-black/20">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Copyable handoff</h2>
          <p className="mt-1 text-sm text-slate-400">
            Deterministic markdown summary. No AI generation and no database write.
          </p>
        </div>

        <button
          className="rounded-full border border-sky-400/40 bg-sky-400/10 px-5 py-2 text-sm font-semibold text-sky-100 hover:border-sky-300 hover:bg-sky-400/20"
          onClick={copyHandoff}
          type="button"
        >
          {copyState === "copied" ? "Copied" : "Copy handoff"}
        </button>
      </div>

      {copyState === "failed" ? (
        <p className="mt-4 text-sm text-amber-200">
          Clipboard copy failed. Select the text below and copy it manually.
        </p>
      ) : null}

      <textarea
        className="mt-5 h-[34rem] w-full resize-y rounded-2xl border border-white/10 bg-black/30 p-4 font-mono text-sm leading-6 text-slate-100 outline-none"
        readOnly
        spellCheck={false}
        value={value}
      />
    </section>
  );
}
