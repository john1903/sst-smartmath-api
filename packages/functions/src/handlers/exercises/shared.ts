import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import { BatchGetCommand } from "@aws-sdk/lib-dynamodb";
import { Resource } from "sst";
import { ddb } from "@smartmath/utils/dynamodb";
import { presignedGetUrl } from "@smartmath/utils/s3";
import {
  CategoryItemSchema,
} from "@smartmath/core/static/categories";
import {
  RequirementItemSchema,
} from "@smartmath/core/static/requirements";
import { FileItemSchema, type FileItem } from "@smartmath/core/files";
import type { StoredIllustration } from "@smartmath/core/exercises";
import type { LanguageCode } from "@smartmath/core/i18n";

type Translations = Partial<Record<LanguageCode, string>>;
import {
  hasAnyGroup,
  readClaims,
  UserGroup,
} from "@smartmath/core/auth";
import { forbidden, unauthorized } from "@smartmath/core/http";

export const WRITE_GROUPS = [UserGroup.Admin, UserGroup.Contributor] as const;

export type Handler = (
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
) => Promise<import("aws-lambda").APIGatewayProxyResultV2>;

export function requireAdminOrContributor(
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
  instance: string,
) {
  const claims = readClaims(event);
  if (!claims.sub) return unauthorized(instance);
  if (!hasAnyGroup(claims, WRITE_GROUPS)) {
    return forbidden(
      "Requires ADMIN or CONTRIBUTOR group membership.",
      instance,
    );
  }
  return null;
}

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

export interface IllustrationSnapshotResult {
  illustrations: StoredIllustration[];
  missingIds: string[];
  wrongCategoryIds: string[];
}

export async function snapshotIllustrations(
  ids: string[],
): Promise<IllustrationSnapshotResult> {
  const uniq = [...new Set(ids)];
  if (uniq.length === 0) {
    return { illustrations: [], missingIds: [], wrongCategoryIds: [] };
  }
  const res = await ddb.send(
    new BatchGetCommand({
      RequestItems: {
        [Resource.Files.name]: { Keys: uniq.map((id) => ({ id })) },
      },
    }),
  );
  const rows = res.Responses?.[Resource.Files.name] ?? [];
  const parsed: FileItem[] = rows
    .map((r) => FileItemSchema.safeParse(r))
    .filter((p): p is Extract<typeof p, { success: true }> => p.success)
    .map((p) => p.data);
  const byId = new Map(parsed.map((f) => [f.id, f]));

  const missingIds = uniq.filter((id) => !byId.has(id));
  const wrongCategoryIds = parsed
    .filter((f) => f.category !== "exercise")
    .map((f) => f.id);

  const illustrations: StoredIllustration[] = uniq
    .map((id) => byId.get(id))
    .filter((f): f is FileItem => Boolean(f) && f!.category === "exercise")
    .map((f) => ({
      id: f.id,
      fileName: f.fileName,
      mimeType: f.mimeType,
      s3Key: f.s3Key,
    }));

  return { illustrations, missingIds, wrongCategoryIds };
}

export function presignIllustrationUri(s3Key: string): Promise<string> {
  return presignedGetUrl(Resource.Uploads.name, s3Key);
}
