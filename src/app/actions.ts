"use server";

import { redirect } from "next/navigation";
import { clearSession, requireUser } from "@/lib/auth";

export async function logoutAction() {
  await requireUser();
  await clearSession();
  redirect("/login");
}
