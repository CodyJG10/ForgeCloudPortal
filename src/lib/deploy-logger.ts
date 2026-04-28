/**
 * Lightweight step logger for the deploy pipeline.
 * Every entry is written to the server console in real time (visible in `npm run dev`)
 * and accumulated so the full trace can be stored in ActivityLog or returned on error.
 */
export class DeployLogger {
  private entries: string[] = [];

  private write(prefix: string, msg: string) {
    const ts = new Date().toISOString();
    const line = `[${ts}] ${prefix} ${msg}`;
    // eslint-disable-next-line no-console
    if (prefix.startsWith("✗")) {
      console.error(line);
    } else {
      console.log(line);
    }
    this.entries.push(line);
  }

  /** Start of a major phase */
  step(label: string) {
    this.write("▶", label);
  }

  /** Successful completion of a phase */
  ok(msg: string) {
    this.write("✓", msg);
  }

  /** Non-fatal detail / extra info */
  info(msg: string) {
    this.write(" ", msg);
  }

  /** Fatal failure — call immediately before throwing */
  fail(msg: string) {
    this.write("✗", msg);
  }

  /** Returns the full accumulated log as a single string */
  dump(): string {
    return this.entries.join("\n");
  }
}
