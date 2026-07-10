import { prisma } from "../prisma";

export const DEMO_PRODUCT_SLUG = "forgepilot";

export type DogfoodingSeverityKey =
  | "low"
  | "medium"
  | "high"
  | "critical"
  | "unknown";

export type DogfoodingFinding = {
  id: string;
  severity: DogfoodingSeverityKey;
  rawSeverity: string;
  title: string;
  observation: string | null;
  resolution: string | null;
  improvement: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type DogfoodingCounts = {
  total: number;
  highImpact: number;
  resolved: number;
  improvements: number;
};

export type DogfoodingReadyData = {
  status: "ready";
  product: {
    id: string;
    name: string;
    slug: string;
    summary: string;
  };
  findings: DogfoodingFinding[];
  counts: DogfoodingCounts;
};

export type DogfoodingData =
  | DogfoodingReadyData
  | { status: "missing_product"; productSlug: string }
  | {
      status: "empty";
      product: {
        id: string;
        name: string;
        slug: string;
        summary: string;
      };
    }
  | { status: "database_error"; message: string };

const fieldMap = {
  "severity": "severity",
  "title": "title",
  "observation": "observation",
  "resolution": "resolution",
  "improvement": "forgeImprovement",
  "createdAt": "createdAt",
  "updatedAt": "updatedAt"
} as const;

function readString(record: Record<string, unknown>, field: string | null) {
  if (!field) {
    return null;
  }

  const value = record[field];

  if (typeof value === "string" && value.trim()) {
    return value;
  }

  if (value !== null && value !== undefined) {
    return String(value);
  }

  return null;
}

function readDate(record: Record<string, unknown>, field: string | null) {
  if (!field) {
    return null;
  }

  const value = record[field];

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "string" && value.trim()) {
    return value;
  }

  return null;
}

function normalizeSeverity(value: string | null): DogfoodingSeverityKey {
  const normalized = (value ?? "").toLowerCase();

  if (
    normalized === "low" ||
    normalized === "medium" ||
    normalized === "high" ||
    normalized === "critical"
  ) {
    return normalized;
  }

  return "unknown";
}

function titleFromObservation(observation: string | null, fallback: string) {
  if (!observation) {
    return fallback;
  }

  const firstLine = observation.split("\n").find((line) => line.trim());

  if (!firstLine) {
    return fallback;
  }

  return firstLine.length > 96 ? `${firstLine.slice(0, 93)}...` : firstLine;
}

function createCounts(findings: DogfoodingFinding[]): DogfoodingCounts {
  return {
    total: findings.length,
    highImpact: findings.filter((finding) =>
      ["high", "critical"].includes(finding.severity),
    ).length,
    resolved: findings.filter((finding) => Boolean(finding.resolution)).length,
    improvements: findings.filter((finding) => Boolean(finding.improvement)).length,
  };
}

function toFinding(record: Record<string, unknown>): DogfoodingFinding {
  const rawSeverity = readString(record, fieldMap.severity) ?? "unknown";
  const observation = readString(record, fieldMap.observation);
  const title =
    readString(record, fieldMap.title) ??
    titleFromObservation(observation, "Dogfooding finding");

  return {
    id: readString(record, "id") ?? title,
    severity: normalizeSeverity(rawSeverity),
    rawSeverity,
    title,
    observation,
    resolution: readString(record, fieldMap.resolution),
    improvement: readString(record, fieldMap.improvement),
    createdAt: readDate(record, fieldMap.createdAt),
    updatedAt: readDate(record, fieldMap.updatedAt),
  };
}

export async function getDogfoodingData(): Promise<DogfoodingData> {
  try {
    const product = await prisma.product.findUnique({
      where: { slug: DEMO_PRODUCT_SLUG },
      select: {
        id: true,
        name: true,
        slug: true,
        summary: true,
      },
    });

    if (!product) {
      return {
        status: "missing_product",
        productSlug: DEMO_PRODUCT_SLUG,
      };
    }

    const rows = await prisma.dogfoodingEntry.findMany({
      where: { productId: product.id },
      orderBy: [
        { updatedAt: "desc" },
      ],
      select: {
        id: true,
        productId: true,
        severity: true,
        title: true,
        observation: true,
        resolution: true,
        forgeImprovement: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const findings = rows.map((row) =>
      toFinding(row as Record<string, unknown>),
    );

    if (findings.length === 0) {
      return {
        status: "empty",
        product,
      };
    }

    return {
      status: "ready",
      product,
      findings,
      counts: createCounts(findings),
    };
  } catch (error) {
    return {
      status: "database_error",
      message:
        error instanceof Error ? error.message : "Unknown database error.",
    };
  }
}
