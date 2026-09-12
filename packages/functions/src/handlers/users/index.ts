import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from "aws-lambda";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import {
  GetCommand,
  TransactWriteCommand,
  type TransactWriteCommandInput,
} from "@aws-sdk/lib-dynamodb";
import { Resource } from "sst";
import { readClaims } from "@smartmath/core/auth";
import { FileItemSchema } from "@smartmath/core/files";
import {
  UpdateUserRequestSchema,
  UserItemSchema,
  toUserDto,
  type UserItem,
} from "@smartmath/core/users";
import {
  badRequest,
  internalError,
  notFound,
  ok,
  problem,
} from "@smartmath/core/http";
import { ddb } from "@smartmath/utils/dynamodb";
import { presignedGetUrl, s3 } from "@smartmath/utils/s3";

type Handler = (
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
) => Promise<APIGatewayProxyResultV2>;

const BASE_PATH = "/users/me";

function presignAvatarUri(s3Key: string): Promise<string> {
  return presignedGetUrl(Resource.Uploads.name, s3Key);
}

function isMergePatch(headers: Record<string, string | undefined>): boolean {
  const ct = headers["content-type"] ?? headers["Content-Type"] ?? "";
  return ct.toLowerCase().startsWith("application/merge-patch+json");
}

// DynamoDB's marshaller throws on explicit `undefined` values (the shared
// ddb client isn't configured with removeUndefinedValues) — strip them
// before a Put/Update so clearing an optional field (e.g. avatar) works.
function withoutUndefined<T extends object>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined),
  ) as T;
}

export const get: Handler = async (event) => {
  const { sub } = readClaims(event);
  const res = await ddb.send(
    new GetCommand({ TableName: Resource.Users.name, Key: { id: sub } }),
  );
  if (!res.Item) return notFound("User", BASE_PATH);

  const parsed = UserItemSchema.safeParse(res.Item);
  if (!parsed.success) {
    console.error(`Malformed user ${sub} in DynamoDB`, parsed.error);
    return internalError("Stored user data is malformed", BASE_PATH);
  }
  return ok(await toUserDto(parsed.data, presignAvatarUri));
};

export const patch: Handler = async (event) => {
  const { sub } = readClaims(event);
  if (!isMergePatch(event.headers)) {
    return problem({
      status: 415,
      title: "Unsupported Media Type",
      detail: "Expected application/merge-patch+json",
      instance: BASE_PATH,
    });
  }

  let body: unknown;
  try {
    body = JSON.parse(event.body ?? "");
  } catch {
    return problem({ status: 400, title: "Invalid JSON body", instance: BASE_PATH });
  }
  const parsed = UpdateUserRequestSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error, BASE_PATH);
  const patchBody = parsed.data;

  const wantsNewAvatar =
    patchBody.avatarId !== undefined && patchBody.avatarId !== null;

  const [existing, fileRes] = await Promise.all([
    ddb.send(new GetCommand({ TableName: Resource.Users.name, Key: { id: sub } })),
    wantsNewAvatar
      ? ddb.send(
          new GetCommand({ TableName: Resource.Files.name, Key: { id: patchBody.avatarId } }),
        )
      : Promise.resolve(undefined),
  ]);

  if (!existing.Item) return notFound("User", BASE_PATH);

  const currentParse = UserItemSchema.safeParse(existing.Item);
  if (!currentParse.success) {
    console.error(`Malformed user ${sub} in DynamoDB`, currentParse.error);
    return internalError("Stored user data is malformed", BASE_PATH);
  }
  const current = currentParse.data;

  let nextAvatar = current.avatar;
  if (patchBody.avatarId === null) {
    nextAvatar = undefined;
  } else if (wantsNewAvatar) {
    const fileParsed = fileRes?.Item ? FileItemSchema.safeParse(fileRes.Item) : undefined;
    if (
      !fileParsed?.success ||
      fileParsed.data.ownerSub !== sub ||
      fileParsed.data.category !== "user"
    ) {
      return problem({
        status: 400,
        title: "Invalid avatarId",
        detail: `Unknown avatarId: ${patchBody.avatarId}`,
        instance: BASE_PATH,
      });
    }
    nextAvatar = {
      id: fileParsed.data.id,
      fileName: fileParsed.data.fileName,
      mimeType: fileParsed.data.mimeType,
      s3Key: fileParsed.data.s3Key,
    };
  }

  const oldAvatarToDelete =
    current.avatar && current.avatar.id !== nextAvatar?.id ? current.avatar : undefined;

  const now = new Date().toISOString();
  const next: UserItem = UserItemSchema.parse({
    id: current.id,
    email: current.email,
    firstName: patchBody.firstName ?? current.firstName,
    lastName: patchBody.lastName ?? current.lastName,
    ...(nextAvatar ? { avatar: nextAvatar } : {}),
    createdAt: current.createdAt,
    updatedAt: now,
  });

  // Track which TransactItem is which so a ConditionalCheckFailed can be
  // attributed to the right cause (stale profile vs. a concurrently
  // deleted/reassigned avatar file) instead of a generic conflict.
  type Kind = "user" | "avatarStillValid" | "deleteOldAvatar";
  const planned: { kind: Kind; item: NonNullable<TransactWriteCommandInput["TransactItems"]>[number] }[] = [
    {
      kind: "user",
      item: {
        Put: {
          TableName: Resource.Users.name,
          Item: withoutUndefined(next),
          ConditionExpression: "attribute_exists(id) AND updatedAt = :prev",
          ExpressionAttributeValues: { ":prev": current.updatedAt },
        },
      },
    },
  ];
  if (wantsNewAvatar && nextAvatar) {
    planned.push({
      kind: "avatarStillValid",
      item: {
        ConditionCheck: {
          TableName: Resource.Files.name,
          Key: { id: nextAvatar.id },
          ConditionExpression: "attribute_exists(id) AND ownerSub = :sub AND category = :cat",
          ExpressionAttributeValues: { ":sub": sub, ":cat": "user" },
        },
      },
    });
  }
  if (oldAvatarToDelete) {
    planned.push({
      kind: "deleteOldAvatar",
      item: {
        Delete: {
          TableName: Resource.Files.name,
          Key: { id: oldAvatarToDelete.id },
          ConditionExpression: "attribute_exists(id) AND ownerSub = :sub",
          ExpressionAttributeValues: { ":sub": sub },
        },
      },
    });
  }

  try {
    await ddb.send(
      new TransactWriteCommand({ TransactItems: planned.map((p) => p.item) }),
    );
  } catch (err: unknown) {
    const name = (err as { name?: string } | null)?.name;
    const reasons = (err as { CancellationReasons?: { Code?: string }[] } | null)
      ?.CancellationReasons;

    if (name === "ConditionalCheckFailedException") {
      return problem({
        status: 409,
        title: "Conflict",
        detail: "The profile was modified by another request. Fetch the current version and retry.",
        instance: BASE_PATH,
      });
    }
    if (name === "TransactionCanceledException" && reasons) {
      const failedAvatarCheck = planned.some(
        (p, i) =>
          p.kind === "avatarStillValid" &&
          reasons[i]?.Code === "ConditionalCheckFailed",
      );
      if (failedAvatarCheck) {
        return problem({
          status: 400,
          title: "Invalid avatarId",
          detail: `avatarId ${patchBody.avatarId} was deleted or reassigned before the update could commit.`,
          instance: BASE_PATH,
        });
      }
      if (reasons.some((r) => r.Code === "ConditionalCheckFailed")) {
        return problem({
          status: 409,
          title: "Conflict",
          detail: "The profile was modified by another request. Fetch the current version and retry.",
          instance: BASE_PATH,
        });
      }
    }
    throw err;
  }

  if (oldAvatarToDelete) {
    await s3
      .send(
        new DeleteObjectCommand({
          Bucket: Resource.Uploads.name,
          Key: oldAvatarToDelete.s3Key,
        }),
      )
      .catch((err) => {
        console.error(
          `Failed to delete old avatar S3 object ${oldAvatarToDelete.s3Key}`,
          err,
        );
      });
  }

  return ok(await toUserDto(next, presignAvatarUri));
};
