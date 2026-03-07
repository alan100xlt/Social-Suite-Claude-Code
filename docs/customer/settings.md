# Settings

The **Settings** page is where you manage your personal account, company details, brand voice, notification preferences, and OG image configuration. Open it from **Settings** in the left sidebar.

Settings are organized into tabs. The tabs you see depend on your role -- Owners and Admins see all tabs, while Members see only **Profile** and **Notifications**.

<!-- screenshot: The Settings page showing the tab bar with Profile, Company, Voice, OG Images, and Notifications tabs -->

---

## Profile

The **Profile** tab manages your personal account details and preferences.

### Personal Information

- **Full Name** -- your display name across the platform. Other team members see this in mentions, assignments, and activity logs.
- **Email** -- the email address linked to your account. This field is read-only; contact support to change it.

Click **Save Changes** after editing your name.

<!-- screenshot: The Profile card showing the Full Name and Email fields with the Save Changes button -->

### Changing Your Password

1. Scroll down to the **Security** section.
2. Enter your new password in the **New Password** field (minimum 6 characters).
3. Re-enter it in the **Confirm Password** field.
4. Click **Update Password**.

You will see a confirmation message when the change is successful.

### Appearance

Toggle **Compact Mode** on or off to use a more condensed layout throughout the app.

---

## Company

The **Company** tab is available to Owners and Admins. It covers your company information, brand identity, and team management.

### Company Information

- **Company Name** -- click **Edit** to change it, then confirm with the checkmark button.
- **URL Slug** -- your company's unique identifier in URLs (e.g., `longtale.ai/your-slug`). This is set during onboarding and displayed here for reference.

<!-- screenshot: The Company Information card showing the company name with the Edit button and the URL slug -->

### Media Company Association

If your company belongs to a larger media company group, you will see the parent media company name and relationship type here. Click **View** to go to the media company dashboard.

### Brand Identity

The Brand Identity section stores your visual brand data. Click **Edit** to update:

- **Logo** -- paste a URL to your company logo image.
- **Brand Colors** -- enter your brand color hex codes separated by commas (e.g., `#667eea, #764ba2`). Colors are displayed as swatches.
- **Description** -- a short description of your brand for reference.
- **Location** -- your company's city and country.
- **Website** -- your company URL. This is displayed as a clickable link.

Click **Save Branding** when you are done.

<!-- screenshot: The Brand Identity card showing the logo preview, color swatches, description, and website fields -->

### Team Members

This section lists everyone who has access to your company. Each member shows their name, email, avatar, and role badge:

- **Owner** -- full access, including billing and company deletion.
- **Admin** -- can manage settings, approve content, and invite members.
- **Member** -- can create content and participate in conversations.

#### Inviting New Team Members

1. Click the **Invite** button in the Team Members section header.
2. Enter the person's email address.
3. Choose their role (Admin or Member).
4. Click **Send Invitation**.

The invitee receives an email with a link to join your company. Pending invitations are listed below the team members grid.

<!-- screenshot: The Invite User dialog showing the email field, role selector, and Send Invitation button -->

---

## Brand Voice (Voice V1)

The **Voice V1** tab controls how Social Suite's AI generates content for your brand. This is the original voice settings interface.

### AI Autonomy

Choose how much freedom the AI has when generating posts:

| Mode | Description |
|------|------------|
| **Default** | Uses system defaults. No customization needed. |
| **Custom** | AI follows your settings exactly. |
| **Dynamic AI** | AI may adjust settings if it is 60%+ confident the change improves results. |
| **Strict AI** | AI adjusts only with 90%+ confidence. |
| **AI Decides** | Full autonomy -- the AI picks the best approach for each article. |

When using any AI mode (Dynamic, Strict, or AI Decides), you can enable **Require review before publishing** to ensure AI-modified posts become drafts for your approval instead of publishing automatically.

<!-- screenshot: The AI Autonomy section showing the five mode pill buttons with Dynamic AI selected -->

### Tone

Pick the overall personality of your generated content:

- **Professional (The Anchor)** -- balanced, authoritative
- **Friendly (The Neighbor)** -- warm, conversational
- **Urgent (The Town Crier)** -- attention-grabbing, breaking news
- **Engaging (The Instigator)** -- sparks conversation and debate

### Content Length

Control how long generated posts are:

- **Headline Only** -- short form, fits platform character limits
- **Bullet List** -- scannable key points
- **Standard Summary** -- medium-form paragraph
- **Full Post** -- extended form for platforms like LinkedIn

### Emoji Style

- **No Emojis** -- strict, no emojis at all
- **Minimalist** -- functional cues only
- **Smart / Contextual** -- AI picks emojis that match the topic
- **Heavy** -- frequent emojis for maximum engagement

### Hashtag Strategy

- **None** -- no hashtags
- **Smart Tags** -- AI generates relevant hashtags
- **Brand Tags Only** -- only your pre-defined hashtags (enter them in the field that appears)
- **Smart + Brand Tags** -- AI-generated tags plus your brand tags

When you select **Brand Tags Only** or **Smart + Brand Tags**, a text field appears where you can enter your brand hashtags separated by commas (e.g., `#YourBrand, #AlwaysInclude`).

Toggle **Extract locations** to have the AI automatically add location-based hashtags when relevant.

### Custom Instructions

Add any free-text guidance for the AI, such as "Always mention our website URL" or "Avoid political topics." This field appears when you are in Custom, Dynamic AI, or Strict AI mode.

Click **Save Settings** when you are done.

<!-- screenshot: The Brand Voice settings showing the tone selector grid, content length dropdown, and hashtag strategy options -->

### Content Playground

Below the settings, the **Content Playground** lets you test your voice settings on real articles from your feeds. Generate a sample post to see how your settings affect the output before saving.

---

## Brand Voice (Voice V2)

The **Voice V2** tab is an enhanced version of the voice settings with a more visual interface and a live preview playground. It includes the same settings as V1 (AI autonomy, tone, content length, emoji style, hashtags, and custom instructions) but with a different layout:

- Tone options show icons and descriptions side by side
- Length options include platform-specific recommendations
- The playground lets you pick a specific article and platform to preview generated content

Use whichever version you prefer -- both save to the same underlying settings.

---

## OG Images

The **OG Images** tab controls how Social Suite generates Open Graph preview images for your posts. These are the images that appear when someone shares a link on social media.

### Content Layers

Toggle which elements appear on your OG images:

- **Title** -- the article headline
- **Description** -- a subtitle or summary
- **Author** -- the writer byline
- **Date** -- publication date
- **Logo** -- your company logo
- **Category Tag** -- an article category badge
- **Source Name** -- the feed or publication name

### Brand and Typography

- **Brand Color / Secondary Color** -- your primary and secondary brand colors for image accents and gradients.
- **Body Font** -- choose between Inter (sans-serif), Source Serif 4, or JetBrains Mono.
- **Title Font** -- optionally use a different font for titles, or keep it the same as the body font.
- **Logo URLs** -- provide separate logo images for light and dark backgrounds.

### Template Library

Browse and manage OG image templates organized by category: Photo, Gradient, News, Stats, Editorial, and Brand. You can:

- **Search** templates by name or category.
- **Switch between grid and list view** using the toggle in the top right.
- **Enable or disable templates** by clicking on them. Disabled templates will not be used by the AI or shown in the template picker.

The count next to each category shows how many templates are enabled versus total.

<!-- screenshot: The OG Images template library in grid view showing template preview cards with enabled/disabled indicators -->

---

## Notifications

The **Notifications** tab lets you choose which events trigger notifications and how you receive them.

For each event type, you can independently toggle:

- **In-App** -- notifications appear in the bell icon dropdown within Social Suite.
- **Email** -- notifications are sent to your account email address.

Available event types:

| Event | When it triggers |
|-------|-----------------|
| **Assignment** | A draft or conversation is assigned to you |
| **@Mention** | Someone mentions you in an internal note |
| **Reply** | Someone replies to a conversation you follow |
| **Status change** | A post's approval status changes |
| **Correction** | A correction is requested on your content |
| **Escalation** | A conversation is escalated to you |
| **SLA breach** | A response time target is missed |

<!-- screenshot: The Notifications panel showing the event list with In-App and Email toggle switches in a grid layout -->

---

## Tips

- **Set up your brand voice before creating automations.** The AI uses your voice settings to generate posts from RSS feeds. Getting the tone and length right early saves editing time later.

- **Try both Voice V1 and V2.** They control the same settings but offer different interfaces. Some people prefer the compact V1 layout, while others like the visual V2 previews.

- **Use the Content Playground.** Before saving voice settings, generate a sample post to see exactly how your changes affect the AI's output.

- **Keep your brand colors up to date.** They are used in OG images, email branding, and other visual elements throughout the platform.

- **Disable OG templates you do not like.** If certain template styles do not fit your brand, disable them so the AI never picks them.

- **Review notification settings periodically.** As your team grows, you may want to adjust which events trigger email versus in-app notifications to avoid inbox overload.

---

## FAQ

**Q: I am a Member. Why do I not see the Company or Brand Voice tabs?**
A: These tabs are only available to Owners and Admins. If you need to change company settings, ask an Owner or Admin on your team.

**Q: Will changing the brand voice affect existing posts?**
A: No. Voice settings only apply to newly generated content. Existing posts and drafts are not changed.

**Q: What is the difference between Voice V1 and Voice V2?**
A: They control the same settings with different interfaces. V2 has a more visual layout with icons and a live preview playground. Use whichever you prefer.

**Q: Can I use different voice settings per platform?**
A: Not directly. Voice settings apply globally. However, the AI automatically adapts content length and style to each platform's norms when generating posts.

**Q: How do OG image templates work?**
A: When the AI generates a social media post from an article, it also creates an Open Graph preview image using one of your enabled templates. The template determines the layout, and your brand colors, fonts, and logo are applied automatically.

**Q: Can I change my email address?**
A: The email field on the Profile tab is read-only. Contact support to change the email associated with your account.
