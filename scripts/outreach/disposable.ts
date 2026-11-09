const DISPOSABLE_LIST_URL =
  "https://raw.githubusercontent.com/disposable-email-domains/disposable-email-domains/main/disposable_email_blocklist.conf";

export async function loadDisposableDomains(): Promise<Set<string>> {
  try {
    const response = await fetch(DISPOSABLE_LIST_URL);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const text = await response.text();
    return new Set(
      text
        .split("\n")
        .map((line) => line.trim().toLowerCase())
        .filter(Boolean),
    );
  } catch (error) {
    console.warn(`Could not load disposable domain list, skipping that filter: ${error}`);
    return new Set();
  }
}
