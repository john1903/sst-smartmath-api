import type { APIGatewayProxyResultV2 } from "aws-lambda";
import type { ZodError } from "zod";

export interface ProblemDetail {
  status: number;
  title: string;
  type?: string;
  detail?: string;
  instance?: string;
  errors?: { field?: string; message: string }[];
}

export function problem(p: ProblemDetail): APIGatewayProxyResultV2 {
  const body = {
    type: p.type ?? "about:blank",
    status: p.status,
    title: p.title,
    ...(p.detail !== undefined ? { detail: p.detail } : {}),
    ...(p.instance !== undefined ? { instance: p.instance } : {}),
    ...(p.errors !== undefined ? { errors: p.errors } : {}),
  };
  return {
    statusCode: p.status,
    headers: { "content-type": "application/problem+json" },
    body: JSON.stringify(body),
  };
}

export function ok(json: unknown, status = 200): APIGatewayProxyResultV2 {
  return {
    statusCode: status,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(json),
  };
}

export function notFound(
  resource: string,
  instance?: string,
): APIGatewayProxyResultV2 {
  return problem({
    status: 404,
    title: `${resource} not found`,
    instance,
  });
}

export function internalError(
  detail?: string,
  instance?: string,
): APIGatewayProxyResultV2 {
  return problem({
    status: 500,
    title: "Internal server error",
    detail,
    instance,
  });
}

export function invalidCursor(instance?: string): APIGatewayProxyResultV2 {
  return problem({
    status: 400,
    title: "Invalid cursor",
    detail: "The provided cursor is malformed.",
    instance,
  });
}

export function invalidQueryParams(
  error: ZodError,
  instance?: string,
): APIGatewayProxyResultV2 {
  return problem({
    status: 400,
    title: "Invalid query parameters",
    detail: error.message,
    instance,
    errors: error.issues.map((i) => ({
      field: i.path.join("."),
      message: i.message,
    })),
  });
}
