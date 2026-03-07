import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

// Unit test: verify the rewritten hooks no longer call getlate-analytics edge function.

const hooksDir = path.resolve(__dirname, "../hooks");

const REWRITTEN_HOOKS = [
  "useBestTimeToPost.ts",
  "useContentDecay.ts",
];

describe("Analytics hooks — no live GetLate API calls", () => {
  for (const hookFile of REWRITTEN_HOOKS) {
    describe(hookFile, () => {
      const filePath = path.join(hooksDir, hookFile);
      const source = fs.readFileSync(filePath, "utf-8");

      it("does NOT call getlate-analytics edge function", () => {
        expect(source).not.toContain("getlate-analytics");
      });

      it("does NOT call supabase.functions.invoke", () => {
        expect(source).not.toContain("functions.invoke");
      });
    });
  }

  describe("useBestTimeToPost.ts", () => {
    const source = fs.readFileSync(
      path.join(hooksDir, "useBestTimeToPost.ts"),
      "utf-8"
    );

    it("calls get_optimal_posting_windows RPC", () => {
      expect(source).toContain("get_optimal_posting_windows");
    });

    it("does not accept profileId parameter", () => {
      expect(source).not.toContain("profileId");
    });
  });

  describe("useContentDecay.ts", () => {
    const source = fs.readFileSync(
      path.join(hooksDir, "useContentDecay.ts"),
      "utf-8"
    );

    it("reads from content_decay_cache table", () => {
      expect(source).toContain("content_decay_cache");
    });

    it("does not accept accountId or postId parameters", () => {
      expect(source).not.toContain("accountId");
      expect(source).not.toContain("postId");
    });
  });
});

describe("Dead GetLate analytics hooks removed", () => {
  const source = fs.readFileSync(
    path.join(hooksDir, "useGetLateAnalytics.ts"),
    "utf-8"
  );

  const REMOVED_HOOKS = [
    "usePostAnalytics",
    "useBatchAnalytics",
    "useAnalyticsOverview",
    "usePostTimeline",
  ];

  for (const hookName of REMOVED_HOOKS) {
    it(`does not export ${hookName}`, () => {
      expect(source).not.toContain(`function ${hookName}`);
    });
  }

  it("still exports useDailyMetrics", () => {
    expect(source).toContain("function useDailyMetrics");
  });
});

describe("Deleted analytics hooks no longer exist", () => {
  const deletedHooks = [
    "useViewsByPublishDate.ts",
    "useHistoricalAnalytics.ts",
    "useDailyPlatformMetrics.ts",
    "useFollowersByPlatform.ts",
    "useMetric.ts",
  ];

  for (const hookFile of deletedHooks) {
    it(`${hookFile} does not exist`, () => {
      expect(fs.existsSync(path.join(hooksDir, hookFile))).toBe(false);
    });
  }
});

describe("New analytics hooks (SOC-217 + SOC-261)", () => {
  const newHooks = [
    { file: "usePostTimeline.ts", queryKey: "post-timeline" },
    { file: "useYouTubeDailyViews.ts", queryKey: "youtube-daily-views" },
    { file: "useFollowerStats.ts", queryKey: "follower-stats" },
    { file: "useAccountHealth.ts", queryKey: "account-health" },
  ];

  for (const { file, queryKey } of newHooks) {
    describe(file, () => {
      const filePath = path.join(hooksDir, file);

      it("exists", () => {
        expect(fs.existsSync(filePath)).toBe(true);
      });

      it(`uses '${queryKey}' query key`, () => {
        const source = fs.readFileSync(filePath, "utf-8");
        expect(source).toContain(`'${queryKey}'`);
      });

      it("uses useQuery", () => {
        const source = fs.readFileSync(filePath, "utf-8");
        expect(source).toContain("useQuery");
      });
    });
  }
});

describe("useSyncAnalytics invalidation keys (SOC-217)", () => {
  const syncSource = fs.readFileSync(
    path.join(hooksDir, "useSyncAnalytics.ts"),
    "utf-8"
  );

  const requiredKeys = [
    "account-growth",
    "aggregated-followers",
    "top-posts",
    "analytics-by-publish-date",
    "platform-breakdown",
    "content-decay",
    "analytics-stats",
    "last-sync-time",
    "all-posts-with-analytics",
    "best-time-to-post",
    "inactive-account-ids",
    "dashboard-trends",
    "post-timeline",
    "youtube-daily-views",
    "follower-stats",
    "account-health",
  ];

  for (const key of requiredKeys) {
    it(`invalidates '${key}'`, () => {
      expect(syncSource).toContain(`'${key}'`);
    });
  }

  it("has at least 16 invalidation calls", () => {
    const count = (syncSource.match(/invalidateQueries/g) || []).length;
    expect(count).toBeGreaterThanOrEqual(16);
  });
});
