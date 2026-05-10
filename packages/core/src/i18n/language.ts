import { z } from "zod";
import { pick as pickAcceptLanguage } from "accept-language-parser";

export const SUPPORTED_LANGUAGES = ["pl-PL", "en-GB"] as const;

export const LanguageCodeSchema = z.enum(SUPPORTED_LANGUAGES);

export type LanguageCode = z.infer<typeof LanguageCodeSchema>;

export const LanguageCode = {
  PlPl: "pl-PL",
  EnGb: "en-GB",
} as const satisfies Record<string, LanguageCode>;

export const DEFAULT_LANGUAGE = "pl-PL" as const;

export function parseAcceptLanguage(header: string | undefined): LanguageCode {
  if (!header) return DEFAULT_LANGUAGE;
  const match = pickAcceptLanguage([...SUPPORTED_LANGUAGES], header, {
    loose: true,
  });
  return (match as LanguageCode | null) ?? DEFAULT_LANGUAGE;
}

export function acceptLanguageFromHeaders(
  headers: Record<string, string | undefined> | undefined,
): LanguageCode {
  if (!headers) return DEFAULT_LANGUAGE;
  for (const key of Object.keys(headers)) {
    if (key.toLowerCase() === "accept-language") {
      return parseAcceptLanguage(headers[key]);
    }
  }
  return DEFAULT_LANGUAGE;
}

export const TranslationsSchema = z
  .record(LanguageCodeSchema, z.string().min(1))
  .refine((t) => Boolean(t[DEFAULT_LANGUAGE]), {
    message: `translations must include the default language (${DEFAULT_LANGUAGE})`,
  })
  .transform(
    (t) =>
      t as Partial<Record<LanguageCode, string>> &
        Record<typeof DEFAULT_LANGUAGE, string>,
  );

export type Translations = z.infer<typeof TranslationsSchema>;

export function pickTranslation(
  translations: Partial<Record<LanguageCode, string>>,
  lang: LanguageCode,
): string {
  if (translations[lang]) return translations[lang]!;
  if (translations[DEFAULT_LANGUAGE]) return translations[DEFAULT_LANGUAGE]!;
  const first = Object.values(translations).find((v) => v);
  return first ?? "";
}
