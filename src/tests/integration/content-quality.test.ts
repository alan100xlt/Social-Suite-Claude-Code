import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  adminClient,
  createTestUser,
  deleteTestUser,
  createTestCompany,
  deleteTestCompany,
} from "./setup";

/**
 * Content Quality Integration Tests
 *
 * Tests the content metadata tables, evergreen queue, and
 * feature configuration for the content overhaul.
 */

let testUser: { id: string; email: string };
let testCompanyId: string;

beforeAll(async () => {
  testUser = await createTestUser("content-quality");
  testCompanyId = await createTestCompany("Content Quality Test Co", testUser.id);
});

afterAll(async () => {
  await adminClient.from("evergreen_queue").delete().eq("company_id", testCompanyId);
  await adminClient.from("company_feature_config").delete().eq("company_id", testCompanyId);
  await deleteTestCompany(testCompanyId);
  await deleteTestUser(testUser.id);
});

describe("evergreen_queue table", () => {
  let itemId: string;

  it("can insert an evergreen queue item", async () => {
    const { data, error } = await adminClient
      .from("evergreen_queue")
      .insert({
        company_id: testCompanyId,
        variation_text: "Check out this timeless article about best practices!",
        status: "pending",
      })
      .select("id")
      .single();

    expect(error).toBeNull();
    expect(data!.id).toBeDefined();
    itemId = data!.id;
  });

  it("can query evergreen queue items by company", async () => {
    const { data, error } = await adminClient
      .from("evergreen_queue")
      .select("*")
      .eq("company_id", testCompanyId);

    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThanOrEqual(1);
  });

  it("can update status to published", async () => {
    const { error } = await adminClient
      .from("evergreen_queue")
      .update({ status: "published", published_at: new Date().toISOString() })
      .eq("id", itemId);

    expect(error).toBeNull();
  });

  it("can update status to skipped", async () => {
    // Insert another item first
    const { data: newItem } = await adminClient
      .from("evergreen_queue")
      .insert({
        company_id: testCompanyId,
        variation_text: "Another evergreen variation",
        status: "pending",
      })
      .select("id")
      .single();

    const { error } = await adminClient
      .from("evergreen_queue")
      .update({ status: "skipped" })
      .eq("id", newItem!.id);

    expect(error).toBeNull();
  });
});

describe("company_feature_config defaults", () => {
  it("can insert full feature config", async () => {
    const config = {
      evergreen_recycling: { enabled: true, schedule: "weekly", auto_publish: false },
      breaking_news: { enabled: true },
      quality_checker: { enabled: true, block_on_publish: true },
      performance_alerts: { enabled: true, viral_threshold: 3.0, underperform_threshold: 0.3 },
      posting_throttle: { enabled: true, max_posts: 5, per_hours: 4 },
      media_library: { enabled: false, imagekit_url_endpoint: null },
      brand_voice_learning: { enabled: false },
    };

    const { error } = await adminClient.from("company_feature_config").upsert({
      company_id: testCompanyId,
      config,
    });

    expect(error).toBeNull();
  });

  it("config round-trips correctly", async () => {
    const { data, error } = await adminClient
      .from("company_feature_config")
      .select("config")
      .eq("company_id", testCompanyId)
      .single();

    expect(error).toBeNull();
    const config = data!.config as any;
    expect(config.evergreen_recycling.enabled).toBe(true);
    expect(config.quality_checker.block_on_publish).toBe(true);
    expect(config.posting_throttle.max_posts).toBe(5);
    expect(config.performance_alerts.viral_threshold).toBe(3.0);
  });
});

describe("new schema columns", () => {
  it("rss_feed_items has byline column", async () => {
    // Query the column — if it doesn't exist, this will error
    const { error } = await adminClient
      .from("rss_feed_items")
      .select("byline")
      .limit(1);

    expect(error).toBeNull();
  });

  it("rss_feed_items has journalist_id column", async () => {
    const { error } = await adminClient
      .from("rss_feed_items")
      .select("journalist_id")
      .limit(1);

    expect(error).toBeNull();
  });

  it("rss_feed_items has content_classification column", async () => {
    const { error } = await adminClient
      .from("rss_feed_items")
      .select("content_classification")
      .limit(1);

    expect(error).toBeNull();
  });

  it("rss_feed_items has last_recycled_at column", async () => {
    const { error } = await adminClient
      .from("rss_feed_items")
      .select("last_recycled_at")
      .limit(1);

    expect(error).toBeNull();
  });
});
