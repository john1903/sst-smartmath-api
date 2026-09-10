import { apiGet } from "./http";

export type ExerciseType =
  | "singleChoice"
  | "multipleChoice"
  | "trueFalse"
  | "matching"
  | "openEnded";

export type DifficultyLevel = "easy" | "medium" | "hard";

export interface ExerciseTranslationBase {
  languageCode: string;
  exerciseType: ExerciseType;
  title: string;
  description: string;
}

export interface ExerciseAdmin {
  id: string;
  exerciseType: ExerciseType;
  difficultyLevel: DifficultyLevel;
  maxPoints: number;
  categoryId: string;
  detailedRequirementIds: string[];
  illustrations?: { id: string; fileName?: string; uri: string; mimeType: string }[];
  translations: (ExerciseTranslationBase & Record<string, unknown>)[];
}

export interface Page<T> {
  items: T[];
  nextCursor?: string;
}

export interface ListExercisesParams {
  query?: string;
  categoryId?: string;
  exerciseType?: ExerciseType;
  difficultyLevel?: DifficultyLevel;
  cursor?: string;
  limit?: number;
}

const API_URL = (import.meta.env.VITE_API_URL as string).replace(/\/+$/, "");

export interface CreateExerciseTranslation {
  languageCode: string;
  exerciseType: ExerciseType;
  title: string;
  description: string;
  [k: string]: unknown;
}

export interface CreateExerciseBody {
  categoryId: string;
  detailedRequirementIds: string[];
  difficultyLevel: DifficultyLevel;
  maxPoints: number;
  translations: CreateExerciseTranslation[];
}

export async function getExercise(
  accessToken: string,
  id: string,
): Promise<ExerciseAdmin> {
  return apiGet<ExerciseAdmin>(`/exercises/${encodeURIComponent(id)}`, accessToken);
}

export async function deleteExercise(
  accessToken: string,
  id: string,
): Promise<void> {
  const res = await fetch(
    `${API_URL}/exercises/${encodeURIComponent(id)}`,
    {
      method: "DELETE",
      headers: { authorization: `Bearer ${accessToken}` },
    },
  );
  if (!res.ok && res.status !== 204) {
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
    throw { status: res.status, title, detail };
  }
}

export interface UpdateExerciseBody {
  categoryId?: string;
  detailedRequirementIds?: string[];
  difficultyLevel?: DifficultyLevel;
  maxPoints?: number;
  translations?: CreateExerciseTranslation[];
}

async function throwIfBad(res: Response): Promise<void> {
  if (res.ok || res.status === 204) return;
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
  throw { status: res.status, title, detail };
}

export async function updateExercise(
  accessToken: string,
  id: string,
  body: UpdateExerciseBody,
): Promise<ExerciseAdmin> {
  const res = await fetch(
    `${API_URL}/exercises/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/merge-patch+json",
      },
      body: JSON.stringify(body),
    },
  );
  await throwIfBad(res);
  return (await res.json()) as ExerciseAdmin;
}

export async function addIllustrations(
  accessToken: string,
  exerciseId: string,
  files: File[],
): Promise<ExerciseAdmin> {
  const form = new FormData();
  for (const f of files) form.append("illustrations", f, f.name);
  const res = await fetch(
    `${API_URL}/exercises/${encodeURIComponent(exerciseId)}/illustrations`,
    {
      method: "POST",
      headers: { authorization: `Bearer ${accessToken}` },
      body: form,
    },
  );
  await throwIfBad(res);
  return (await res.json()) as ExerciseAdmin;
}

export async function deleteIllustration(
  accessToken: string,
  exerciseId: string,
  illustrationId: string,
): Promise<void> {
  const res = await fetch(
    `${API_URL}/exercises/${encodeURIComponent(exerciseId)}/illustrations/${encodeURIComponent(illustrationId)}`,
    {
      method: "DELETE",
      headers: { authorization: `Bearer ${accessToken}` },
    },
  );
  await throwIfBad(res);
}

export async function createExercise(
  accessToken: string,
  body: CreateExerciseBody,
): Promise<ExerciseAdmin> {
  const res = await fetch(`${API_URL}/exercises`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
  await throwIfBad(res);
  return (await res.json()) as ExerciseAdmin;
}

export function listExercises(
  accessToken: string,
  params: ListExercisesParams = {},
): Promise<Page<ExerciseAdmin>> {
  return apiGet<Page<ExerciseAdmin>>("/exercises", accessToken, {
    query: params.query,
    categoryId: params.categoryId,
    exerciseType: params.exerciseType,
    difficultyLevel: params.difficultyLevel,
    cursor: params.cursor,
    limit: params.limit,
  });
}
