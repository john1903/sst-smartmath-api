// Deployed stages inject the site's URL via SM_WEB_URL before `sst deploy`
// (or set it once in Pulumi config). Without it, only local/postman callbacks
// are registered — deployed sign-in fails with redirect_uri_mismatch until set.
const deployedWebUrl = process.env.SM_WEB_URL?.replace(/\/+$/, "");

const callbackUrls = [
  "https://oauth.pstmn.io/v1/callback",
  ...($app.stage === "production"
    ? []
    : [
        "http://localhost:5173/callback",
        "http://localhost:5173/silent-callback",
      ]),
  ...(deployedWebUrl
    ? [
        `${deployedWebUrl}/callback`,
        `${deployedWebUrl}/silent-callback`,
      ]
    : []),
];

const logoutUrls = [
  "https://oauth.pstmn.io/v1/callback",
  ...($app.stage === "production" ? [] : ["http://localhost:5173/"]),
  ...(deployedWebUrl ? [`${deployedWebUrl}/`] : []),
];

export const adminPool = new sst.aws.CognitoUserPool("Admin", {
  usernames: ["email"],
  transform: {
    userPool: {
      adminCreateUserConfig: {
        allowAdminCreateUserOnly: true,
      },
      passwordPolicy: {
        minimumLength: 12,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSymbols: true,
      },
    },
  },
});

export const adminPoolDomain = new aws.cognito.UserPoolDomain(
  "AdminDomain",
  {
    domain: $interpolate`smartmath-admin-${$app.stage}`,
    userPoolId: adminPool.id,
  },
);

export const adminPoolClient = adminPool.addClient("AdminWeb", {
  transform: {
    client: {
      allowedOauthFlowsUserPoolClient: true,
      allowedOauthFlows: ["code"],
      allowedOauthScopes: ["openid", "email", "profile"],
      callbackUrls,
      logoutUrls,
      supportedIdentityProviders: ["COGNITO"],
    },
  },
});
