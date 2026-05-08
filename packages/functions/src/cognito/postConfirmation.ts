import type { PostConfirmationTriggerHandler } from "aws-lambda";
import {
  CognitoIdentityProviderClient,
  AdminAddUserToGroupCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { UserGroup } from "@smartmath/core/auth";

const cognito = new CognitoIdentityProviderClient();

export const handler: PostConfirmationTriggerHandler = async (event) => {
  await cognito.send(
    new AdminAddUserToGroupCommand({
      UserPoolId: event.userPoolId,
      Username: event.userName,
      GroupName: UserGroup.Student,
    })
  );
  return event;
};
