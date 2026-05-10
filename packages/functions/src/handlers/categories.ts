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
import {
  CATEGORY_PK,
  CategoryItemSchema,
  categorySK,
  toCategoryDto,
  type Category,
} from "@smartmath/core/categories";
import { acceptLanguageFromHeaders } from "@smartmath/core/i18n";
import {
  invalidQueryParams,
  notFound,
  ok,
  problem,
} from "@smartmath/core/http";
import {
  ListQuerySchema,
  paginate,
  parseSortParams,
  SortValidationError,
  sortBy,
} from "@smartmath/core/pagination";

type Handler = (
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
) => Promise<APIGatewayProxyResultV2>;

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const CATEGORY_SORT_FIELDS = ["id", "name"] as const satisfies readonly (keyof Category)[];

export const list: Handler = async (event) => {
  const lang = acceptLanguageFromHeaders(event.headers);

  const parsed = ListQuerySchema.safeParse(event.queryStringParameters ?? {});
  if (!parsed.success) {
    return invalidQueryParams(parsed.error, "/categories");
  }
  const { page, size, sort } = parsed.data;
  let sortSpecs;
  try {
    sortSpecs = parseSortParams<Category>(sort, CATEGORY_SORT_FIELDS);
  } catch (err) {
    if (err instanceof SortValidationError) {
      return problem({
        status: 400,
        title: "Invalid sort parameter",
        detail: err.message,
        instance: "/categories",
      });
    }
    throw err;
  }

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

  const items = CategoryItemSchema.array().parse(res.Items ?? []);
  const dtos = items.map((i) => toCategoryDto(i, lang));
  const sorted = sortBy(dtos, sortSpecs);
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

  const item = CategoryItemSchema.parse(res.Item);
  return ok(toCategoryDto(item, lang));
};
