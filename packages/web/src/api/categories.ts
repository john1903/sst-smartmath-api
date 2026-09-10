import { apiGet } from "./http";
import type { Page } from "./exercises";

export interface Category {
  id: string;
  name: string;
}

export function listCategories(accessToken: string): Promise<Page<Category>> {
  return apiGet<Page<Category>>("/static/categories", accessToken, { limit: 100 });
}
