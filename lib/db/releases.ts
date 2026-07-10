import { prisma } from "../prisma";

const DEMO_PRODUCT_SLUG = "forgepilot";

const releaseSelect = {
  id: true,
  title: true,
  version: true,
  summary: true,
  status: true,
  releasedAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

const releaseOrderBy = [
  { releasedAt: "desc" as const },
  { updatedAt: "desc" as const },
  { createdAt: "desc" as const },
];

const releaseFieldMap = {
  "id": "id",
  "title": "title",
  "version": "version",
  "summary": "summary",
  "status": "status",
  "plannedAt": null,
  "releasedAt": "releasedAt",
  "createdAt": "createdAt",
  "updatedAt": "updatedAt",
  "order": null
} as const;

export type ReleaseStatusKey =
  | "planned"
  | "in_progress"
  | "released"
  | "cancelled"
  | "unknown";

export type ReleaseTimelineItem = {
  id: string;
  title: string;
  version: string | null;
  summary: string | null;
  status: ReleaseStatusKey;
  statusLabel: string;
  plannedAt: Date | null;
  releasedAt: Date | null;
  createdAt: Date | null;
  updatedAt: Date | null;
};

export type ReleaseTimelineData =
  | {
      state: "ready";
      product: {
        id: string;
        slug: string;
        name: string;
        summary: string;
      };
      releases: ReleaseTimelineItem[];
      counts: {
        total: number;
        byStatus: Record<string, number>;
      };
      fieldMap: typeof releaseFieldMap;
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

function normalizeStatus(value: string | null): ReleaseStatusKey {
  const normalized = value?.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_") ?? "";

  if (
    normalized === "planned" ||
    normalized === "in_progress" ||
    normalized === "released" ||
    normalized === "cancelled"
  ) {
    return normalized;
  }

  return "unknown";
}

function toStatusLabel(value: string | null, fallback: ReleaseStatusKey): string {
  const raw = value?.trim() || fallback;

  if (raw === "unknown") {
    return "Unknown";
  }

  return raw
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function toReleaseItem(row: Record<string, unknown>): ReleaseTimelineItem {
  const statusRaw = readString(row, releaseFieldMap.status);
  const status = normalizeStatus(statusRaw);
  const version = readString(row, releaseFieldMap.version);
  const fallbackTitle = version ? `Release ${version}` : "Untitled release";

  return {
    id: readString(row, "id") ?? "unknown-release",
    title: readString(row, releaseFieldMap.title) ?? fallbackTitle,
    version,
    summary: readString(row, releaseFieldMap.summary),
    status,
    statusLabel: toStatusLabel(statusRaw, status),
    plannedAt: readDate(row, releaseFieldMap.plannedAt),
    releasedAt: readDate(row, releaseFieldMap.releasedAt),
    createdAt: readDate(row, releaseFieldMap.createdAt),
    updatedAt: readDate(row, releaseFieldMap.updatedAt),
  };
}

function countByStatus(releases: ReleaseTimelineItem[]): Record<string, number> {
  return releases.reduce<Record<string, number>>((counts, release) => {
    counts[release.statusLabel] = (counts[release.statusLabel] ?? 0) + 1;
    return counts;
  }, {});
}

export async function getReleaseTimelineData(): Promise<ReleaseTimelineData> {
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

    const rows = await prisma.productRelease.findMany({
      where: {
        productId: product.id,
      },
      orderBy: releaseOrderBy,
      select: releaseSelect,
    });

    const releases = rows.map((row) => toReleaseItem(row as Record<string, unknown>));

    return {
      state: "ready",
      product,
      releases,
      counts: {
        total: releases.length,
        byStatus: countByStatus(releases),
      },
      fieldMap: releaseFieldMap,
    };
  } catch (error) {
    return {
      state: "database_error",
      message: error instanceof Error ? error.message : "Unknown database error",
    };
  }
}
