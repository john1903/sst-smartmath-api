import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from "aws-lambda";
import { GetCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { Resource } from "sst";
import { ddb } from "@smartmath/utils/dynamodb";
import {
  CATEGORY_PK,
  CategoryItemSchema,
  categorySK,
  toCategoryDto,
} from "@smartmath/core/categories";
import { acceptLanguageFromHeaders } from "@smartmath/core/i18n";
import {
  internalError,
  invalidQueryParams,
  notFound,
  ok,
} from "@smartmath/core/http";
import {
  ListQuerySchema,
  paginate,
  sortBy,
  sortParamSchema,
} from "@smartmath/core/pagination";

type Handler = (
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
) => Promise<APIGatewayProxyResultV2>;

const ListCategoriesQuerySchema = ListQuerySchema.extend({
  sort: sortParamSchema(["id", "name"] as const).optional(),
});

export const list: Handler = async (event) => {
  const lang = acceptLanguageFromHeaders(event.headers);

  const parsed = ListCategoriesQuerySchema.safeParse(
    event.queryStringParameters ?? {},
  );
  if (!parsed.success) {
    return invalidQueryParams(parsed.error, "/categories");
  }
  const { page, size, sort } = parsed.data;

  // TODO: server-side pagination once category count grows. Categories live
  // under one PK so a single Query returns the whole set; pagination and sort
  // happen in memory.
  const res = await ddb.send(
    new QueryCommand({
      TableName: Resource.Table.name,
      KeyConditionExpression: "PK = :pk",
      ExpressionAttributeValues: { ":pk": CATEGORY_PK },
    }),
  );

  const itemsParse = CategoryItemSchema.array().safeParse(res.Items ?? []);
  if (!itemsParse.success) {
    console.error("Malformed category items in DynamoDB", itemsParse.error);
    return internalError("Stored category data is malformed", "/categories");
  }
  const dtos = itemsParse.data.map((i) => toCategoryDto(i, lang));
  const sorted = sortBy(dtos, sort);
  return ok(paginate(sorted, page, size));
};

export const get: Handler = async (event) => {
  const lang = acceptLanguageFromHeaders(event.headers);
  const id = event.pathParameters?.id ?? "";

  const res = await ddb.send(
    new GetCommand({
      TableName: Resource.Table.name,
      Key: { PK: CATEGORY_PK, SK: categorySK(id) },
    }),
  );

  if (!res.Item) {
    return notFound("Category", `/categories/${id}`);
  }

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