import { bucket, table } from "./storage";
import { userPool, userPoolClient } from "./auth";
import { UserGroup } from "@smartmath/core/auth";

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

// Group enforcement (auth.groups) is not wired yet. The Cognito JWT authorizer
// only validates the token; group filtering on `cognito:groups` will be done
// by a Lambda authorizer in a follow-up task. Routes can already declare
// `auth.groups` so they are ready to switch over without further infra churn.
//
// auth values:
//   - omitted     → JWT-authenticated, any group
//   - false       → public (no authorizer)
//   - { groups }  → JWT-authenticated, must belong to one of the listed groups
type RouteAuth = false | { groups: readonly UserGroup[] };

interface Route {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path?: string;
  handler: string;
  auth?: RouteAuth;
}

interface RouteGroup {
  basePath: string;
  auth?: RouteAuth;
  routes: Route[];
}

const handlerPath = (h: string) => `packages/functions/src/handlers/${h}`;

function buildRouteOptions(auth: RouteAuth | undefined) {
  if (auth === false) return undefined;
  return { auth: { jwt: { authorizer: cognitoAuthorizer.id } } };
}

const routeGroups: RouteGroup[] = [
  {
    basePath: "/me",
    routes: [{ method: "GET", handler: "me.handler" }],
  },
  {
    basePath: "/categories",
    routes: [
      { method: "GET", handler: "categories.list" },
      { method: "GET", path: "/{id}", handler: "categories.get" },
    ],
  },
];

for (const group of routeGroups) {
  for (const r of group.routes) {
    const fullPath = `${group.basePath}${r.path ?? ""}`;
    const auth = r.auth !== undefined ? r.auth : group.auth;
    api.route(
      `${r.method} ${fullPath}`,
      handlerPath(r.handler),
      buildRouteOptions(auth),
    );
  }
}
