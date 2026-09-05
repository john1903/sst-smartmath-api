export const studentPool = new sst.aws.CognitoUserPool("StudentPool", {
  usernames: ["email"],
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

export const studentPoolClient = studentPool.addClient("StudentMobileClient", {
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
