import { z } from "zod";
import orderBy from "lodash.orderby";

export const SortDirectionSchema = z.enum(["asc", "desc"]);
export type SortDirection = z.infer<typeof SortDirectionSchema>;

export interface SortSpec<T> {
  by: keyof T & string;
  direction: SortDirection;
}

export class SortValidationError extends Error {
  constructor(public readonly invalid: string[]) {
    super(`Invalid sort parameters: ${invalid.join(", ")}`);
    this.name = "SortValidationError";
  }
}

export function parseSortParams<T>(
  raw: string | string[] | undefined,
  allowed: readonly (keyof T & string)[],
): SortSpec<T>[] {
  if (!raw) return [];
  const tokens = Array.isArray(raw) ? raw : [raw];
  const specs: SortSpec<T>[] = [];
  const invalid: string[] = [];
  for (const token of tokens) {
    const [field, dirRaw] = token.split(",").map((s) => s.trim());
    const dirOk = dirRaw === undefined || dirRaw === "asc" || dirRaw === "desc";
    if (!field || !(allowed as readonly string[]).includes(field) || !dirOk) {
      invalid.push(token);
      continue;
    }
    specs.push({
      by: field as keyof T & string,
      direction: dirRaw === "desc" ? "desc" : "asc",
    });
  }
  if (invalid.length > 0) throw new SortValidationError(invalid);
  return specs;
}

export function sortBy<T>(items: T[], specs: SortSpec<T>[]): T[] {
  if (specs.length === 0) return items;
  return orderBy(
    items,
    specs.map((s) => s.by),
    specs.map((s) => s.direction),
  );
}
