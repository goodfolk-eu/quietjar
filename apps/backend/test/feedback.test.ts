import { beforeEach, describe, expect, test } from "bun:test";
import { emailState, json, request, resetEmail, sentEmails, session } from "./harness";

// The harness registers mock.module replacements before any src module loads;
// static imports would hoist past that setup.
const { feedbackRoutes } = await import("../src/feedback/routes");
const { feedbackEmail, SUPPORT_EMAIL } = await import("../src/notify/feedback");

/** The limiter is keyed by user, so each test signs in as a different one. */
let nextUser = 0;
let signedInEmail = "";

function signIn(): void {
  nextUser += 1;
  signedInEmail = `creator${nextUser}@example.com`;
  session.user = { id: `user_feedback_${nextUser}`, email: signedInEmail };
}

function send(body?: Record<string, unknown>): Promise<Response> {
  return feedbackRoutes.handle(request("POST", "/api/feedback", body ?? { message: "hello" }));
}

beforeEach(() => {
  resetEmail();
  signIn();
});

describe("POST /api/feedback", () => {
  test("mails the message to support with the sender's address", async () => {
    const { status, body } = await json(await send({ message: "The widget colours are lovely" }));

    expect(status).toBe(200);
    expect(body).toEqual({ ok: true });
    expect(sentEmails).toHaveLength(1);
    expect(sentEmails[0].to).toBe(SUPPORT_EMAIL);
    expect(sentEmails[0].subject).toBe("Feedback: The widget colours are lovely");
    expect(sentEmails[0].html).toContain("The widget colours are lovely");
    expect(sentEmails[0].html).toContain(signedInEmail);
  });

  test("includes the page the feedback came from", async () => {
    await send({ message: "This chart is confusing", page: "/en/dashboard/" });

    expect(sentEmails[0].html).toContain("/en/dashboard/");
  });

  test("refuses a signed-out caller", async () => {
    session.user = null;

    const { status, body } = await json(await send());

    expect(status).toBe(401);
    expect(body).toEqual({ error: "unauthorized" });
    expect(sentEmails).toHaveLength(0);
  });

  test("refuses a message that is only whitespace", async () => {
    const { status, body } = await json(await send({ message: "   \n  " }));

    expect(status).toBe(400);
    expect(body).toEqual({ error: "empty_message" });
    expect(sentEmails).toHaveLength(0);
  });

  test("refuses a sixth message within the hour", async () => {
    for (let i = 0; i < 5; i += 1) {
      expect((await send()).status).toBe(200);
    }

    const { status, body } = await json(await send());

    expect(status).toBe(429);
    expect(body).toEqual({ error: "rate_limited" });
    expect(sentEmails).toHaveLength(5);
  });

  test("reports a failed send instead of swallowing it", async () => {
    emailState.failNextSend = true;

    const { status, body } = await json(await send());

    expect(status).toBe(502);
    expect(body).toEqual({ error: "send_failed" });
  });
});

describe("feedbackEmail", () => {
  test("escapes a message that looks like markup", async () => {
    const { html } = feedbackEmail({
      message: "<script>alert(1)</script>",
      senderEmail: "creator@example.com",
      senderName: null,
      page: null,
    });

    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  test("shortens a long message down to a readable subject", () => {
    const { subject } = feedbackEmail({
      message: `${"word ".repeat(40)}end`,
      senderEmail: "creator@example.com",
      senderName: null,
      page: null,
    });

    expect(subject.length).toBeLessThanOrEqual("Feedback: ".length + 61);
    expect(subject.endsWith("…")).toBe(true);
  });

  test("names the sender when the account has a name", () => {
    const { html } = feedbackEmail({
      message: "hello",
      senderEmail: "creator@example.com",
      senderName: "Dana",
      page: null,
    });

    expect(html).toContain("Dana &lt;creator@example.com&gt;");
  });
});
