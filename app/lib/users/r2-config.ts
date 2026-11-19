export type R2StorageConfig = {
  bucket: string;
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
};

export function readR2StorageConfig(
  environment: Record<string, string | undefined>,
): R2StorageConfig | null {
  const accountId = environment.R2_ACCOUNT_ID?.trim().toLowerCase();
  const bucket = environment.R2_BUCKET?.trim();
  const accessKeyId = environment.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = environment.R2_SECRET_ACCESS_KEY?.trim();
  if (
    !accountId ||
    !/^[a-f0-9]{32}$/.test(accountId) ||
    !bucket ||
    !accessKeyId ||
    !secretAccessKey
  ) {
    return null;
  }

  const endpointValue =
    environment.R2_ENDPOINT?.trim() ||
    `https://${accountId}.r2.cloudflarestorage.com`;
  let endpoint: URL;
  try {
    endpoint = new URL(endpointValue);
  } catch {
    return null;
  }
  if (
    endpoint.protocol !== "https:" ||
    endpoint.hostname !== `${accountId}.r2.cloudflarestorage.com` ||
    endpoint.username ||
    endpoint.password ||
    endpoint.port ||
    endpoint.pathname !== "/" ||
    endpoint.search ||
    endpoint.hash
  ) {
    return null;
  }

  return {
    bucket,
    endpoint: endpoint.origin,
    accessKeyId,
    secretAccessKey,
  };
}
