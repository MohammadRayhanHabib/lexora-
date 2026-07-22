import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";
import path from "path";
import { env } from "../config/env";

const isStorageConfigured =
  !!env.storageEndpoint && !!env.storageAccessKey && !!env.storageSecretKey;

const s3 = isStorageConfigured
  ? new S3Client({
      region: env.storageRegion,
      endpoint: env.storageEndpoint,
      forcePathStyle: true,
      credentials: {
        accessKeyId: env.storageAccessKey,
        secretAccessKey: env.storageSecretKey,
      },
    })
  : null;

function normalizeEndpoint(endpoint: string) {
  return endpoint.endsWith("/") ? endpoint.slice(0, -1) : endpoint;
}

export function buildObjectStorageUrl(bucket: string, key: string) {
  const endpoint = normalizeEndpoint(env.storageEndpoint);
  return `${endpoint}/${bucket}/${key}`;
}

export async function uploadBufferToObjectStorage(options: {
  bucket: string;
  folder: string;
  originalName: string;
  mimeType?: string;
  content: Buffer;
}) {
  if (!s3) {
    throw new Error(
      "Object storage is not configured. Set STORAGE_ENDPOINT, STORAGE_ACCESS_KEY and STORAGE_SECRET_KEY.",
    );
  }

  const ext = path.extname(options.originalName) || "";
  const key = `${options.folder}/${Date.now()}-${randomUUID()}${ext}`;

  await s3.send(
    new PutObjectCommand({
      Bucket: options.bucket,
      Key: key,
      Body: options.content,
      ContentType: options.mimeType || "application/octet-stream",
    }),
  );

  return {
    key,
    url: buildObjectStorageUrl(options.bucket, key),
  };
}

export function getObjectStorageKeyFromUrl(url: string, bucket: string) {
  const endpoint = normalizeEndpoint(env.storageEndpoint);
  const prefix = `${endpoint}/${bucket}/`;
  if (!url.startsWith(prefix)) {
    return null;
  }

  return url.slice(prefix.length);
}

export async function deleteObjectFromObjectStorage(options: {
  bucket: string;
  key: string;
}) {
  if (!s3) {
    throw new Error(
      "Object storage is not configured. Set STORAGE_ENDPOINT, STORAGE_ACCESS_KEY and STORAGE_SECRET_KEY.",
    );
  }

  await s3.send(
    new DeleteObjectCommand({
      Bucket: options.bucket,
      Key: options.key,
    }),
  );
}
