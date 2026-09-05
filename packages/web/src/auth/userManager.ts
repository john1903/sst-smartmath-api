import { UserManager, WebStorageStateStore, type UserManagerSettings } from "oidc-client-ts";

const HOSTED_URL = import.meta.env.VITE_COGNITO_ADMIN_HOSTED_URL as string;
const CLIENT_ID = import.meta.env.VITE_COGNITO_ADMIN_CLIENT_ID as string;
const POOL_ID = import.meta.env.VITE_COGNITO_ADMIN_POOL_ID as string;
const REGION = POOL_ID?.split("_")[0];

// Cognito's OIDC issuer (used for token validation / discovery) is the
// user-pool endpoint, not the Hosted-UI domain. Hosted UI is the AUTH endpoint
// for the browser flow.
const ISSUER = `https://cognito-idp.${REGION}.amazonaws.com/${POOL_ID}`;

const settings: UserManagerSettings = {
  authority: ISSUER,
  metadata: {
    issuer: ISSUER,
    authorization_endpoint: `${HOSTED_URL}/oauth2/authorize`,
    token_endpoint: `${HOSTED_URL}/oauth2/token`,
    userinfo_endpoint: `${HOSTED_URL}/oauth2/userInfo`,
    end_session_endpoint: `${HOSTED_URL}/logout`,
    jwks_uri: `${ISSUER}/.well-known/jwks.json`,
  },
  client_id: CLIENT_ID,
  redirect_uri: `${window.location.origin}/callback`,
  silent_redirect_uri: `${window.location.origin}/silent-callback`,
  post_logout_redirect_uri: `${window.location.origin}/`,
  response_type: "code",
  scope: "openid email profile",

  // Tab-scoped storage (dies when the tab closes). Refresh tokens are still
  // exchanged in memory here; the alternative — localStorage — leaves them
  // reachable to any XSS for the pool's refresh-token lifetime.
  userStore: new WebStorageStateStore({ store: window.sessionStorage }),
  stateStore: new WebStorageStateStore({ store: window.sessionStorage }),

  // Silent renew via hidden iframe hits Cognito with the existing session
  // cookie and mints a fresh access token — no need to keep a refresh token
  // in the browser at all after the initial exchange.
  automaticSilentRenew: true,
  accessTokenExpiringNotificationTimeInSeconds: 60,
  loadUserInfo: false,
  monitorSession: false,
};

export const userManager = new UserManager(settings);

userManager.events.addSilentRenewError((err) => {
  console.warn("Silent token renewal failed", err);
});
