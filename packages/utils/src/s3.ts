import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const s3 = new S3Client({});

const DEFAULT_TTL_SECONDS = 900;

export function presignedGetUrl(
  bucket: string,
  key: string,
  ttlSeconds: number = DEFAULT_TTL_SECONDS,
): Promise<string> {
  return getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: bucket, Key: key }),
    { expiresIn: ttlSeconds },
  );
}
