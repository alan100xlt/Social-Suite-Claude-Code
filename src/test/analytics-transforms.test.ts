import { describe, it, expect } from "vitest";
import {
  buildKpiSparklines,
  buildAreaTrend,
  buildDonutData,
  buildHeatmapData,
  buildFunnelData,
  buildGaugeData,
  buildTreemapData,
  buildDecayBarData,
  buildFollowerTrend,
  computeChangePercent,
} from "@/lib/analytics/transforms";

const samplePdm = [
  { date: "2026-02-01", impressions: 100, reach: 80, views: 50, likes: 10, comments: 5, shares: 3, clicks: 20, postCount: 2, engagementRate: 3.5 },
  { date: "2026-02-02", impressions: 200, reach: 160, views: 120, likes: 25, comments: 10, shares: 5, clicks: 40, postCount: 3, engagementRate: 4.2 },
  { date: "2026-02-03", impressions: 150, reach: 110, views: 80, likes: 15, comments: 7, shares: 4, clicks: 30, postCount: 2, engagementRate: 3.8 },
];

describe("buildKpiSparklines", () => {
  it("extracts sparkline arrays keyed by metric", () => {
    const result = buildKpiSparklines(samplePdm);
    expect(result.views).toHaveLength(3);
    expect(result.views[0]).toEqual({ x: "2026-02-01", y: 50 });
    expect(result.impressions[1]).toEqual({ x: "2026-02-02", y: 200 });
    expect(result.clicks[2]).toEqual({ x: "2026-02-03", y: 30 });
    expect(result.engagement[0]).toEqual({ x: "2026-02-01", y: 3.5 });
  });

  it("returns empty arrays for empty input", () => {
    const result = buildKpiSparklines([]);
    expect(result.views).toEqual([]);
  });
});

describe("buildAreaTrend", () => {
  it("returns Nivo line format with views and engagement series", () => {
    const result = buildAreaTrend(samplePdm);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("views");
    expect(result[0].data[0]).toEqual({ x: "2026-02-01", y: 50 });
    expect(result[1].id).toBe("engagement");
    expect(result[1].data[0]).toEqual({ x: "2026-02-01", y: 3.5 });
  });
});

describe("buildDonutData", () => {
  const platforms = [
    { platform: "facebook" as const, followers: 3000, following: 0, postsCount: 10, impressions: 0, reach: 0, views: 0, likes: 0, comments: 0, shares: 0, clicks: 0, engagementRate: 0, totalEngagement: 0 },
    { platform: "instagram" as const, followers: 2000, following: 0, postsCount: 5, impressions: 0, reach: 0, views: 0, likes: 0, comments: 0, shares: 0, clicks: 0, engagementRate: 0, totalEngagement: 0 },
  ];

  it("maps platform data to donut format", () => {
    const result = buildDonutData(platforms);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("facebook");
    expect(result[0].value).toBe(3000);
    expect(result[0].label).toBe("Facebook");
  });
});

describe("buildHeatmapData", () => {
  const slots = [
    { day_of_week: 0, hour: 9, avg_engagement: 5.2, post_count: 10 },
    { day_of_week: 0, hour: 14, avg_engagement: 3.1, post_count: 8 },
    { day_of_week: 1, hour: 9, avg_engagement: 4.5, post_count: 12 },
  ];

  it("produces 7 rows with 24 columns each", () => {
    const result = buildHeatmapData(slots);
    expect(result).toHaveLength(7);
    expect(result[0].data).toHaveLength(24);
  });

  it("fills in known values", () => {
    const result = buildHeatmapData(slots);
    const sunRow = result[0];
    expect(sunRow.id).toBe("Sun");
    const hour9 = sunRow.data.find((d: { x: string }) => d.x === "9:00");
    expect(hour9?.y).toBe(5.2);
  });
});

describe("buildFunnelData", () => {
  it("builds funnel from totals", () => {
    const totals = { impressions: 10000, views: 5000, clicks: 2000, engagement: 800 };
    const result = buildFunnelData(totals);
    expect(result).toHaveLength(4);
    expect(result[0]).toEqual({ id: "Impressions", label: "Impressions", value: 10000 });
    expect(result[3]).toEqual({ id: "Engagement", label: "Engagement", value: 800 });
  });
});

describe("buildGaugeData", () => {
  const platforms = [
    { platform: "facebook" as const, engagementRate: 4.2, followers: 100, following: 0, postsCount: 0, impressions: 0, reach: 0, views: 0, likes: 0, comments: 0, shares: 0, clicks: 0, totalEngagement: 0 },
    { platform: "instagram" as const, engagementRate: 6.8, followers: 200, following: 0, postsCount: 0, impressions: 0, reach: 0, views: 0, likes: 0, comments: 0, shares: 0, clicks: 0, totalEngagement: 0 },
  ];

  it("maps to Nivo radial bar format with data array", () => {
    const result = buildGaugeData(platforms);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("Facebook");
    expect(result[0].data).toEqual([{ x: "rate", y: 4.2 }]);
  });
});

describe("buildTreemapData", () => {
  const platforms = [
    { platform: "facebook" as const, totalEngagement: 500, followers: 0, following: 0, postsCount: 0, impressions: 0, reach: 0, views: 0, likes: 0, comments: 0, shares: 0, clicks: 0, engagementRate: 0 },
    { platform: "instagram" as const, totalEngagement: 300, followers: 0, following: 0, postsCount: 0, impressions: 0, reach: 0, views: 0, likes: 0, comments: 0, shares: 0, clicks: 0, engagementRate: 0 },
  ];

  it("returns hierarchical Nivo treemap format", () => {
    const result = buildTreemapData(platforms);
    expect(result.name).toBe("platforms");
    expect(result.children).toHaveLength(2);
    expect(result.children[0].name).toBe("Facebook");
    expect(result.children[0].value).toBe(500);
  });
});

describe("buildDecayBarData", () => {
  const buckets = [
    { timeWindow: "1 hour", engagementPercentage: 85 },
    { timeWindow: "24 hours", engagementPercentage: 45 },
  ];

  it("maps decay buckets to bar data", () => {
    const result = buildDecayBarData(buckets);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ bucket: "1 hour", count: 85 });
  });
});

describe("buildFollowerTrend", () => {
  it("returns Nivo line format", () => {
    const data = [
      { date: "2026-02-01", followers: 100 },
      { date: "2026-02-02", followers: 120 },
    ];
    const result = buildFollowerTrend(data);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("followers");
    expect(result[0].data[0]).toEqual({ x: "2026-02-01", y: 100 });
  });
});

describe("computeChangePercent", () => {
  it("computes percentage change between first and last values", () => {
    const result = computeChangePercent(samplePdm);
    expect(result.views).toBeCloseTo(60, 0);
    expect(result.impressions).toBeCloseTo(50, 0);
  });

  it("returns 0 for single-item input", () => {
    const result = computeChangePercent([samplePdm[0]]);
    expect(result.views).toBe(0);
  });

  it("returns 0 for empty input", () => {
    const result = computeChangePercent([]);
    expect(result.views).toBe(0);
  });
});
