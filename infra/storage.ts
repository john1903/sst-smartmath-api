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

export const exercisesTable = new sst.aws.Dynamo("Exercises", {
  fields: { id: "string", categoryId: "string" },
  primaryIndex: { hashKey: "id" },
  globalIndexes: {
    byCategory: { hashKey: "categoryId", rangeKey: "id" },
  },
});

export const filesTable = new sst.aws.Dynamo("Files", {
  fields: { id: "string", ownerSub: "string" },
  primaryIndex: { hashKey: "id" },
  globalIndexes: {
    byOwner: { hashKey: "ownerSub", rangeKey: "id" },
  },
});
