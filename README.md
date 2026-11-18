# Payroll System

## Local setup

Install dependencies with Bun, configure the environment described below, then run:

```powershell
bun install
bun dev
```

Open [http://localhost:3000](http://localhost:3000).

## Required configuration

Keep credentials in an untracked `.env` file or the deployment platform's secret manager. Never commit production credentials.

- `DATABASE_URL`: MySQL connection string.
- `APP_ORIGIN`: canonical application origin; use an HTTPS origin in production. Local development may use `http://localhost:3000`.
- `AUTH_ENCRYPTION_KEY` and `RATE_LIMIT_SECRET`: each must be canonical Base64 encoding of 32 random bytes. Generate independent values with `node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"`.
- `SMTP_HOST`, `SMTP_PORT`, and `SMTP_FROM`: required for user invitations. `SMTP_SECURE` may be `true` or `false` (defaults to TLS on port 465). Configure both `SMTP_USER` and `SMTP_PASSWORD` when the provider requires authentication.
- `R2_ACCOUNT_ID`, `R2_BUCKET`, `R2_ACCESS_KEY_ID`, and `R2_SECRET_ACCESS_KEY`: required for private profile-image storage. Create an R2 S3 API token with only the required bucket object read/write permissions. `R2_ENDPOINT` is optional; when omitted, it is derived as `https://<R2_ACCOUNT_ID>.r2.cloudflarestorage.com`. The adapter uses the R2-required `auto` region and the AWS SDK's R2-compatible bucket endpoint behavior.

Invitations fail rather than report success when SMTP is unavailable. The R2 bucket should remain private; profile-image access is served through authenticated application routes. `R2_PUBLIC_BASE_URL` and legacy `S3_*` variables are not used by the profile-image adapter. Configure least-privilege SMTP and R2 credentials.

## Database migrations

The Prisma schema and additive migrations are maintained under `prisma/`. Review the target database and migration contents before applying migrations; the current users/roles/attendance migration has not been applied.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
