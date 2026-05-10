import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { Resource } from "sst";
import {
  CATEGORY_PK,
  categorySK,
  type CategoryItem,
} from "@smartmath/core/categories";
import { LanguageCode } from "@smartmath/core/i18n";
import { batchPutAll } from "@smartmath/core/dynamodb";

interface CategorySeed {
  id: string;
  translations: Record<LanguageCode, string>;
}

const CATEGORY_SEEDS: CategorySeed[] = [
  { id: "1", translations: { "en-GB": "Real numbers", "pl-PL": "Liczby rzeczywiste" } },
  { id: "2", translations: { "en-GB": "Algebraic expressions", "pl-PL": "Wyrażenia algebraiczne" } },
  { id: "3", translations: { "en-GB": "Equations and inequalities", "pl-PL": "Równania i nierówności" } },
  { id: "4", translations: { "en-GB": "Systems of equations", "pl-PL": "Układy równań" } },
  { id: "5", translations: { "en-GB": "Functions", "pl-PL": "Funkcje" } },
  { id: "6", translations: { "en-GB": "Sequences", "pl-PL": "Ciągi" } },
  { id: "7", translations: { "en-GB": "Trigonometry", "pl-PL": "Trygonometria" } },
  { id: "8", translations: { "en-GB": "Plane geometry", "pl-PL": "Planimetria" } },
  { id: "9", translations: { "en-GB": "Analytic geometry", "pl-PL": "Geometria analityczna" } },
  { id: "10", translations: { "en-GB": "Solid geometry", "pl-PL": "Stereometria" } },
  { id: "11", translations: { "en-GB": "Combinatorics", "pl-PL": "Kombinatoryka" } },
  { id: "12", translations: { "en-GB": "Probability and statistics", "pl-PL": "Rachunek prawdopodobieństwa i statystyka" } },
  { id: "13", translations: { "en-GB": "Optimization and differential calculus", "pl-PL": "Optymalizacja i rachunek różniczkowy" } },
];

async function main() {
  const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
  const tableName = Resource.Table.name;

  const items: CategoryItem[] = CATEGORY_SEEDS.map((s) => ({
    PK: CATEGORY_PK,
    SK: categorySK(s.id),
    entityType: "category",
    id: s.id,
    translations: s.translations,
  }));

  await batchPutAll(ddb, tableName, items);

  console.log(`Seeded ${items.length} categories into ${tableName}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
