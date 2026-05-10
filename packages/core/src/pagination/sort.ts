import { z } from "zod";
import orderBy from "lodash.orderby";

export const SortDirectionSchema = z.enum(["asc", "desc"]);
export type SortDirection = z.infer<typeof SortDirectionSchema>;

export interface SortSpec<T> {
  by: keyof T & string;
  direction: SortDirection;
}

export class SortValidationError extends Error {
  constructor(public readonly token: string) {
    super(`Invalid sort parameter: ${token}`);
    this.name = "SortValidationError";
  }
}

export function parseSortParam<T>(
  raw: string | undefined,
  allowed: readonly (keyof T & string)[],
): SortSpec<T> | undefined {
  if (!raw) return undefined;
  const [field, dirRaw] = raw.split(",").map((s) => s.trim());
  const dirOk = dirRaw === undefined || dirRaw === "asc" || dirRaw === "desc";
  if (!field || !(allowed as readonly string[]).includes(field) || !dirOk) {
    throw new SortValidationError(raw);
  }
  return {
    by: field as keyof T & string,
    direction: dirRaw === "desc" ? "desc" : "asc",
  };
}

export function sortBy<T>(items: T[], spec: SortSpec<T> | undefined): T[] {
  if (!spec) return items;
  return orderBy(items, [spec.by], [spec.direction]);
}
