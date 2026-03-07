# Inbox AI Features

Social Suite uses AI to help you manage your inbox faster and smarter. Every conversation is automatically analyzed for sentiment, category, and language -- and the AI drafts reply suggestions so you can respond in seconds instead of minutes.

<!-- screenshot: The AI Draft panel in the inbox showing a recommended reply, alternative tone options, and the Summarize button -->

---

## AI-powered reply suggestions

When you select a conversation, the **AI Draft** panel appears between the message thread and the reply composer. The AI reads the conversation context and generates a recommended reply automatically.

### How it works

1. **Select a conversation** in the inbox.
2. The AI Draft panel loads with a spinning indicator ("Drafting a reply...").
3. Within a few seconds, the **recommended reply** is generated and automatically inserted into the composer.
4. Review the draft, edit it if needed, and click **Send**.

You are always in control -- the AI never sends a reply on its own. Every suggestion is a draft that you can edit or discard before sending.

<!-- screenshot: The AI Draft panel showing "Drafting a reply..." with a loading spinner -->

### Alternative tones

After the recommended reply loads, **tone chips** appear below the panel header. These let you quickly switch between different reply styles:

- The currently active tone is highlighted (e.g., "Professional").
- Click an alternative (e.g., "Friendly", "Concise", "Empathetic") to replace the composer text with that version.

The available tones change based on the conversation context -- the AI picks the most appropriate options.

<!-- screenshot: The tone chips row showing "Professional" selected and "Friendly" and "Concise" as alternatives -->

### Regenerating a suggestion

If none of the options feel right, click **Regenerate** in the AI Draft panel header. The AI creates a fresh set of suggestions based on the same conversation.

### Canned reply fusion

When the AI finds a relevant canned reply in your saved library, it blends the canned reply with the conversation context. A small "from canned reply" label appears so you know where the draft originated.

---

## Thread summarization

For long conversations with many messages, click the **Summarize** button in the AI Draft panel header. The AI condenses the entire thread into a short paragraph that captures the key points, saving you from scrolling through dozens of messages.

The summary appears in a card above the tone chips and stays visible until you navigate away.

<!-- screenshot: A thread summary card reading "The customer reported a billing issue on March 2. Support confirmed the charge was a duplicate and initiated a refund. The customer is waiting for confirmation." -->

---

## Automatic classification

Every incoming conversation is classified by the AI into a **category** and **subcategory**. The classification badge appears in the AI Draft panel header and in the conversation list.

### Categories

| Category | What it means | Example |
|----------|---------------|---------|
| **Editorial** | Related to news, stories, or editorial content | News tips, story ideas, source offers, correction requests |
| **Business** | Commercial inquiries | Advertising, PR pitches, partnership proposals, event invitations |
| **Support** | Customer or reader issues | Subscription access, technical problems, general questions |
| **Community** | Audience engagement | Positive comments, discussions, user-generated content |
| **Noise** | Low-value messages | Spam, trolling, off-topic chatter |

### Signal score

Alongside the category, the AI assigns an **editorial value score** (displayed as a signal badge). Higher scores indicate conversations more likely to be relevant to your editorial or business goals. Use this to prioritize which conversations to tackle first.

### Language detection

If the conversation is not in English, a **language badge** appears next to the classification (e.g., "ES" for Spanish, "FR" for French). This works together with the translation features described below.

<!-- screenshot: The classification row showing an "Editorial" badge, a signal score badge, and an "ES" language badge -->

---

## Sentiment analysis

The AI evaluates the emotional tone of each conversation and tags it as:

- **Positive** (green) -- compliments, praise, satisfied feedback
- **Neutral** (gray) -- informational, questions, general discussion
- **Negative** (red) -- complaints, frustration, urgent issues

Sentiment badges appear on each conversation in the list view and can be used as a filter (click **Sentiment** in the filter bar to show only negative conversations, for example).

<!-- screenshot: The conversation list with colored sentiment badges (green, gray, red) next to different conversations -->

---

## Translation

Social Suite can translate messages and your replies between languages.

### Translating your reply

If the AI detects that a conversation is in a non-English language, a **translate button** (globe icon) appears in the reply composer. Write your reply in your preferred language, then click the translate button to convert it into the contact's language before sending.

### How translation is triggered

Translation uses the **detected language** of the conversation. If the conversation is tagged as Spanish ("ES"), clicking translate converts your English draft into Spanish.

---

## Crisis detection and alerts

The AI monitors incoming messages for sudden spikes in negative sentiment. When the volume of negative messages exceeds a threshold within a time window, a **Crisis Alert Banner** appears at the top of the inbox.

### Alert levels

| Level | Banner color | What it means |
|-------|-------------|---------------|
| **Warning** | Yellow | A moderate spike in negative sentiment. Investigate soon. |
| **Critical** | Red | A severe spike -- immediate attention recommended. |

### What the banner shows

- **Summary** of the situation (e.g., "12 negative messages in 30 minutes")
- **Topics** mentioned across the flagged conversations
- **Resolve** button to mark the crisis as handled
- **Dismiss** button to close the alert

### Configuring crisis detection

Admins can adjust crisis detection settings:

- **Enable/disable** crisis detection entirely
- **Threshold** -- the number of negative messages that triggers an alert
- **Window** -- the time period (in minutes) to monitor

These settings are found in the AI settings for your company (managed by your admin).

<!-- screenshot: A yellow warning banner reading "Sentiment Warning: 5 negative messages in 30min. Topics: delivery, refund" -->

---

## Automation rules

Automation rules let the AI (or your canned replies) respond to messages automatically based on triggers you define.

### Creating a rule

1. Navigate to the **Automation Rules** section (available to Admins and Owners).
2. Click **New Rule**.
3. Fill in the form:
   - **Rule Name** -- a descriptive name (e.g., "Auto-reply to pricing questions")
   - **Trigger Type** -- choose how the rule matches messages:
     - **Keyword match** -- fires when a message contains specific words (comma-separated)
     - **Regex pattern** -- fires when a message matches a regular expression
     - **Sentiment** -- fires when a message has a specific sentiment (positive, negative, neutral)
     - **All new messages** -- fires on every new message
   - **Action Type** -- what happens when the trigger fires:
     - **Canned Reply** -- sends one of your saved canned replies
     - **AI Response** -- generates a reply using an AI prompt template you provide
   - **Platform filter** -- optionally limit the rule to a specific platform
   - **Conversation type** -- optionally limit to Comments, DMs, Reviews, or Mentions
4. Click **Create Rule**.

### Managing rules

Each rule appears as a row with a **toggle switch** to enable/disable it, the trigger type and action type as badges, and a **delete** button.

Disabled rules are kept in the list but do not fire -- toggle them back on anytime.

<!-- screenshot: The Automation Rules panel showing two rules -- one enabled (keyword match, canned reply) and one disabled (sentiment, AI response) -->

---

## Correcting AI classifications (feedback loop)

If the AI gets a classification wrong, you can flag it for correction.

1. Open the conversation.
2. Click the **Flag Correction** button in the conversation header.
3. A **Correction Request** card appears in the detail panel showing the current status (Open, In Progress, Resolved, or Rejected).
4. Add notes about what was wrong.
5. When the correction is addressed, click **Resolve** and add a resolution summary.

These corrections feed back into the AI's learning, improving future classifications for your organization.

<!-- screenshot: The Correction Request card in the detail panel with status "Open" and Start Working / Reject buttons -->

---

## AI settings overview

Your admin can configure several AI behaviors per company:

| Setting | What it controls |
|---------|-----------------|
| **Auto-classify** | Automatically classify new conversations by category, sentiment, and language |
| **Smart acknowledgment** | (When enabled) Automatically acknowledge new messages with a brief response |
| **Crisis detection** | Monitor for negative sentiment spikes and show alert banners |
| **Auto-translate** | (When enabled) Automatically translate incoming messages |
| **Content recycling** | (When enabled) Suggest ways to recycle popular inbox conversations into new social content |

---

## Tips

- **Review AI drafts before sending.** The AI provides a strong starting point, but a quick personal touch makes replies feel more authentic.
- **Use tone alternatives** when the recommended reply feels too formal or too casual for the situation.
- **Summarize long threads** before replying -- it helps you avoid rehashing points already addressed.
- **Set up automation rules for FAQs.** If you get the same question repeatedly, create a keyword-triggered canned reply to handle it instantly.
- **Correct misclassifications.** The more feedback you provide, the more accurate the AI becomes for your specific audience.
- **Watch crisis alerts.** A quick response to a sentiment spike can prevent a small issue from becoming a PR problem.

---

## FAQ

**Does the AI send replies automatically?**
No. AI-suggested replies are inserted into your composer as drafts. You always review and click **Send** yourself. The only exception is if you set up an Automation Rule with an auto-response action -- those fire automatically when a trigger matches.

**Can I turn off AI features?**
Yes. Your admin can disable individual AI features (auto-classify, crisis detection, etc.) in the AI settings. The inbox still works without AI -- you just will not see classifications, suggestions, or crisis alerts.

**What languages does translation support?**
Translation supports all major languages. The AI auto-detects the conversation language and translates between it and your preferred language.

**How accurate is sentiment analysis?**
Sentiment analysis works well for clear positive or negative messages. Sarcasm, mixed sentiments, and very short messages may occasionally be misclassified. Use the correction feedback loop to improve accuracy over time.

**Is my data used to train the AI?**
Your conversation data is processed to generate suggestions and classifications for your organization only. It is not used to train general-purpose AI models.

**What happens if I regenerate a reply suggestion?**
The previous suggestion is discarded and a new one is generated from scratch. The new suggestion may have a different tone and content.
