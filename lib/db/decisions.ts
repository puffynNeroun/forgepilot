import { prisma } from "../prisma";

const DEMO_PRODUCT_SLUG = "forgepilot";

const decisionSelect = {
  id: true,
  title: true,
  decision: true,
  context: true,
  createdAt: true,
  updatedAt: true,
} as const;

const decisionOrderBy = [
  { updatedAt: "desc" as const },
  { createdAt: "desc" as const },
];

const decisionFieldMap = {
  "id": "id",
  "title": "title",
  "summary": "decision",
  "rationale": "context",
  "status": null,
  "type": null,
  "category": null,
  "createdAt": "createdAt",
  "updatedAt": "updatedAt",
  "order": null
} as const;

export type DecisionStatusKey =
  | "accepted"
  | "active"
  | "approved"
  | "proposed"
  | "planned"
  | "rejected"
  | "deprecated"
  | "superseded"
  | "unknown";

export type DecisionLogItem = {
  id: string;
  title: string;
  summary: string | null;
  rationale: string | null;
  status: DecisionStatusKey;
  statusLabel: string;
  type: string | null;
  category: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
};

export type DecisionLogData =
  | {
      state: "ready";
      product: {
        id: string;
        slug: string;
        name: string;
        summary: string;
      };
      decisions: DecisionLogItem[];
      counts: {
        total: number;
        byStatus: Record<string, number>;
      };
      fieldMap: typeof decisionFieldMap;
    }
  | {
      state: "missing_product";
      slug: string;
    }
  | {
      state: "database_error";
      message: string;
    };

function readString(record: Record<string, unknown>, field: string | null): string | null {
  if (!field) {
    return null;
  }

  const value = record[field];

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (value === null || value === undefined) {
    return null;
  }

  return String(value);
}

function readDate(record: Record<string, unknown>, field: string | null): Date | null {
  if (!field) {
    return null;
  }

  const value = record[field];

  if (value instanceof Date) {
    return value;
  }

  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);

    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return null;
}

function normalizeStatus(value: string | null): DecisionStatusKey {
  const normalized = value?.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_") ?? "";

  if (
    normalized === "accepted" ||
    normalized === "active" ||
    normalized === "approved" ||
    normalized === "proposed" ||
    normalized === "planned" ||
    normalized === "rejected" ||
    normalized === "deprecated" ||
    normalized === "superseded"
  ) {
    return normalized;
  }

  return "unknown";
}

function toStatusLabel(value: string | null, fallback: DecisionStatusKey): string {
  if (value?.trim()) {
    return value
      .trim()
      .toLowerCase()
      .replace(/[_-]+/g, " ")
      .replace(/\b\w/g, (match) => match.toUpperCase());
  }

  return fallback === "unknown"
    ? "Unknown"
    : fallback.replace(/\b\w/g, (match) => match.toUpperCase());
}

function toDecisionItem(row: Record<string, unknown>): DecisionLogItem {
  const statusRaw = readString(row, decisionFieldMap.status);
  const status = normalizeStatus(statusRaw);
  const fallbackTitle = readString(row, decisionFieldMap.summary) ?? "Untitled decision";

  return {
    id: readString(row, "id") ?? "unknown-decision",
    title: readString(row, decisionFieldMap.title) ?? fallbackTitle,
    summary: readString(row, decisionFieldMap.summary),
    rationale: readString(row, decisionFieldMap.rationale),
    status,
    statusLabel: toStatusLabel(statusRaw, status),
    type: readString(row, decisionFieldMap.type),
    category: readString(row, decisionFieldMap.category),
    createdAt: readDate(row, decisionFieldMap.createdAt),
    updatedAt: readDate(row, decisionFieldMap.updatedAt),
  };
}

function countByStatus(decisions: DecisionLogItem[]): Record<string, number> {
  return decisions.reduce<Record<string, number>>((counts, decision) => {
    counts[decision.statusLabel] = (counts[decision.statusLabel] ?? 0) + 1;
    return counts;
  }, {});
}

export async function getDecisionLogData(): Promise<DecisionLogData> {
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
      },
    });

    if (!product) {
      return {
        state: "missing_product",
        slug: DEMO_PRODUCT_SLUG,
      };
    }

    const rows = await prisma.decision.findMany({
      where: {
        productId: product.id,
      },
      orderBy: decisionOrderBy,
      select: decisionSelect,
    });

    const decisions = rows.map((row) => toDecisionItem(row as Record<string, unknown>));

    return {
      state: "ready",
      product,
      decisions,
      counts: {
        total: decisions.length,
        byStatus: countByStatus(decisions),
      },
      fieldMap: decisionFieldMap,
    };
  } catch (error) {
    return {
      state: "database_error",
      message: error instanceof Error ? error.message : "Unknown database error",
    };
  }
}
