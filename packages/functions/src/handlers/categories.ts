import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { Resource } from "sst";
import { z } from "zod";
import {
  CATEGORY_PK,
  CategoryItemSchema,
  categorySK,
  toCategoryDto,
} from "@smartmath/core/categories";
import { acceptLanguageFromHeaders } from "@smartmath/core/i18n";
import { ok, problem } from "@smartmath/core/http";

type Handler = (
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
) => Promise<APIGatewayProxyResultV2>;

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const ListQuerySchema = z.object({
  page: z.coerce.number().int().min(0).default(0),
  size: z.coerce.number().int().min(1).max(100).default(20),
});

export const list: Handler = async (event) => {
  const lang = acceptLanguageFromHeaders(event.headers);

  const parsed = ListQuerySchema.safeParse(event.queryStringParameters ?? {});
  if (!parsed.success) {
    return problem({
      status: 400,
      title: "Invalid query parameters",
      detail: parsed.error.message,
      instance: "/categories",
    });
  }
  const { page, size } = parsed.data;

  const res = await ddb.send(
    new QueryCommand({
      TableName: Resource.Table.name,
      KeyConditionExpression: "PK = :pk",
      ExpressionAttributeValues: { ":pk": CATEGORY_PK },
    }),
  );

  const items = CategoryItemSchema.array().parse(res.Items ?? []);
  const totalElements = items.length;
  const totalPages = totalElements === 0 ? 0 : Math.ceil(totalElements / size);
  const slice = items.slice(page * size, page * size + size);
  const content = slice.map((i) => toCategoryDto(i, lang));

  return ok({
    content,
    page: { number: page, size, totalElements, totalPages },
  });
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
    return problem({
      status: 404,
      title: "Category not found",
      instance: `/categories/${id}`,
    });
  }

  const item = CategoryItemSchema.parse(res.Item);
  return ok(toCategoryDto(item, lang));
};
