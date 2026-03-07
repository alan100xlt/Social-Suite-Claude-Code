# RSS Feeds and Automation

Social Suite can monitor your website's RSS feeds and automatically generate social media posts whenever a new article is published. This guide covers adding feeds, setting up automation rules, and understanding how the pipeline works.

---

## How It Works (Big Picture)

1. You add an RSS feed URL (e.g., your blog or news site).
2. Social Suite checks the feed every 5 minutes for new articles.
3. When a new article appears, an automation rule decides what to do: generate a post and publish it, save it as a draft, or send it for approval first.
4. The AI generates platform-optimized content using the article's title, description, and (optionally) full text.

<!-- screenshot: A flow diagram showing RSS Feed -> New Article Detected -> Automation Rule -> AI Generates Post -> Action (Publish / Draft / Approval) -->

---

## Adding an RSS Feed

1. Go to **Content** in the left sidebar.
2. Click the **Feeds** tab.
3. Click **Add Feed** in the top-right corner.
4. Fill in the dialog:
   - **Name** -- a friendly label (e.g., "Company Blog", "Press Releases").
   - **URL** -- the full RSS or Atom feed URL.
   - **Enable Scraping** -- turn this on if you want Social Suite to fetch the full article text (not just the RSS summary). This gives the AI more material to work with.
   - **Automation Rule** -- optionally link an existing automation rule, create a new one, or leave as "None" to manually compose posts from articles later.
5. Click **Add Feed**.

The feed starts polling immediately. New articles will appear within a few minutes.

<!-- screenshot: The Add Feed dialog showing Name, URL, Enable Scraping toggle, and Automation Rule dropdown -->

---

## Managing Feeds

### Feed Dashboard

The **Feeds** tab shows three summary stats at the top:

- **Active** -- number of feeds currently polling.
- **With Automation** -- feeds linked to an automation rule.
- **No Automation** -- feeds without a rule (articles must be used manually).

Below the stats, each feed is displayed as a card showing:

- **Feed name** and URL
- **Status badge** -- "Active" or "Paused"
- **Automation badge** -- the linked rule name, or "No automation"
- **Scraping badge** -- shown if full-text scraping is enabled
- **Polling interval** -- every 5 minutes
- **Last polled** -- how long ago the feed was last checked

<!-- screenshot: The feeds list showing multiple feed cards with status badges and automation labels -->

### Editing a Feed

1. Click the **pencil icon** on a feed card.
2. Update the name, URL, scraping toggle, or linked automation rule.
3. Click **Save Changes**.

### Pausing and Resuming a Feed

Use the **Active** toggle on the feed card to pause or resume polling. Paused feeds stop checking for new articles but are not deleted.

### Deleting a Feed

1. Click the **trash icon** on a feed card.
2. Confirm in the dialog. This permanently removes the feed and all its stored articles.

Note: Only users with **Owner** or **Admin** roles can add, edit, or delete feeds.

---

## Automation Rules

Automation rules tell Social Suite what to do when a new article arrives from a feed.

### Creating a Rule

You can create a rule in two ways:

- From the **Feeds** tab: when adding or editing a feed, choose "Create new rule" in the automation dropdown. This opens the rule wizard pre-linked to that feed.
- From the **Automations** tab: click **Create Rule** in the top-right corner.

The rule wizard has three steps:

#### Step 1: Content Source

Choose which RSS feed this rule applies to:
- **All feeds** -- the rule triggers for new articles from any feed in your company.
- **A specific feed** -- the rule only triggers for articles from the selected feed.

<!-- screenshot: Step 1 of the automation wizard showing the RSS Feed Filter dropdown -->

#### Step 2: Platforms and Objective

- **Post to Platforms** -- select which connected social accounts should receive the generated posts. You must select at least one platform (unless the action is "Save as draft").
- **Objective** -- tell the AI what the post should optimize for:
  - **AI Decides** -- the AI picks the best strategy for each article.
  - **Reach** -- maximize audience size.
  - **Engagement** -- drive likes, comments, and shares.
  - **Clicks** -- drive traffic to your site.

<!-- screenshot: Step 2 showing platform selection pills and objective cards -->

#### Step 3: Action and Delivery

Choose what happens after the AI generates the post:

| Action | What It Does |
|--------|-------------|
| **Publish immediately** | Post goes live as soon as it is generated |
| **Optimal time** | Schedule for peak engagement based on your data |
| **Send for approval** | Email reviewers before publishing |
| **Save as draft** | Save for manual review later |

If you choose **Send for approval**, add the email addresses of the reviewers. Team members are suggested automatically, and you (the rule creator) are included by default.

Finally, give the rule a **name**. A name is auto-generated based on your selections (e.g., "Auto-publish Facebook, Instagram posts from Company Blog"), but you can edit it.

Toggle **Active** to enable or disable the rule immediately.

Click **Create Rule** to save.

<!-- screenshot: Step 3 showing the action cards and the approval email input -->

### Viewing and Managing Rules

Go to **Content** > **Automations** tab to see all your rules in a searchable, sortable table:

| Column | Description |
|--------|-------------|
| **Name** | Rule name |
| **Status** | Active or Inactive |
| **Feed** | Linked feed name, or "All feeds" |
| **Action** | Auto-publish, Draft, or Approval |
| **Platforms** | Platform icons for selected accounts |
| **Objective** | The selected AI objective |

Use the **search bar** to filter rules by name, and the column headers to sort.

Each row has controls to:
- **Toggle active/inactive** with the switch
- **Edit** with the pencil icon
- **Delete** with the trash icon

<!-- screenshot: The Automations tab showing the AG Grid table with rule rows and action controls -->

### Editing a Rule

Click the **pencil icon** on a rule row. The same wizard opens with all fields pre-filled. Make your changes and click **Save Changes**.

### Deleting a Rule

Click the **trash icon**, then confirm. Deleting a rule stops future automation but does not affect posts that were already published.

---

## How the RSS-to-Post Pipeline Works

Here is what happens behind the scenes when everything is set up:

1. **Polling** -- Social Suite checks each active feed every 5 minutes. It uses smart caching (ETags and Last-Modified headers) to avoid unnecessary downloads.
2. **New article detected** -- any article not previously seen is saved with a "pending" status.
3. **Rule matching** -- the system checks if any active automation rule applies to this feed (or to all feeds).
4. **AI generation** -- the article's title, description, link, and (if scraping is enabled) full text are sent to the AI. The AI generates platform-specific post content based on your objective and brand voice settings.
5. **Action execution** -- depending on the rule's action:
   - **Publish**: the post is sent to the selected platforms immediately or at the optimal time.
   - **Draft**: the post is saved as a draft in your **Drafts** tab.
   - **Approval**: an email is sent to the reviewers with the post content and approve/reject buttons.

---

## Tips

- **Enable scraping for better AI output.** RSS summaries are often short. Scraping fetches the full article text, giving the AI much more to work with.
- **Start with "Send for approval" rules.** This lets you see what the AI generates before anything goes live. Once you trust the output, you can switch to auto-publish.
- **Use "AI Decides" for mixed-content feeds.** If your feed includes both news and opinion pieces, the AI can adapt the objective per article.
- **Link one rule per feed.** Each feed can have one linked rule. If you need different rules for different types of content, consider splitting your RSS source into separate feeds.
- **Check the Drafts tab for draft-action rules.** Posts from "Save as draft" rules appear in **Content** > **Drafts**, where you can review and publish them manually.

---

## FAQ

**Q: How often does Social Suite check my feeds?**
Every 5 minutes. This is automatic and cannot be changed.

**Q: What if the same article appears in two different feeds?**
Each feed tracks its own articles independently. If the same article URL appears in two feeds with active rules, two separate posts may be generated. To avoid duplicates, only add each feed URL once.

**Q: Can I create a rule without linking it to a specific feed?**
Yes. Set the content source to **All feeds** and the rule will trigger for new articles from any feed in your company.

**Q: What happens if I delete a feed that has a linked automation rule?**
The rule remains but becomes unlinked. It will not trigger until you link it to another feed or set it to "All feeds."

**Q: Can non-admin users create feeds or rules?**
No. Only users with **Owner** or **Admin** roles can add, edit, or delete feeds and automation rules. Other team members can view feeds and use articles in manual compose.

**Q: Where can I see what the automation posted?**
Published posts appear in the **Content** > **Compose** tab's post history, and their performance shows up in **Analytics**.
