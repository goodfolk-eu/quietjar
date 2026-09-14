import { Elysia, t } from "elysia";
import { auth } from "../auth";
import { sendEmail } from "../email";
import { feedbackEmail, MAX_FEEDBACK_LENGTH, SUPPORT_EMAIL } from "../notify/feedback";
import { RateLimiter } from "../pay/limits";

/** A signed-in creator with something to say needs a handful, not a hundred. */
const feedbackPerUser = new RateLimiter(5, 60 * 60 * 1000);

/** The page the feedback came from is a hint for support, not a URL we follow. */
const MAX_PAGE_LENGTH = 200;

function trimmed(value: string | undefined, limit: number): string | null {
  const clean = value?.trim() ?? "";
  if (clean === "") return null;
  return clean.slice(0, limit);
}

/**
 * Credentialed route for the dashboard's feedback modal. A session is required
 * so the message arrives with an address support can reply to, and so the
 * endpoint cannot be used to mail us from anywhere.
 */
export const feedbackRoutes = new Elysia({ prefix: "/api/feedback" }).post(
  "/",
  async ({ request, set, body }) => {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
      set.status = 401;
      return { error: "unauthorized" };
    }

    const message = trimmed(body.message, MAX_FEEDBACK_LENGTH);
    if (!message) {
      set.status = 400;
      return { error: "empty_message" };
    }

    if (!feedbackPerUser.take(session.user.id)) {
      set.status = 429;
      return { error: "rate_limited" };
    }

    const { subject, html } = feedbackEmail({
      message,
      senderEmail: session.user.email,
      senderName: session.user.name ?? null,
      page: trimmed(body.page, MAX_PAGE_LENGTH),
    });

    try {
      await sendEmail(SUPPORT_EMAIL, subject, html);
    } catch (err) {
      console.error("[feedback] send failed:", err);
      set.status = 502;
      return { error: "send_failed" };
    }

    return { ok: true };
  },
  {
    body: t.Object({
      message: t.String({ maxLength: MAX_FEEDBACK_LENGTH }),
      page: t.Optional(t.String({ maxLength: MAX_PAGE_LENGTH })),
    }),
  },
);
