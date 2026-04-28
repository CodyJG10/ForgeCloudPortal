"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type JobStatus = "PENDING" | "RUNNING" | "SUCCESS" | "FAILED";

interface JobData {
  id: string;
  status: JobStatus;
  log: string;
  projectId: string | null;
  updatedAt: string;
}

const STATUS_LABEL: Record<JobStatus, string> = {
  PENDING: "Queued",
  RUNNING: "Deploying…",
  SUCCESS: "Success",
  FAILED: "Failed",
};

const STATUS_COLOR: Record<JobStatus, string> = {
  PENDING: "text-yellow-400",
  RUNNING: "text-blue-400",
  SUCCESS: "text-green-400",
  FAILED: "text-red-400",
};

export default function DeployStatusPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const [id, setId] = useState<string | null>(null);
  const [job, setJob] = useState<JobData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const logRef = useRef<HTMLPreElement>(null);
  const doneRef = useRef(false);

  // Unwrap the async params
  useEffect(() => {
    params.then((p) => setId(p.id));
  }, [params]);

  useEffect(() => {
    if (!id) return;

    const poll = async () => {
      try {
        const res = await fetch(`/api/deploy/${id}`);
        if (!res.ok) {
          setError(`Failed to fetch status (${res.status})`);
          return;
        }
        const data: JobData = await res.json();
        setJob(data);

        if (data.status === "SUCCESS" || data.status === "FAILED") {
          doneRef.current = true;
        }
      } catch {
        setError("Network error while fetching status");
      }
    };

    poll(); // immediate first fetch
    const interval = setInterval(() => {
      if (doneRef.current) {
        clearInterval(interval);
        return;
      }
      poll();
    }, 2000);

    return () => clearInterval(interval);
  }, [id]);

  // Auto-scroll log to bottom whenever it updates
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [job?.log]);

  if (error) {
    return (
      <main className="p-8">
        <p className="text-red-400">{error}</p>
      </main>
    );
  }

  if (!job) {
    return (
      <main className="p-8">
        <p className="text-gray-400">Loading deployment status…</p>
      </main>
    );
  }

  return (
    <main className="p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Deployment</h1>
          <p className="text-sm text-gray-400 font-mono mt-1">{job.id}</p>
        </div>
        <span className={`text-lg font-semibold ${STATUS_COLOR[job.status]}`}>
          {STATUS_LABEL[job.status]}
        </span>
      </div>

      {job.status === "SUCCESS" && job.projectId && (
        <div className="rounded-md bg-green-900/40 border border-green-700 p-4 text-sm text-green-300">
          Deployment succeeded.{" "}
          <button
            className="underline hover:no-underline"
            onClick={() => router.push(`/projects/${job.projectId}`)}
          >
            View project →
          </button>
        </div>
      )}

      {job.status === "FAILED" && (
        <div className="rounded-md bg-red-900/40 border border-red-700 p-4 text-sm text-red-300">
          Deployment failed. See log below for details.
        </div>
      )}

      <div>
        <h2 className="text-sm font-medium text-gray-400 mb-2 uppercase tracking-wide">
          Live Log
        </h2>
        <pre
          ref={logRef}
          className="bg-gray-950 text-gray-200 text-xs font-mono rounded-lg border border-gray-700 p-4 h-[60vh] overflow-y-auto whitespace-pre-wrap break-words"
        >
          {job.log || "(waiting for output…)"}
        </pre>
      </div>

      <div className="flex gap-3 text-sm">
        <button
          className="px-4 py-2 rounded bg-gray-800 hover:bg-gray-700 transition-colors"
          onClick={() => router.push("/projects")}
        >
          ← All projects
        </button>
        {(job.status === "SUCCESS" || job.status === "FAILED") && (
          <button
            className="px-4 py-2 rounded bg-gray-800 hover:bg-gray-700 transition-colors"
            onClick={() => router.push("/projects/new")}
          >
            Deploy another
          </button>
        )}
      </div>
    </main>
  );
}
