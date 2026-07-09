import type { ReactNode } from "react";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-8 sm:px-8 lg:px-10">
      <header className="mb-10 flex flex-col gap-3 border-b border-white/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.35em] text-slate-400">
            ForgePilot
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            AI-assisted product development dashboard
          </h1>
        </div>

        <p className="max-w-sm text-sm leading-6 text-slate-400">
          Built through Project Forge to dogfood the workflow from product spec
          to release.
        </p>
      </header>

      {children}
    </main>
  );
}
