---
description: Convert PRD documents into Linear tickets for autonomous development
---

# PRD to Linear Tasks Conversion Workflow

This workflow converts your Product Requirements Document (PRD) into actionable Linear tickets that can be worked on autonomously.

## How to Use

1. **Upload your PRD** to the workspace (PDF, DOCX, or Markdown)
2. **Run this workflow** using `/prd-to-linear`
3. **Review generated tickets** in Linear
4. **Start autonomous development**

## Process Steps

### Step 1: PRD Analysis
- Extract features, user stories, and technical requirements
- Identify dependencies and acceptance criteria
- Categorize by priority and complexity

### Step 2: Task Generation
- Create epics for major features
- Break down into user stories and technical tasks
- Assign appropriate labels and priorities

### Step 3: Linear Integration
- Create tickets in your Linear team
- Link related items and set dependencies
- Assign to appropriate swimlanes

### Step 4: Development Planning
- Order tasks by priority
- Identify parallel work streams
- Set up automated tracking

## Generated Ticket Types

- **🎯 Feature Epics**: Major functionality areas
- **📝 User Stories**: Specific user-facing features
- **🔧 Technical Tasks**: Implementation work
- **🐛 Bug Fixes**: Issues and improvements
- **✅ Testing**: QA and validation tasks
- **📚 Documentation**: Guides and API docs

## Automation Features

- **Smart Estimation**: Based on complexity analysis
- **Dependency Mapping**: Automatic task relationships
- **Progress Tracking**: Real-time status updates
- **Integration**: Git commits linked to tickets

## Best Practices

1. **Clear PRD Structure**: Use sections, bullet points, acceptance criteria
2. **Specific Requirements**: Include measurable outcomes
3. **User Context**: Define target users and use cases
4. **Technical Constraints**: Note limitations and dependencies

## Example PRD Structure

```markdown
# Feature: Social Media Automation

## User Story
As a social media manager, I want to automatically schedule posts so that I can save time.

## Acceptance Criteria
- Support for Twitter, LinkedIn, Instagram
- Bulk scheduling capability
- Calendar view interface
- Approval workflow

## Technical Requirements
- REST API integration
- OAuth authentication
- Cron job scheduling
- Error handling and retries
```

This structure enables accurate task generation and proper estimation.
