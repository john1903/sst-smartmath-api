import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  BatchWriteCommand,
  DynamoDBDocumentClient,
} from "@aws-sdk/lib-dynamodb";

export const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const DDB_BATCH_LIMIT = 25;

// Bulk-put items into a table by chunking into DynamoDB's 25-item batch limit.
// No ConditionExpression, no UnprocessedItems retry — use only for immutable seeds
// with deterministic IDs, where re-running the migration is a safe no-op.
// Throws if DynamoDB returns UnprocessedItems so the migration fails loudly and
// can be re-run rather than silently dropping writes.
export async function batchPutAll(
  tableName: string,
  items: Record<string, unknown>[],
): Promise<void> {
  for (let i = 0; i < items.length; i += DDB_BATCH_LIMIT) {
    const batch = items.slice(i, i + DDB_BATCH_LIMIT);
    const res = await ddb.send(
      new BatchWriteCommand({
        RequestItems: {
          [tableName]: batch.map((Item) => ({ PutRequest: { Item } })),
        },
      }),
    );
    const unprocessed = res.UnprocessedItems?.[tableName]?.length ?? 0;
    if (unprocessed > 0) {
      throw new Error(
        `batchPutAll: ${unprocessed} unprocessed items for table ${tableName}; re-run the migration`,
      );
    }
  }
}
