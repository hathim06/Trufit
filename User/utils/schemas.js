import { z  } from 'zod';

export const categorySchema = z.object({
    name: z.string()
        .min(2, "Category name must be at least 2 characters")
        .max(50, "Category name must be less than 50 characters")
        .trim()
        .refine(val => val.length > 0, "Category name is required"),
    description: z.string().max(200, "Description must be less than 200 characters").optional().or(z.literal(''))
});
