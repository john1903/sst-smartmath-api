import { adminPool, adminPoolClient } from "./authAdmin";
import { studentPool, studentPoolClient } from "./authStudent";
import {
  bucket,
  categoriesTable,
  exercisesTable,
  filesTable,
  requirementsTable,
} from "./storage";

const region = aws.getRegionOutput().name;

export const api = new sst.aws.ApiGatewayV2("Api", {
  cors: true,
});

const adminAuthorizer = api.addAuthorizer({
  name: "adminCognito",
  jwt: {
    issuer: $interpolate`https://cognito-idp.${region}.amazonaws.com/${adminPool.id}`,
    audiences: [adminPoolClient.id],
  },
});

const studentAuthorizer = api.addAuthorizer({
  name: "studentCognito",
  jwt: {
    issuer: $interpolate`https://cognito-idp.${region}.amazonaws.com/${studentPool.id}`,
    audiences: [studentPoolClient.id],
  },
});

type RouteAuth = false | "admin" | "student";

interface Route {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path?: string;
  handler: string;
  auth?: RouteAuth;
  link?: readonly unknown[];
}

interface RouteGroup {
  basePath: string;
  auth?: RouteAuth;
  link?: readonly unknown[];
  routes: Route[];
}

const handlerPath = (h: string) => `packages/functions/src/handlers/${h}`;

function buildRouteOptions(auth: RouteAuth | undefined) {
  if (auth === false) return undefined;
  if (auth === "student")
    return { auth: { jwt: { authorizer: studentAuthorizer.id } } };
  return { auth: { jwt: { authorizer: adminAuthorizer.id } } };
}

const routeGroups: RouteGroup[] = [
  {
    basePath: "/cognito/me",
    auth: "admin",
    routes: [{ method: "GET", handler: "cognito/me.handler" }],
  },
  {
    basePath: "/static/categories",
    auth: "admin",
    link: [categoriesTable],
    routes: [
      { method: "GET", handler: "static/categories.list" },
      { method: "GET", path: "/{id}", handler: "static/categories.get" },
    ],
  },
  {
    basePath: "/static/requirements",
    auth: "admin",
    link: [requirementsTable],
    routes: [
      { method: "GET", handler: "static/requirements.list" },
      { method: "GET", path: "/{id}", handler: "static/requirements.get" },
    ],
  },
  {
    basePath: "/exercises",
    auth: "admin",
    routes: [
      {
        method: "GET",
        handler: "exercises/index.list",
        link: [exercisesTable, bucket],
      },
      {
        method: "POST",
        handler: "exercises/index.create",
        link: [exercisesTable, categoriesTable, requirementsTable, bucket],
      },
      {
        method: "GET",
        path: "/{id}",
        handler: "exercises/index.get",
        link: [exercisesTable, bucket],
      },
      {
        method: "PATCH",
        path: "/{id}",
        handler: "exercises/index.patch",
        link: [exercisesTable, categoriesTable, requirementsTable, bucket],
      },
      {
        method: "DELETE",
        path: "/{id}",
        handler: "exercises/index.remove",
        link: [exercisesTable, bucket],
      },
    ],
  },
  {
    basePath: "/uploads",
    auth: "student",
    link: [filesTable, bucket],
    routes: [
      { method: "POST", handler: "uploads/index.upload" },
      { method: "DELETE", path: "/{id}", handler: "uploads/index.remove" },
    ],
  },
];

for (const group of routeGroups) {
  for (const r of group.routes) {
    const fullPath = `${group.basePath}${r.path ?? ""}`;
    const auth = r.auth !== undefined ? r.auth : group.auth;
    const link = [...(group.link ?? []), ...(r.link ?? [])];
    api.route(
      `${r.method} ${fullPath}`,
      { handler: handlerPath(r.handler), link: link as any },
      buildRouteOptions(auth),
    );
  }
}
