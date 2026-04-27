import { updateEnvFileAction } from "@/app/projects/actions";
import { SubmitButton } from "@/components/submit-button";
import { Textarea } from "@/components/ui";

export function EnvEditor({
  projectId,
  which,
  initialContent,
}: {
  projectId: string;
  which: "backend" | "frontend";
  initialContent: string;
}) {
  return (
    <form action={updateEnvFileAction} className="space-y-2">
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="which" value={which} />
      <Textarea name="content" rows={14} defaultValue={initialContent} className="font-mono text-xs" />
      <SubmitButton
        idleText={`Save ${which}.env`}
        pendingText="Saving..."
        className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-40"
      />
    </form>
  );
}
