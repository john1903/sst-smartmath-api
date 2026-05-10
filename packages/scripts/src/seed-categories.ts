import { Resource } from "sst";
import {
  CATEGORY_PK,
  categorySK,
  type CategoryItem,
} from "@smartmath/core/categories";
import { LanguageCode } from "@smartmath/core/i18n";
import { batchPutAll, ddb } from "@smartmath/utils/dynamodb";
import { newId } from "@smartmath/utils/id";

type CategorySeedTranslations = Record<LanguageCode, string>;

const CATEGORY_TRANSLATIONS: CategorySeedTranslations[] = [
  { "en-GB": "Real numbers", "pl-PL": "Liczby rzeczywiste" },
  { "en-GB": "Algebraic expressions", "pl-PL": "Wyrażenia algebraiczne" },
  { "en-GB": "Equations and inequalities", "pl-PL": "Równania i nierówności" },
  { "en-GB": "Systems of equations", "pl-PL": "Układy równań" },
  { "en-GB": "Functions", "pl-PL": "Funkcje" },
  { "en-GB": "Sequences", "pl-PL": "Ciągi" },
  { "en-GB": "Trigonometry", "pl-PL": "Trygonometria" },
  { "en-GB": "Plane geometry", "pl-PL": "Planimetria" },
  { "en-GB": "Analytic geometry", "pl-PL": "Geometria analityczna" },
  { "en-GB": "Solid geometry", "pl-PL": "Stereometria" },
  { "en-GB": "Combinatorics", "pl-PL": "Kombinatoryka" },
  { "en-GB": "Probability and statistics", "pl-PL": "Rachunek prawdopodobieństwa i statystyka" },
  { "en-GB": "Optimization and differential calculus", "pl-PL": "Optymalizacja i rachunek różniczkowy" },
];

async function main() {
  const tableName = Resource.Table.name;

  const items: CategoryItem[] = CATEGORY_TRANSLATIONS.map((translations) => {
    const id = newId();
    return {
      PK: CATEGORY_PK,
      SK: categorySK(id),
      entityType: "category",
      id,
      translations,
    };
  });

  await batchPutAll(ddb, tableName, items);

  console.log(`Seeded ${items.length} categories into ${tableName}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
