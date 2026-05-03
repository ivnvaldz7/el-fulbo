# Agent Skill Registry

This registry maps conversational triggers to agent skills. The orchestrator uses this file to automatically inject the right instructions for the task.

## Compact Rules

- Project: el-fulbo
- Framework: Next.js (14.2.35)
- Language: TypeScript (5.9.3)
- Database: Supabase
- Testing: vitest (unit, integration), Playwright (e2e)
- State Management: Zustand, TanStack React Query

## User Skills

| Skill | Trigger | Location |
|-------|---------|----------|
| branch-pr | When creating a pull request, opening a PR, or preparing changes for review. | ~/.config/opencode/skills/branch-pr/SKILL.md |
| find-skills | When the user is looking for functionality that might exist as an installable skill. | ~/.agents/skills/find-skills/SKILL.md |
| go-testing | When writing Go tests, using teatest, or adding test coverage. | ~/.config/opencode/skills/go-testing/SKILL.md |
| issue-creation | When creating a GitHub issue, reporting a bug, or requesting a feature. | ~/.config/opencode/skills/issue-creation/SKILL.md |
| judgment-day | When user says "judgment day", "judgment-day", "review adversarial", "dual review" | ~/.config/opencode/skills/judgment-day/SKILL.md |
| skill-creator | When user asks to create a new skill, add agent instructions, or document patterns for AI. | ~/.config/opencode/skills/skill-creator/SKILL.md |

## Project Skills

*(No project-specific skills found)*

## Project Conventions

*(No project-level conventions found)*