import { z } from "zod";
import orderBy from "lodash.orderby";

export const SortDirectionSchema = z.enum(["asc", "desc"]);
export type SortDirection = z.infer<typeof SortDirectionSchema>;

export interface SortSpec<T> {
  by: keyof T & string;
  direction: SortDirection;
}

export function sortParamSchema<F extends readonly string[]>(allowed: F) {
  type Field = F[number];
  return z
    .string()
    .transform((raw, ctx): SortSpec<Record<Field, unknown>> | undefined => {
      if (raw.trim() === "") return undefined;
      const parts = raw.split(",").map((s) => s.trim());
      const [field, dirRaw, ...rest] = parts;
      const dirOk =
        dirRaw === undefined || dirRaw === "asc" || dirRaw === "desc";
      const fieldOk =
        Boolean(field) && (allowed as readonly string[]).includes(field);
      if (!fieldOk || !dirOk || rest.length > 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Invalid sort '${raw}'. Expected '<field>,asc|desc' (single sort field per request) where field is one of: ${allowed.join(", ")}`,
        });
        return z.NEVER;
      }
      return {
        by: field as Field,
        direction: dirRaw === "desc" ? "desc" : "asc",
      };
    });
}

export function sortBy<T>(items: T[], spec: SortSpec<T> | undefined): T[] {
  if (!spec) return items;
  return orderBy(items, [spec.by], [spec.direction]);
}
