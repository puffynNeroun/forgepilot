import { z } from "zod";

export const productSpecFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, "Title must be at least 3 characters.")
    .max(120, "Title must be at most 120 characters."),
  content: z
    .string()
    .trim()
    .min(20, "Content must be at least 20 characters.")
    .max(20000, "Content must be at most 20,000 characters."),
});

export type ProductSpecFormInput = z.infer<typeof productSpecFormSchema>;
