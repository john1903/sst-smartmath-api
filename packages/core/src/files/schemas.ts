import { z } from "zod";

export const FileCategorySchema = z.enum([
  "user",
  "answer",
  "report",
  "exercise",
]);
export type FileCategory = z.infer<typeof FileCategorySchema>;

const IdString = z.string().min(1).max(128);

export const FileItemSchema = z.object({
  id: IdString,
  ownerSub: z.string().min(1),
  category: FileCategorySchema,
  fileName: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(127),
  s3Key: z.string().min(1),
  createdAt: z.string(),
});
export interface FileItem extends z.infer<typeof FileItemSchema> {}

export interface FileDto {
  id: string;
  fileName?: string;
  uri: string;
  mimeType: string;
}

export function toFileDto(item: FileItem, uri: string): FileDto {
  return {
    id: item.id,
    fileName: item.fileName,
    uri,
    mimeType: item.mimeType,
  };
}
