// ===================================================================
// Cloudflare R2 (S3-compatible object storage) — profile images only
//
// Required env vars (Render → Environment):
//   R2_ACCOUNT_ID         Cloudflare account id
//   R2_ACCESS_KEY_ID      from an R2 API token (Object Read & Write)
//   R2_SECRET_ACCESS_KEY  from the same token (shown only once)
//   R2_BUCKET             bucket name, e.g. teachme-profiles
//   R2_PUBLIC_URL         public base URL of the bucket, no trailing slash
//                         e.g. https://pub-xxxxxxxxxxxxxxxx.r2.dev
// ===================================================================
require("dotenv").config();
const {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");

const {
  R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_BUCKET,
  R2_PUBLIC_URL,
} = process.env;

const configured = Boolean(
  R2_ACCOUNT_ID &&
    R2_ACCESS_KEY_ID &&
    R2_SECRET_ACCESS_KEY &&
    R2_BUCKET &&
    R2_PUBLIC_URL
);

if (!configured) {
  // Do not crash the whole server: everything except signup still works.
  console.warn(
    "⚠️  R2 is not fully configured (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, " +
      "R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_URL) — signup with a profile image will fail"
  );
}

const publicBase = (R2_PUBLIC_URL || "").trim().replace(/\/+$/, "");

const client = configured
  ? new S3Client({
      region: "auto", // R2 ignores regions, the SDK just needs a value
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
      },
      // Newer SDK versions add checksum headers by default; only send them
      // when an operation requires it (keeps R2 happy on every SDK version).
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
    })
  : null;

const EXTENSIONS = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

const ALLOWED_MIME_TYPES = new Set(Object.keys(EXTENSIONS));

function publicUrlFor(key) {
  return `${publicBase}/${key}`;
}

// Origin used by the Content-Security-Policy in index.js (img-src)
function publicOrigin() {
  try {
    return publicBase ? new URL(publicBase).origin : null;
  } catch (_) {
    return null;
  }
}

/**
 * Uploads a multer memory-storage file as profiles/<studentId>.<ext>
 * Returns { key, url }.
 */
async function uploadProfileImage(studentId, file) {
  if (!client) throw new Error("R2 is not configured on the server");
  const ext = EXTENSIONS[file.mimetype];
  if (!ext) throw new Error(`unsupported image type: ${file.mimetype}`);

  const key = `profiles/${studentId}.${ext}`;
  await client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      CacheControl: "public, max-age=86400",
    })
  );
  return { key, url: publicUrlFor(key) };
}

async function deleteObject(key) {
  if (!client) return;
  await client.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: key }));
}

module.exports = {
  configured,
  ALLOWED_MIME_TYPES,
  publicUrlFor,
  publicOrigin,
  uploadProfileImage,
  deleteObject,
};
