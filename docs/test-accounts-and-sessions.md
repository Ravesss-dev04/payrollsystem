# Test accounts and persistent sessions

## Provisioning

`bun run provision:test-accounts` is an opt-in provisioning utility for an
explicitly allowlisted, non-production MySQL database.
It refuses to run unless all of these are true:

- `APP_ENV` is `development` or `test`.
- `NODE_ENV` is not `production`.
- `PROVISION_TEST_ACCOUNTS=true`.
- `DATABASE_URL` uses MySQL and its database name includes `test`, `dev`,
  `stage`, or `sandbox`.
- `TEST_ACCOUNT_DATABASE_ALLOWLIST` contains the exact
  `host:port/database` target.

The Prisma schema and runtime adapter use MySQL. Remote database connections
require certificate-verified TLS; loopback development connections do not.
Never point the utility at production or a database containing real employee
records. The utility checks reserved email identities and records marked as
test accounts before making changes. It creates missing accounts only and
never changes or reactivates existing accounts.

The three reserved identities are `test-admin@payroll.test`,
`test-hr@payroll.test`, and `test-employee@payroll.test`. The admin and HR
accounts have MFA enabled at creation; the employee account follows the regular
employee login flow. There is no Employee relation in the current Prisma schema,
so no payroll/employee record is created.

Passwords are random 256-bit values checked by the current password validator
and hashed with Argon2id. MFA secrets are encrypted with
`AUTH_ENCRYPTION_KEY`; only hashes of recovery codes are stored in the
database. Plaintext passwords, MFA seeds, and recovery codes are written once
to a uniquely named directory under `%LOCALAPPDATA%` (or the local user's
`AppData\Local` directory). The utility restricts the directory and file to
the current Windows user, or applies owner-only permissions on POSIX. The
command prints the file path, not credential contents. Protect or securely
delete that file after use.

For admin and HR sign-in, enroll the `totpSecret` from that protected local
credential file in an authenticator app. The login page also accepts one
unused `recoveryCodes` entry as an alternative second factor; each recovery
code is single-use. Do not share either value.

## MFA sign-in policy

The login flow reads `isTestAccount` from the account's database record.
Already-marked test accounts skip MFA verification at sign-in only in
development and test environments; the flag is never accepted from a login
request. In production, Admin and HR accounts require MFA according to the
normal reauthentication schedule regardless of the test-account marker. This
does not bypass password verification, account status, role validation, rate
limits, or session controls. The provisioning utility continues to refuse
production databases, and this change adds no production test-account creation
or marking workflow.

Admin and HR accounts with MFA enabled must verify MFA when they have no
recorded successful MFA challenge or when their latest successful setup or
verification is at least 60 days old. A successful authenticator-code or
single-use recovery-code verification updates the challenge record used for
this interval. Admin and HR accounts without MFA enabled still go through
initial MFA setup. Provisioned test admin and HR accounts are MFA-enabled and
skip the second-factor prompt only in development and test environments.

Provisioning does not rotate existing credentials. To rotate one reserved
account, set `ROTATE_TEST_ACCOUNT_PASSWORD=true` and
`TEST_ACCOUNT_ROTATION_EMAIL` to exactly one reserved test identity, then run
`bun run rotate:test-account-password`. The same local-only environment and
database allowlist checks apply. The rotation updates only an active account
with the expected test marker and role, changes its password hash, increments
its session version, revokes its sessions, and rotates recovery codes for MFA
accounts in one transaction. It writes the new credentials to a protected
local file and does not change the account role or status.

## Required configuration names

The application and local provisioning require:

- `APP_ORIGIN`
- `APP_ENV`
- `AUTH_ENCRYPTION_KEY` (canonical base64 for 32 random bytes)
- `RATE_LIMIT_SECRET` (canonical base64 for 32 random bytes)
- `DATABASE_URL` (MySQL connection string for the explicitly allowlisted
  non-production database)
- `PROVISION_TEST_ACCOUNTS=true` only when intentionally provisioning
- `TEST_ACCOUNT_DATABASE_ALLOWLIST` with the exact local `host:port/database`
- `ROTATE_TEST_ACCOUNT_PASSWORD=true` and
  `TEST_ACCOUNT_ROTATION_EMAIL` only for an intentional test-account rotation

Never commit or print these values. Do not set the provisioning flag in
production. Do not provision until the existing MySQL schema has been
inspected and any required non-destructive migration has been reviewed and
applied to the intended non-production database.

## Session behavior

Sessions use opaque random cookie values; only their SHA-256 digests are stored
in the shared MySQL session table. Cookies are HttpOnly, SameSite=Lax,
Secure for HTTPS deployments, and path-scoped to `/`. CSRF tokens are checked
for state-changing requests.

The current policy is a 30-minute idle timeout and a 12-hour absolute maximum.
Requests extend idle expiry at most once per five minutes and never beyond the
absolute deadline. Network changes and IP changes do not bind or revoke a
session. Going offline does not extend the idle timeout; a session that reaches
its expiration or is revoked still requires login.

Protected server routes re-read the session and current account role/status
from the database. Page refresh restores the session from the HttpOnly cookie.
An outage is not treated as an invalid session: server errors do not clear the
cookie, the protected UI shows a reconnect state, and revalidation runs when
connectivity returns or the tab becomes visible. Automatic retries use
exponential backoff with jitter and a bounded retry count. A confirmed 401
causes the client to return to login. Logout revokes the database session;
other tabs revalidate the shared session when notified or when they become
visible.

## Current deployment boundary

No database connection or migration is performed by this change. An authorized
operator must inspect the target schema and migration state before running any
migration or provisioning command. The utility rejects non-MySQL, unnamed or
non-allowlisted targets and refuses database names that do not identify a
non-production environment. Provisioning is not complete until accounts are
verified in the intended MySQL database and login is tested through the
application.
