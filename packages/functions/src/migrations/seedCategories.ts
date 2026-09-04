import { Resource } from "sst";
import { batchPutAll } from "@smartmath/utils/dynamodb";
import type { CategoryItem } from "@smartmath/core/categories";

const SEED: CategoryItem[] = [
  { id: "real-numbers", translations: { "en-GB": "Real numbers", "pl-PL": "Liczby rzeczywiste" } },
  { id: "algebraic-expressions", translations: { "en-GB": "Algebraic expressions", "pl-PL": "Wyrażenia algebraiczne" } },
  { id: "equations-and-inequalities", translations: { "en-GB": "Equations and inequalities", "pl-PL": "Równania i nierówności" } },
  { id: "systems-of-equations", translations: { "en-GB": "Systems of equations", "pl-PL": "Układy równań" } },
  { id: "functions", translations: { "en-GB": "Functions", "pl-PL": "Funkcje" } },
  { id: "sequences", translations: { "en-GB": "Sequences", "pl-PL": "Ciągi" } },
  { id: "trigonometry", translations: { "en-GB": "Trigonometry", "pl-PL": "Trygonometria" } },
  { id: "plane-geometry", translations: { "en-GB": "Plane geometry", "pl-PL": "Planimetria" } },
  { id: "analytic-geometry", translations: { "en-GB": "Analytic geometry", "pl-PL": "Geometria analityczna" } },
  { id: "solid-geometry", translations: { "en-GB": "Solid geometry", "pl-PL": "Stereometria" } },
  { id: "combinatorics", translations: { "en-GB": "Combinatorics", "pl-PL": "Kombinatoryka" } },
  { id: "probability-and-statistics", translations: { "en-GB": "Probability and statistics", "pl-PL": "Rachunek prawdopodobieństwa i statystyka" } },
  { id: "optimization-and-differential-calculus", translations: { "en-GB": "Optimization and differential calculus", "pl-PL": "Optymalizacja i rachunek różniczkowy" } },
];

export async function handler(): Promise<{ written: number }> {
  await batchPutAll(Resource.Categories.name, SEED);
  console.log(`SeedCategories: written=${SEED.length}`);
  return { written: SEED.length };
}
