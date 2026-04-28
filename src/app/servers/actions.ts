"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { encryptSecret } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";
import { runCommand } from "@/lib/ssh";

const serverSchema = z.object({
  name: z.string().min(2),
  host: z.string().min(2),
  port: z.coerce.number().int().min(1).max(65535).default(22),
  username: z.string().min(1),
  authType: z.enum(["SSH_KEY", "PASSWORD"]),
  privateKey: z.string().optional(),
  passphrase: z.string().optional(),
  password: z.string().optional(),
  defaultProjectDir: z.string().default("/opt/strapi-sites"),
  notes: z.string().optional(),
});

export async function createServerAction(formData: FormData) {
  await requireUser();

  const parsed = serverSchema.safeParse({
    name: formData.get("name"),
    host: formData.get("host"),
    port: formData.get("port"),
    username: formData.get("username"),
    authType: formData.get("authType"),
    privateKey: formData.get("privateKey"),
    passphrase: formData.get("passphrase"),
    password: formData.get("password"),
    defaultProjectDir: formData.get("defaultProjectDir"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid input");
  const input = parsed.data;

  if (input.authType === "SSH_KEY" && !input.privateKey?.trim()) {
    throw new Error("Private key is required for SSH key auth.");
  }

  if (input.authType === "PASSWORD" && !input.password?.trim()) {
    throw new Error("Password is required for password auth.");
  }

  await prisma.vpsServer.create({
    data: {
      name: input.name,
      host: input.host,
      port: input.port,
      username: input.username,
      authType: input.authType,
      privateKeyEnc: input.privateKey ? encryptSecret(input.privateKey) : null,
      passwordEnc: input.password ? encryptSecret(input.password) : null,
      passphraseEnc: input.passphrase ? encryptSecret(input.passphrase) : null,
      defaultProjectDir: input.defaultProjectDir,
      notes: input.notes,
    },
  });

  revalidatePath("/servers");
}

export async function testServerConnectionAction(
  _prev: { ok: boolean; message: string } | null,
  formData: FormData
): Promise<{ ok: boolean; message: string }> {
  await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, message: "Missing server id" };

  const server = await prisma.vpsServer.findUnique({ where: { id } });
  if (!server) return { ok: false, message: "Server not found" };

  const result = await runCommand(server, "echo connected && uname -a");
  if (!result.ok) return { ok: false, message: result.stderr || "Connection failed" };

  return { ok: true, message: result.stdout.trim() || "Connected successfully" };
}

export async function deleteServerAction(formData: FormData) {
  const user = await requireUser();
  if (user.role !== "ADMIN") throw new Error("Only admins can remove servers.");

  const id = String(formData.get("id") ?? "");
  await prisma.vpsServer.delete({ where: { id } });

  revalidatePath("/servers");
}

const updateServerSchema = serverSchema.extend({
  id: z.string().min(1),
  clearPrivateKey: z.boolean().optional(),
  clearPassword: z.boolean().optional(),
});

export async function updateServerAction(formData: FormData) {
  await requireUser();

  const parsed = updateServerSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    host: formData.get("host"),
    port: formData.get("port"),
    username: formData.get("username"),
    authType: formData.get("authType"),
    privateKey: formData.get("privateKey"),
    passphrase: formData.get("passphrase"),
    password: formData.get("password"),
    defaultProjectDir: formData.get("defaultProjectDir"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid input");
  const input = parsed.data;

  const existing = await prisma.vpsServer.findUnique({ where: { id: input.id } });
  if (!existing) throw new Error("Server not found");

  await prisma.vpsServer.update({
    where: { id: input.id },
    data: {
      name: input.name,
      host: input.host,
      port: input.port,
      username: input.username,
      authType: input.authType,
      // Only overwrite encrypted fields when new values are provided
      ...(input.privateKey?.trim()
        ? { privateKeyEnc: encryptSecret(input.privateKey) }
        : {}),
      ...(input.passphrase?.trim()
        ? { passphraseEnc: encryptSecret(input.passphrase) }
        : {}),
      ...(input.password?.trim()
        ? { passwordEnc: encryptSecret(input.password) }
        : {}),
      defaultProjectDir: input.defaultProjectDir,
      notes: input.notes,
    },
  });

  revalidatePath("/servers");
}
