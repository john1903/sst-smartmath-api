import {
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
  TransactWriteCommand,
} from "@aws-sdk/lib-dynamodb";
import { Resource } from "sst";
import { z } from "zod";
import { ddb } from "@smartmath/utils/dynamodb";
import { newId } from "@smartmath/utils/id";
import {
  CreateExerciseRequestSchema,
  DifficultyLevelSchema,
  EXERCISE_ENTITY,
  ExerciseItemSchema,
  ExerciseTypeSchema,
  parseTranslationsForType,
  splitTranslation,
  titleSearchableFrom,
  toExerciseAdminDto,
  UpdateExerciseRequestSchema,
  validateTranslationInvariants,
  type ExerciseItem,
  type ExerciseTranslation,
} from "@smartmath/core/exercises";
import {
  badRequest,
  internalError,
  invalidCursor,
  invalidQueryParams,
  notFound,
  ok,
  problem,
} from "@smartmath/core/http";
import {
  InvalidCursorError,
  ListQuerySchema,
  decodeCursor,
  encodeCursor,
} from "@smartmath/core/pagination";
import {
  deleteIllustrations,
  denormalizeReferences,
  presignIllustrationUri,
  type Handler,
} from "./shared";

// SECURITY INVARIANT: every route in this file is attached to the ADMIN Cognito
// authorizer in infra/api.ts. Any authenticated caller = an admin. If a future
// change removes the authorizer, opens the admin pool to self-signup, or adds
// a broader authorizer, add an explicit group / pool-issuer check here first.
const BASE_PATH = "/exercises";
const instanceFor = (id?: string) =>
  id ? `${BASE_PATH}/${id}` : BASE_PATH;

const ListExercisesQuerySchema = ListQuerySchema.extend({
  query: z.string().min(1).max(255).optional(),
  categoryId: z.string().min(1).max(128).optional(),
  exerciseType: ExerciseTypeSchema.optional(),
  difficultyLevel: DifficultyLevelSchema.optional(),
});

function buildFilterExpression(filters: {
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
  return {
    expr: clauses.length ? clauses.join(" AND ") : undefined,
    values,
  };
}

export const list: Handler = async (event) => {
  const parsed = ListExercisesQuerySchema.safeParse(
    event.queryStringParameters ?? {},
  );
  if (!parsed.success) return invalidQueryParams(parsed.error, BASE_PATH);
  const { cursor, limit, categoryId, exerciseType, difficultyLevel, query } =
    parsed.data;

  let exclusiveStartKey: Record<string, unknown> | undefined;
  try {
    exclusiveStartKey = cursor ? decodeCursor(cursor) : undefined;
  } catch (err) {
    if (err instanceof InvalidCursorError) return invalidCursor(BASE_PATH);
    throw err;
  }

  const filter = buildFilterExpression({ query, exerciseType, difficultyLevel });

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
          ExpressionAttributeValues: {
            ":e": EXERCISE_ENTITY,
            ...filter.values,
          },
          Limit: limit,
          ExclusiveStartKey: exclusiveStartKey,
          ScanIndexForward: false,
        }),
  );

  const collected: ExerciseItem[] = [];
  for (const raw of res.Items ?? []) {
    const parsedItem = ExerciseItemSchema.safeParse(raw);
    if (parsedItem.success) {
      collected.push(parsedItem.data);
    } else {
      console.error(
        `Skipping malformed exercise row id=${(raw as { id?: unknown }).id}`,
        parsedItem.error,
      );
    }
  }

  const items = await Promise.all(
    collected.map((it) => toExerciseAdminDto(it, presignIllustrationUri)),
  );
  return ok({
    items,
    nextCursor: res.LastEvaluatedKey
      ? encodeCursor(res.LastEvaluatedKey)
      : undefined,
  });
};

export const get: Handler = async (event) => {
  const id = event.pathParameters?.id ?? "";
  const res = await ddb.send(
    new GetCommand({ TableName: Resource.Exercises.name, Key: { id } }),
  );
  if (!res.Item) return notFound("Exercise", instanceFor(id));

  const parsed = ExerciseItemSchema.safeParse(res.Item);
  if (!parsed.success) {
    console.error(`Malformed exercise ${id} in DynamoDB`, parsed.error);
    return internalError("Stored exercise data is malformed", instanceFor(id));
  }
  return ok(await toExerciseAdminDto(parsed.data, presignIllustrationUri));
};

export const create: Handler = async (event) => {
  let body: unknown;
  try {
    body = JSON.parse(event.body ?? "");
  } catch {
    return problem({
      status: 400,
      title: "Invalid JSON body",
      instance: BASE_PATH,
    });
  }
  const parsed = CreateExerciseRequestSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error, BASE_PATH);
  const req = parsed.data;

  const shapeParse = parseTranslationsForType(req.translations, req.exerciseType);
  if (!shapeParse.ok) {
    return problem({
      status: 400,
      title: "Invalid translation",
      instance: BASE_PATH,
      errors: shapeParse.errors,
    });
  }
  const typedTranslations = shapeParse.translations;

  const invariantErrors = validateTranslationInvariants(
    typedTranslations,
    req.exerciseType,
  );
  if (invariantErrors.length) {
    return problem({
      status: 400,
      title: "Invalid translation",
      instance: BASE_PATH,
      errors: invariantErrors,
    });
  }

  const denorm = await denormalizeReferences(
    req.categoryId,
    req.detailedRequirementIds,
  );
  if (denorm.missingCategory || denorm.missingRequirementIds.length) {
    return problem({
      status: 400,
      title: "Invalid references",
      instance: BASE_PATH,
      errors: [
        ...(denorm.missingCategory
          ? [
              {
                field: "categoryId",
                message: `Unknown categoryId: ${req.categoryId}`,
              },
            ]
          : []),
        ...denorm.missingRequirementIds.map((rid) => ({
          field: "detailedRequirementIds",
          message: `Unknown detailedRequirementId: ${rid}`,
        })),
      ],
    });
  }

  const id = newId();
  const now = new Date().toISOString();
  const translationsMap: Record<string, unknown> = {};
  for (const t of typedTranslations) {
    const { languageCode, payload } = splitTranslation(t);
    translationsMap[languageCode] = payload;
  }

  const item: ExerciseItem = {
    id,
    entity: EXERCISE_ENTITY,
    exerciseType: req.exerciseType,
    difficultyLevel: req.difficultyLevel,
    maxPoints: req.maxPoints,
    categoryId: req.categoryId,
    categoryTranslations: denorm.categoryTranslations,
    detailedRequirementIds: req.detailedRequirementIds,
    detailedRequirementTranslations: denorm.detailedRequirementTranslations,
    illustrations: [],
    translations: translationsMap,
    titleSearchable: titleSearchableFrom(typedTranslations),
    createdAt: now,
    updatedAt: now,
  };

  await ddb.send(
    new PutCommand({
      TableName: Resource.Exercises.name,
      Item: item,
      ConditionExpression: "attribute_not_exists(id)",
    }),
  );

  return {
    statusCode: 201,
    headers: {
      "content-type": "application/json",
      location: instanceFor(id),
    },
    body: JSON.stringify(await toExerciseAdminDto(item, presignIllustrationUri)),
  };
};

function isMergePatch(headers: Record<string, string | undefined>): boolean {
  const ct =
    headers["content-type"] ?? headers["Content-Type"] ?? "";
  return ct.toLowerCase().startsWith("application/merge-patch+json");
}

export const patch: Handler = async (event) => {
  const id = event.pathParameters?.id ?? "";
  if (!isMergePatch(event.headers)) {
    return problem({
      status: 415,
      title: "Unsupported Media Type",
      detail: "Expected application/merge-patch+json",
      instance: instanceFor(id),
    });
  }

  let body: unknown;
  try {
    body = JSON.parse(event.body ?? "");
  } catch {
    return problem({
      status: 400,
      title: "Invalid JSON body",
      instance: instanceFor(id),
    });
  }
  const parsed = UpdateExerciseRequestSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error, instanceFor(id));
  const patchBody = parsed.data;

  const existing = await ddb.send(
    new GetCommand({ TableName: Resource.Exercises.name, Key: { id } }),
  );
  if (!existing.Item) return notFound("Exercise", instanceFor(id));

  const currentParse = ExerciseItemSchema.safeParse(existing.Item);
  if (!currentParse.success) {
    console.error(`Malformed exercise ${id} in DynamoDB`, currentParse.error);
    return internalError("Stored exercise data is malformed", instanceFor(id));
  }
  const current = currentParse.data;

  let nextTranslationsMap: Record<string, unknown> = current.translations;
  let typedPatchTranslations: ExerciseTranslation[] | undefined;
  if (patchBody.translations) {
    const shapeParse = parseTranslationsForType(
      patchBody.translations,
      current.exerciseType,
    );
    if (!shapeParse.ok) {
      return problem({
        status: 400,
        title: "Invalid translation",
        instance: instanceFor(id),
        errors: shapeParse.errors,
      });
    }
    typedPatchTranslations = shapeParse.translations;

    const invariantErrors = validateTranslationInvariants(
      typedPatchTranslations,
      current.exerciseType,
    );
    if (invariantErrors.length) {
      return problem({
        status: 400,
        title: "Invalid translation",
        instance: instanceFor(id),
        errors: invariantErrors,
      });
    }

    const replacement: Record<string, unknown> = {};
    for (const t of typedPatchTranslations) {
      const { languageCode, payload } = splitTranslation(t);
      replacement[languageCode] = payload;
    }
    nextTranslationsMap = replacement;
  }

  const nextCategoryId = patchBody.categoryId ?? current.categoryId;
  const nextRequirementIds =
    patchBody.detailedRequirementIds ?? current.detailedRequirementIds;
  const catChanged = patchBody.categoryId !== undefined;
  const reqChanged = patchBody.detailedRequirementIds !== undefined;

  let categoryTranslations = current.categoryTranslations;
  let detailedRequirementTranslations = current.detailedRequirementTranslations;
  if (catChanged || reqChanged) {
    const denorm = await denormalizeReferences(
      nextCategoryId,
      nextRequirementIds,
    );
    if (denorm.missingCategory || denorm.missingRequirementIds.length) {
      return problem({
        status: 400,
        title: "Invalid references",
        instance: instanceFor(id),
        errors: [
          ...(denorm.missingCategory
            ? [
                {
                  field: "categoryId",
                  message: `Unknown categoryId: ${nextCategoryId}`,
                },
              ]
            : []),
          ...denorm.missingRequirementIds.map((rid) => ({
            field: "detailedRequirementIds",
            message: `Unknown detailedRequirementId: ${rid}`,
          })),
        ],
      });
    }
    categoryTranslations = denorm.categoryTranslations;
    detailedRequirementTranslations = denorm.detailedRequirementTranslations;
  }

  let titleSearchable = current.titleSearchable;
  if (typedPatchTranslations) {
    titleSearchable = titleSearchableFrom(typedPatchTranslations);
  }

  const now = new Date().toISOString();
  const next: ExerciseItem = {
    ...current,
    categoryId: nextCategoryId,
    categoryTranslations,
    detailedRequirementIds: nextRequirementIds,
    detailedRequirementTranslations,
    difficultyLevel: patchBody.difficultyLevel ?? current.difficultyLevel,
    maxPoints: patchBody.maxPoints ?? current.maxPoints,
    translations: nextTranslationsMap,
    titleSearchable,
    updatedAt: now,
  };

  try {
    await ddb.send(
      new TransactWriteCommand({
        TransactItems: [
          {
            Put: {
              TableName: Resource.Exercises.name,
              Item: next,
              ConditionExpression:
                "attribute_exists(id) AND updatedAt = :prev",
              ExpressionAttributeValues: { ":prev": current.updatedAt },
            },
          },
        ],
      }),
    );
  } catch (err: unknown) {
    const name = (err as { name?: string } | null)?.name;
    const reasons = (err as { CancellationReasons?: { Code?: string }[] } | null)
      ?.CancellationReasons;
    const conditionFailed =
      name === "ConditionalCheckFailedException" ||
      (name === "TransactionCanceledException" &&
        reasons?.some((r) => r.Code === "ConditionalCheckFailed"));
    if (conditionFailed) {
      return problem({
        status: 409,
        title: "Conflict",
        detail:
          "The exercise was modified or removed by another request. Fetch the current version and retry.",
        instance: instanceFor(id),
      });
    }
    throw err;
  }

  return ok(await toExerciseAdminDto(next, presignIllustrationUri));
};

export const remove: Handler = async (event) => {
  const id = event.pathParameters?.id ?? "";
  const res = await ddb.send(
    new DeleteCommand({
      TableName: Resource.Exercises.name,
      Key: { id },
      ConditionExpression: "attribute_exists(id)",
      ReturnValues: "ALL_OLD",
    }),
  ).catch((err: unknown) => {
    if (
      err &&
      typeof err === "object" &&
      "name" in err &&
      (err as { name: string }).name === "ConditionalCheckFailedException"
    ) {
      return null;
    }
    throw err;
  });

  if (!res) return notFound("Exercise", instanceFor(id));

  const oldParse = ExerciseItemSchema.safeParse(res.Attributes);
  if (oldParse.success && oldParse.data.illustrations.length) {
    await deleteIllustrations(oldParse.data.illustrations);
  }

  return { statusCode: 204, headers: {}, body: "" };
};
