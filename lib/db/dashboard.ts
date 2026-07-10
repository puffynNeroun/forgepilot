import { prisma } from "../prisma";

const DEMO_PRODUCT_SLUG = "forgepilot";

export type DashboardBreakdown = {
  label: string;
  value: number;
};

export type DashboardSurfaceSummary = {
  href: string;
  label: string;
  description: string;
  value: string;
  meta: string;
  breakdown: DashboardBreakdown[];
};

export type DashboardOverviewData =
  | {
      state: "ready";
      product: {
        id: string;
        slug: string;
        name: string;
        summary: string;
        status: string;
        updatedAt: Date;
      };
      surfaces: DashboardSurfaceSummary[];
      totals: {
        specCount: number;
        taskCount: number;
        dogfoodingCount: number;
        decisionCount: number;
        releaseCount: number;
      };
    }
  | {
      state: "missing_product";
      slug: string;
    }
  | {
      state: "database_error";
      message: string;
    };

function formatLabel(value: unknown): string {
  const raw = String(value ?? "unknown").trim();

  if (!raw || raw === "unknown") {
    return "Unknown";
  }

  return raw
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function summarizeValues(values: unknown[]): DashboardBreakdown[] {
  const counts = values.reduce<Record<string, number>>((result, value) => {
    const label = formatLabel(value);
    result[label] = (result[label] ?? 0) + 1;
    return result;
  }, {});

  return Object.entries(counts)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
}

function totalLabel(total: number, singular: string, plural: string): string {
  return `${total} ${total === 1 ? singular : plural}`;
}

export async function getDashboardOverviewData(): Promise<DashboardOverviewData> {
  try {
    const product = await prisma.product.findUnique({
      where: {
        slug: DEMO_PRODUCT_SLUG,
      },
      select: {
        id: true,
        slug: true,
        name: true,
        summary: true,
        status: true,
        updatedAt: true,
      },
    });

    if (!product) {
      return {
        state: "missing_product",
        slug: DEMO_PRODUCT_SLUG,
      };
    }

    const [specCount, tasks, dogfoodingEntries, decisionCount, releases] =
      await Promise.all([
        prisma.productSpec.count({
          where: {
            productId: product.id,
          },
        }),
        prisma.forgeTask.findMany({
          where: {
            productId: product.id,
          },
          select: {
            status: true,
          },
        }),
        prisma.dogfoodingEntry.findMany({
          where: {
            productId: product.id,
          },
          select: {
            severity: true,
          },
        }),
        prisma.decision.count({
          where: {
            productId: product.id,
          },
        }),
        prisma.productRelease.findMany({
          where: {
            productId: product.id,
          },
          select: {
            status: true,
          },
        }),
      ]);

    const taskCount = tasks.length;
    const dogfoodingCount = dogfoodingEntries.length;
    const releaseCount = releases.length;

    return {
      state: "ready",
      product: {
        ...product,
        status: formatLabel(product.status),
      },
      totals: {
        specCount,
        taskCount,
        dogfoodingCount,
        decisionCount,
        releaseCount,
      },
      surfaces: [
        {
          href: "/spec",
          label: "Product spec",
          description: "Current product direction and editable specification surface.",
          value: specCount > 0 ? "Ready" : "Missing",
          meta: totalLabel(specCount, "spec record", "spec records"),
          breakdown: [],
        },
        {
          href: "/tasks",
          label: "Tasks",
          description: "Forge task board status across the current product.",
          value: String(taskCount),
          meta: totalLabel(taskCount, "task", "tasks"),
          breakdown: summarizeValues(tasks.map((task) => task.status)),
        },
        {
          href: "/dogfooding",
          label: "Dogfooding",
          description: "Workflow friction and product-learning entries.",
          value: String(dogfoodingCount),
          meta: totalLabel(dogfoodingCount, "entry", "entries"),
          breakdown: summarizeValues(dogfoodingEntries.map((entry) => entry.severity)),
        },
        {
          href: "/decisions",
          label: "Decisions",
          description: "Documented product and architecture decisions.",
          value: String(decisionCount),
          meta: totalLabel(decisionCount, "decision", "decisions"),
          breakdown: [],
        },
        {
          href: "/releases",
          label: "Releases",
          description: "Planned, active, shipped, or cancelled product releases.",
          value: String(releaseCount),
          meta: totalLabel(releaseCount, "release", "releases"),
          breakdown: summarizeValues(releases.map((release) => release.status)),
        },
      ],
    };
  } catch (error) {
    return {
      state: "database_error",
      message: error instanceof Error ? error.message : "Unknown database error",
    };
  }
}
