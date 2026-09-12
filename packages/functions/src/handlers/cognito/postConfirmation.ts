import type { PostConfirmationTriggerHandler } from "aws-lambda";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { Resource } from "sst";
import { UserItemSchema } from "@smartmath/core/users";
import { ddb } from "@smartmath/utils/dynamodb";

export const handler: PostConfirmationTriggerHandler = async (event) => {
  if (event.triggerSource !== "PostConfirmation_ConfirmSignUp") return event;

  const attrs = event.request.userAttributes;
  const now = new Date().toISOString();

  const item = UserItemSchema.parse({
    id: attrs.sub,
    email: attrs.email ?? "",
    firstName: attrs.given_name ?? "",
    lastName: attrs.family_name ?? "",
    createdAt: now,
    updatedAt: now,
  });

  try {
    await ddb.send(
      new PutCommand({
        TableName: Resource.Users.name,
        Item: item,
        ConditionExpression: "attribute_not_exists(id)",
      }),
    );
  } catch (err: unknown) {
    const name = (err as { name?: string } | null)?.name;
    if (name !== "ConditionalCheckFailedException") throw err;
  }

  return event;
};
