import Link from "next/link";
import { ProductSpecEditor } from "../../components/spec/ProductSpecEditor";
import { ProductSpecStatus } from "../../components/spec/ProductSpecStatus";
import {
  getCurrentProductSpec,
  type CurrentProductSpec,
} from "../../lib/db/product-specs";
import { saveProductSpecAction } from "./actions";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ReadyProductSpec = Extract<CurrentProductSpec, { status: "ready" }>;

type ProductSpecLoadResult =
  | {
      status: "loaded";
      currentSpec: CurrentProductSpec;
    }
  | {
      status: "database_error";
      message: string;
    };

async function loadCurrentProductSpec(): Promise<ProductSpecLoadResult> {
  try {
    return {
      status: "loaded",
      currentSpec: await getCurrentProductSpec(),
    };
  } catch (error) {
    return {
      status: "database_error",
      message:
        error instanceof Error ? error.message : "Unknown database error.",
    };
  }
}

function SetupCommands() {
  const commands = [
    "docker compose up -d postgres",
    "pnpm db:push",
    "pnpm db:seed",
    "pnpm dev",
  ];

  return (
    <div className="rounded-2xl border border-amber-300/20 bg-amber-300/10 p-5">
      <h2 className="text-lg font-semibold text-amber-100">
        Demo data is not ready yet
      </h2>
      <p className="mt-2 text-sm leading-6 text-amber-100/80">
        The product spec editor needs the local PostgreSQL database and demo
        seed data. Run these commands locally, then reload this page.
      </p>
      <div className="mt-4 space-y-2">
        {commands.map((command) => (
          <code
            className="block rounded-lg bg-slate-950 px-3 py-2 text-sm text-slate-100"
            key={command}
          >
            {command}
          </code>
        ))}
      </div>
    </div>
  );
}

function PageShell({
  children,
  eyebrow = "ForgePilot",
  eyebrowClassName = "text-sky-300",
  description,
}: {
  children: React.ReactNode;
  eyebrow?: string;
  eyebrowClassName?: string;
  description: string;
}) {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
      <div className="mx-auto max-w-5xl space-y-8">
        <Link className="text-sm text-sky-300 hover:text-sky-200" href="/">
          ← Back to overview
        </Link>

        <section className="space-y-3">
          <p
            className={`text-sm uppercase tracking-[0.35em] ${eyebrowClassName}`}
          >
            {eyebrow}
          </p>
          <h1 className="text-4xl font-bold tracking-tight">
            Product spec editor
          </h1>
          <p className="max-w-3xl text-slate-400">{description}</p>
        </section>

        {children}
      </div>
    </main>
  );
}

function MissingDemoDataState() {
  return (
    <PageShell description="Edit the active ForgePilot product specification through the Prisma persistence layer.">
      <SetupCommands />
    </PageShell>
  );
}

function DatabaseErrorState({ message }: { message: string }) {
  return (
    <PageShell
      description="The editor is available, but the local database connection failed."
      eyebrow="Database unavailable"
      eyebrowClassName="text-red-300"
    >
      <div className="rounded-2xl border border-red-300/20 bg-red-300/10 p-5">
        <p className="text-sm leading-6 text-red-100">{message}</p>
      </div>

      <SetupCommands />
    </PageShell>
  );
}

function ReadyEditorState({ currentSpec }: { currentSpec: ReadyProductSpec }) {
  return (
    <PageShell description="Edit the current product specification. This is the first ForgePilot feature backed by the Prisma/PostgreSQL persistence foundation.">
      <ProductSpecStatus
        productName={currentSpec.product.name}
        productSlug={currentSpec.product.slug}
        updatedAt={currentSpec.spec.updatedAt.toISOString()}
        version={currentSpec.spec.version}
      />

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <ProductSpecEditor
          action={saveProductSpecAction}
          content={currentSpec.spec.content}
          title={currentSpec.spec.title}
        />
      </section>
    </PageShell>
  );
}

export default async function ProductSpecPage() {
  const result = await loadCurrentProductSpec();

  if (result.status === "database_error") {
    return <DatabaseErrorState message={result.message} />;
  }

  if (result.currentSpec.status !== "ready") {
    return <MissingDemoDataState />;
  }

  return <ReadyEditorState currentSpec={result.currentSpec} />;
}
