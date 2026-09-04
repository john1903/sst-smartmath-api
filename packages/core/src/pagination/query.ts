import { z } from "zod";

export const ListQuerySchema = z.object({
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export interface ListQuery extends z.infer<typeof ListQuerySchema> {}
