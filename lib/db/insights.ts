import { prisma } from "../prisma";
import type { DogfoodingInsightSource } from "../insights/analyze-dogfooding";

const DEMO_PRODUCT_SLUG = "forgepilot";

export type InsightsProduct = {
  id: string;
  slug: string;
  name: string;
  summary: string;
};

export type DogfoodingInsightsData =
  | {
      status: "ready";
      product: InsightsProduct;
      entries: DogfoodingInsightSource[];
    }
  | {
      status: "empty";
      product: InsightsProduct;
    }
  | {
      status: "missing_product";
      productSlug: string;
    }
  | {
      status: "database_error";
      message: string;
    };

export async function getDogfoodingInsightsData(): Promise<DogfoodingInsightsData> {
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
        status: "missing_product",
        productSlug: DEMO_PRODUCT_SLUG,
      };
    }

    const rows = await prisma.dogfoodingEntry.findMany({
      where: {
        productId: product.id,
      },
      orderBy: [
        {
          updatedAt: "desc",
        },
        {
          createdAt: "desc",
        },
      ],
      select: {
        id: true,
        title: true,
        observation: true,
        friction: true,
        resolution: true,
        forgeImprovement: true,
        severity: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (rows.length === 0) {
      return {
        status: "empty",
        product,
      };
    }

    return {
      status: "ready",
      product,
      entries: rows.map((row) => ({
        id: row.id,
        title: row.title,
        observation: row.observation,
        friction: row.friction,
        resolution: row.resolution,
        forgeImprovement: row.forgeImprovement,
        severity: row.severity.toLowerCase(),
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      })),
    };
  } catch (error) {
    return {
      status: "database_error",
      message:
        error instanceof Error ? error.message : "Unknown database error.",
    };
  }
}
