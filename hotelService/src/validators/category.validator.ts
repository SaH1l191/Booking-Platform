import z from "zod";

export const categorySchema = z.object({
    name: z.string().min(1, "Name is required").max(100),
    slug: z.string().min(1, "Slug is required").max(100).regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
    icon: z.string().max(255).optional(),
});

export const updateCategorySchema = z.object({
    name: z.string().min(1).max(100).optional(),
    slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/).optional(),
    icon: z.string().max(255).optional(),
});
