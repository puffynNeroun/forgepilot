type ProductSpecStatusProps = {
  productName: string;
  productSlug: string;
  version: number;
  updatedAt: string;
};

export function ProductSpecStatus({
  productName,
  productSlug,
  version,
  updatedAt,
}: ProductSpecStatusProps) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="grid gap-4 sm:grid-cols-4">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
            Product
          </p>
          <p className="mt-2 font-medium text-slate-100">{productName}</p>
        </div>

        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
            Slug
          </p>
          <p className="mt-2 font-mono text-sm text-slate-300">{productSlug}</p>
        </div>

        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
            Version
          </p>
          <p className="mt-2 font-medium text-slate-100">v{version}</p>
        </div>

        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
            Updated
          </p>
          <p className="mt-2 text-sm text-slate-300">
            {new Intl.DateTimeFormat("en", {
              dateStyle: "medium",
              timeStyle: "short",
            }).format(new Date(updatedAt))}
          </p>
        </div>
      </div>
    </section>
  );
}
