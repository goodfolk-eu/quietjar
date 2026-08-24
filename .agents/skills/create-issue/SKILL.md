---
name: create-issue
description: Use when the user wants to create a new issue. Acts as a product owner, clarifies the feature, fills the issue template, and creates it.
---

## What I do

Turn a rough feature description into a well-written issue on the issue board, then create it.

## When to use me

- When the user wants to create a new feature issue / ticket.
- When the user has a feature idea that needs to be turned into a proper issue.

## Available labels

These are the current labels in the repo. Use this list when selecting labels - do not fetch them at runtime.

**Kind:** Bug, Documentation, Enhancement, Feature, Security, Testing, Compat/Breaking  
**Priority:** Critical, High, Medium, Low  
**Reviewed:** Confirmed, Duplicate, Invalid, Won't Fix  
**Status:** Blocked, Need More Info, Abandoned   

## Workflow

Follow these steps in order. Do not skip ahead.

### 1. Load company context

If the company context has not already been loaded in this conversation, invoke the `load-context` skill first. This grounds you in what this is and what its features do. Skip if it's already loaded.

### 2. Assume the role

Act as a professional product owner. Write crisply, think about the user value, the "why", and scope. Use sentence case for headings, never Title Case, and never use em-dashes (use a regular dash).

**Do not search the codebase.** This skill produces a functional description for a developer to pick up - not a technical analysis. A dev will create an architectural plan after the issue is created. Base all content on the conversation and your knowledge of the project as a product, never on reading source files.

### 3. Ask for the feature description

Ask the user to describe the feature they want an issue for. Wait for their answer.

### 4. Grill the user to clarify

Using your knowledge of the project (its product, widget, dashboard, etc.) and the loaded context, ask focused clarifying questions before writing anything. Only ask what genuinely matters for a clear issue, for example:

- Who is the user / persona (end customer, support agent, admin)?
- What problem does this solve, what is the value / the "why"?
- What is in scope vs explicitly out of scope?
- Any acceptance criteria or success conditions?
- Any dependencies on existing features?

Ask in a tight batch, iterate until the feature is unambiguous. Do not pad with questions you can reasonably infer.

### 5. Select labels

From the **Available labels** section above, pick the labels that fit. Rules:
- Pick a `Kind/*` label (e.g. `Feature`, `Bug`, `Documentation`).
- Pick a `Priority/*` label when relevant (e.g. `High`, `Low`).
- Do NOT assign `Reviewed/*` or `Status/*` labels (`Confirmed`, `Blocked`, `Need More Info`, etc.); those track triage state.

### 6. Fill in the template

Produce this exact markdown template, filled in. Keep the HTML comments removed once you replace them with real content.

```
## User story

As a [user], I want [goal] so that [reason].

## Add to releases

- [x] Add to releases

## Feature description

<detailed description of the feature>

---

## Tech details

```

Rules:
- The "Add to releases" checkbox should be set to checked if this is a new story related to the product and should be published to the public changelog on our website (it should not be checked if it's a bugfix, or a website change, minor fix, etc).
- Leave **Tech details** empty unless there is a clear, concrete technical consideration worth recording. Do not invent implementation detail.
- Headings in sentence case, no em-dashes.

### 6. Confirm with the user

Show the filled-in markdown, the proposed issue title, and the selected labels. Ask the user to confirm or request changes. Iterate until they approve. Do NOT create the issue before explicit confirmation.

### 7. Create the issue in CodeFloe

Once confirmed, create the issue via the Forgejo API in the CodeFloe repo.

- CodeFloe is a Forgejo instance. API base: `https://codefloe.com/api/v1`.
- Project: owner `Goodfolk.eu`, repo `quietjar` (issues: https://codefloe.com/Goodfolk.eu/quietjar/issues).
- Auth: an API token passed in the `Authorization: token ...` header. It lives in `CODEFLOE_TOKEN` in `.env` at the project root, which is not exported into the shell. Source `.env` at the start of the script so the token is set even on a clean session. If it is still unset, ask the user for it and do not hardcode it.
- Labels are sent as a list of numeric label IDs, not names. Resolve the selected label names to IDs first via the repo labels endpoint, then pass those IDs when creating the issue. Use the full label names (e.g. `Kind/Feature`, `Priority/Low`) - not the short forms.

```bash
set -euo pipefail

# CODEFLOE_TOKEN is defined in .env at the project root; load it into the session.
if [[ -f ".env" ]]; then
  set -a; source .env; set +a
fi

CODEOFLOE_API="https://codefloe.com/api/v1"
OWNER="Goodfolk.eu"
REPO="quietjar"

if [[ -z "${CODEFLOE_TOKEN:-}" ]]; then
  echo "Error: CODEFLOE_TOKEN is not set" >&2
  exit 1
fi

# Write the confirmed markdown body to a temp file to preserve formatting
cat > /tmp/quietjar-issue.md <<'EOF'
## User story

As a [user], I want [goal] so that [reason].

## Add to releases

- [X] Add to releases

## Feature description

<detailed description>

---

## Tech details

EOF

# The selected label names (comma-separated) confirmed by the user. Empty if none.
SELECTED_LABELS="<label 1>,<label 2>"

# The issue title. Use this same value everywhere it appears.
ISSUE_TITLE="<concise feature title in sentence case>"

# Resolve the selected label names to their numeric IDs (comma-separated).
LABEL_IDS=$(curl -fsS \
  -H "Authorization: token ${CODEFLOE_TOKEN}" \
  -H "Accept: application/json" \
  "${CODEOFLOE_API}/repos/${OWNER}/${REPO}/labels" \
  | jq -r --arg names "${SELECTED_LABELS}" '
      ($names | split(",")) as $wanted
      | [ .[] | select(.name as $n | $wanted | index($n)) | .id ] | join(",")
    ')

# Guard against duplicates: abort if an open issue with this exact title already exists.
# This prevents creating the issue multiple times if the script is ever re-run.
EXISTING=$(curl -fsS \
  -H "Authorization: token ${CODEFLOE_TOKEN}" \
  -H "Accept: application/json" \
  "${CODEOFLOE_API}/repos/${OWNER}/${REPO}/issues?state=open&limit=50" \
  | jq -r --arg title "${ISSUE_TITLE}" '
      [ .[] | select(.title == $title and (.pull_request | not)) ] | length
    ')

if [[ "${EXISTING:-0}" -gt 0 ]]; then
  echo "Error: an open issue with this title already exists; aborting to avoid a duplicate." >&2
  exit 1
fi

# Create the issue; the response contains the html_url of the new issue.
# Build the JSON body with jq, only including the labels array when there are labels.
ISSUE_JSON=$(jq -n \
  --arg title "${ISSUE_TITLE}" \
  --rawfile body /tmp/quietjar-issue.md \
  --arg ids "${LABEL_IDS}" \
  '{title: $title, body: $body} + (if $ids == "" then {} else {labels: ($ids | split(",") | map(tonumber))} end)')

# Capture the HTTP status code and the response body separately. Decide success from the
# status code (201), never from parsing the body: a failed POST can return a non-JSON
# error body, and running that through jq produced a confusing "parse error" that looked
# like the creation had failed (prompting unnecessary retries and duplicates).
RESPONSE_FILE=$(mktemp)
STATUS=$(curl -sS -o "${RESPONSE_FILE}" -w "%{http_code}" -X POST \
  -H "Authorization: token ${CODEFLOE_TOKEN}" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  "${CODEOFLOE_API}/repos/${OWNER}/${REPO}/issues" \
  -d "${ISSUE_JSON}")

if [[ "${STATUS}" != "201" ]]; then
  echo "Error: issue creation failed (HTTP ${STATUS})." >&2
  cat "${RESPONSE_FILE}" >&2
  rm -f "${RESPONSE_FILE}"
  exit 1
fi

jq -r '.html_url' "${RESPONSE_FILE}"

rm -f /tmp/quietjar-issue.md "${RESPONSE_FILE}"
```

Notes:
- The script resolves label names to IDs, guards against creating a duplicate open issue with the same title, then creates the issue with a single API call.
- Success is judged from the HTTP status code (201), not from parsing the response body, so a non-JSON error body never produces a misleading `jq` error that could trigger an unnecessary retry.
- After creation, report the new issue URL back to the user.
