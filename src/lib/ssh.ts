import { NodeSSH } from "node-ssh";
import type { VpsServer } from "@prisma/client";
import { decryptSecret } from "@/lib/crypto";

export async function withSsh<T>(server: VpsServer, fn: (ssh: NodeSSH) => Promise<T>) {
  const ssh = new NodeSSH();

  const privateKey = decryptSecret(server.privateKeyEnc);
  const password = decryptSecret(server.passwordEnc);
  const passphrase = decryptSecret(server.passphraseEnc) ?? undefined;

  await ssh.connect({
    host: server.host,
    port: server.port,
    username: server.username,
    privateKey: privateKey ?? undefined,
    password: password ?? undefined,
    passphrase,
    tryKeyboard: true,
  });

  try {
    return await fn(ssh);
  } finally {
    ssh.dispose();
  }
}

export async function runCommand(server: VpsServer, command: string, cwd?: string) {
  return withSsh(server, async (ssh) => {
    const result = await ssh.execCommand(command, cwd ? { cwd } : undefined);

    return {
      ok: result.code === 0,
      code: result.code,
      stdout: result.stdout?.trim() ?? "",
      stderr: result.stderr?.trim() ?? "",
    };
  });
}
