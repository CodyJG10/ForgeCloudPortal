"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSession, verifyPassword } from "@/lib/auth";

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").toLowerCase().trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) redirect("/login");

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) redirect("/login");

  await createSession({ sub: user.id, email: user.email, role: user.role });
  redirect("/");
}
