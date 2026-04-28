"use client";

import { useActionState } from "react";
import { testServerConnectionAction } from "@/app/servers/actions";
import { SubmitButton } from "@/components/submit-button";

type TestResult = { ok: boolean; message: string } | null;

export function ServerTestForm({ id }: { id: string }) {
  const [result, formAction] = useActionState<TestResult, FormData>(
    testServerConnectionAction,
    null
  );

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="id" value={id} />
      <SubmitButton
        idleText="Test SSH"
        pendingText="Testing…"
        className="w-full rounded-lg bg-zinc-800 px-3 py-2 text-sm font-semibold text-white hover:bg-zinc-700 disabled:opacity-40"
      />
      {result && (
        <div
          className={`rounded-md px-3 py-2 text-xs font-mono whitespace-pre-wrap break-all ${
            result.ok
              ? "bg-green-900/40 border border-green-700 text-green-300"
              : "bg-red-900/40 border border-red-700 text-red-300"
          }`}
        >
          {result.ok ? "✓ " : "✗ "}
          {result.message}
        </div>
      )}
    </form>
  );
}
