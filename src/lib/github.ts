import type { DeployLogger } from "@/lib/deploy-logger";

const TEMPLATE_REPO = "https://github.com/CodyJG10/ForgeTemplate.git";

function getConfig() {
  const token = process.env.GITHUB_TOKEN;
  const org = process.env.GITHUB_ORG; // optional – if set, repo is created under the org
  if (!token) throw new Error("GITHUB_TOKEN is not configured.");
  return { token, org };
}

/**
 * Creates a new private GitHub repository and returns its plain HTTPS clone URL.
 */
export async function createGithubRepo(repoName: string, log: DeployLogger): Promise<string> {
  const { token, org } = getConfig();

  const endpoint = org
    ? `https://api.github.com/orgs/${org}/repos`
    : "https://api.github.com/user/repos";

  log.step(`Creating GitHub repo: ${repoName}`);
  log.info(`POST ${endpoint}`);

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name: repoName, private: true, auto_init: false }),
  });

  if (!res.ok) {
    const body = await res.text();
    log.fail(`GitHub API responded ${res.status}: ${body}`);
    throw new Error(`GitHub API error ${res.status}: ${body}`);
  }

  const data = (await res.json()) as { clone_url: string; html_url: string };
  log.ok(`Repo created: ${data.html_url}`);
  return data.clone_url; // e.g. https://github.com/owner/repo.git
}

/**
 * Returns an authenticated HTTPS push URL by embedding the token into the clone URL.
 * Used only transiently during VPS push; never stored.
 */
export function buildAuthPushUrl(cloneUrl: string): string {
  const { token } = getConfig();
  // Insert token: https://github.com/... → https://x-token:TOKEN@github.com/...
  return cloneUrl.replace("https://", `https://x-token:${token}@`);
}

/**
 * Builds the bash command that, when run on the VPS, mirrors ForgeTemplate into the new repo.
 * Steps:  bare-clone template → push mirror to new repo → clean up.
 */
export function buildRepoInitCommand(siteName: string, authPushUrl: string): string {
  const tmpDir = `/tmp/forge-init-${siteName}`;
  // Redact the token from the command that gets logged by replacing the auth URL
  return [
    `rm -rf ${tmpDir}`,
    `git clone --bare ${TEMPLATE_REPO} ${tmpDir}`,
    `git -C ${tmpDir} push --mirror ${authPushUrl}`,
    `rm -rf ${tmpDir}`,
  ].join(" && ");
}

/** Same as buildRepoInitCommand but with the token redacted — safe to log */
export function buildRepoInitCommandRedacted(siteName: string, cloneUrl: string): string {
  const tmpDir = `/tmp/forge-init-${siteName}`;
  return [
    `rm -rf ${tmpDir}`,
    `git clone --bare ${TEMPLATE_REPO} ${tmpDir}`,
    `git -C ${tmpDir} push --mirror ${cloneUrl}  # (token redacted)`,
    `rm -rf ${tmpDir}`,
  ].join(" && ");
}
