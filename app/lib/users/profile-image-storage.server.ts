import "server-only";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { randomBytes } from "node:crypto";
import { readR2StorageConfig } from "./r2-config";

export class ProfileImageStorageError extends Error {
  constructor(
    public readonly code: "storage_not_configured" | "storage_unavailable",
    public readonly status: 503,
  ) {
    super(code);
  }
}

type StorageConfig = {
  bucket: string;
  client: S3Client;
};

function getStorageConfig(
  environment: NodeJS.ProcessEnv = process.env,
): StorageConfig {
  const config = readR2StorageConfig(environment);
  if (!config) throw new ProfileImageStorageError("storage_not_configured", 503);

  return {
    bucket: config.bucket,
    client: new S3Client({
      region: "auto",
      endpoint: config.endpoint,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    }),
  };
}

function userPrefix(userId: string): string {
  if (!/^[A-Za-z0-9_-]{1,191}$/.test(userId)) {
    throw new ProfileImageStorageError("storage_unavailable", 503);
  }
  return `profiles/${userId}/`;
}

function objectKey(userId: string, key?: string): string {
  const prefix = userPrefix(userId);
  if (key !== undefined) {
    if (!new RegExp(`^${prefix}[a-f0-9]{32}$`).test(key)) {
      throw new ProfileImageStorageError("storage_unavailable", 503);
    }
    return key;
  }
  return `${prefix}${randomBytes(16).toString("hex")}`;
}

export async function putProfileImage(
  userId: string,
  image: Uint8Array,
  contentType: "image/jpeg" | "image/png" | "image/webp",
): Promise<string> {
  const { bucket, client } = getStorageConfig();
  const key = objectKey(userId);
  try {
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: image,
        ContentType: contentType,
        CacheControl: "private, no-store",
      }),
    );
    return key;
  } catch {
    throw new ProfileImageStorageError("storage_unavailable", 503);
  } finally {
    client.destroy();
  }
}

export async function getProfileImage(userId: string, key: string) {
  const { bucket, client } = getStorageConfig();
  try {
    return await client.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: objectKey(userId, key),
      }),
    );
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "name" in error &&
      error.name === "NoSuchKey"
    ) {
      return null;
    }
    throw new ProfileImageStorageError("storage_unavailable", 503);
  } finally {
    client.destroy();
  }
}

export async function deleteProfileImage(
  userId: string,
  key: string,
): Promise<void> {
  const { bucket, client } = getStorageConfig();
  try {
    await client.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: objectKey(userId, key),
      }),
    );
  } catch {
    throw new ProfileImageStorageError("storage_unavailable", 503);
  } finally {
    client.destroy();
  }
}
