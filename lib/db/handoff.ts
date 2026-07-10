import { prisma } from "../prisma";

const DEMO_PRODUCT_SLUG = "forgepilot";

export type HandoffBreakdown = {
  label: string;
  value: number;
};

export type HandoffSurfaceLink = {
  href: string;
  label: string;
  description: string;
};

export type HandoffSummaryData =
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
      spec: {
        exists: boolean;
        title: string | null;
        version: number | null;
        updatedAt: Date | null;
      };
      counts: {
        tasks: number;
        dogfoodingEntries: number;
        decisions: number;
        releases: number;
      };
      breakdowns: {
        tasks: HandoffBreakdown[];
        dogfooding: HandoffBreakdown[];
        releases: HandoffBreakdown[];
      };
      surfaces: HandoffSurfaceLink[];
      handoffMarkdown: string;
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

function summarizeValues(values: unknown[]): HandoffBreakdown[] {
  const counts = values.reduce<Record<string, number>>((result, value) => {
    const label = formatLabel(value);
    result[label] = (result[label] ?? 0) + 1;
    return result;
  }, {});

  return Object.entries(counts)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
}

function renderBreakdown(items: HandoffBreakdown[]): string {
  if (items.length === 0) {
    return "- none";
  }

  return items.map((item) => `- ${item.label}: ${item.value}`).join("\n");
}

function formatDate(date: Date | null): string {
  if (!date) {
    return "not set";
  }

  return date.toISOString().slice(0, 10);
}

function buildHandoffMarkdown(input: {
  product: {
    slug: string;
    name: string;
    summary: string;
    status: string;
    updatedAt: Date;
  };
  spec: {
    exists: boolean;
    title: string | null;
    version: number | null;
    updatedAt: Date | null;
  };
  counts: {
    tasks: number;
    dogfoodingEntries: number;
    decisions: number;
    releases: number;
  };
  breakdowns: {
    tasks: HandoffBreakdown[];
    dogfooding: HandoffBreakdown[];
    releases: HandoffBreakdown[];
  };
  surfaces: HandoffSurfaceLink[];
}): string {
  const specLine = input.spec.exists
    ? `${input.spec.title ?? "Untitled spec"} v${input.spec.version ?? "?"}, updated ${formatDate(input.spec.updatedAt)}`
    : "missing";

  return [
    "# ForgePilot handoff",
    "",
    "## Product",
    `- Name: ${input.product.name}`,
    `- Slug: ${input.product.slug}`,
    `- Status: ${input.product.status}`,
    `- Updated: ${formatDate(input.product.updatedAt)}`,
    `- Summary: ${input.product.summary}`,
    "",
    "## Current surfaces",
    ...input.surfaces.map((surface) => `- ${surface.href} — ${surface.label}: ${surface.description}`),
    "",
    "## Product spec",
    `- State: ${specLine}`,
    "",
    "## Task summary",
    `- Total tasks: ${input.counts.tasks}`,
    renderBreakdown(input.breakdowns.tasks),
    "",
    "## Dogfooding summary",
    `- Total entries: ${input.counts.dogfoodingEntries}`,
    renderBreakdown(input.breakdowns.dogfooding),
    "",
    "## Decisions",
    `- Total decisions: ${input.counts.decisions}`,
    "",
    "## Releases",
    `- Total releases: ${input.counts.releases}`,
    renderBreakdown(input.breakdowns.releases),
    "",
    "## Suggested next step",
    "- Continue from Forge Next and define the next narrow task.",
    "- Keep changes scoped through the Forge lifecycle: Planner, Builder, Tester, Reviewer, PR, completion.",
    "",
    "## Boundary",
    "- This handoff is deterministic and read-only.",
    "- No AI-generated summary, database write, snapshot persistence, release automation, or deployment was performed.",
  ].join("\n");
}

export async function getHandoffSummaryData(): Promise<HandoffSummaryData> {
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

    const [latestSpec, tasks, dogfoodingEntries, decisionCount, releases] =
      await Promise.all([
        prisma.productSpec.findFirst({
          where: {
            productId: product.id,
          },
          orderBy: [
            {
              version: "desc",
            },
            {
              updatedAt: "desc",
            },
          ],
          select: {
            title: true,
            version: true,
            updatedAt: true,
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

    const surfaces: HandoffSurfaceLink[] = [
      {
        href: "/spec",
        label: "Product spec",
        description: "product direction and specification",
      },
      {
        href: "/tasks",
        label: "Tasks",
        description: "Forge task board",
      },
      {
        href: "/dogfooding",
        label: "Dogfooding",
        description: "workflow friction and learning log",
      },
      {
        href: "/decisions",
        label: "Decisions",
        description: "decision log",
      },
      {
        href: "/releases",
        label: "Releases",
        description: "release timeline",
      },
      {
        href: "/dashboard",
        label: "Dashboard",
        description: "product overview dashboard",
      },
    ];

    const counts = {
      tasks: tasks.length,
      dogfoodingEntries: dogfoodingEntries.length,
      decisions: decisionCount,
      releases: releases.length,
    };

    const breakdowns = {
      tasks: summarizeValues(tasks.map((task) => task.status)),
      dogfooding: summarizeValues(dogfoodingEntries.map((entry) => entry.severity)),
      releases: summarizeValues(releases.map((release) => release.status)),
    };

    const spec = {
      exists: Boolean(latestSpec),
      title: latestSpec?.title ?? null,
      version: latestSpec?.version ?? null,
      updatedAt: latestSpec?.updatedAt ?? null,
    };

    const readyData = {
      state: "ready" as const,
      product: {
        ...product,
        status: formatLabel(product.status),
      },
      spec,
      counts,
      breakdowns,
      surfaces,
    };

    return {
      ...readyData,
      handoffMarkdown: buildHandoffMarkdown(readyData),
    };
  } catch (error) {
    return {
      state: "database_error",
      message: error instanceof Error ? error.message : "Unknown database error",
    };
  }
}
