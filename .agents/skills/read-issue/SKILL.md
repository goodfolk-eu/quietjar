---
name: read-issue
description: Use when the user wants to read an issue by its issue number or URL. Fetches the issue and presents its details.
argument-hint: [issue-number-or-url]
---

Read an issue from the CodeFloe ticketing system from `$ARGUMENTS` and present its details.

## Resolve the issue number

`$ARGUMENTS` may be a plain issue number or a full URL. Extract the issue number:

- If it is a number, use it directly.
- If it is a URL (e.g. `https://codefloe.com/Goodfolk.eu/quietjar/issues/6` or `.../-/issues/4178`), the issue number is the trailing path segment.
- If empty or no number can be extracted, try to derive it from the current branch name. Most branches start with the issue number, so run `git rev-parse --abbrev-ref HEAD` and take the leading digits (e.g. `6-fix-foo` -> `6`). Use that number if found.
- If no number can be derived from `$ARGUMENTS` or the branch name, ask the user for the issue number before proceeding.

## Configuration

- CodeFloe is a Forgejo instance. API base: `https://codefloe.com/api/v1`.
- Project: owner `Goodfolk.eu`, repo `quietjar` (issues: https://codefloe.com/Goodfolk.eu/quietjar/issues).
- Auth: an API token passed in the `Authorization: token ...` header. It lives in `CODEFLOE_TOKEN` in `.env` at the project root, which is not exported into the shell. Source `.env` at the start of the script so the token is set even on a clean session. If it is still unset, ask the user for it and do not hardcode it.

## Steps

### 1. Fetch the issue

Source `.env`, then call the Forgejo API directly:

```bash
set -euo pipefail

# CODEFLOE_TOKEN is defined in .env at the project root; load it into the session.
if [[ -f ".env" ]]; then
  set -a; source .env; set +a
fi

CODEOFLOE_API="https://codefloe.com/api/v1"
OWNER="Goodfolk.eu"
REPO="quietjar"
ISSUE_NUMBER="<issue-number>"

if [[ -z "${CODEFLOE_TOKEN:-}" ]]; then
  echo "Error: CODEFLOE_TOKEN is not set" >&2
  exit 1
fi

curl -fsS \
  -H "Authorization: token ${CODEFLOE_TOKEN}" \
  -H "Accept: application/json" \
  "${CODEOFLOE_API}/repos/${OWNER}/${REPO}/issues/${ISSUE_NUMBER}"
```

To fetch comments, add the `/comments` endpoint:

```bash
curl -fsS \
  -H "Authorization: token ${CODEFLOE_TOKEN}" \
  -H "Accept: application/json" \
  "${CODEOFLOE_API}/repos/${OWNER}/${REPO}/issues/${ISSUE_NUMBER}/comments"
```

### 2. Present the issue

Show the user a clear summary:

- **Title** and issue number (with URL `https://codefloe.com/Goodfolk.eu/quietjar/issues/<issue-number>`)
- **State** (open/closed), **labels** (from the `labels` array, their `name` fields), **assignees** (from the `assignees` array), **milestone** (its `title` if present)
- **Description** (the full issue body, from the `body` field)
- **Comments**, if requested or relevant

Use sentence case for any headings you add. Never use em-dashes, use a regular dash.
