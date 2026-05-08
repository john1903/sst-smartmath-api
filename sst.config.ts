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
    const auth = await import("./infra/auth");
    const api = await import("./infra/api");
    const queues = await import("./infra/queues");
    const web = await import("./infra/web");

    return {
      webUrl: web.web.url,
      apiUrl: api.api.url,
      authUrl: $interpolate`https://${auth.userPoolDomain.domain}.auth.${aws.getRegionOutput().name}.amazoncognito.com`,
      authClientId: auth.userPoolClient.id,
    };
  },
});
