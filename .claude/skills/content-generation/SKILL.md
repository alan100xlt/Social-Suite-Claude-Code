name: content-generation
description: Generate platform-optimized social media content from RSS articles, news stories, or raw ideas. Adapts tone, length, hashtags, and formatting per platform. Use when creating posts, drafting social content, or improving the AI content generation pipeline.

---

# Content Generation Skill

Generate social media content optimized for each platform's format, audience expectations, and algorithmic preferences. This skill encodes the platform-specific rules that the Social Suite content pipeline should follow.

## Platform Rules

### X (Twitter)
- **Length**: 280 chars max. Aim for 200-250 for engagement (room for quote-tweets)
- **Format**: Hook line + value + CTA. No walls of text
- **Hashtags**: 1-2 max. More than 3 looks spammy. Place at end, not inline
- **Threads**: For long-form, split into 5-8 tweets. First tweet must standalone as hook
- **Media**: Posts with images get 150% more engagement. Always suggest an image
- **Tone**: Conversational, punchy, opinionated. Avoid corporate speak
- **Emojis**: 1-2 max as visual breaks. Never start with an emoji

### LinkedIn
- **Length**: 1,300 chars optimal (3,000 max). First 2 lines visible before "see more"
- **Format**: Hook (first 2 lines CRITICAL — must compel "see more" click) + story/insight + takeaway + CTA
- **Hashtags**: 3-5 at the bottom. Industry-specific, not generic (#marketing not #success)
- **Line breaks**: Use single-sentence paragraphs with blank lines between. Dense text kills engagement
- **Tone**: Professional but personal. First-person stories perform best
- **Polls**: Suggest polls for engagement when topic allows binary/multiple-choice framing
- **No links in post**: LinkedIn suppresses external links. Put link in first comment instead

### Instagram
- **Caption length**: 125 chars for feed visibility, up to 2,200 for Stories/Reels
- **Hashtags**: 5-15 in first comment, not caption. Mix of popular (500K+ posts) and niche (10K-100K)
- **Format**: Hook + value + CTA + hashtag block in comment
- **Stories**: 15-second segments. Use polls, questions, quizzes for interaction
- **Reels**: Hook in first 3 seconds. Text overlay for silent viewing
- **Tone**: Visual-first. Caption supports the image, not the other way around

### Facebook
- **Length**: 40-80 chars for highest engagement. Can go longer for articles
- **Format**: Question or controversial statement + context + share CTA
- **Links**: Facebook supports link previews — include URLs directly (unlike LinkedIn)
- **Groups**: Content for groups should be discussion-starter, not broadcast
- **Tone**: Conversational, community-oriented. "What do you think?" style

### Threads
- **Length**: 500 chars max per post
- **Format**: Casual, conversational. Like X but less formal
- **No hashtags**: Threads doesn't use hashtags effectively yet
- **Tone**: Authentic, unfiltered. The "real you" platform

### Bluesky
- **Length**: 300 chars max
- **Format**: Similar to X. Concise, direct
- **Alt text**: Bluesky community values image alt text. Always include
- **Tone**: Tech-savvy, early-adopter audience. More niche than X

### YouTube (Community Posts)
- **Length**: 5,000 chars max but keep under 500 for community posts
- **Format**: Behind-the-scenes, polls, or video teasers
- **CTA**: Drive to latest video or upcoming premiere

## RSS-to-Social Pipeline

When generating content from an RSS article:

1. **Extract**: Pull title, summary, key quotes, and main image from the article
2. **Angle**: Don't just share the headline. Find the angle: Why should the audience care? What's the takeaway?
3. **Adapt**: Generate a version for EACH connected platform following the rules above
4. **Attribution**: Always credit the source. For news media, this is journalistic duty
5. **Timing**: Suggest optimal posting time based on platform (see best-time-to-post data)
6. **Variation**: For the same article, generate 2-3 variants per platform (different hooks, different angles)

## Content Quality Checklist

Before finalizing any generated content:

- [ ] Does the first line hook attention? (Would YOU stop scrolling?)
- [ ] Is it the right length for the platform?
- [ ] Does it provide value (inform, entertain, or inspire)?
- [ ] Is there a clear CTA (like, comment, share, click)?
- [ ] Are hashtags platform-appropriate?
- [ ] Is the tone right for the platform?
- [ ] Would it still make sense without the image?
- [ ] Is it original enough? (Not just a reshared headline)
- [ ] Does it respect the source attribution?
- [ ] Is it free of cliches? ("Game-changer", "Excited to announce", "Hot take")

## Anti-Patterns (Never Do These)

- **Same content everywhere**: Each platform needs a unique version. Cross-posting identical text is lazy and underperforms
- **Link dumps**: "Check this out: [link]" is not content. Add context, opinion, or a question
- **Hashtag stuffing**: More than 5 hashtags on X or LinkedIn looks desperate
- **Engagement bait**: "Like if you agree!" without substance. Platforms penalize this
- **AI tells**: Avoid phrases that scream AI-generated: "In today's fast-paced world", "Let's dive in", "Here's the thing", "It's no secret that"
- **Thread for everything**: Not every thought needs a thread. Single impactful posts often outperform

## Output Format

When generating content, output:

```
## [Platform Name]

**Post:**
[The actual post content]

**Suggested image:** [description of ideal accompanying image]
**Best time:** [suggested posting window]
**Hashtags:** [if applicable]
**Notes:** [any platform-specific considerations]
```

Generate for all connected platforms unless user specifies otherwise.
