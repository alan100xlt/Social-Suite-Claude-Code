name: inbox-debug
description: Diagnose inbox pipeline issues — stale syncs, webhook failures, message delivery gaps, and cron health problems. Use when the inbox isn't showing new messages, conversations are missing, or sync appears stuck.

---

# Inbox Debug Skill

Diagnose and fix issues in the inbox pipeline: sync → webhooks → edge functions → database → frontend.

## Diagnostic Steps

Run these checks in order. Each step narrows the problem.

### Step 1: Check Sync State

```sql
SELECT company_id, provider, last_synced_at, sync_cursor, error_count, last_error
FROM inbox_sync_state
WHERE last_synced_at < NOW() - INTERVAL '30 minutes'
ORDER BY last_synced_at ASC;
```

**If stale**: Sync hasn't run recently. Check cron health (Step 2).
**If error_count > 0**: Read `last_error` for API failures.

### Step 2: Check Cron Health

```sql
SELECT job_name, status, started_at, completed_at, error_message, metadata
FROM cron_health_logs
WHERE job_name LIKE 'inbox-sync%'
ORDER BY started_at DESC
LIMIT 10;
```

**If missing entries**: `cron-dispatcher` may not be firing. Check `pg_cron` jobs.
**If status = 'failed'**: Read `error_message` for root cause.
**If status = 'running' for > 5 min**: Stuck job. Run cleanup via `webhook-admin` edge function.

### Step 3: Check Webhook Events

```sql
SELECT event_type, provider, status, created_at, error_message, payload->>'profileId' as profile_id
FROM webhook_event_log
WHERE provider = 'getlate'
ORDER BY created_at DESC
LIMIT 20;
```

**If no events**: Webhooks may not be registered or the endpoint is down.
**If status = 'failed'**: HMAC verification or processing error.

### Step 4: Check Conversation Counts

```sql
SELECT c.company_id, comp.name, COUNT(*) as conv_count,
       COUNT(*) FILTER (WHERE c.last_message_at > NOW() - INTERVAL '24 hours') as recent_count
FROM inbox_conversations c
JOIN companies comp ON comp.id = c.company_id
GROUP BY c.company_id, comp.name
ORDER BY conv_count DESC;
```

Compare against GetLate API:
```
GET /inbox/conversations?profileId={PROFILE_ID}&limit=1
```
Check `total` field in response vs database count.

### Step 5: Check Message Delivery

```sql
SELECT ic.id, ic.contact->'display_name' as contact,
       ic.message_count,
       (SELECT COUNT(*) FROM inbox_messages im WHERE im.conversation_id = ic.id) as actual_messages,
       ic.last_message_at
FROM inbox_conversations ic
WHERE ic.company_id = '{COMPANY_ID}'
ORDER BY ic.last_message_at DESC
LIMIT 10;
```

**If message_count != actual_messages**: Sync gap. Messages exist in API but not in database.

### Step 6: Verify Webhook HMAC

```sql
SELECT id, provider, webhook_url, hmac_secret IS NOT NULL as has_hmac
FROM webhook_registrations
WHERE provider = 'getlate';
```

**If has_hmac = false**: HMAC secret missing. Webhook events will fail verification.
**If multiple rows**: Should be exactly 1 row with `company_id = NULL` (account-level webhook).

### Step 7: Edge Function Health

Deploy a health check:
```bash
npx supabase functions invoke inbox-sync --body '{"healthCheck": true}'
npx supabase functions invoke getlate-inbox --body '{"action": "health"}'
npx supabase functions invoke getlate-webhook --body '{"test": true}'
```

## Common Issues & Fixes

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| No new conversations | Sync stale or API key expired | Check sync_state, verify GetLate API key |
| Conversations but no messages | Message sync failing silently | Check inbox-sync logs for per-conversation errors |
| Webhook events but no updates | HMAC verification failing | Re-register webhook with correct secret |
| Duplicate conversations | Missing ON CONFLICT in upsert | Check sync function for proper conflict resolution |
| Reply fails | Wrong accountId or field name | Verify metadata.accountId cached during sync |
| Stuck "running" cron | Edge function timeout without cleanup | Run webhook-admin cleanup-stuck-cron action |

## Output

After running diagnostics, produce a report:

```
# Inbox Pipeline Health Report

## Status: HEALTHY | DEGRADED | DOWN

### Findings
1. [CRITICAL/HIGH/MEDIUM] Description + specific fix

### Recommended Actions
1. First action to take
2. Second action to take
```
