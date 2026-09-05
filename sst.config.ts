/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "smartmath",
      removal: input?.stage === "production" ? "retain" : "remove",
      protect: ["production"].includes(input?.stage),
      home: "aws",
    };
  },
  async run() {
    const storage = await import("./infra/storage");
    const authAdmin = await import("./infra/authAdmin");
    const authStudent = await import("./infra/authStudent");
    const api = await import("./infra/api");
    const queues = await import("./infra/queues");
    const web = await import("./infra/web");
    await import("./infra/migrations");

    const region = aws.getRegionOutput().name;

    return {
      webUrl: web.web.url,
      apiUrl: api.api.url,
      cognitoAdminHostedUrl: $interpolate`https://${authAdmin.adminPoolDomain.domain}.auth.${region}.amazoncognito.com`,
      cognitoAdminClientId: authAdmin.adminPoolClient.id,
      cognitoStudentPoolId: authStudent.studentPool.id,
      cognitoStudentClientId: authStudent.studentPoolClient.id,
    };
  },
});
