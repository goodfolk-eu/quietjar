---
name: create-mr
description: Use when the user wants to create a merge/pull request for their current changes. Handles linting, building, testing, branching, committing, pushing, and MR creation.
argument-hint: [issue-id]
---

Create a merge/pull request for the current changes, linked to the issue `$ARGUMENTS`.

If `$ARGUMENTS` is empty or not a number, ask the user for the issue ID before proceeding.

## Configuration

- CodeFloe is a Forgejo instance. API base: `https://codefloe.com/api/v1`.
- Project: owner `Goodfolk.eu`, repo `quietjar`.
- Auth: an API token passed in the `Authorization: token ...` header. It lives in `CODEFLOE_TOKEN` in `.env` at the project root, which is not exported into the shell. Source `.env` at the start of the script so the token is set even on a clean session. If it is still unset, ask the user for it and do not hardcode it.

## Steps

### 0. Load the API config

Source `.env` so the token is available for the ticketing calls:

```bash
set -euo pipefail

if [[ -f ".env" ]]; then
  set -a; source .env; set +a
fi

CODEOFLOE_API="https://codefloe.com/api/v1"
OWNER="Goodfolk.eu"
REPO="quietjar"
ISSUE_ID="<issue-id>"

if [[ -z "${CODEFLOE_TOKEN:-}" ]]; then
  echo "Error: CODEFLOE_TOKEN is not set" >&2
  exit 1
fi
```

### 1. Pull ticket info from ticketing system

Fetch the issue via the Forgejo API and note its title, which you'll use for the branch name and commit message:

```bash
curl -fsS \
  -H "Authorization: token ${CODEFLOE_TOKEN}" \
  -H "Accept: application/json" \
  "${CODEOFLOE_API}/repos/${OWNER}/${REPO}/issues/${ISSUE_ID}" | jq -r '.title'
```

### 2. Run checks (in parallel where possible)

```bash
bun run lint
bun run build
bun run test
```

If any check fails, stop and report the error to the user. Do not proceed.

### 3. Create branch (if not already on a feature branch)

- Derive branch name from issue: `<issue-id>-<slugified-issue-title>` (lowercase, hyphens, max ~60 chars)
- Example: issue #6 "SEO and AI optimization for the public site" → `6-seo-and-ai-optimization-for-the-public-site`
- If already on a branch matching the issue ID, stay on it
```bash
git checkout -b <branch-name>
```

### 4. Stage and commit

- `git add` all changed and new files relevant to the work (review with `git status` first, exclude secrets/env files)
- Write commit message: `<issue-id> <type>: <short description>`
- Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`
- Use a HEREDOC for the commit message, don't add "Co-Authored-By: ..."

### 5. Push

```bash
git push -u origin <branch-name>
```

### 6. Create MR

Create the pull request via the Forgejo API. The `head` is the source branch and `base` is the target branch (the repo's default branch is `main`). The response contains the `html_url` of the new MR.

```bash
# Write the description body to a temp file to preserve formatting
cat > /tmp/quietjar-mr.md <<'EOF'
## Summary

- <bullet points describing what changed and why>

Related #<issue-id>
EOF

MR_JSON=$(jq -n \
  --arg title "Draft: <issue-id> <type>: <short description>" \
  --arg head "<branch-name>" \
  --arg base "main" \
  --rawfile body /tmp/quietjar-mr.md \
  '{title: $title, head: $head, base: $base, body: $body}')

curl -fsS -X POST \
  -H "Authorization: token ${CODEFLOE_TOKEN}" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  "${CODEOFLOE_API}/repos/${OWNER}/${REPO}/pulls" \
  -d "${MR_JSON}"

rm -f /tmp/quietjar-mr.md
```

- The MR must be created as a **Draft**. The Forgejo API has no `draft` field on PR creation, so prefix the title with `Draft:` (Forgejo recognizes this prefix and marks the PR as draft/WIP).
- Description body: write a `## Summary` with bullet points describing what changed and why, add `Related #<issue-id>` at the end
- The final `curl` prints the MR JSON; extract and return the `html_url` to the user when done
