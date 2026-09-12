import { z } from "zod";
import type { FileDto } from "../files/schemas";

const IdString = z.string().min(1).max(128);

const StoredAvatarSchema = z.object({
  id: z.string().min(1).max(128),
  fileName: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(127),
  s3Key: z.string().min(1),
});
export type StoredAvatar = z.infer<typeof StoredAvatarSchema>;

export const UserItemSchema = z.object({
  id: IdString,
  email: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  avatar: StoredAvatarSchema.optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export interface UserItem extends z.infer<typeof UserItemSchema> {}

export const UpdateUserRequestSchema = z
  .object({
    firstName: z.string().min(1).max(255),
    lastName: z.string().min(1).max(255),
    avatarId: z.string().min(1).max(128).nullable(),
  })
  .partial();
export type UpdateUserRequest = z.infer<typeof UpdateUserRequestSchema>;

export interface UserDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatar?: FileDto;
}

export async function toUserDto(
  item: UserItem,
  presignUri: (s3Key: string) => Promise<string>,
): Promise<UserDto> {
  return {
    id: item.id,
    email: item.email,
    firstName: item.firstName,
    lastName: item.lastName,
    avatar: item.avatar
      ? {
          id: item.avatar.id,
          fileName: item.avatar.fileName,
          uri: await presignUri(item.avatar.s3Key),
          mimeType: item.avatar.mimeType,
        }
      : undefined,
  };
}
