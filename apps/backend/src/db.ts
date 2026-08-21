import { createClient } from "@libsql/client";
import { LibsqlDialect } from "@libsql/kysely-libsql";
import { Kysely } from "kysely";

// BunnyDB is a libsql (Turso-compatible) database.
// Credentials come from the environment. See ".env.development".
const url = process.env.BUNNY_DATABASE_URL;
const authToken =
  process.env.BUNNY_DATABASE_AUTH_TOKEN ??
  process.env.BUNNY_DATABASE_READ_ONLY_AUTH_TOKEN ??
  process.env.LIBSQL_AUTH_TOKEN;

if (!url) {
  throw new Error(
    "BUNNY_DATABASE_URL is not set. Add it to .env.development or the container env.",
  );
}

export const libsqlClient = createClient({
  url,
  ...(authToken ? { authToken } : {}),
});

// Kysely dialect over the libsql HTTP connection.
export const libsqlDialect = new LibsqlDialect({ client: libsqlClient });

// BetterAuth drives the schema via its own migrations on first boot.
// The table types are "any" here because BetterAuth owns the schema.
export const kyselyDb = new Kysely<Record<string, never>>({ dialect: libsqlDialect });