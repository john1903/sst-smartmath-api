import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyEventV2WithJWTAuthorizer,
} from "aws-lambda";
import {
  DeleteObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { BatchGetCommand } from "@aws-sdk/lib-dynamodb";
import { Resource } from "sst";
import Busboy from "busboy";
import { ddb } from "@smartmath/utils/dynamodb";
import { newId } from "@smartmath/utils/id";
import { presignedGetUrl, s3 } from "@smartmath/utils/s3";
import { CategoryItemSchema } from "@smartmath/core/static/categories";
import { RequirementItemSchema } from "@smartmath/core/static/requirements";
import type { StoredIllustration } from "@smartmath/core/exercises";
import type { LanguageCode } from "@smartmath/core/i18n";

type Translations = Partial<Record<LanguageCode, string>>;

export type Handler = (
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
) => Promise<import("aws-lambda").APIGatewayProxyResultV2>;

export interface DenormResult {
  categoryTranslations: Translations;
  detailedRequirementTranslations: Record<string, Translations>;
  missingCategory: boolean;
  missingRequirementIds: string[];
}

export async function denormalizeReferences(
  categoryId: string,
  detailedRequirementIds: string[],
): Promise<DenormResult> {
  const uniqReqIds = [...new Set(detailedRequirementIds)];
  const res = await ddb.send(
    new BatchGetCommand({
      RequestItems: {
        [Resource.Categories.name]: { Keys: [{ id: categoryId }] },
        [Resource.Requirements.name]: {
          Keys: uniqReqIds.map((id) => ({ id })),
        },
      },
    }),
  );

  const catRow = res.Responses?.[Resource.Categories.name]?.[0];
  const category = catRow ? CategoryItemSchema.safeParse(catRow) : undefined;

  const reqRows = res.Responses?.[Resource.Requirements.name] ?? [];
  const parsedReqs = reqRows
    .map((r) => RequirementItemSchema.safeParse(r))
    .filter((p): p is Extract<typeof p, { success: true }> => p.success)
    .map((p) => p.data);
  const reqById = new Map(parsedReqs.map((r) => [r.id, r]));

  const missingRequirementIds = uniqReqIds.filter((id) => !reqById.has(id));

  const detailedRequirementTranslations: Record<string, Translations> = {};
  for (const r of parsedReqs) {
    detailedRequirementTranslations[r.id] = r.translations;
  }

  return {
    categoryTranslations: category?.success ? category.data.translations : {},
    detailedRequirementTranslations,
    missingCategory: !category?.success,
    missingRequirementIds,
  };
}

export function presignIllustrationUri(s3Key: string): Promise<string> {
  return presignedGetUrl(Resource.Uploads.name, s3Key);
}

const MAX_ILLUSTRATION_BYTES = 5 * 1024 * 1024;
const MAX_ILLUSTRATIONS = 5;

export interface MultipartExerciseUpload {
  body: unknown | undefined;
  files: { fileName: string; mimeType: string; body: Buffer }[];
}

export function isMultipart(headers: Record<string, string | undefined>): boolean {
  const ct = headers["content-type"] ?? headers["Content-Type"] ?? "";
  return ct.toLowerCase().startsWith("multipart/form-data");
}

export function parseMultipartExercise(
  event: APIGatewayProxyEventV2,
  bodyFieldName: string,
  bodyRequired: boolean,
): Promise<MultipartExerciseUpload> {
  return new Promise((resolve, reject) => {
    const contentType =
      event.headers["content-type"] ?? event.headers["Content-Type"] ?? "";
    const busboy = Busboy({
      headers: { "content-type": contentType },
      limits: {
        fileSize: MAX_ILLUSTRATION_BYTES,
        files: MAX_ILLUSTRATIONS,
        fields: 4,
      },
    });

    let bodyJson: string | undefined;
    const files: MultipartExerciseUpload["files"] = [];
    let exceededLimit = false;

    busboy.on("field", (name, value) => {
      if (name === bodyFieldName) bodyJson = value;
    });

    busboy.on("file", (_field, stream, info) => {
      const chunks: Buffer[] = [];
      stream.on("data", (c: Buffer) => chunks.push(c));
      stream.on("limit", () => {
        exceededLimit = true;
      });
      stream.on("end", () => {
        files.push({
          fileName: info.filename,
          mimeType: info.mimeType,
          body: Buffer.concat(chunks),
        });
      });
    });

    busboy.on("error", reject);
    busboy.on("finish", () => {
      if (exceededLimit) {
        reject(Object.assign(new Error("Illustration too large"), { code: 413 }));
        return;
      }
      if (bodyRequired && !bodyJson) {
        reject(new Error(`Missing \`${bodyFieldName}\` form field`));
        return;
      }
      let parsed: unknown = undefined;
      if (bodyJson !== undefined) {
        try {
          parsed = JSON.parse(bodyJson);
        } catch {
          reject(new Error(`Field \`${bodyFieldName}\` is not valid JSON`));
          return;
        }
      }
      resolve({ body: parsed, files });
    });

    const body = event.body ?? "";
    const buf = event.isBase64Encoded
      ? Buffer.from(body, "base64")
      : Buffer.from(body, "latin1");
    busboy.end(buf);
  });
}

export async function uploadIllustrations(
  exerciseId: string,
  files: MultipartExerciseUpload["files"],
): Promise<StoredIllustration[]> {
  const out: StoredIllustration[] = [];
  for (const f of files) {
    const id = newId();
    const s3Key = `exercises/${exerciseId}/illustrations/${id}/${f.fileName}`;
    await s3.send(
      new PutObjectCommand({
        Bucket: Resource.Uploads.name,
        Key: s3Key,
        Body: f.body,
        ContentType: f.mimeType,
      }),
    );
    out.push({ id, fileName: f.fileName, mimeType: f.mimeType, s3Key });
  }
  return out;
}

export async function deleteIllustrations(
  illustrations: StoredIllustration[],
): Promise<void> {
  await Promise.all(
    illustrations.map((ill) =>
      s3
        .send(
          new DeleteObjectCommand({
            Bucket: Resource.Uploads.name,
            Key: ill.s3Key,
          }),
        )
        .catch((err) => {
          console.error(
            `Failed to delete illustration S3 object ${ill.s3Key}`,
            err,
          );
        }),
    ),
  );
}
