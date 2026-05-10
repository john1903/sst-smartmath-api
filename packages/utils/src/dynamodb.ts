import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  BatchWriteCommand,
  DynamoDBDocumentClient,
  type BatchWriteCommandInput,
} from "@aws-sdk/lib-dynamodb";

// Module-scope singleton: AWS Lambda reuses the runtime between invocations,
// so the client is created once per container and reused across requests.
// Sharing one instance across handlers and scripts also keeps connection
// pooling and credential resolution consistent.
export const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

const BATCH_WRITE_LIMIT = 25;
const MAX_RETRIES = 6;

export async function batchPutAll<T extends Record<string, unknown>>(
  client: DynamoDBDocumentClient,
  tableName: string,
  items: T[],
): Promise<void> {
  for (const batch of chunk(items, BATCH_WRITE_LIMIT)) {
    let request: BatchWriteCommandInput = {
      RequestItems: {
        [tableName]: batch.map((Item) => ({ PutRequest: { Item } })),
      },
    };

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const res = await client.send(new BatchWriteCommand(request));
      const unprocessed = res.UnprocessedItems ?? {};
      if (!unprocessed[tableName] || unprocessed[tableName].length === 0) break;
      if (attempt === MAX_RETRIES - 1) {
        throw new Error(
          `BatchWrite still has ${unprocessed[tableName].length} unprocessed items after ${MAX_RETRIES} retries`,
        );
      }
      await new Promise((r) => setTimeout(r, 50 * 2 ** attempt));
      request = { RequestItems: unprocessed };
    }
  }
}
