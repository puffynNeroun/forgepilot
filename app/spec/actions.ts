"use server";

import { revalidatePath } from "next/cache";
import { updateCurrentProductSpec } from "../../lib/db/product-specs";
import { productSpecFormSchema } from "../../lib/validators/product-spec";

export type ProductSpecActionState = {
  ok: boolean;
  message: string;
  fieldErrors?: {
    title?: string[];
    content?: string[];
  };
  values?: {
    title: string;
    content: string;
  };
};

export async function saveProductSpecAction(
  _previousState: ProductSpecActionState,
  formData: FormData,
): Promise<ProductSpecActionState> {
  const rawInput = {
    title: formData.get("title"),
    content: formData.get("content"),
  };

  const parsed = productSpecFormSchema.safeParse(rawInput);

  if (!parsed.success) {
    return {
      ok: false,
      message: "Please fix the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
      values: {
        title: String(rawInput.title ?? ""),
        content: String(rawInput.content ?? ""),
      },
    };
  }

  try {
    await updateCurrentProductSpec(parsed.data);
    revalidatePath("/spec");

    return {
      ok: true,
      message: "Product spec saved.",
      values: parsed.data,
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to save the product spec.",
      values: parsed.data,
    };
  }
}
