// Dev loads the local bundle: the deployed bundle at the customer URL would be
// older than this checkout. Dev can still target another origin with
// PUBLIC_WIDGET_URL.
export const WIDGET_SRC =
  (import.meta.env.PUBLIC_WIDGET_URL as string | undefined) ??
  (import.meta.env.DEV ? "/js/latest/quietjar.js" : "https://quietjar.com/js/latest/quietjar.js");
