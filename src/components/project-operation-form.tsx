import { projectOperationAction } from "@/app/projects/actions";
import { SubmitButton } from "@/components/submit-button";

export function ProjectOperationForm({ projectId, operation, label }: { projectId: string; operation: string; label: string }) {
  return (
    <form action={projectOperationAction} className="space-y-2 rounded-lg border border-zinc-800 p-3">
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="operation" value={operation} />
      <SubmitButton
        idleText={label}
        pendingText="Running..."
        className="w-full rounded-lg bg-zinc-800 px-3 py-2 text-sm font-semibold text-white hover:bg-zinc-700 disabled:opacity-40"
      />
    </form>
  );
}
