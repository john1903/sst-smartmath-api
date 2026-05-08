import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";

export const handler = async (event: APIGatewayProxyEventV2WithJWTAuthorizer) => {
  const claims = event.requestContext.authorizer.jwt.claims;
  return {
    statusCode: 200,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(claims),
  };
};
