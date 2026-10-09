---
description: Send a structured report to Muse (Gilad's reviewing AI assistant) via the bridge
---
Write a structured report of this session for Muse, who reviews your work and
gives Gilad verdicts. Format:
**Task:** <what was asked>
**Done:** <what changed — files, commits, with paths>
**Tests:** <what you verified, with numbers>
**Open questions / needs decision:** <...>
Then send it: "$CLAUDE_PROJECT_DIR"/.claude/hooks/report-to-muse.sh --text "<repo>: <short title>" "<the full report>"
Keep it under 4000 characters. Never include secrets, tokens, or passwords.
