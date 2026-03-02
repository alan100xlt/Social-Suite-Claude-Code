# Windsurf Plugins Configuration

This directory contains the configuration for all recommended Windsurf plugins installed in the Social Suite project.

## 🚀 Installed Plugins

### 🔐 Authentication & Integration
- **opencode-windsurf-codeium** - OpenCode plugin for Windsurf/Codeium authentication
- **@donnes/syncode** - Sync AI code agent configs across machines and projects

### 🧠 Memory & Context Management
- **memorix** - Cross-Agent Memory Bridge for AI coding agents
- **kiro-memory** - Persistent cross-session memory for AI coding assistants
- **@aitytech/agentkits-memory** - Persistent memory system for AI coding assistants via MCP

### 🤖 AI Agent & Skills
- **agileflow** - AI-driven agile development system
- **dinq-autopilot** - Auto-generate Dinq cards with Code Agents
- **neo-skill** - Multi-assistant skill generator
- **@empjs/skill** - Unified CLI tool for managing AI agent skills
- **tskills** - Sync private team AI skills across multiple tools

### 🔧 Development Tools & Rules
- **@malamute/ai-rules** - AI coding tool configurations for multiple frameworks
- **comment-rules** - Install comment policy rules for AI code editors
- **windsurf-task-manager** - Windsurf Task Manager Workflow

### 🌐 MCP Servers & Routing
- **slashvibe-mcp** - Social MCP server for AI-assisted developers
- **@agentpmt/mcp-router** - Universal MCP server for 8+ AI platforms

### 🛠️ CLI & Workflow
- **atris** - CLI for AI coding agents with codebase navigation

## ⚙️ Configuration

### Plugin Configuration
All plugins are configured in `.windsurf/plugins.json` with optimal settings for the Social Suite project:

- **Auto-update enabled** - Plugins automatically update to latest versions
- **Performance monitoring** - Track plugin performance and resource usage
- **Error reporting** - Automatic error reporting for debugging
- **Cross-platform compatibility** - Works with Claude, Cursor, VS Code, Windsurf

### Workflow Templates
Pre-configured workflows for:

1. **Social Suite Development** - Optimized for our specific development workflow
2. **AI-Assisted Coding** - Leverage all AI tools for maximum productivity

### Integration Features
- **Claude Integration** - Full memory, context sharing, and collaboration
- **Cursor Integration** - Rules sync and skill sharing
- **GitHub Integration** - Copilot integration and Actions sync

## 🎯 Usage

### For Development
1. All plugins are automatically loaded when Windsurf starts
2. Memory systems provide persistent context across sessions
3. AI agents have access to project-specific skills and rules
4. Cross-platform sync ensures consistency across development environments

### For AI Assistance
1. **Memory Systems**: Automatically maintain context and learn from interactions
2. **Skill Management**: Team skills are synced and version controlled
3. **Rule Enforcement**: Coding standards are automatically applied
4. **Workflow Automation**: Repetitive tasks are automated through AI agents

### For Team Collaboration
1. **Shared Context**: Team members access collective knowledge
2. **Skill Sharing**: Reusable AI skills across the team
3. **Workflow Standardization**: Consistent development processes
4. **Performance Monitoring**: Track team productivity and AI effectiveness

## 🔧 Customization

### Adding New Plugins
1. Install plugin via npm: `npm install --save-dev plugin-name`
2. Add to `.windsurf/plugins.json` configuration
3. Restart Windsurf to load new plugin

### Modifying Configuration
1. Edit `.windsurf/plugins.json`
2. Adjust plugin settings as needed
3. Changes are applied automatically

### Workflow Customization
1. Create custom workflow templates in `.windsurf/workflows/`
2. Reference in plugins configuration
3. Use with AI agents for automated processes

## 📊 Performance

### Memory Systems
- **Memorix**: Cross-agent memory with vector search
- **Kiro-memory**: SQLite-based persistent storage
- **AgentKits**: MCP protocol memory system

### AI Agents
- **Agileflow**: Automated sprint planning and retrospectives
- **Dinq-Autopilot**: Intelligent card generation
- **Neo-skill**: Dynamic skill creation and management

### Development Tools
- **Comment Rules**: Automated code quality enforcement
- **Task Manager**: Integrated workflow and task tracking
- **Syncode**: Cross-machine configuration sync

## 🚨 Troubleshooting

### Common Issues
1. **Plugin Conflicts**: Check for duplicate functionality
2. **Memory Issues**: Clear cache and restart Windsurf
3. **Performance**: Disable unused plugins
4. **Connectivity**: Check MCP server connections

### Debug Mode
Enable debug mode in plugin configuration:
```json
{
  "globalSettings": {
    "debug": true,
    "verboseLogging": true
  }
}
```

## 📚 Documentation

### Plugin-Specific Docs
- [Memorix Documentation](https://npm.im/memorix)
- [Kiro-Memory Guide](https://npm.im/kiro-memory)
- [Agileflow Workflow](https://npm.im/agileflow)
- [Dinq-Autopilot Cards](https://npm.im/dinq-autopilot)

### Integration Guides
- [Claude Code Integration](https://docs.anthropic.com/claude-code)
- [Cursor Setup](https://cursor.sh/docs)
- [Windsurf Configuration](https://windsurf.ai/docs)

## 🔄 Updates

### Automatic Updates
All plugins are configured for automatic updates. To check for updates:
```bash
npm update
```

### Manual Updates
For manual plugin updates:
1. Check current versions in `package.json`
2. Update specific plugins: `npm update plugin-name`
3. Restart Windsurf to apply changes

---

**This configuration provides a comprehensive AI-powered development environment optimized for the Social Suite project with maximum productivity and collaboration capabilities.**
