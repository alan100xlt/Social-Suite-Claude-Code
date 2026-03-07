import { describe, test, expect } from "vitest";
import { adminClient } from "./setup";

describe("Cron job health", () => {
  test("get_cron_jobs RPC returns data", async () => {
    const result = await adminClient.rpc("get_cron_jobs");
    expect(
      result.error,
      `get_cron_jobs RPC failed: ${result.error?.message}. Fix the RPC or remove this test.`
    ).toBeNull();
    expect(Array.isArray(result.data)).toBe(true);
    expect((result.data as any[]).length).toBeGreaterThan(0);
  });

  test("core cron jobs are registered", async () => {
    const result = await adminClient.rpc("get_cron_jobs");
    const jobNames = (result.data as any[]).map((j: any) => j.jobname);

    // These 3 are critical — data pipeline breaks without them
    expect(jobNames).toContain("analytics-sync-hourly");
    expect(jobNames).toContain("inbox-sync-every-15-min");
    expect(jobNames).toContain("rss-poll-every-5-min");
  });

  test("all enabled cron_job_settings have a matching pg_cron entry", async () => {
    const { data: settings } = await adminClient
      .from("cron_job_settings")
      .select("job_name")
      .eq("enabled", true);

    if (!settings || settings.length === 0) return; // no settings table = skip

    const result = await adminClient.rpc("get_cron_jobs");
    const registeredNames = new Set((result.data as any[]).map((j: any) => j.jobname));

    const missing = settings
      .map((s: any) => s.job_name)
      .filter((name: string) => !registeredNames.has(name));

    expect(
      missing,
      `These jobs are enabled in cron_job_settings but NOT registered in pg_cron: ${missing.join(", ")}`
    ).toHaveLength(0);
  });
});
