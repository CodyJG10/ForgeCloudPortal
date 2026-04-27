import { testServerConnectionAction } from "@/app/servers/actions";
import { SubmitButton } from "@/components/submit-button";

export function ServerTestForm({ id }: { id: string }) {
  return (
    <form action={testServerConnectionAction} className="space-y-2">
      <input type="hidden" name="id" value={id} />
      <SubmitButton
        idleText="Test SSH"
        pendingText="Testing..."
        className="w-full rounded-lg bg-zinc-800 px-3 py-2 text-sm font-semibold text-white hover:bg-zinc-700 disabled:opacity-40"
      />
    </form>
  );
}
