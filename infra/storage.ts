export const bucket = new sst.aws.Bucket("Uploads");

export const table = new sst.aws.Dynamo("Table", {
  fields: {
    PK: "string",
    SK: "string",
  },
  primaryIndex: { hashKey: "PK", rangeKey: "SK" },
});
