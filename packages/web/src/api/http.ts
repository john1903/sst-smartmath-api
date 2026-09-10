import i18n from "../i18n";

const API_URL = (import.meta.env.VITE_API_URL as string).replace(/\/+$/, "");

export interface ApiError {
  status: number;
  title: string;
  detail?: string;
}

export async function apiGet<T>(
  path: string,
  accessToken: string,
  params?: Record<string, string | number | undefined>,
): Promise<T> {
  const qs = new URLSearchParams();
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== "") qs.set(k, String(v));
    }
  }
  const url = `${API_URL}${path}${qs.toString() ? `?${qs}` : ""}`;
  const res = await fetch(url, {
    headers: {
      "accept-language": i18n.language,
      authorization: `Bearer ${accessToken}`,
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let title = res.statusText;
    let detail: string | undefined;
    try {
      const j = JSON.parse(text) as { title?: string; detail?: string };
      title = j.title ?? title;
      detail = j.detail;
    } catch {
      /* not problem+json */
    }
    const err: ApiError = { status: res.status, title, detail };
    throw err;
  }
  return (await res.json()) as T;
}
