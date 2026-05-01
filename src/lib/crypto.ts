import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const SECRET = process.env.ENCRYPTION_KEY || "dev-encryption-key-change-me";
const KEY = createHash("sha256").update(SECRET).digest();

export function encryptSecret(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", KEY, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${iv.toString("base64")}:${tag.toString("base64")}:${encrypted.toString("base64")}`;
}

export function decryptSecret(payload: string | null | undefined) {
  if (!payload) return null;
  const [ivB64, tagB64, dataB64] = payload.split(":");
  if (!ivB64 || !tagB64 || !dataB64) return null;

  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const data = Buffer.from(dataB64, "base64");

  const decipher = createDecipheriv("aes-256-gcm", KEY, iv);
  decipher.setAuthTag(tag);

  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}
