import { UserManager, WebStorageStateStore, type UserManagerSettings } from "oidc-client-ts";

const HOSTED_URL = import.meta.env.VITE_COGNITO_ADMIN_HOSTED_URL as string;
const CLIENT_ID = import.meta.env.VITE_COGNITO_ADMIN_CLIENT_ID as string;
const POOL_ID = import.meta.env.VITE_COGNITO_ADMIN_POOL_ID as string;
const REGION = POOL_ID?.split("_")[0];

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

  userStore: new WebStorageStateStore({ store: window.sessionStorage }),
  stateStore: new WebStorageStateStore({ store: window.sessionStorage }),
  automaticSilentRenew: true,
  accessTokenExpiringNotificationTimeInSeconds: 60,
  loadUserInfo: false,
  monitorSession: false,
};

export const userManager = new UserManager(settings);

userManager.events.addSilentRenewError((err) => {
  console.warn("Silent token renewal failed", err);
});

// Cognito's Hosted-UI /logout endpoint uses non-standard params
// (client_id + logout_uri), not the OIDC-standard ones oidc-client-ts sends
// via signoutRedirect(). Build the URL by hand.
export function cognitoLogoutUrl(): string {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    logout_uri: `${window.location.origin}/`,
  });
  return `${HOSTED_URL}/logout?${params.toString()}`;
}
