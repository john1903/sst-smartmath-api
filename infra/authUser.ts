import { usersTable } from "./storage";

export const userPool = new sst.aws.CognitoUserPool("User", {
  usernames: ["email"],
  triggers: {
    postConfirmation: {
      handler: "packages/functions/src/handlers/cognito/postConfirmation.handler",
      link: [usersTable],
    },
  },
  transform: {
    userPool: {
      adminCreateUserConfig: {
        allowAdminCreateUserOnly: false,
      },
      passwordPolicy: {
        minimumLength: 8,
        requireUppercase: false,
        requireLowercase: true,
        requireNumbers: true,
        requireSymbols: false,
      },
    },
  },
});

export const userPoolClient = userPool.addClient("UserMobile", {
  transform: {
    client: {
      allowedOauthFlowsUserPoolClient: false,
      explicitAuthFlows: [
        "ALLOW_USER_SRP_AUTH",
        "ALLOW_REFRESH_TOKEN_AUTH",
      ],
    },
  },
});
