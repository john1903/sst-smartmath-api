import type { SQSHandler } from "aws-lambda";

export const handler: SQSHandler = async (event) => {
  console.log(`openEndedEvaluation: received ${event.Records.length} message(s)`);
};
