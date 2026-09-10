import { apiGet } from "./http";
import type { Page } from "./exercises";

export interface Requirement {
  id: string;
  categoryId: string;
  definition: string;
}

export function listRequirements(
  accessToken: string,
  categoryId: string,
  cursor?: string,
): Promise<Page<Requirement>> {
  return apiGet<Page<Requirement>>("/static/requirements", accessToken, {
    categoryId,
    cursor,
    limit: 100,
  });
}
