import { describe, test, expect, beforeAll, afterAll } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import {
  adminClient,
  createTestUser,
  deleteTestUser,
  createTestCompany,
  deleteTestCompany,
  addMembership,
  signInAsUser,
} from "./setup";

/**
 * Content Workflow RLS + Schema Tests
 *
 * L2: Insert/read new workflow columns, verify RLS isolation
 * L0: Migration SQL structural assertions
 */

let userA: { id: string; email: string };
let userB: { id: string; email: string };
let companyA: string;
let companyB: string;
let draftIdA: string | null = null;
let draftIdB: string | null = null;
let activityIdB: string | null = null;

beforeAll(async () => {
  userA = await createTestUser("content-wf-a");
  userB = await createTestUser("content-wf-b");
  companyA = await createTestCompany("Content WF Co A", userA.id);
  companyB = await createTestCompany("Content WF Co B", userB.id);
  await addMembership(userA.id, companyA, "owner");
  await addMembership(userB.id, companyB, "owner");

  // Seed draft in Company A with new workflow columns
  const { data: draftA } = await adminClient
    .from("post_drafts")
    .insert({
      company_id: companyA,
      created_by: userA.id,
      status: "awaiting_approval",
      assigned_to: userA.id,
      reviewer_id: userA.id,
      due_at: new Date().toISOString(),
      title: "Content Workflow Test Draft A",
    })
    .select("id")
    .single();
  draftIdA = draftA?.id ?? null;

  // Seed draft in Company B with approval columns
  const { data: draftB } = await adminClient
    .from("post_drafts")
    .insert({
      company_id: companyB,
      created_by: userB.id,
      status: "approved",
      assigned_to: userB.id,
      reviewer_id: userB.id,
      rejection_reason: null,
      approved_at: new Date().toISOString(),
      approved_by: userB.id,
      title: "Content Workflow Test Draft B",
    })
    .select("id")
    .single();
  draftIdB = draftB?.id ?? null;

  // Seed activity log entry with entity_type='content' in Company B
  const { data: activity } = await adminClient
    .from("inbox_activity_log")
    .insert({
      company_id: companyB,
      user_id: userB.id,
      action: "status_changed",
      entity_type: "content",
      entity_id: draftIdB,
      metadata: { user_name: "Test User B", new_status: "approved" },
    })
    .select("id")
    .single();
  activityIdB = activity?.id ?? null;
}, 30000);

afterAll(async () => {
  if (activityIdB) {
    await adminClient.from("inbox_activity_log").delete().eq("id", activityIdB);
  }
  if (draftIdA) {
    await adminClient.from("post_drafts").delete().eq("id", draftIdA);
  }
  if (draftIdB) {
    await adminClient.from("post_drafts").delete().eq("id", draftIdB);
  }
  await deleteTestCompany(companyA);
  await deleteTestCompany(companyB);
  await deleteTestUser(userA.id);
  await deleteTestUser(userB.id);
}, 30000);

describe("L2: post_drafts workflow columns", () => {
  test("insert and read back new workflow columns", async () => {
    const { client } = await signInAsUser(userA.email);
    const { data, error } = await client
      .from("post_drafts")
      .select("id, assigned_to, reviewer_id, due_at, status")
      .eq("id", draftIdA!);

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data![0].assigned_to).toBe(userA.id);
    expect(data![0].reviewer_id).toBe(userA.id);
    expect(data![0].due_at).toBeTruthy();
    expect(data![0].status).toBe("awaiting_approval");
  });

  test("read back approval columns (approved_at, approved_by)", async () => {
    const { client } = await signInAsUser(userB.email);
    const { data, error } = await client
      .from("post_drafts")
      .select("id, approved_at, approved_by, rejection_reason, status")
      .eq("id", draftIdB!);

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data![0].approved_at).toBeTruthy();
    expect(data![0].approved_by).toBe(userB.id);
    expect(data![0].rejection_reason).toBeNull();
    expect(data![0].status).toBe("approved");
  });

  test("User A CANNOT read Company B's drafts", async () => {
    const { client } = await signInAsUser(userA.email);
    const { data, error } = await client
      .from("post_drafts")
      .select("id")
      .eq("company_id", companyB);

    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });
});

describe("L2: inbox_activity_log entity_type='content'", () => {
  test("content activity log entry is readable by Company B user", async () => {
    const { client } = await signInAsUser(userB.email);
    const { data, error } = await client
      .from("inbox_activity_log")
      .select("id, entity_type, entity_id, action")
      .eq("id", activityIdB!);

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data![0].entity_type).toBe("content");
    expect(data![0].entity_id).toBe(draftIdB);
  });

  test("User A CANNOT read Company B's content activity", async () => {
    const { client } = await signInAsUser(userA.email);
    const { data, error } = await client
      .from("inbox_activity_log")
      .select("id")
      .eq("entity_type", "content")
      .eq("company_id", companyB);

    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });
});

describe("L0: Migration SQL structural assertions", () => {
  const migrationPath = join(
    __dirname,
    "../../../supabase/migrations/20260308070000_content_workflow.sql"
  );
  let sql: string;

  beforeAll(() => {
    sql = readFileSync(migrationPath, "utf-8");
  });

  test("contains ALTER TABLE post_drafts", () => {
    expect(sql).toContain("ALTER TABLE public.post_drafts");
  });

  test("adds workflow columns", () => {
    expect(sql).toContain("ADD COLUMN IF NOT EXISTS assigned_to");
    expect(sql).toContain("ADD COLUMN IF NOT EXISTS reviewer_id");
    expect(sql).toContain("ADD COLUMN IF NOT EXISTS due_at");
    expect(sql).toContain("ADD COLUMN IF NOT EXISTS rejection_reason");
    expect(sql).toContain("ADD COLUMN IF NOT EXISTS approved_at");
    expect(sql).toContain("ADD COLUMN IF NOT EXISTS approved_by");
  });

  test("adds entity_type and entity_id to inbox_activity_log", () => {
    expect(sql).toContain("ALTER TABLE public.inbox_activity_log");
    expect(sql).toContain("ADD COLUMN IF NOT EXISTS entity_type");
    expect(sql).toContain("ADD COLUMN IF NOT EXISTS entity_id");
  });

  test("creates indexes", () => {
    expect(sql).toContain("idx_post_drafts_assigned_to");
    expect(sql).toContain("idx_post_drafts_status");
    expect(sql).toContain("idx_activity_log_entity");
  });

  test("seeds notification preferences for content events", () => {
    expect(sql).toContain("content_submitted");
    expect(sql).toContain("content_approved");
    expect(sql).toContain("content_rejected");
    expect(sql).toContain("content_published");
  });
});
