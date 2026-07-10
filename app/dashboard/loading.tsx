export default function DashboardLoading() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <div className="h-64 animate-pulse rounded-3xl border border-white/10 bg-white/[0.03]" />
        <div className="grid gap-4 md:grid-cols-5">
          <div className="h-28 animate-pulse rounded-3xl border border-white/10 bg-white/[0.03]" />
          <div className="h-28 animate-pulse rounded-3xl border border-white/10 bg-white/[0.03]" />
          <div className="h-28 animate-pulse rounded-3xl border border-white/10 bg-white/[0.03]" />
          <div className="h-28 animate-pulse rounded-3xl border border-white/10 bg-white/[0.03]" />
          <div className="h-28 animate-pulse rounded-3xl border border-white/10 bg-white/[0.03]" />
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="h-56 animate-pulse rounded-3xl border border-white/10 bg-white/[0.03]" />
          <div className="h-56 animate-pulse rounded-3xl border border-white/10 bg-white/[0.03]" />
        </div>
      </div>
    </main>
  );
}
