import { CognitoJwtVerifier } from "aws-jwt-verify";
import type { APIGatewayProxyEventV2 } from "aws-lambda";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(
      `Missing required env var ${name} — /uploads Lambda cannot verify tokens. Check infra/api.ts environment wiring.`,
    );
  }
  return v;
}

const verifier = CognitoJwtVerifier.create([
  {
    userPoolId: requireEnv("COGNITO_ADMIN_POOL_ID"),
    clientId: requireEnv("COGNITO_ADMIN_CLIENT_ID"),
    tokenUse: "access",
  },
  {
    userPoolId: requireEnv("COGNITO_STUDENT_POOL_ID"),
    clientId: requireEnv("COGNITO_STUDENT_CLIENT_ID"),
    tokenUse: "access",
  },
]);

export interface UploadCaller {
  sub: string;
}

export async function verifyBearer(
  event: APIGatewayProxyEventV2,
): Promise<UploadCaller | null> {
  const header =
    event.headers["authorization"] ?? event.headers["Authorization"];
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match) return null;
  try {
    const payload = await verifier.verify(match[1]);
    return { sub: String(payload.sub) };
  } catch {
    return null;
  }
}
