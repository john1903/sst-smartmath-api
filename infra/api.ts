import { bucket, table } from "./storage";
import { userPool, userPoolClient } from "./auth";

const region = aws.getRegionOutput().name;

export const api = new sst.aws.ApiGatewayV2("Api", {
  cors: true,
  link: [bucket, table, userPool, userPoolClient],
});

const cognitoAuthorizer = api.addAuthorizer({
  name: "cognito",
  jwt: {
    issuer: $interpolate`https://cognito-idp.${region}.amazonaws.com/${userPool.id}`,
    audiences: [userPoolClient.id],
  },
});

api.route("GET /health", "packages/functions/src/handlers/health.handler");

api.route("GET /me", "packages/functions/src/handlers/me.handler", {
  auth: {
    jwt: {
      authorizer: cognitoAuthorizer.id,
    },
  },
});
