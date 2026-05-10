import { z } from "zod";
import type { PageMetadata } from "./page";

export const ListQuerySchema = z.object({
  page: z.coerce.number().int().min(0).default(0),
  size: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.string().optional(),
});

export interface ListQuery extends z.infer<typeof ListQuerySchema> {}

export interface PageSlice<T> {
  content: T[];
  page: PageMetadata;
}

export function paginate<T>(
  items: T[],
  page: number,
  size: number,
): PageSlice<T> {
  const totalElements = items.length;
  const totalPages = totalElements === 0 ? 0 : Math.ceil(totalElements / size);
  const content = items.slice(page * size, page * size + size);
  return {
    content,
    page: { number: page, size, totalElements, totalPages },
  };
}
