import { bucket, table } from "./storage";

export const openEndedEvaluationDlq = new sst.aws.Queue("OpenEndedEvaluationDLQ");

export const openEndedEvaluationQueue = new sst.aws.Queue("OpenEndedEvaluationQueue", {
  visibilityTimeout: "60 seconds",
  dlq: openEndedEvaluationDlq.arn,
});

openEndedEvaluationQueue.subscribe({
  handler: "packages/functions/src/queues/openEndedEvaluation.handler",
  link: [table, bucket],
});

export const reportsDlq = new sst.aws.Queue("ReportsDLQ");

export const reportsQueue = new sst.aws.Queue("ReportsQueue", {
  visibilityTimeout: "60 seconds",
  dlq: reportsDlq.arn,
});

reportsQueue.subscribe({
  handler: "packages/functions/src/queues/reports.handler",
  link: [table, bucket],
});
