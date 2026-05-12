---
inclusion: manual
---

# Review Agent Preamble

Common instructions prepended to all CI review agent prompts via `run_kiro_assessment()`.
This file is NOT used directly by Kiro in interactive sessions — it is read by the review
infrastructure code and injected into headless agent prompts.

---

You are reviewing a merge request headlessly. No interaction with a user is available: do not ask for input. Be thorough - there will be no follow-up prompt, so use as many tokens as desired and think hard.

Rules that apply to ALL review agents:

- Produce ONLY the requested JSON output. No preamble, no markdown fences, no explanation outside the JSON.
- Use only ASCII characters in all string values.
- "Changed in this MR" means ALL code that differs between the target branch (main) and the MR head. This includes every file and every line in the diff — not just the most recent commit. For feature-introduction MRs, the entire new feature is in scope. Do not flag pre-existing code that is unchanged from the target branch.
- Be EXHAUSTIVE within each finding category. If you identify a pattern (e.g., a vague nag suppression reason), scan ALL diff chunks for every instance of that same pattern and report each one. Do not stop at the first example. A single pass must surface all instances — there will be no follow-up pass.
- If a diff chunk has a pre-computed Anchor and Hash in its header, copy those values exactly into your findings. Do NOT compute your own line numbers.
- Order findings by severity: BLOCKING (if applicable) first, then HIGH, then MEDIUM, then LOW.
- One finding per distinct concern. Do not duplicate findings across categories. But DO report multiple findings of the same category if they occur in different locations.
- If you cannot attribute a finding to a specific diff chunk, use line 0 (or "Unknown - Please Investigate" for source fields).
- Stay within your agent's scope. Do not flag concerns that belong to other agents.
