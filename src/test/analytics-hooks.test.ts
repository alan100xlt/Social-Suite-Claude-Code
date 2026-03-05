import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

// Unit test: verify the rewritten hooks no longer call getlate-analytics edge function,
// and that dead analytics hooks have been removed from useGetLateAnalytics.ts.

const hooksDir = path.resolve(__dirname, "../hooks");

const REWRITTEN_HOOKS = [
  "useBestTimeToPost.ts",
  "usePostingFrequency.ts",
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

  describe("usePostingFrequency.ts", () => {
    const source = fs.readFileSync(
      path.join(hooksDir, "usePostingFrequency.ts"),
      "utf-8"
    );

    it("calls get_posting_frequency_analysis RPC", () => {
      expect(source).toContain("get_posting_frequency_analysis");
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
