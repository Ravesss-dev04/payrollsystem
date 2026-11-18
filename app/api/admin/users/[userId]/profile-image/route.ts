import { Prisma } from "../../../../../generated/prisma/client";
import { hasPermission } from "../../../../../lib/auth/authorization";
import {
  ApiAuthorizationError,
  requireApiPermission,
} from "../../../../../lib/auth/api-guard.server";
import {
  HttpInputError,
  jsonResponse,
} from "../../../../../lib/auth/http";
import { prisma } from "../../../../../lib/db";
import { writeDomainAuditEvent } from "../../../../../lib/audit/domain-audit";
import {
  deleteProfileImage,
  getProfileImage,
  ProfileImageStorageError,
  putProfileImage,
} from "../../../../../lib/users/profile-image-storage.server";
import { UserServiceError } from "../../../../../lib/users/service";
import { userIdSchema } from "../../../../../lib/users/schemas";
import { userApiErrorResponse } from "../../../../_shared/user-errors";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
type ImageType = (typeof IMAGE_TYPES)[number];

type RouteParams = { params: Promise<{ userId: string }> };

function isImageType(value: string): value is ImageType {
  return IMAGE_TYPES.some((type) => type === value);
}

function matchesImageSignature(bytes: Uint8Array, contentType: ImageType) {
  if (contentType === "image/png") {
    return (
      bytes.length >= 8 &&
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a
    );
  }
  if (contentType === "image/jpeg") {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  return (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  );
}

async function readImageBody(request: Request): Promise<Uint8Array> {
  const contentLength = request.headers.get("content-length");
  if (contentLength !== null) {
    if (!/^\d+$/.test(contentLength)) {
      throw new HttpInputError(400, "invalid_request");
    }
    if (Number(contentLength) > MAX_IMAGE_BYTES) {
      throw new HttpInputError(413, "payload_too_large");
    }
  }
  if (!request.body) throw new HttpInputError(400, "invalid_request");

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_IMAGE_BYTES) {
        await reader.cancel();
        throw new HttpInputError(413, "payload_too_large");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const result = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}

export async function GET(
  request: Request,
  { params }: RouteParams,
): Promise<Response> {
  try {
    const actor = await requireApiPermission(request);
    const { userId: rawId } = await params;
    const id = userIdSchema.safeParse(rawId);
    if (!id.success) return jsonResponse({ error: "user_not_found" }, 404);
    const canReadOthers = hasPermission({
      role: actor.role,
      permission: "users:read",
      actorId: actor.userId,
      grantedPermissions: actor.grantedPermissions,
      deniedPermissions: actor.deniedPermissions,
    });
    if (actor.userId !== id.data && !canReadOthers) {
      throw new ApiAuthorizationError(403, "forbidden");
    }
    const user = await prisma.user.findFirst({
      where: { id: id.data, isTestAccount: false },
      select: {
        profileImageKey: true,
        profileImageContentType: true,
      },
    });
    if (!user?.profileImageKey || !user.profileImageContentType) {
      return jsonResponse({ error: "profile_image_not_found" }, 404);
    }
    if (
      !isImageType(user.profileImageContentType) ||
      !user.profileImageKey.startsWith(`profiles/${id.data}/`)
    ) {
      throw new ProfileImageStorageError("storage_unavailable", 503);
    }
    const object = await getProfileImage(id.data, user.profileImageKey);
    if (!object?.Body) {
      return jsonResponse({ error: "profile_image_not_found" }, 404);
    }
    return new Response(object.Body.transformToWebStream(), {
      headers: {
        "content-type": user.profileImageContentType,
        "cache-control": "private, no-store, max-age=0",
        "x-content-type-options": "nosniff",
      },
    });
  } catch (error) {
    return userApiErrorResponse(error);
  }
}

export async function PUT(
  request: Request,
  { params }: RouteParams,
): Promise<Response> {
  try {
    const actor = await requireApiPermission(request, "users:manage");
    const { userId: rawId } = await params;
    const id = userIdSchema.safeParse(rawId);
    if (!id.success || new URL(request.url).search) {
      return jsonResponse({ error: "invalid_request" }, 400);
    }
    const contentType = request.headers.get("content-type")?.toLowerCase();
    if (!contentType || !isImageType(contentType)) {
      return jsonResponse({ error: "unsupported_media_type" }, 415);
    }
    const bytes = await readImageBody(request);
    if (!bytes.length || !matchesImageSignature(bytes, contentType)) {
      return jsonResponse({ error: "invalid_image" }, 400);
    }
    const current = await prisma.user.findFirst({
      where: { id: id.data, isTestAccount: false },
      select: { profileImageKey: true },
    });
    if (!current) throw new UserServiceError("user_not_found", 404);

    const newKey = await putProfileImage(id.data, bytes, contentType);
    let oldKey: string | null;
    try {
      oldKey = await prisma.$transaction(async (transaction) => {
        const updated = await transaction.user.updateMany({
          where: {
            id: id.data,
            isTestAccount: false,
            profileImageKey: current.profileImageKey,
          },
          data: {
            profileImageKey: newKey,
            profileImageContentType: contentType,
          },
        });
        if (updated.count !== 1) {
          throw new UserServiceError("concurrent_update", 409);
        }
        await writeDomainAuditEvent(transaction, {
          actor,
          action: "user.profile_image.updated",
          entityType: "user",
          entityId: id.data,
          summary: "User profile image updated",
          details: {
            contentType,
            byteLength: bytes.length,
          } satisfies Prisma.InputJsonObject,
        });
        return current.profileImageKey;
      });
    } catch (error) {
      await deleteProfileImage(id.data, newKey);
      throw error;
    }

    let cleanupPending = false;
    if (oldKey && oldKey !== newKey) {
      try {
        await deleteProfileImage(id.data, oldKey);
      } catch (error) {
        if (!(error instanceof ProfileImageStorageError)) throw error;
        cleanupPending = true;
      }
    }
    return jsonResponse({
      updated: true,
      cleanupPending,
      profileImageUrl: `/api/admin/users/${encodeURIComponent(id.data)}/profile-image`,
    });
  } catch (error) {
    return userApiErrorResponse(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: RouteParams,
): Promise<Response> {
  try {
    const actor = await requireApiPermission(request, "users:manage");
    const { userId: rawId } = await params;
    const id = userIdSchema.safeParse(rawId);
    if (!id.success || new URL(request.url).search) {
      return jsonResponse({ error: "invalid_request" }, 400);
    }
    const oldKey = await prisma.$transaction(async (transaction) => {
      const user = await transaction.user.findFirst({
        where: { id: id.data, isTestAccount: false },
        select: { profileImageKey: true },
      });
      if (!user) throw new UserServiceError("user_not_found", 404);
      if (!user.profileImageKey) return null;
      const updated = await transaction.user.updateMany({
        where: {
          id: id.data,
          profileImageKey: user.profileImageKey,
          isTestAccount: false,
        },
        data: { profileImageKey: null, profileImageContentType: null },
      });
      if (updated.count !== 1) {
        throw new UserServiceError("concurrent_update", 409);
      }
      await writeDomainAuditEvent(transaction, {
        actor,
        action: "user.profile_image.removed",
        entityType: "user",
        entityId: id.data,
        summary: "User profile image removed",
      });
      return user.profileImageKey;
    });
    if (!oldKey) return jsonResponse({ updated: true, cleanupPending: false });
    try {
      await deleteProfileImage(id.data, oldKey);
      return jsonResponse({ updated: true, cleanupPending: false });
    } catch (error) {
      if (!(error instanceof ProfileImageStorageError)) throw error;
      return jsonResponse({ updated: true, cleanupPending: true });
    }
  } catch (error) {
    return userApiErrorResponse(error);
  }
}
