import { UserGroup } from "@smartmath/core/auth";

const callbackUrls =
  $app.stage === "production"
    ? ["https://oauth.pstmn.io/v1/callback"]
    : ["https://oauth.pstmn.io/v1/callback", "http://localhost:5173/callback"];

const logoutUrls =
  $app.stage === "production"
    ? ["https://oauth.pstmn.io/v1/callback"]
    : ["https://oauth.pstmn.io/v1/callback", "http://localhost:5173/"];

export const userPool = new sst.aws.CognitoUserPool("UserPool", {
  usernames: ["email"],
  triggers: {
    postConfirmation: {
      handler: "packages/functions/src/cognito/postConfirmation.handler",
      permissions: [
        {
          actions: ["cognito-idp:AdminAddUserToGroup"],
          resources: [
            $interpolate`arn:aws:cognito-idp:${aws.getRegionOutput().name}:${aws.getCallerIdentityOutput().accountId}:userpool/*`,
          ],
        },
      ],
    },
  },
  transform: {
    userPool: {
      adminCreateUserConfig: {
        allowAdminCreateUserOnly: $app.stage === "production",
      },
    },
  },
});

export const userPoolDomain = new aws.cognito.UserPoolDomain("UserPoolDomain", {
  domain: $interpolate`smartmath-${$app.stage}`,
  userPoolId: userPool.id,
});

export const userPoolClient = userPool.addClient("WebClient", {
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

export const adminGroup = new aws.cognito.UserGroup("AdminGroup", {
  userPoolId: userPool.id,
  name: UserGroup.Admin,
});

export const contributorGroup = new aws.cognito.UserGroup("ContributorGroup", {
  userPoolId: userPool.id,
  name: UserGroup.Contributor,
});

export const studentGroup = new aws.cognito.UserGroup("StudentGroup", {
  userPoolId: userPool.id,
  name: UserGroup.Student,
});
