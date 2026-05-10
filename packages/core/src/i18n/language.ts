import { z } from "zod";
import { pick as pickAcceptLanguage } from "accept-language-parser";

export const LanguageCode = {
  EnGb: "en-GB",
  PlPl: "pl-PL",
} as const;

export type LanguageCode = (typeof LanguageCode)[keyof typeof LanguageCode];

export const LanguageCodeSchema = z.enum(["en-GB", "pl-PL"]);

export const SUPPORTED_LANGUAGES: readonly LanguageCode[] = [
  LanguageCode.PlPl,
  LanguageCode.EnGb,
];

export const DEFAULT_LANGUAGE: LanguageCode = LanguageCode.PlPl;

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

export function pickTranslation(
  translations: Partial<Record<LanguageCode, string>>,
  lang: LanguageCode,
): string {
  if (translations[lang]) return translations[lang]!;
  if (translations[DEFAULT_LANGUAGE]) return translations[DEFAULT_LANGUAGE]!;
  const first = Object.values(translations).find((v) => v);
  return first ?? "";
}
