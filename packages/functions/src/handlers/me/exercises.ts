import { BatchGetCommand, GetCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { Resource } from "sst";
import { z } from "zod";
import { ddb } from "@smartmath/utils/dynamodb";
import { readClaims } from "@smartmath/core/auth";
import {
  AnswerItemSchema,
  ExerciseAnswerFilterIndexItemSchema,
  FeedbackStatusSchema,
  toAnswerDto,
  toAnswerListItemDto,
  type AnswerItem,
  type ExerciseAnswerFilterIndexItem,
} from "@smartmath/core/answers";
import {
  DifficultyLevelSchema,
  EXERCISE_ENTITY,
  ExerciseItemSchema,
  ExerciseTypeSchema,
  toExerciseListItemDto,
  toUserExerciseView,
  type ExerciseItem,
} from "@smartmath/core/exercises";
import { acceptLanguageFromHeaders } from "@smartmath/core/i18n";
import {
  internalError,
  invalidCursor,
  invalidQueryParams,
  notFound,
  ok,
} from "@smartmath/core/http";
import {
  InvalidCursorError,
  ListQuerySchema,
  decodeCursor,
  encodeCursor,
} from "@smartmath/core/pagination";
import { presignIllustrationUri, type Handler } from "../exercises/shared";

const BASE_PATH = "/me/exercises";
const instanceFor = (id: string) => `${BASE_PATH}/${id}`;

const ListMyExercisesQuerySchema = ListQuerySchema.extend({
  query: z.string().min(1).max(255).optional(),
  categoryId: z.string().min(1).max(128).optional(),
  exerciseType: ExerciseTypeSchema.optional(),
  difficultyLevel: DifficultyLevelSchema.optional(),
  feedbackStatus: FeedbackStatusSchema.optional(),
});

function buildExerciseFilterExpression(filters: {
  query?: string;
  exerciseType?: string;
  difficultyLevel?: string;
}): { expr?: string; values: Record<string, unknown> } {
  const clauses: string[] = [];
  const values: Record<string, unknown> = {};
  if (filters.query) {
    clauses.push("contains(titleSearchable, :q)");
    values[":q"] = filters.query.toLowerCase();
  }
  if (filters.exerciseType) {
    clauses.push("exerciseType = :et");
    values[":et"] = filters.exerciseType;
  }
  if (filters.difficultyLevel) {
    clauses.push("difficultyLevel = :dl");
    values[":dl"] = filters.difficultyLevel;
  }
  return { expr: clauses.length ? clauses.join(" AND ") : undefined, values };
}

function buildFilterIndexFilterExpression(filters: {
  query?: string;
  categoryId?: string;
  exerciseType?: string;
  difficultyLevel?: string;
}): { expr?: string; values: Record<string, unknown> } {
  const clauses: string[] = [];
  const values: Record<string, unknown> = {};
  if (filters.query) {
    clauses.push("contains(titleSearchable, :q)");
    values[":q"] = filters.query.toLowerCase();
  }
  if (filters.categoryId) {
    clauses.push("categoryId = :cid");
    values[":cid"] = filters.categoryId;
  }
  if (filters.exerciseType) {
    clauses.push("exerciseType = :et");
    values[":et"] = filters.exerciseType;
  }
  if (filters.difficultyLevel) {
    clauses.push("difficultyLevel = :dl");
    values[":dl"] = filters.difficultyLevel;
  }
  return { expr: clauses.length ? clauses.join(" AND ") : undefined, values };
}

async function batchGetAnswers(
  userId: string,
  exerciseIds: string[],
): Promise<Map<string, AnswerItem>> {
  const byExerciseId = new Map<string, AnswerItem>();
  if (!exerciseIds.length) return byExerciseId;

  let request: Record<string, { Keys: Record<string, unknown>[] }> = {
    [Resource.Answers.name]: {
      Keys: exerciseIds.map((exerciseId) => ({ userId, exerciseId })),
    },
  };
  const MAX_ATTEMPTS = 5;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const res = await ddb.send(new BatchGetCommand({ RequestItems: request }));
    for (const raw of res.Responses?.[Resource.Answers.name] ?? []) {
      const parsed = AnswerItemSchema.safeParse(raw);
      if (parsed.success) byExerciseId.set(parsed.data.exerciseId, parsed.data);
      else console.error("Skipping malformed answer row", parsed.error);
    }
    const unprocessed = res.UnprocessedKeys ?? {};
    if (!unprocessed[Resource.Answers.name]) break;
    if (attempt === MAX_ATTEMPTS - 1) {
      throw new Error("BatchGet did not converge after retries");
    }
    await new Promise((r) => setTimeout(r, 50 * 2 ** attempt));
    request = unprocessed as Record<string, { Keys: Record<string, unknown>[] }>;
  }
  return byExerciseId;
}

async function batchGetExercises(exerciseIds: string[]): Promise<Map<string, ExerciseItem>> {
  const byId = new Map<string, ExerciseItem>();
  if (!exerciseIds.length) return byId;

  let request: Record<string, { Keys: Record<string, unknown>[] }> = {
    [Resource.Exercises.name]: { Keys: exerciseIds.map((id) => ({ id })) },
  };
  const MAX_ATTEMPTS = 5;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const res = await ddb.send(new BatchGetCommand({ RequestItems: request }));
    for (const raw of res.Responses?.[Resource.Exercises.name] ?? []) {
      const parsed = ExerciseItemSchema.safeParse(raw);
      if (parsed.success) byId.set(parsed.data.id, parsed.data);
      else console.error(`Skipping malformed exercise row id=${(raw as { id?: unknown }).id}`, parsed.error);
    }
    const unprocessed = res.UnprocessedKeys ?? {};
    if (!unprocessed[Resource.Exercises.name]) break;
    if (attempt === MAX_ATTEMPTS - 1) {
      throw new Error("BatchGet did not converge after retries");
    }
    await new Promise((r) => setTimeout(r, 50 * 2 ** attempt));
    request = unprocessed as Record<string, { Keys: Record<string, unknown>[] }>;
  }
  return byId;
}

export const list: Handler = async (event) => {
  const { sub } = readClaims(event);
  const parsed = ListMyExercisesQuerySchema.safeParse(event.queryStringParameters ?? {});
  if (!parsed.success) return invalidQueryParams(parsed.error, BASE_PATH);
  const { cursor, limit, categoryId, exerciseType, difficultyLevel, feedbackStatus, query } =
    parsed.data;
  const lang = acceptLanguageFromHeaders(event.headers);

  let exclusiveStartKey: Record<string, unknown> | undefined;
  try {
    exclusiveStartKey = cursor ? decodeCursor(cursor) : undefined;
  } catch (err) {
    if (err instanceof InvalidCursorError) return invalidCursor(BASE_PATH);
    throw err;
  }

  // Deliberate tradeoff: a filtered page here may come back with fewer than
  // `limit` items alongside a nextCursor. We do not loop to fill the page —
  // the client follows nextCursor until it's exhausted.
  if (feedbackStatus) {
    const filter = buildFilterIndexFilterExpression({
      query,
      categoryId,
      exerciseType,
      difficultyLevel,
    });
    const res = await ddb.send(
      new QueryCommand({
        TableName: Resource.ExerciseAnswerFilterIndex.name,
        IndexName: "byUserStatus",
        KeyConditionExpression: "userId = :uid AND feedbackStatus = :fs",
        FilterExpression: filter.expr,
        ExpressionAttributeValues: { ":uid": sub, ":fs": feedbackStatus, ...filter.values },
        Limit: limit,
        ExclusiveStartKey: exclusiveStartKey,
      }),
    );

    const indexRows: ExerciseAnswerFilterIndexItem[] = [];
    for (const raw of res.Items ?? []) {
      const p = ExerciseAnswerFilterIndexItemSchema.safeParse(raw);
      if (p.success) indexRows.push(p.data);
      else console.error("Skipping malformed filter index row", p.error);
    }
    const exerciseIds = indexRows.map((r) => r.exerciseId);

    // The index only tells us which exercise ids belong on this page; all
    // displayed content comes from the live Exercises/Answers rows below.
    const [exercisesById, answersByExerciseId] = await Promise.all([
      batchGetExercises(exerciseIds),
      batchGetAnswers(sub, exerciseIds),
    ]);

    const items = exerciseIds
      .map((id) => exercisesById.get(id))
      .filter((e): e is ExerciseItem => Boolean(e))
      .map((exercise) => {
        const answer = answersByExerciseId.get(exercise.id);
        return {
          exercise: toExerciseListItemDto(exercise, lang),
          ...(answer ? { answer: toAnswerListItemDto(answer) } : {}),
        };
      });

    return ok({
      items,
      nextCursor: res.LastEvaluatedKey ? encodeCursor(res.LastEvaluatedKey) : undefined,
    });
  }

  const filter = buildExerciseFilterExpression({ query, exerciseType, difficultyLevel });
  const res = await ddb.send(
    categoryId
      ? new QueryCommand({
          TableName: Resource.Exercises.name,
          IndexName: "byCategory",
          KeyConditionExpression: "categoryId = :cid",
          FilterExpression: filter.expr,
          ExpressionAttributeValues: { ":cid": categoryId, ...filter.values },
          Limit: limit,
          ExclusiveStartKey: exclusiveStartKey,
        })
      : new QueryCommand({
          TableName: Resource.Exercises.name,
          IndexName: "all",
          KeyConditionExpression: "entity = :e",
          FilterExpression: filter.expr,
          ExpressionAttributeValues: { ":e": EXERCISE_ENTITY, ...filter.values },
          Limit: limit,
          ExclusiveStartKey: exclusiveStartKey,
          ScanIndexForward: false,
        }),
  );

  const exercises: ExerciseItem[] = [];
  for (const raw of res.Items ?? []) {
    const p = ExerciseItemSchema.safeParse(raw);
    if (p.success) exercises.push(p.data);
    else console.error(`Skipping malformed exercise row id=${(raw as { id?: unknown }).id}`, p.error);
  }

  const answersByExerciseId = await batchGetAnswers(sub, exercises.map((e) => e.id));

  const items = exercises.map((exercise) => {
    const answer = answersByExerciseId.get(exercise.id);
    return {
      exercise: toExerciseListItemDto(exercise, lang),
      ...(answer ? { answer: toAnswerListItemDto(answer) } : {}),
    };
  });

  return ok({
    items,
    nextCursor: res.LastEvaluatedKey ? encodeCursor(res.LastEvaluatedKey) : undefined,
  });
};

export const get: Handler = async (event) => {
  const { sub } = readClaims(event);
  const id = event.pathParameters?.id ?? "";
  const lang = acceptLanguageFromHeaders(event.headers);

  const [exerciseRes, answerRes] = await Promise.all([
    ddb.send(new GetCommand({ TableName: Resource.Exercises.name, Key: { id } })),
    ddb.send(
      new GetCommand({
        TableName: Resource.Answers.name,
        Key: { userId: sub, exerciseId: id },
      }),
    ),
  ]);

  if (!exerciseRes.Item) return notFound("Exercise", instanceFor(id));
  const exerciseParsed = ExerciseItemSchema.safeParse(exerciseRes.Item);
  if (!exerciseParsed.success) {
    console.error(`Malformed exercise ${id} in DynamoDB`, exerciseParsed.error);
    return internalError("Stored exercise data is malformed", instanceFor(id));
  }
  const exercise = exerciseParsed.data;

  let answer: AnswerItem | undefined;
  if (answerRes.Item) {
    const answerParsed = AnswerItemSchema.safeParse(answerRes.Item);
    if (answerParsed.success) answer = answerParsed.data;
    else console.error(`Malformed answer for user=${sub} exercise=${id}`, answerParsed.error);
  }

  return ok({
    exercise: await toUserExerciseView(exercise, lang, presignIllustrationUri),
    ...(answer ? { answer: toAnswerDto(answer) } : {}),
  });
};
