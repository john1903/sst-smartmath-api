import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import { readClaims } from "@smartmath/core/auth";
import { ok } from "@smartmath/core/http";

export const handler = async (event: APIGatewayProxyEventV2WithJWTAuthorizer) => {
  const { sub, email, name } = readClaims(event);
  return ok({
    sub,
    ...(email !== undefined ? { email } : {}),
    ...(name !== undefined ? { name } : {}),
  });
};
