import { categoriesTable } from "./storage";

const SEED_CATEGORIES_VERSION = 1;

const seedCategories = new sst.aws.Function("SeedCategories", {
  handler: "packages/functions/src/migrations/seedCategories.handler",
  link: [categoriesTable],
  timeout: "30 seconds",
});

export const seedCategoriesInvocation = new aws.lambda.Invocation(
  "SeedCategoriesInvocation",
  {
    functionName: seedCategories.name,
    input: JSON.stringify({ version: SEED_CATEGORIES_VERSION }),
  },
);
