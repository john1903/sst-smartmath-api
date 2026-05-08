export const userPool = new sst.aws.CognitoUserPool("UserPool", {
  usernames: ["email"],
});

export const userPoolClient = userPool.addClient("WebClient");

export const adminGroup = new aws.cognito.UserGroup("AdminGroup", {
  userPoolId: userPool.id,
  name: "ADMIN",
});

export const contributorGroup = new aws.cognito.UserGroup("ContributorGroup", {
  userPoolId: userPool.id,
  name: "CONTRIBUTOR",
});

export const studentGroup = new aws.cognito.UserGroup("StudentGroup", {
  userPoolId: userPool.id,
  name: "STUDENT",
});
