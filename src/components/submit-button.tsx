"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({
  idleText,
  pendingText,
  className,
}: {
  idleText: string;
  pendingText: string;
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={className ?? "rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-40"}
    >
      {pending ? pendingText : idleText}
    </button>
  );
}
