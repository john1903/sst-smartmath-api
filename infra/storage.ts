export const bucket = new sst.aws.Bucket("Uploads");

export const categoriesTable = new sst.aws.Dynamo("Categories", {
  fields: { id: "string" },
  primaryIndex: { hashKey: "id" },
});

export const requirementsTable = new sst.aws.Dynamo("Requirements", {
  fields: { id: "string", categoryId: "string" },
  primaryIndex: { hashKey: "id" },
  globalIndexes: {
    byCategory: { hashKey: "categoryId", rangeKey: "id" },
  },
});
