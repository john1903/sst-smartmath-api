import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from "aws-lambda";
import { GetCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { Resource } from "sst";
import { ddb } from "@smartmath/utils/dynamodb";
import {
  CategoryItemSchema,
  toCategoryDto,
} from "@smartmath/core/categories";
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

export const list: Handler = async (event) => {
  const lang = acceptLanguageFromHeaders(event.headers);

  const parsed = ListQuerySchema.safeParse(event.queryStringParameters ?? {});
  if (!parsed.success) return invalidQueryParams(parsed.error, "/categories");
  const { cursor, limit } = parsed.data;

  let exclusiveStartKey: Record<string, unknown> | undefined;
  try {
    exclusiveStartKey = cursor ? decodeCursor(cursor) : undefined;
  } catch (err) {
    if (err instanceof InvalidCursorError) return invalidCursor("/categories");
    throw err;
  }

  const res = await ddb.send(
    new ScanCommand({
      TableName: Resource.Categories.name,
      Limit: limit,
      ExclusiveStartKey: exclusiveStartKey,
    }),
  );

  const itemsParse = CategoryItemSchema.array().safeParse(res.Items ?? []);
  if (!itemsParse.success) {
    console.error("Malformed category items in DynamoDB", itemsParse.error);
    return internalError("Stored category data is malformed", "/categories");
  }

  return ok({
    items: itemsParse.data.map((i) => toCategoryDto(i, lang)),
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
      TableName: Resource.Categories.name,
      Key: { id },
    }),
  );

  if (!res.Item) return notFound("Category", `/categories/${id}`);

  const itemParse = CategoryItemSchema.safeParse(res.Item);
  if (!itemParse.success) {
    console.error(`Malformed category ${id} in DynamoDB`, itemParse.error);
    return internalError(
      "Stored category data is malformed",
      `/categories/${id}`,
    );
  }
  return ok(toCategoryDto(itemParse.data, lang));
};
