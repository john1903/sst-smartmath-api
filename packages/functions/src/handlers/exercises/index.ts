import {
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";
import { Resource } from "sst";
import { z } from "zod";
import { ddb } from "@smartmath/utils/dynamodb";
import { newId } from "@smartmath/utils/id";
import {
  CreateExerciseRequestSchema,
  DifficultyLevelSchema,
  ExerciseItemSchema,
  ExerciseTypeSchema,
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
  denormalizeReferences,
  presignIllustrationUri,
  requireAdminOrContributor,
  snapshotIllustrations,
  type Handler,
} from "./shared";

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
  const denied = requireAdminOrContributor(event, BASE_PATH);
  if (denied) return denied;

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

  const collected: ExerciseItem[] = [];
  let lastKey: Record<string, unknown> | undefined = exclusiveStartKey;
  let iterations = 0;
  const MAX_ITERATIONS = 5;
  while (collected.length < limit && iterations < MAX_ITERATIONS) {
    iterations++;
    const remaining = limit - collected.length;
    const res: {
      Items?: Record<string, unknown>[];
      LastEvaluatedKey?: Record<string, unknown>;
    } = categoryId
      ? await ddb.send(
          new QueryCommand({
            TableName: Resource.Exercises.name,
            IndexName: "byCategory",
            KeyConditionExpression: "categoryId = :cid",
            FilterExpression: filter.expr,
            ExpressionAttributeValues: { ":cid": categoryId, ...filter.values },
            Limit: remaining,
            ExclusiveStartKey: lastKey,
          }),
        )
      : await ddb.send(
          new ScanCommand({
            TableName: Resource.Exercises.name,
            FilterExpression: filter.expr,
            ExpressionAttributeValues: filter.expr ? filter.values : undefined,
            Limit: remaining,
            ExclusiveStartKey: lastKey,
          }),
        );

    for (const raw of res.Items ?? []) {
      const parsed = ExerciseItemSchema.safeParse(raw);
      if (parsed.success) {
        collected.push(parsed.data);
      } else {
        console.error(
          `Skipping malformed exercise row id=${(raw as { id?: unknown }).id}`,
          parsed.error,
        );
      }
    }

    lastKey = res.LastEvaluatedKey;
    if (!lastKey) break;
  }

  const page = collected;
  const items = await Promise.all(
    page.map((it) => toExerciseAdminDto(it, presignIllustrationUri)),
  );
  return ok({
    items,
    nextCursor: lastKey ? encodeCursor(lastKey) : undefined,
  });
};

export const get: Handler = async (event) => {
  const id = event.pathParameters?.id ?? "";
  const denied = requireAdminOrContributor(event, instanceFor(id));
  if (denied) return denied;

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
  const denied = requireAdminOrContributor(event, BASE_PATH);
  if (denied) return denied;

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

  const invariantErrors = validateTranslationInvariants(req.translations);
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

  const illustrationIds = req.illustrationIds ?? [];
  const illSnap = await snapshotIllustrations(illustrationIds);
  if (illSnap.missingIds.length || illSnap.wrongCategoryIds.length) {
    return problem({
      status: 400,
      title: "Invalid illustrations",
      instance: BASE_PATH,
      errors: [
        ...illSnap.missingIds.map((iid) => ({
          field: "illustrationIds",
          message: `Unknown file id: ${iid}`,
        })),
        ...illSnap.wrongCategoryIds.map((iid) => ({
          field: "illustrationIds",
          message: `File ${iid} is not of category 'exercise'`,
        })),
      ],
    });
  }

  const id = newId();
  const now = new Date().toISOString();
  const translationsMap: Record<string, unknown> = {};
  for (const t of req.translations) {
    const { languageCode, payload } = splitTranslation(t);
    translationsMap[languageCode] = payload;
  }

  const item: ExerciseItem = {
    id,
    exerciseType: req.translations[0].exerciseType,
    difficultyLevel: req.difficultyLevel,
    maxPoints: req.maxPoints,
    categoryId: req.categoryId,
    categoryTranslations: denorm.categoryTranslations,
    detailedRequirementIds: req.detailedRequirementIds,
    detailedRequirementTranslations: denorm.detailedRequirementTranslations,
    illustrations: illSnap.illustrations,
    translations: translationsMap,
    titleSearchable: titleSearchableFrom(req.translations),
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
  const denied = requireAdminOrContributor(event, instanceFor(id));
  if (denied) return denied;

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

  if (patchBody.translations) {
    const invariantErrors = validateTranslationInvariants(
      patchBody.translations,
    );
    if (invariantErrors.length) {
      return problem({
        status: 400,
        title: "Invalid translation",
        instance: instanceFor(id),
        errors: invariantErrors,
      });
    }
  }

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

  const mergedTranslationsMap: Record<string, unknown> = {
    ...current.translations,
  };
  if (patchBody.translations) {
    for (const t of patchBody.translations) {
      if (t.exerciseType !== current.exerciseType) {
        return problem({
          status: 400,
          title: "Invalid translation type",
          detail: `translation exerciseType ${t.exerciseType} does not match exercise ${current.exerciseType}`,
          instance: instanceFor(id),
        });
      }
      const { languageCode, payload } = splitTranslation(t);
      mergedTranslationsMap[languageCode] = payload;
    }
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
  if (patchBody.translations) {
    const rebuiltList: ExerciseTranslation[] = Object.entries(
      mergedTranslationsMap,
    ).map(([lc, payload]) => ({
      ...(payload as Omit<ExerciseTranslation, "languageCode">),
      languageCode: lc as ExerciseTranslation["languageCode"],
    })) as ExerciseTranslation[];
    titleSearchable = titleSearchableFrom(rebuiltList);
  }

  let illustrations = current.illustrations;
  if (patchBody.illustrationIds) {
    const illSnap = await snapshotIllustrations(patchBody.illustrationIds);
    if (illSnap.missingIds.length || illSnap.wrongCategoryIds.length) {
      return problem({
        status: 400,
        title: "Invalid illustrations",
        instance: instanceFor(id),
        errors: [
          ...illSnap.missingIds.map((iid) => ({
            field: "illustrationIds",
            message: `Unknown file id: ${iid}`,
          })),
          ...illSnap.wrongCategoryIds.map((iid) => ({
            field: "illustrationIds",
            message: `File ${iid} is not of category 'exercise'`,
          })),
        ],
      });
    }
    illustrations = illSnap.illustrations;
  }

  const now = new Date().toISOString();
  const next: ExerciseItem = {
    ...current,
    categoryId: nextCategoryId,
    categoryTranslations,
    detailedRequirementIds: nextRequirementIds,
    detailedRequirementTranslations,
    illustrations,
    difficultyLevel: patchBody.difficultyLevel ?? current.difficultyLevel,
    maxPoints: patchBody.maxPoints ?? current.maxPoints,
    translations: mergedTranslationsMap,
    titleSearchable,
    updatedAt: now,
  };

  try {
    await ddb.send(
      new PutCommand({
        TableName: Resource.Exercises.name,
        Item: next,
        ConditionExpression: "attribute_exists(id)",
      }),
    );
  } catch (err: unknown) {
    if (
      err &&
      typeof err === "object" &&
      "name" in err &&
      (err as { name: string }).name === "ConditionalCheckFailedException"
    ) {
      return notFound("Exercise", instanceFor(id));
    }
    throw err;
  }

  return ok(await toExerciseAdminDto(next, presignIllustrationUri));
};

export const remove: Handler = async (event) => {
  const id = event.pathParameters?.id ?? "";
  const denied = requireAdminOrContributor(event, instanceFor(id));
  if (denied) return denied;

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

  return { statusCode: 204, headers: {}, body: "" };
};
