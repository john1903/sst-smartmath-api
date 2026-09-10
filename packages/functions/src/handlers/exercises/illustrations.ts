import {
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { Resource } from "sst";
import { ddb } from "@smartmath/utils/dynamodb";
import { s3 } from "@smartmath/utils/s3";
import {
  ExerciseItemSchema,
  toExerciseAdminDto,
  type ExerciseItem,
} from "@smartmath/core/exercises";
import {
  internalError,
  notFound,
  ok,
  problem,
} from "@smartmath/core/http";
import {
  deleteIllustrations,
  isMultipart,
  parseMultipartFiles,
  presignIllustrationUri,
  uploadIllustrations,
  type Handler,
} from "./shared";

const instanceForExercise = (id: string) => `/exercises/${id}/illustrations`;

async function getExerciseItem(id: string): Promise<
  { ok: true; item: ExerciseItem } | { ok: false; response: ReturnType<typeof notFound> }
> {
  const res = await ddb.send(
    new GetCommand({ TableName: Resource.Exercises.name, Key: { id } }),
  );
  if (!res.Item) {
    return { ok: false, response: notFound("Exercise", `/exercises/${id}`) };
  }
  const parsed = ExerciseItemSchema.safeParse(res.Item);
  if (!parsed.success) {
    console.error(`Malformed exercise ${id} in DynamoDB`, parsed.error);
    return {
      ok: false,
      response: internalError(
        "Stored exercise data is malformed",
        `/exercises/${id}`,
      ),
    };
  }
  return { ok: true, item: parsed.data };
}

export const add: Handler = async (event) => {
  const id = event.pathParameters?.id ?? "";
  if (!isMultipart(event.headers)) {
    return problem({
      status: 415,
      title: "Unsupported Media Type",
      detail: "Expected multipart/form-data",
      instance: instanceForExercise(id),
    });
  }

  const current = await getExerciseItem(id);
  if (!current.ok) return current.response;

  let files;
  try {
    files = await parseMultipartFiles(event);
  } catch (err) {
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code: number }).code === 413
    ) {
      return problem({
        status: 413,
        title: "Payload too large",
        instance: instanceForExercise(id),
      });
    }
    return problem({
      status: 400,
      title: "Invalid multipart body",
      detail: err instanceof Error ? err.message : String(err),
      instance: instanceForExercise(id),
    });
  }

  const uploaded = await uploadIllustrations(id, files);
  const next: ExerciseItem = {
    ...current.item,
    illustrations: [...current.item.illustrations, ...uploaded],
    updatedAt: new Date().toISOString(),
  };

  try {
    await ddb.send(
      new PutCommand({
        TableName: Resource.Exercises.name,
        Item: next,
        ConditionExpression: "attribute_exists(id) AND updatedAt = :prev",
        ExpressionAttributeValues: { ":prev": current.item.updatedAt },
      }),
    );
  } catch (err: unknown) {
    await deleteIllustrations(uploaded);
    const name = (err as { name?: string } | null)?.name;
    if (name === "ConditionalCheckFailedException") {
      return problem({
        status: 409,
        title: "Conflict",
        detail: "The exercise was modified concurrently. Refetch and retry.",
        instance: instanceForExercise(id),
      });
    }
    throw err;
  }

  return ok(await toExerciseAdminDto(next, presignIllustrationUri));
};

export const remove: Handler = async (event) => {
  const id = event.pathParameters?.id ?? "";
  const illustrationId = event.pathParameters?.illustrationId ?? "";
  const instance = `/exercises/${id}/illustrations/${illustrationId}`;

  const current = await getExerciseItem(id);
  if (!current.ok) return current.response;

  const target = current.item.illustrations.find((i) => i.id === illustrationId);
  if (!target) return notFound("Illustration", instance);

  const next: ExerciseItem = {
    ...current.item,
    illustrations: current.item.illustrations.filter(
      (i) => i.id !== illustrationId,
    ),
    updatedAt: new Date().toISOString(),
  };

  try {
    await ddb.send(
      new PutCommand({
        TableName: Resource.Exercises.name,
        Item: next,
        ConditionExpression: "attribute_exists(id) AND updatedAt = :prev",
        ExpressionAttributeValues: { ":prev": current.item.updatedAt },
      }),
    );
  } catch (err: unknown) {
    const name = (err as { name?: string } | null)?.name;
    if (name === "ConditionalCheckFailedException") {
      return problem({
        status: 409,
        title: "Conflict",
        detail: "The exercise was modified concurrently. Refetch and retry.",
        instance,
      });
    }
    throw err;
  }

  await s3
    .send(
      new DeleteObjectCommand({
        Bucket: Resource.Uploads.name,
        Key: target.s3Key,
      }),
    )
    .catch((cleanupErr) => {
      console.error(
        `Failed to delete illustration S3 object ${target.s3Key}`,
        cleanupErr,
      );
    });

  return { statusCode: 204, headers: {}, body: "" };
};
