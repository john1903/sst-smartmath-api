import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from "aws-lambda";
import { GetCommand, QueryCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { Resource } from "sst";
import { z } from "zod";
import { ddb } from "@smartmath/utils/dynamodb";
import {
  RequirementItemSchema,
  toRequirementDto,
} from "@smartmath/core/static/requirements";
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

type Handler = (
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
) => Promise<APIGatewayProxyResultV2>;

const ListRequirementsQuerySchema = ListQuerySchema.extend({
  categoryId: z.string().min(1).max(128).optional(),
});

export const list: Handler = async (event) => {
  const lang = acceptLanguageFromHeaders(event.headers);

  const parsed = ListRequirementsQuerySchema.safeParse(
    event.queryStringParameters ?? {},
  );
  if (!parsed.success) return invalidQueryParams(parsed.error, "/static/requirements");
  const { cursor, limit, categoryId } = parsed.data;

  let exclusiveStartKey: Record<string, unknown> | undefined;
  try {
    exclusiveStartKey = cursor ? decodeCursor(cursor) : undefined;
  } catch (err) {
    if (err instanceof InvalidCursorError)
      return invalidCursor("/static/requirements");
    throw err;
  }

  const res = categoryId
    ? await ddb.send(
        new QueryCommand({
          TableName: Resource.Requirements.name,
          IndexName: "byCategory",
          KeyConditionExpression: "categoryId = :cid",
          ExpressionAttributeValues: { ":cid": categoryId },
          Limit: limit,
          ExclusiveStartKey: exclusiveStartKey,
        }),
      )
    : await ddb.send(
        new ScanCommand({
          TableName: Resource.Requirements.name,
          Limit: limit,
          ExclusiveStartKey: exclusiveStartKey,
        }),
      );

  const itemsParse = RequirementItemSchema.array().safeParse(res.Items ?? []);
  if (!itemsParse.success) {
    console.error("Malformed requirement items in DynamoDB", itemsParse.error);
    return internalError(
      "Stored requirement data is malformed",
      "/static/requirements",
    );
  }

  return ok({
    items: itemsParse.data.map((i) => toRequirementDto(i, lang)),
    nextCursor: res.LastEvaluatedKey
      ? encodeCursor(res.LastEvaluatedKey)
      : undefined,
  });
};

export const get: Handler = async (event) => {
  const lang = acceptLanguageFromHeaders(event.headers);
  const id = event.pathParameters?.id ?? "";

  const res = await ddb.send(
    new GetCommand({
      TableName: Resource.Requirements.name,
      Key: { id },
    }),
  );

  if (!res.Item) return notFound("Requirement", `/static/requirements/${id}`);

  const itemParse = RequirementItemSchema.safeParse(res.Item);
  if (!itemParse.success) {
    console.error(`Malformed requirement ${id} in DynamoDB`, itemParse.error);
    return internalError(
      "Stored requirement data is malformed",
      `/static/requirements/${id}`,
    );
  }
  return ok(toRequirementDto(itemParse.data, lang));
};
