export default function TasksLoading() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="h-4 w-40 rounded bg-white/10" />
        <div className="h-12 w-80 rounded bg-white/10" />
        <div className="grid gap-4 sm:grid-cols-4">
          {["total", "active", "ready", "done"].map((item) => (
            <div
              className="h-28 rounded-2xl border border-white/10 bg-white/[0.03]"
              key={item}
            />
          ))}
        </div>
      </div>
    </main>
  );
}
