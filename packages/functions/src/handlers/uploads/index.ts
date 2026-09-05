import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from "aws-lambda";
import { DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import {
  DeleteCommand,
  GetCommand,
  PutCommand,
} from "@aws-sdk/lib-dynamodb";
import { Resource } from "sst";
import Busboy from "busboy";
import { readClaims } from "@smartmath/core/auth";
import {
  FileCategorySchema,
  FileItemSchema,
  toFileDto,
  type FileCategory,
  type FileItem,
} from "@smartmath/core/files";
import {
  forbidden,
  notFound,
  problem,
  unauthorized,
} from "@smartmath/core/http";
import { ddb } from "@smartmath/utils/dynamodb";
import { newId } from "@smartmath/utils/id";
import { presignedGetUrl, s3 } from "@smartmath/utils/s3";

type Handler = (
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
) => Promise<APIGatewayProxyResultV2>;

const BASE_PATH = "/uploads";
const instanceFor = (id?: string) =>
  id ? `${BASE_PATH}/${id}` : BASE_PATH;

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

interface ParsedUpload {
  fileName: string;
  mimeType: string;
  category: FileCategory;
  body: Buffer;
}

function parseMultipart(
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
): Promise<ParsedUpload> {
  return new Promise((resolve, reject) => {
    const contentType =
      event.headers["content-type"] ?? event.headers["Content-Type"] ?? "";
    if (!contentType.toLowerCase().startsWith("multipart/form-data")) {
      reject(new Error("Content-Type must be multipart/form-data"));
      return;
    }

    const busboy = Busboy({
      headers: { "content-type": contentType },
      limits: { fileSize: MAX_UPLOAD_BYTES, files: 1, fields: 5 },
    });

    let category: string | undefined;
    let fileName: string | undefined;
    let mimeType: string | undefined;
    const chunks: Buffer[] = [];
    let exceededLimit = false;

    busboy.on("field", (name, value) => {
      if (name === "category") category = value;
    });

    busboy.on("file", (_fieldname, stream, info) => {
      fileName = info.filename;
      mimeType = info.mimeType;
      stream.on("data", (chunk: Buffer) => chunks.push(chunk));
      stream.on("limit", () => {
        exceededLimit = true;
      });
    });

    busboy.on("error", reject);
    busboy.on("finish", () => {
      if (exceededLimit) {
        reject(Object.assign(new Error("File too large"), { code: 413 }));
        return;
      }
      if (!fileName || !mimeType) {
        reject(new Error("Missing file part"));
        return;
      }
      const parsedCategory = FileCategorySchema.safeParse(category);
      if (!parsedCategory.success) {
        reject(new Error("Missing or invalid category"));
        return;
      }
      resolve({
        fileName,
        mimeType,
        category: parsedCategory.data,
        body: Buffer.concat(chunks),
      });
    });

    const body = event.body ?? "";
    const buf = event.isBase64Encoded
      ? Buffer.from(body, "base64")
      : Buffer.from(body, "latin1");
    busboy.end(buf);
  });
}

export const upload: Handler = async (event) => {
  const claims = readClaims(event);
  if (!claims.sub) return unauthorized(BASE_PATH);

  let parsed: ParsedUpload;
  try {
    parsed = await parseMultipart(event);
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
        detail: `File exceeds ${MAX_UPLOAD_BYTES} bytes.`,
        instance: BASE_PATH,
      });
    }
    return problem({
      status: 400,
      title: "Invalid upload",
      detail: err instanceof Error ? err.message : String(err),
      instance: BASE_PATH,
    });
  }

  const id = newId();
  const s3Key = `files/${id}/${parsed.fileName}`;
  const now = new Date().toISOString();

  await s3.send(
    new PutObjectCommand({
      Bucket: Resource.Uploads.name,
      Key: s3Key,
      Body: parsed.body,
      ContentType: parsed.mimeType,
    }),
  );

  const item: FileItem = {
    id,
    ownerSub: claims.sub,
    category: parsed.category,
    fileName: parsed.fileName,
    mimeType: parsed.mimeType,
    s3Key,
    createdAt: now,
  };

  try {
    await ddb.send(
      new PutCommand({
        TableName: Resource.Files.name,
        Item: item,
        ConditionExpression: "attribute_not_exists(id)",
      }),
    );
  } catch (err) {
    await s3
      .send(
        new DeleteObjectCommand({
          Bucket: Resource.Uploads.name,
          Key: s3Key,
        }),
      )
      .catch((cleanupErr) => {
        console.error(
          `Failed to clean up orphaned S3 object ${s3Key} after DDB write failed`,
          cleanupErr,
        );
      });
    throw err;
  }

  const uri = await presignedGetUrl(Resource.Uploads.name, s3Key);
  return {
    statusCode: 201,
    headers: {
      "content-type": "application/json",
      location: instanceFor(id),
    },
    body: JSON.stringify(toFileDto(item, uri)),
  };
};

export const remove: Handler = async (event) => {
  const claims = readClaims(event);
  if (!claims.sub) return unauthorized(instanceFor(event.pathParameters?.id));

  const id = event.pathParameters?.id ?? "";
  const res = await ddb.send(
    new GetCommand({ TableName: Resource.Files.name, Key: { id } }),
  );
  if (!res.Item) return notFound("File", instanceFor(id));

  const parsed = FileItemSchema.safeParse(res.Item);
  if (!parsed.success) return notFound("File", instanceFor(id));
  if (parsed.data.ownerSub !== claims.sub) {
    return forbidden("Not the owner of this file.", instanceFor(id));
  }

  try {
    await ddb.send(
      new DeleteCommand({
        TableName: Resource.Files.name,
        Key: { id },
        ConditionExpression:
          "attribute_exists(id) AND ownerSub = :sub",
        ExpressionAttributeValues: { ":sub": claims.sub },
      }),
    );
  } catch (err: unknown) {
    if (
      err &&
      typeof err === "object" &&
      "name" in err &&
      (err as { name: string }).name === "ConditionalCheckFailedException"
    ) {
      return notFound("File", instanceFor(id));
    }
    throw err;
  }

  await s3
    .send(
      new DeleteObjectCommand({
        Bucket: Resource.Uploads.name,
        Key: parsed.data.s3Key,
      }),
    )
    .catch((cleanupErr) => {
      console.error(
        `Failed to delete S3 object ${parsed.data.s3Key} after DDB row removed; orphaned`,
        cleanupErr,
      );
    });

  return { statusCode: 204, headers: {}, body: "" };
};

