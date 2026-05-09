import type { APIGatewayProxyResultV2 } from "aws-lambda";

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
