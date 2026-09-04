import { bucket, categoriesTable, requirementsTable } from "./storage";
import { userPool, userPoolClient } from "./auth";
import { UserGroup } from "@smartmath/core/auth";

const region = aws.getRegionOutput().name;

export const api = new sst.aws.ApiGatewayV2("Api", {
  cors: true,
  link: [bucket, categoriesTable, requirementsTable, userPool, userPoolClient],
});

const cognitoAuthorizer = api.addAuthorizer({
  name: "cognito",
  jwt: {
    issuer: $interpolate`https://cognito-idp.${region}.amazonaws.com/${userPool.id}`,
    audiences: [userPoolClient.id],
  },
});

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
  {
    basePath: "/requirements",
    routes: [
      { method: "GET", handler: "requirements.list" },
      { method: "GET", path: "/{id}", handler: "requirements.get" },
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
