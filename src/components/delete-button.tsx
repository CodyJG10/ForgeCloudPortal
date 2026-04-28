"use client";

import { useRef } from "react";

interface DeleteButtonProps {
  action: (formData: FormData) => void | Promise<void>;
  idName: string;
  idValue: string;
  label?: string;
  className?: string;
  confirmMessage?: string;
}

export function DeleteButton({
  action,
  idName,
  idValue,
  label = "Delete",
  className = "w-full rounded-lg bg-red-700 px-3 py-2 text-sm font-semibold hover:bg-red-600",
  confirmMessage = "Are you sure you want to delete this? This action cannot be undone.",
}: DeleteButtonProps) {
  const formRef = useRef<HTMLFormElement>(null);

  function handleClick() {
    if (confirm(confirmMessage)) {
      formRef.current?.requestSubmit();
    }
  }

  return (
    <form ref={formRef} action={action}>
      <input type="hidden" name={idName} value={idValue} />
      <button type="button" onClick={handleClick} className={className}>
        {label}
      </button>
    </form>
  );
}
