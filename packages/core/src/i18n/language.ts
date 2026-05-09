import { z } from "zod";

export const LanguageCode = {
  EnGb: "en-GB",
  PlPl: "pl-PL",
} as const;

export type LanguageCode = (typeof LanguageCode)[keyof typeof LanguageCode];

export const LanguageCodeSchema = z.enum(["en-GB", "pl-PL"]);

export const SUPPORTED_LANGUAGES: readonly LanguageCode[] = [
  LanguageCode.EnGb,
  LanguageCode.PlPl,
];

export const DEFAULT_LANGUAGE: LanguageCode = LanguageCode.EnGb;

export function parseAcceptLanguage(header: string | undefined): LanguageCode {
  if (!header) return DEFAULT_LANGUAGE;
  const tags = header
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      let q = 1;
      for (const p of params) {
        const m = p.trim().match(/^q=([0-9.]+)$/);
        if (m) q = Number(m[1]);
      }
      return { tag: tag.trim().toLowerCase(), q };
    })
    .filter((t) => t.tag.length > 0)
    .sort((a, b) => b.q - a.q);

  for (const { tag } of tags) {
    const exact = SUPPORTED_LANGUAGES.find((l) => l.toLowerCase() === tag);
    if (exact) return exact;
  }
  for (const { tag } of tags) {
    const primary = tag.split("-")[0];
    const fallback = SUPPORTED_LANGUAGES.find(
      (l) => l.toLowerCase().split("-")[0] === primary,
    );
    if (fallback) return fallback;
  }
  return DEFAULT_LANGUAGE;
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
  if (translations[LanguageCode.EnGb]) return translations[LanguageCode.EnGb]!;
  if (translations[LanguageCode.PlPl]) return translations[LanguageCode.PlPl]!;
  const first = Object.values(translations)[0];
  return first ?? "";
}
