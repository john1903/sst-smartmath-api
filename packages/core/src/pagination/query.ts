import { z } from "zod";

export const ListQuerySchema = z.object({
  page: z.coerce.number().int().min(0).default(0),
  size: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.string().optional(),
});

export interface ListQuery extends z.infer<typeof ListQuerySchema> {}
