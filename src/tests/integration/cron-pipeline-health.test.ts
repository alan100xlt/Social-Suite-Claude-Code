import { describe, test, expect, beforeAll } from "vitest";
import { adminClient } from "./setup";

/**
 * Cron Pipeline Health Tests
 *
 * These test the ACTUAL health of the data pipeline by querying cron_health_logs.
 * They verify that cron jobs are running, completing, and not getting stuck.
 *
 * Unlike E2E tests (which check if UI shows data), these test whether the
 * backend pipeline is actually working — the most critical part of the platform.
 */

// How far back to look (in minutes)
const LOOKBACK_MINUTES = {
  "rss-poll": 15,                    // runs every 5min, should have entry within 15min
  "inbox-sync": 45,                  // runs every 15min, should have entry within 45min
  "analytics-sync": 120,            // runs hourly — allow 2h lookback
  "getlate-changelog-monitor": 1500, // runs daily at 9am — 25h lookback
  "cron-watchdog": 30,              // runs every 10min
  "cron-escalation": 90,            // runs every 30min — allow 90min lookback
};

interface CronLog {
  id: string;
  job_name: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  duration_ms: number | null;
  error_message: string | null;
}

let allLogs: CronLog[] = [];
let jobSettings: Array<{ job_name: string; schedule: string; enabled: boolean; job_type: string }> = [];

beforeAll(async () => {
  // Fetch last 100 cron health logs
  const { data: logs, error: logError } = await adminClient
    .from("cron_health_logs")
    .select("id, job_name, status, started_at, completed_at, duration_ms, error_message")
    .order("started_at", { ascending: false })
    .limit(100);

  if (logError) throw new Error(`Failed to query cron_health_logs: ${logError.message}`);
  allLogs = (logs || []) as CronLog[];

  // Fetch cron job settings
  const { data: settings, error: settingsError } = await adminClient
    .from("cron_job_settings")
    .select("job_name, schedule, enabled, job_type");

  if (settingsError) throw new Error(`Failed to query cron_job_settings: ${settingsError.message}`);
  jobSettings = (settings || []) as typeof jobSettings;
}, 15000);

// ─── Cron Job Registration ────────────────────────────────────

describe("Cron job registration", () => {
  const expectedEnabled = [
    "rss-poll-every-5-min",
    "inbox-sync-every-15-min",
    "analytics-sync-hourly",
    "cron-watchdog",
    "cron-health-logs-cleanup",
    "inbox-resurface-snoozed",
  ];

  // These exist but are intentionally disabled (missing secrets)
  const expectedDisabled = [
    "getlate-changelog-monitor",
    "cron-escalation-every-30-min",
  ];

  for (const jobName of expectedEnabled) {
    test(`${jobName} is registered and enabled`, () => {
      const setting = jobSettings.find((s) => s.job_name === jobName);
      expect(setting, `Job "${jobName}" not found in cron_job_settings`).toBeDefined();
      expect(setting!.enabled, `Job "${jobName}" is disabled`).toBe(true);
    });
  }

  for (const jobName of expectedDisabled) {
    test(`${jobName} is registered (disabled — missing secrets)`, () => {
      const setting = jobSettings.find((s) => s.job_name === jobName);
      expect(setting, `Job "${jobName}" not found in cron_job_settings`).toBeDefined();
    });
  }
});

// ─── RSS Poll Health ──────────────────────────────────────────

describe("rss-poll pipeline health", () => {
  // rss-poll logs as "rss-poll-every-5-min" (CronMonitor uses the job_name from settings)
  const isRssPoll = (name: string) => name === "rss-poll" || name.startsWith("rss-poll");

  test("has recent successful executions", () => {
    const cutoff = new Date(Date.now() - LOOKBACK_MINUTES["rss-poll"] * 60000).toISOString();
    const recentLogs = allLogs.filter(
      (l) => isRssPoll(l.job_name) && l.started_at > cutoff
    );

    expect(recentLogs.length, "rss-poll should have recent log entries").toBeGreaterThan(0);

    const successes = recentLogs.filter((l) => l.status === "success");
    expect(successes.length, "rss-poll should have at least 1 recent success").toBeGreaterThan(0);
  });

  test("completes within reasonable time (<10s)", () => {
    const successes = allLogs.filter(
      (l) => isRssPoll(l.job_name) && l.status === "success" && l.duration_ms != null
    );

    if (successes.length === 0) return; // skip if no data
    const avgDuration = successes.reduce((s, l) => s + l.duration_ms!, 0) / successes.length;
    expect(avgDuration, "rss-poll avg duration should be under 10s").toBeLessThan(10000);
  });

  test("has no stuck 'running' entries", () => {
    const running = allLogs.filter((l) => isRssPoll(l.job_name) && l.status === "running");
    expect(running.length, "rss-poll should not have stuck running entries").toBe(0);
  });
});

// ─── Inbox Sync Health ────────────────────────────────────────

describe("inbox-sync pipeline health", () => {
  // inbox-sync logs appear as "inbox-sync:<companyId>" (fan-out dispatcher)
  const isInboxSync = (name: string) => name.startsWith("inbox-sync");

  test("has recent log entries", () => {
    const cutoff = new Date(
      Date.now() - LOOKBACK_MINUTES["inbox-sync"] * 60000
    ).toISOString();
    const recentLogs = allLogs.filter(
      (l) => isInboxSync(l.job_name) && l.started_at > cutoff
    );

    expect(recentLogs.length, "inbox-sync should have recent log entries").toBeGreaterThan(0);
  });

  test("has at least some successful completions in last 100 entries", () => {
    const inboxLogs = allLogs.filter((l) => isInboxSync(l.job_name));
    const successes = inboxLogs.filter((l) => l.status === "success");

    expect(
      successes.length,
      `inbox-sync has ${successes.length}/${inboxLogs.length} successes — should have at least 1`
    ).toBeGreaterThan(0);
  });

  test("stuck 'running' ratio is below 50%", () => {
    const inboxLogs = allLogs.filter((l) => isInboxSync(l.job_name));
    if (inboxLogs.length === 0) return;

    const running = inboxLogs.filter((l) => l.status === "running");
    const stuckRatio = running.length / inboxLogs.length;

    expect(
      stuckRatio,
      `inbox-sync has ${running.length}/${inboxLogs.length} stuck running (${(stuckRatio * 100).toFixed(0)}%) — should be < 50%`
    ).toBeLessThan(0.5);
  });

  test("successful runs complete in under 120s", () => {
    const successes = allLogs.filter(
      (l) =>
        isInboxSync(l.job_name) &&
        l.status === "success" &&
        l.duration_ms != null
    );

    if (successes.length === 0) return;
    const maxDuration = Math.max(...successes.map((l) => l.duration_ms!));
    expect(
      maxDuration,
      `inbox-sync max successful duration is ${(maxDuration / 1000).toFixed(1)}s — should be < 120s`
    ).toBeLessThan(120000);
  });
});

// ─── Analytics Sync Health ────────────────────────────────────

describe("analytics-sync pipeline health", () => {
  // analytics-sync logs appear as "analytics-sync", "analytics-sync-hourly", or "analytics-sync:<companyId>" (fan-out)
  const isAnalyticsSync = (name: string) =>
    name === "analytics-sync" || name === "analytics-sync-hourly" || name.startsWith("analytics-sync:");

  test("has log entries (function has been invoked)", () => {
    const analyticsLogs = allLogs.filter((l) => isAnalyticsSync(l.job_name));

    expect(
      analyticsLogs.length,
      "analytics-sync should have at least 1 log entry — if 0, the cron job may not be triggering the function"
    ).toBeGreaterThan(0);
  });

  test("has at least one successful completion", () => {
    const analyticsLogs = allLogs.filter(
      (l) => isAnalyticsSync(l.job_name) && l.status === "success"
    );

    expect(
      analyticsLogs.length,
      "analytics-sync should have at least 1 successful completion"
    ).toBeGreaterThan(0);
  });

  test("is not permanently stuck in 'running' state", () => {
    const analyticsLogs = allLogs.filter((l) => isAnalyticsSync(l.job_name));

    if (analyticsLogs.length === 0) return;

    const allRunning = analyticsLogs.every((l) => l.status === "running");
    expect(
      allRunning,
      "analytics-sync has ONLY 'running' entries with zero completions — pipeline is stalled"
    ).toBe(false);
  });
});

// ─── GetLate Changelog Monitor Health ─────────────────────────
// DISABLED — missing SLACK_WEBHOOK_URL secret. Re-enable when secret is added.

describe("getlate-changelog-monitor health", () => {
  test("is disabled (missing SLACK_WEBHOOK_URL secret)", () => {
    const job = jobSettings.find((j) => j.job_name === "getlate-changelog-monitor");
    expect(job, "getlate-changelog-monitor should exist in cron_job_settings").toBeDefined();
    expect(job!.enabled, "getlate-changelog-monitor should be disabled until SLACK_WEBHOOK_URL is configured").toBe(false);
  });
});

// ─── Cron Escalation Health ──────────────────────────────────
// DISABLED — missing LINEAR_API_KEY secret. Re-enable when secret is added.

describe("cron-escalation pipeline health", () => {
  test("is disabled (missing LINEAR_API_KEY secret)", () => {
    const job = jobSettings.find((j) => j.job_name === "cron-escalation-every-30-min");
    expect(job, "cron-escalation should exist in cron_job_settings").toBeDefined();
    expect(job!.enabled, "cron-escalation should be disabled until LINEAR_API_KEY is configured").toBe(false);
  });
});

// ─── Dispatcher Routing Verification ────────────────────────

describe("Dispatcher routing", () => {
  test("all edge function jobs in cron_job_settings have job_type = edge_function", () => {
    const edgeFnJobs = jobSettings.filter(
      (j) => !["cron-watchdog", "cron-health-logs-cleanup", "inbox-resurface-snoozed"].includes(j.job_name)
    );

    for (const job of edgeFnJobs) {
      expect(
        (job as any).job_type,
        `${job.job_name} should have job_type = 'edge_function'`
      ).toBe("edge_function");
    }
  });

  test("SQL-type jobs are correctly tagged", () => {
    const sqlJobNames = ["cron-watchdog", "cron-health-logs-cleanup", "inbox-resurface-snoozed"];
    for (const name of sqlJobNames) {
      const job = jobSettings.find((j) => j.job_name === name);
      if (!job) continue; // registration test catches missing jobs
      expect(
        (job as any).job_type,
        `${name} should have job_type = 'sql'`
      ).toBe("sql");
    }
  });

  test("inbox-sync schedule is 15min (not 5min)", () => {
    const inboxJob = jobSettings.find((j) => j.job_name === "inbox-sync-every-15-min");
    expect(inboxJob, "inbox-sync-every-15-min should exist in cron_job_settings").toBeDefined();
    expect(inboxJob!.schedule).toBe("*/15 * * * *");
  });

  test("no inbox-sync-every-5-min job exists (superseded by 15-min)", () => {
    const oldJob = jobSettings.find((j) => j.job_name === "inbox-sync-every-5-min");
    expect(oldJob, "inbox-sync-every-5-min should not exist — it was renamed to inbox-sync-every-15-min").toBeUndefined();
  });
});

// ─── Cross-Job Health Summary ─────────────────────────────────

describe("Overall pipeline health", () => {
  test("no job has 100% error rate in recent entries", () => {
    const jobGroups: Record<string, CronLog[]> = {};
    for (const log of allLogs) {
      if (!jobGroups[log.job_name]) jobGroups[log.job_name] = [];
      jobGroups[log.job_name].push(log);
    }

    const failingJobs: string[] = [];
    for (const [name, logs] of Object.entries(jobGroups)) {
      if (logs.length >= 3 && logs.every((l) => l.status === "error")) {
        failingJobs.push(name);
      }
    }

    expect(
      failingJobs,
      `These jobs have 100% error rate: ${failingJobs.join(", ")}`
    ).toHaveLength(0);
  });

  test("cron_health_logs table is being written to (pipeline is alive)", () => {
    expect(
      allLogs.length,
      "cron_health_logs should have entries — if 0, the entire cron system may be down"
    ).toBeGreaterThan(0);

    // Most recent entry should be within 30 minutes
    const latestLog = allLogs[0];
    const ageMinutes = (Date.now() - new Date(latestLog.started_at).getTime()) / 60000;
    expect(
      ageMinutes,
      `Most recent cron log is ${ageMinutes.toFixed(0)} minutes old — should be < 30 minutes`
    ).toBeLessThan(30);
  });
});
