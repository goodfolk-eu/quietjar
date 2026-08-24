---
name: review-mr
description: Use when the user wants to review a merge/pull request. Fetches MR details, checks out the branch, analyzes the diff, and produces a structured code review.
argument-hint: [mr-number]
---

Review merge/pull request `$ARGUMENTS`.

If `$ARGUMENTS` is empty or not a number, ask the user for the MR number before proceeding.

## Configuration

- CodeFloe is a Forgejo instance. API base: `https://codefloe.com/api/v1`.
- Project: owner `Goodfolk.eu`, repo `quietjar`.
- Auth: an API token passed in the `Authorization: token ...` header. It lives in `CODEFLOE_TOKEN` in `.env` at the project root, which is not exported into the shell. Source `.env` at the start of the script so the token is set even on a clean session. If it is still unset, ask the user for it and do not hardcode it.

## Steps

### 1. Fetch MR details

Source `.env` and fetch the PR via the Forgejo API:

```bash
set -euo pipefail

if [[ -f ".env" ]]; then
  set -a; source .env; set +a
fi

CODEOFLOE_API="https://codefloe.com/api/v1"
OWNER="Goodfolk.eu"
REPO="quietjar"
MR_NUMBER="<mr-number>"

if [[ -z "${CODEFLOE_TOKEN:-}" ]]; then
  echo "Error: CODEFLOE_TOKEN is not set" >&2
  exit 1
fi

curl -fsS \
  -H "Authorization: token ${CODEFLOE_TOKEN}" \
  -H "Accept: application/json" \
  "${CODEOFLOE_API}/repos/${OWNER}/${REPO}/pulls/${MR_NUMBER}"
```

Note the title, description (`body`), author (`user.login`), source branch (`head.ref`), and related issues. The description or branch name usually references the associated ticket number (e.g. `6`).

### 2. Fetch the associated ticket details

Determine the issue number from the MR description, branch name, or title, then fetch it from Forgejo:

```bash
curl -fsS \
  -H "Authorization: token ${CODEFLOE_TOKEN}" \
  -H "Accept: application/json" \
  "${CODEOFLOE_API}/repos/${OWNER}/${REPO}/issues/<issue-number>"
```

Use the ticket's title and description to understand the intended behavior, so the review can check the MR against what was actually requested. If no ticket can be determined, note that and continue.

### 3. Check out the MR branch, but only if not already on it

First get the source branch (`head.ref` from the step 1 response). Compare it to the current branch:

```bash
git rev-parse --abbrev-ref HEAD
```

If already on the source branch, skip the checkout. Otherwise fetch and check it out:

```bash
git fetch origin <branch-name> && git checkout <branch-name>
```

### 4. Gather the diff (run in parallel)

```bash
git log --oneline origin/master..HEAD
git diff origin/master...HEAD --stat
git diff origin/master...HEAD
```

If the full diff is too large, read it in chunks.

### 5. Read key files for deeper context

- Read new files in full
- Read heavily modified files for surrounding context
- Check related type definitions and interfaces

### 6. Produce a structured review with these sections

### Overview
Brief summary of what the MR does and how many files/lines changed.

### Ticket vs implementation
Compare the associated ticket's description (the requested behavior) against what the MR actually implements. Call out:
- **Requirements met**: parts of the ticket the implementation fully covers.
- **Gaps**: requirements that are missing, partially done, or differ from what was asked.
- **Scope creep**: changes in the MR that are not part of the ticket.

If no ticket could be determined, state that and skip this section.

### Issues
Categorized findings:
- **Critical**: Bugs, security issues, data loss risks
- **Important**: Logic problems, missing edge cases, code duplication, architectural concerns
- **Minor**: Style, naming, small improvements, code comments not according to convention

For each issue include the file path and line reference, describe the problem, and suggest a fix where appropriate.

### Test review
Read the changed or added tests and apply these checks. Flag issues in the **Issues** section under the appropriate severity. You don't have to actually run the tests, CI already did. 100% coverage is not required.

- **Do the tests actually assert something meaningful?**
  Watch for tests that call a function but only check that it doesn't throw, or tests that assert on the mock itself rather than the behavior.
- **Are they testing behavior or implementation?**
  AI tends to over-mock. If a test mocks every dependency and then asserts that specific internal methods were called in a specific order, that's testing implementation details - it will break on every refactor even if the behavior stays correct. Ask yourself: if someone changed the internals but the function still returned the correct result, would this test break?
- **Are there real edge cases?**
  AI tools tend to generate happy-path tests and skip the hard cases. Ask yourself: what happens with empty input? What about null or undefined? What if the network request fails? What if the list is empty?

Fewer tests of higher quality is better. Prefer removing low-value tests over keeping them for coverage metrics.

### Assessment
Overall verdict: what needs to be addressed before merge, and what can be deferred.
