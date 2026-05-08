import { api } from "./api";
import { userPool, userPoolClient } from "./auth";

export const web = new sst.aws.StaticSite("Web", {
  path: "packages/web",
  build: {
    command: "npm run build",
    output: "dist",
  },
  environment: {
    VITE_API_URL: api.url,
    VITE_USER_POOL_ID: userPool.id,
    VITE_USER_POOL_CLIENT_ID: userPoolClient.id,
  },
});
