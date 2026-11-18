import { describe, expect, it } from "bun:test";
import { readR2StorageConfig } from "../../app/lib/users/r2-config";

const accountId = "0123456789abcdef0123456789abcdef";
const environment = {
  R2_ACCOUNT_ID: accountId,
  R2_BUCKET: "private-profile-images",
  R2_ACCESS_KEY_ID: "access-key",
  R2_SECRET_ACCESS_KEY: "secret-key",
};

describe("Cloudflare R2 configuration", () => {
  it("derives the Cloudflare S3 endpoint from the account ID", () => {
    expect(readR2StorageConfig(environment)).toEqual({
      bucket: "private-profile-images",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      accessKeyId: "access-key",
      secretAccessKey: "secret-key",
    });
  });

  it("rejects endpoints outside the configured HTTPS R2 account", () => {
    expect(
      readR2StorageConfig({
        ...environment,
        R2_ENDPOINT: `https://other-account.r2.cloudflarestorage.com`,
      }),
    ).toBeNull();
    expect(
      readR2StorageConfig({
        ...environment,
        R2_ENDPOINT: `http://${accountId}.r2.cloudflarestorage.com`,
      }),
    ).toBeNull();
  });

  it("rejects missing credentials and malformed account IDs", () => {
    expect(
      readR2StorageConfig({ ...environment, R2_ACCOUNT_ID: "invalid" }),
    ).toBeNull();
    expect(
      readR2StorageConfig({
        ...environment,
        R2_SECRET_ACCESS_KEY: undefined,
      }),
    ).toBeNull();
  });
});
