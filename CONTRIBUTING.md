# Contributing to Discord MCP

🎉 Thank you for your interest in contributing to Discord MCP! This guide will help you contribute safely and effectively.

## 🚦 Getting Started

### Prerequisites
- Node.js 18+ and npm
- A Discord bot token (for testing)
- Basic understanding of TypeScript and Discord.js

### Setup for Development
1. Fork this repository
2. Clone your fork: `git clone https://github.com/YOUR-USERNAME/discord-mcp.git`
3. Install dependencies: `npm install`
4. Copy environment template: `cp .env.example .env`
5. Add your Discord bot token to `.env`
6. Build the project: `npm run build`

## 🔒 Security Guidelines

### ⚠️ CRITICAL: Never Commit Secrets
- **NEVER** commit Discord bot tokens, API keys, or passwords
- Always use `.env` files for sensitive data
- Double-check commits for accidentally included secrets
- Use `git log --oneline -p` to review your changes before pushing

### Code Security
- Validate all user inputs
- Use TypeScript for type safety
- Follow principle of least privilege
- Sanitize any data that could be user-controlled

## 📝 How to Contribute

### 1. Types of Contributions Welcome
- 🐛 Bug fixes
- ✨ New Discord features
- 📚 Documentation improvements  
- 🧪 Tests and examples
- 🔧 Performance improvements
- 🎨 Code organization and cleanup

### 2. Before You Start
- Check existing issues and PRs
- Create an issue for major changes
- Discuss your approach first

### 3. Development Workflow
```bash
# 1. Create a feature branch
git checkout -b feature/your-feature-name

# 2. Make your changes
# ... edit files ...

# 3. Test your changes
npm run build
npm run dev  # Test locally

# 4. Commit with clear messages
git add .
git commit -m "feat: add new Discord slash command support"

# 5. Push and create PR
git push origin feature/your-feature-name
```

### 4. Code Style Guidelines
- Use TypeScript strict mode
- Follow existing code formatting
- Add JSDoc comments for public APIs
- Keep functions focused and small
- Use meaningful variable names

### 5. Testing Requirements
- Test your changes thoroughly
- Ensure builds complete successfully
- Test with a real Discord bot in a test server
- Document any new environment variables needed

## 🔍 Pull Request Process

### PR Checklist
- [ ] Branch is up to date with main
- [ ] Code follows project style guidelines
- [ ] No sensitive data committed
- [ ] Build passes (`npm run build`)
- [ ] Testing completed
- [ ] Documentation updated if needed
- [ ] PR description explains the changes

### PR Template
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Code cleanup

## Testing
- [ ] Tested locally with Discord bot
- [ ] No sensitive data included
- [ ] Build passes

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
```

## 🚫 What NOT to Contribute

- Discord bot tokens or API keys
- Personal server IDs or sensitive data
- Malicious code or backdoors
- Code that violates Discord's ToS
- Untested breaking changes
- Large refactors without discussion

## 🆘 Getting Help

- **Discord API Questions**: [Discord.js Documentation](https://discord.js.org/)
- **Project Questions**: Create an issue with the `question` label
- **Security Issues**: Follow our [Security Policy](SECURITY.md)

## 📜 Code of Conduct

### Our Standards
- Be respectful and inclusive
- Focus on constructive feedback
- Help newcomers learn
- Assume good intentions

### Unacceptable Behavior
- Harassment or discrimination
- Sharing others' private information
- Trolling or insulting comments
- Any form of abuse

## 🏆 Recognition

Contributors will be acknowledged in our README and releases. Significant contributions may earn maintainer status.

## 📞 Contact

For questions about contributing, create an issue or reach out through GitHub discussions.

---

**Remember**: Security first, then functionality. Every contribution makes this project better! 🚀
