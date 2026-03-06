# Slack Interactive Q&A + Completion Summaries

**Date:** 2026-03-03
**Status:** Approved

## Requirements

1. **Interactive Q&A via Slack buttons** — When Claude has a blocking question with options, post to Slack with one button per option. Support multi-question flows (one at a time). Both IDE and Slack show the question; first answer wins.

2. **Completion summaries** — Plain English summary posted after significant tasks and at session end. User can reply with follow-ups and Claude acts on them. @mention user when action needed.

## @mention Rules

- @mention when: questions with buttons, follow-up prompt after summary, anything blocking
- No @mention when: session start (informational), auto-approvals, pure status updates

## Approach

State-file bridge pattern (existing architecture). Extend state schema for multi-question flows. 1s polling via check-answer.js.

## Files Changed

| File | Change |
|------|--------|
| `.env.local` + `scripts/slack-agent/.env` | Add `SLACK_USER_ID=U08LRH6DEBT` |
| `intercept-question.js` | Buttons per option, multi-question sequencing, @mention |
| `slack-listener.js` | Handle option button clicks, advance questions, "Other" via thread |
| `state.js` | Extended state schema for `ask_multi` with questions array |
| `resolve-question.js` | Handle multi-question state cleanup |
| `notify.js` | Add `summary` event with @mention + follow-up polling |
| `notify-session-stop.js` | Plain English summary with @mention |
| `check-answer.js` | **New** — polls state for answers, returns to stdout |

## State Schema (ask_multi)

```json
{
  "status": "waiting_reply",
  "event": "ask_multi",
  "questions": [
    { "question": "Which library?", "options": ["A", "B"], "answer": null },
    { "question": "Which approach?", "options": ["X", "Y"], "answer": null }
  ],
  "current_question_index": 0,
  "thread_ts": "...",
  "message_ts_list": []
}
```
