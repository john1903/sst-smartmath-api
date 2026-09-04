export const bucket = new sst.aws.Bucket("Uploads");

export const categoriesTable = new sst.aws.Dynamo("Categories", {
  fields: { id: "string" },
  primaryIndex: { hashKey: "id" },
});
