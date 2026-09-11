import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";

export interface CallerClaims {
  sub: string;
  email?: string;
  name?: string;
}

export function readClaims(
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
): CallerClaims {
  const claims = event.requestContext.authorizer.jwt.claims;
  return {
    sub: String(claims.sub ?? ""),
    email:
      typeof claims.email === "string" ? (claims.email as string) : undefined,
    name:
      typeof claims.name === "string" ? (claims.name as string) : undefined,
  };
}
