import type { SQSHandler } from "aws-lambda";

export const handler: SQSHandler = async (event) => {
  console.log(`reports: received ${event.Records.length} message(s)`);
};
