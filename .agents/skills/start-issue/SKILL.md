---
name: start-issue
description: Use when the user wants to start working on an issue end to end. Orchestrates the full feature delivery sequence - read the issue, analyze the codebase, grill the plan, implement, test, and ship the MR.
---

Orchestrate the full feature delivery sequence for the current issue. This is a broad skill that drives other skills in order. Run the steps strictly in sequence and never skip ahead - several steps are explicit gates that require the user's go-ahead before continuing.

## Steps

### 0. Probe optional tooling

Herdr (terminal multiplexer for agents) and Hunk (interactive diff review) are not installed on every machine. Probe both once, up front, and remember the result:

```bash
test "${HERDR_ENV:-}" = 1 && command -v herdr >/dev/null && herdr --skill
command -v hunk >/dev/null && cat "$(hunk skill path)"
```

Each command prints that tool's own instructions when it is usable and nothing when it is not. Read whatever it prints and follow it for the rest of this flow.

**Never block on a missing tool.** A failed probe is not an error and not worth reporting - take the plain fallback noted in each step below and move on. Do not ask the user to install anything.

### 1. Check the branch

Run `git rev-parse --abbrev-ref HEAD`. If the current branch is `main`, do NOT continue - inform the user to create a feature branch first (branches usually start with the issue number, e.g. `4178-fix-foo`) and stop. Only proceed once on a feature branch.
If you make the branch for the user upon request, make sure to first checkout main and pull before creating the new branch.

### 2. Read the issue

Invoke the `read-issue` skill to fetch and present the issue details. It derives the issue number from the current branch, or asks the user for it.

### 3. Analyze the codebase

Understand how the issue should be implemented:

- Explore the relevant apps/packages and existing patterns.
- Find a reference implementation and note the style, tools, libraries, and patterns to reuse (per `CLAUDE.md`).
- Identify the files that will need to change.

### 4. Grill me

Invoke the `grill-me` skill to interview the user relentlessly about the plan and design until reaching shared understanding, resolving each branch of the decision tree.

### 5. Create and review the implementation plan

Write a concrete implementation plan based on steps 3 and 4 and present it to the user.

**Gate:** Do NOT start implementing. Wait until the user explicitly OKs the plan. If the user requests changes, revise the plan and present it again until approved.

### 6. Implement the feature

Implement the feature according to the approved plan:

1. `bun run lint:fix`
2. `bun run build`
3. Run the relevant test file if one exists.

Only consider implementation complete once all of these pass.

If Herdr is available, run anything long-lived (dev server, test watcher) in a sibling pane with `herdr pane split --current --direction right --cwd "$PWD" --no-focus` so it stays visible to the user and out of your own turn. Otherwise run it as a background Bash command.

### 7. Self-review the diff

Read your own changes before handing them over. If Hunk is available, ask the user to open `hunk diff`, then drive that session per Hunk's own instructions - navigate the changeset and leave inline notes on anything you want to flag. Otherwise read the diff with `git diff` and report findings in chat.

Fix what you find, then re-run the step 6 checks.

### 8. User testing

Tell the user the feature is ready for them to test. 

**Gate:** Wait for input from the user. Either address the feedback they give (looping back to step 6 as needed) or continue to step 9 once they give the OK.

### 9. Create the MR

Invoke the `create-mr` skill with the issue number from step 2 to lint, build, test, branch, commit, push, and open the merge request.

### 10. Clear context

Run `/clear` to reset the conversation context before the review.

### 11. Review the MR

Invoke the `review-mr` skill to review the merge request that was just created.
