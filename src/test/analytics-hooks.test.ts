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
    "usePostingFrequency.ts",
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
