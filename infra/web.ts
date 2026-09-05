import { api } from "./api";
import { adminPool, adminPoolClient, adminPoolDomain } from "./authAdmin";

const region = aws.getRegionOutput().name;

export const web = new sst.aws.StaticSite("Web", {
  path: "packages/web",
  build: {
    command: "npm run build",
    output: "dist",
  },
  errorPage: "index.html",
  environment: {
    VITE_API_URL: api.url,
    VITE_COGNITO_ADMIN_POOL_ID: adminPool.id,
    VITE_COGNITO_ADMIN_CLIENT_ID: adminPoolClient.id,
    VITE_COGNITO_ADMIN_HOSTED_URL: $interpolate`https://${adminPoolDomain.domain}.auth.${region}.amazoncognito.com`,
  },
});
