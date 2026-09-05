import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import { UserGroup } from "./userGroup";

export interface CallerClaims {
  sub: string;
  groups: UserGroup[];
}

export function readClaims(
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
): CallerClaims {
  const claims = event.requestContext.authorizer.jwt.claims;
  const sub = String(claims.sub ?? "");
  const raw = claims["cognito:groups"];
  let groups: string[] = [];
  if (Array.isArray(raw)) {
    groups = raw.map(String);
  } else if (typeof raw === "string" && raw.length > 0) {
    // Some Cognito integrations serialise as "[G1 G2]" or "[G1,G2]".
    groups = raw.replace(/^\[|\]$/g, "").split(/[,\s]+/).filter(Boolean);
  }
  const allowed = new Set<string>(Object.values(UserGroup));
  return {
    sub,
    groups: groups.filter((g): g is UserGroup => allowed.has(g)),
  };
}

export function hasAnyGroup(
  claims: CallerClaims,
  required: readonly UserGroup[],
): boolean {
  return claims.groups.some((g) => required.includes(g));
}
