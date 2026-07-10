import { prisma } from "../prisma";
import type { ProductSpecFormInput } from "../validators/product-spec";

export const DEMO_PRODUCT_SLUG = "forgepilot";

export type CurrentProductSpec =
  | {
      status: "ready";
      product: {
        id: string;
        name: string;
        slug: string;
        summary: string;
      };
      spec: {
        id: string;
        title: string;
        content: string;
        version: number;
        updatedAt: Date;
      };
    }
  | {
      status: "missing_product";
      productSlug: string;
    }
  | {
      status: "missing_spec";
      product: {
        id: string;
        name: string;
        slug: string;
        summary: string;
      };
    };

export async function getCurrentProductSpec(): Promise<CurrentProductSpec> {
  const product = await prisma.product.findUnique({
    where: {
      slug: DEMO_PRODUCT_SLUG,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      summary: true,
      specs: {
        orderBy: [
          {
            version: "desc",
          },
          {
            createdAt: "desc",
          },
        ],
        take: 1,
        select: {
          id: true,
          title: true,
          content: true,
          version: true,
          updatedAt: true,
        },
      },
    },
  });

  if (!product) {
    return {
      status: "missing_product",
      productSlug: DEMO_PRODUCT_SLUG,
    };
  }

  const [spec] = product.specs;

  if (!spec) {
    return {
      status: "missing_spec",
      product,
    };
  }

  return {
    status: "ready",
    product,
    spec,
  };
}

export async function updateCurrentProductSpec(input: ProductSpecFormInput) {
  const current = await getCurrentProductSpec();

  if (current.status === "missing_product") {
    throw new Error(
      `Demo product "${current.productSlug}" was not found. Run pnpm db:seed after starting the local database.`,
    );
  }

  if (current.status === "missing_spec") {
    throw new Error(
      `Product "${current.product.slug}" has no product spec. Run pnpm db:seed to restore demo data.`,
    );
  }

  return prisma.productSpec.update({
    where: {
      id: current.spec.id,
    },
    data: {
      title: input.title,
      content: input.content,
    },
    select: {
      id: true,
      title: true,
      content: true,
      version: true,
      updatedAt: true,
    },
  });
}
