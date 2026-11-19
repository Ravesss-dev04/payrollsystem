# Graph Report - payrollsystem  (2026-11-15)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 1404 nodes · 2424 edges · 111 communities (80 shown, 31 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 23 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `b1f760b2`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- UsersRolesClient.tsx
- PayrollBatchDetails.tsx
- compensation/page.tsx
- Workflow and approval matrix
- react-icons
- Prisma Transactions
- SessionRecoveryStatus
- provision-test-accounts.ts
- Standalone Prisma Postgres Provisioning
- company/data.ts
- Prisma Raw Queries
- session-store.ts
- Filter Conditions and Operators
- login/route.ts
- Prisma ORM 7.9.0 release
- Enterprise Admin Dashboard Design
- session.server.ts
- loadSecurityConfig
- prisma migrate dev
- MongoDB schema contract mapping
- migrate-status.md
- package.json
- Generated Prisma Client
- compilerOptions
- verify/route.ts
- PrismaClient Constructor
- migrate-diff.md
- setup/route.ts
- mcp.md
- Payroll system implementation and traceability plan
- dependencies
- Prisma AI safety checkpoint
- Prisma Composer app setup
- Prisma MongoDB client API mapping
- Legacy Postgres Migration Docs
- Authentication Input Schemas
- LoginClient.tsx
- Model queries
- Prisma Compute REST and control APIs
- Prisma CLI agent safety checkpoint
- app-framework-builds.md
- Filter conditions and operators
- Prisma Composer app setup
- migrate-resolve.md
- MongoDB cutover checklist
- Prisma Composer Deployment
- Adopt schema and migrations
- MongoDB Schema-to-Contract Mapping
- MongoDB Cutover Verification Checklist
- rate-limit.test.ts
- app-composer-setup.md
- deploy
- db-pull.md
- prisma.config.ts
- Prisma MongoDB Client API Mapping
- Prisma ORM 6 MongoDB setup
- Prisma Postgres provisioning
- Compare two schema sources
- Prisma Model Queries
- MongoDB Migration Workflow Mapping
- MongoDB migrations mapping
- scripts
- Prisma Upgrade v7 Skill
- Compute automation REST and control APIs
- prisma-orm-setup replacement skill
- MongoDB Stay-or-Migrate Decision
- Prisma ORM 6 MongoDB Setup
- Test accounts and persistent sessions
- eslint.config.mjs
- PrismaClient constructor
- create-prisma automation
- debug.md
- format.md
- dotenv
- Prisma 8 Skill
- Project README
- Prisma model CRUD queries
- Relation queries
- Prisma ORM 6 MongoDB setup
- Prisma 6/7 schema and migration adoption in Prisma 8
- Prisma Console and Management API operations
- Prisma shell completion
- Prisma CLI, client, engines, platform, Node.js, and datasource diagnostics
- Prisma format
- Repository Agent Instructions
- PostgreSQL Setup
- Prisma Postgres Upgrade Skill
- auth
- Prisma Client API
- prisma complete
- Deprecated prisma-database-setup compatibility skill
- Prisma Client Setup
- CockroachDB Setup
- MySQL Setup
- Prisma Postgres with Prisma ORM 7
- SQLite Setup
- SQL Server Setup
- Prisma Client API Reference
- dev
- postgres
- Migration Fixes
- Environment Variables
- Platform Limits
- AI Agent Safety
- v7 Breaking Changes
- Prisma Validate

## God Nodes (most connected - your core abstractions)
1. `react` - 27 edges
2. `loadSecurityConfig()` - 26 edges
3. `react-icons` - 23 edges
4. `DashboardUnavailableState()` - 20 edges
5. `Prisma ORM 7.9.0 release` - 19 edges
6. `PayrollDetail()` - 18 edges
7. `requirePagePermission()` - 18 edges
8. `POST()` - 18 edges
9. `POST()` - 18 edges
10. `UsersRolesClient()` - 16 edges

## Surprising Connections (you probably didn't know these)
- `prisma db seed` --references--> `@prisma/client`  [EXTRACTED]
  .windsurf/skills/prisma-cli/references/db-seed.md → package.json
- `provisionTestAccounts()` --indirect_call--> `createRecoveryCode()`  [INFERRED]
  prisma/provision-test-accounts.ts → app/lib/auth/tokens.ts
- `rotateTestAccountPassword()` --indirect_call--> `createRecoveryCode()`  [INFERRED]
  prisma/rotate-test-account-password.ts → app/lib/auth/tokens.ts
- `PrismaClient constructor` --references--> `@prisma/client`  [EXTRACTED]
  .claude/skills/prisma-client-api/references/constructor.md → package.json
- `prisma migrate dev` --references--> `Shadow database drift detection`  [EXTRACTED]
  .windsurf/skills/prisma-cli/references/migrate-dev.md → .claude/skills/prisma-cli/references/migrate-dev.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **MongoDB to Prisma 8 Migration** — agents_skills_prisma_mongodb_upgrade_skill, agents_skills_prisma_orm_setup_skill [EXTRACTED 0.90]
- **Database Provisioning & Setup Flow** — prisma_postgres_setup_setup, prisma_orm_setup_setup, prisma_postgres_upgrade_upgrade [EXTRACTED 0.95]
- **Destructive Action Safety Protocols** — claude_skills_prisma_compute_references_cli_command_map_postgres, claude_skills_prisma_compute_references_cli_command_map_service, prisma_cli_agent_safety [EXTRACTED 0.95]
- **Prisma Cloud & Compute Deployment** — agents_skills_prisma_compute_skill, agents_skills_prisma_orm_setup_skill [EXTRACTED 0.95]
- **Prisma 7 SQL Provider Workflow** — agents_skills_prisma_orm_setup_references_v7_client_setup_prisma_client_setup, prisma_client_generator, agents_skills_prisma_upgrade_v7_references_prisma_config_ts [EXTRACTED 1.00]
- **Prisma 8 Ecosystem** — prisma_compute_compute, prisma_postgres_upgrade_upgrade, prisma_mongodb_upgrade_upgrade [EXTRACTED 1.00]
- **Prisma Compute Operations Flow** — claude_skills_prisma_compute_references_cli_command_map_auth, claude_skills_prisma_compute_references_cli_command_map_project, claude_skills_prisma_compute_references_cli_command_map_service, claude_skills_prisma_compute_references_cli_command_map_deploy, claude_skills_prisma_compute_references_ops_services_and_config_env [EXTRACTED 1.00]
- **Prisma ORM Ecosystem** — agents_skills_prisma_cli_skill, agents_skills_prisma_orm_setup_skill, agents_skills_prisma_upgrade_v7_references_prisma_config_ts, prisma_schema_prisma [EXTRACTED 1.00]
- **Prisma v7 Migration Flow** — windsurf_skills_prisma_upgrade_v7_skill, windsurf_skills_prisma_upgrade_v7_references_schema_changes, windsurf_skills_prisma_upgrade_v7_references_prisma_config, windsurf_skills_prisma_upgrade_v7_references_env_variables, windsurf_skills_prisma_upgrade_v7_references_esm_support, windsurf_skills_prisma_upgrade_v7_references_removed_features [EXTRACTED 1.00]
- **Authorization requires role, data scope, and workflow state** — docs_system_specification_02_rbac_and_permission_matrix_authorization_contract, docs_system_specification_02_rbac_and_permission_matrix_role_permission_matrix, docs_system_specification_02_rbac_and_permission_matrix_assigned_team_scope [EXTRACTED 1.00]
- **Prisma Postgres Upgrade Path** — windsurf_skills_prisma_postgres_upgrade_references_client_api_mapping, windsurf_skills_prisma_postgres_upgrade_references_verify_upgrade_checklist, prisma_8_skill [INFERRED 0.80]
- **Prisma 8 Upgrade & Compute Path** — agents_skills_prisma_postgres_upgrade_skill [INFERRED 0.85]
- **Prisma ORM Version Management** — prisma_orm_setup_selection, prisma_postgres_upgrade_path, prisma_mongodb_upgrade_decision, prisma_upgrade_v7_breaking_changes [INFERRED 0.85]

## Communities (111 total, 31 thin omitted)

### Community 0 - "UsersRolesClient.tsx"
Cohesion: 0.06
Nodes (55): AttendancePolicies(), badge, base, conflicts(), days, Details(), Dialog(), Editor() (+47 more)

### Community 1 - "PayrollBatchDetails.tsx"
Cohesion: 0.08
Nodes (41): CompanyPage(), DemoDataNotice(), Adjustments(), Badge(), Breakdown(), deduct, Dialog(), download() (+33 more)

### Community 2 - "compensation/page.tsx"
Cohesion: 0.08
Nodes (45): adjustments, allowances, bonuses, employees, grades, adjustmentFields, allowanceFields, BonusDetails() (+37 more)

### Community 3 - "Workflow and approval matrix"
Cohesion: 0.05
Nodes (51): Admin role, Cross-role employee self-service, Role and feature specification, Employee role, Feature inventory, HR role, Policy and data gates, Team Leader role (+43 more)

### Community 4 - "react-icons"
Cohesion: 0.07
Nodes (31): AttendanceSummaryChart(), DashboardPanel(), DashboardUnavailableState(), DepartmentsCard(), PayrollExpenseChart(), PendingApprovalsCard(), PendingApprovalsList(), ProjectedPayrollCard() (+23 more)

### Community 5 - "Prisma Transactions"
Cohesion: 0.05
Nodes (43): Count related records, Create or connect related records, Disconnect and delete related records, Prisma Relation Queries, Include and select relations, Nested writes, Update and upsert related records, Prisma Transactions (+35 more)

### Community 6 - "SessionRecoveryStatus"
Cohesion: 0.09
Nodes (24): EmployeeAccountPage(), instant, AdminShell(), AdminHeader(), AdminNotifications(), initial, Notice, AdminProfileMenu() (+16 more)

### Community 7 - "provision-test-accounts.ts"
Cohesion: 0.12
Nodes (24): validateNewPassword(), getMySqlPoolConfig(), CredentialRecord, getObject(), getSafeProvisioningErrorCode(), inspectDatabaseCause(), inspect(), ProvisioningStage (+16 more)

### Community 8 - "Standalone Prisma Postgres Provisioning"
Cohesion: 0.06
Nodes (36): Credential handling and pagination, Prisma Postgres Console and Management Operations, OAuth token refresh and secure storage, Prisma Console resource inspection, Prisma Management API SDK, Version-matched ORM migrations, Standalone Prisma Postgres Provisioning, Management API provisioning (+28 more)

### Community 9 - "company/data.ts"
Cohesion: 0.12
Nodes (23): businessTypes, holidayTypes, initialBranches, initialCompany, initialDepartments, initialHolidays, BusinessType, CompanyBranch (+15 more)

### Community 10 - "Prisma Raw Queries"
Cohesion: 0.06
Nodes (27): Client lifecycle: $connect and $disconnect, Prisma Client Methods, Prisma event subscriptions: $on, Prisma extensions: $extends, Prisma transactions: $transaction, Prisma type utilities, Raw query methods: $queryRaw and $executeRaw, Type-safe query fragments with satisfies (+19 more)

### Community 11 - "session-store.ts"
Cohesion: 0.11
Nodes (19): isAccountEnabled(), Role, authenticateCredentials(), AuthenticatedLoginAccount, LoginAccountRecord, requiresMfa(), evaluateSession(), SessionPrincipal (+11 more)

### Community 12 - "Filter Conditions and Operators"
Cohesion: 0.08
Nodes (30): Array field filters, Comparison filters, Filter Conditions and Operators, Equality filters, Full-text search, JSON filters, List filters, Logical operators: AND OR NOT (+22 more)

### Community 13 - "login/route.ts"
Cohesion: 0.14
Nodes (16): POST(), databaseRateLimitStore, COMMON_PASSWORDS, hashPassword(), isValidEmail(), normalizeEmail(), verifyPassword(), consumeRateLimit() (+8 more)

### Community 14 - "Prisma ORM 7.9.0 release"
Cohesion: 0.09
Nodes (23): Prisma shell completion, Supported shells: zsh, bash, fish, PowerShell, prisma init, Migration history is not tracked by db push, Direct schema synchronization, Seed configuration in prisma.config.ts, Prisma Postgres instance management, Local Prisma Postgres (+15 more)

### Community 15 - "Enterprise Admin Dashboard Design"
Cohesion: 0.07
Nodes (26): Admin-only dashboard authorization, Dashboard unavailable states, Admin Dashboard Safe Slice Plan, Manila-local dashboard date and greeting, Non-persistent demo-data notice, Payroll HR domain-workflow plan, Server-validated session principal, Three-role safe-slice constraint (+18 more)

### Community 16 - "session.server.ts"
Cohesion: 0.15
Nodes (21): AuthCookieOptions, CSRF_COOKIE_NAME, csrfCookieOptions(), DEVELOPMENT_CSRF_COOKIE_NAME, DEVELOPMENT_MFA_CHALLENGE_COOKIE_NAME, DEVELOPMENT_SESSION_COOKIE_NAME, hasValidCsrfToken(), MFA_CHALLENGE_COOKIE_NAME (+13 more)

### Community 17 - "loadSecurityConfig"
Cohesion: 0.16
Nodes (17): limitSchema, POST(), ApiAuthorizationError, apiAuthorizationErrorResponse(), requireApiPermission(), hasPermission(), isRole(), Permission (+9 more)

### Community 18 - "prisma migrate dev"
Cohesion: 0.12
Nodes (24): prisma.config.ts migrations.seed, Prisma db seed, Configured database seed script, Idempotent seeding with upsert, MongoDB db push workflow, Existing database introspection, prisma db pull, MongoDB schema sampling (+16 more)

### Community 19 - "MongoDB schema contract mapping"
Cohesion: 0.09
Nodes (24): Prisma 6 to Prisma 8 MongoDB client API mapping, Prisma 8 MongoDB typed aggregation pipeline, MongoDB driver sessions for multi-document atomicity, Prisma 6-to-8 MongoDB client API mapping, MongoDB stay-or-migrate decision, Prisma 8 MongoDB Early Access status and requirements, Decision to migrate MongoDB projects to Prisma 8 or stay on v6, Prisma 6 maintenance and setup hygiene (+16 more)

### Community 20 - "migrate-status.md"
Cohesion: 0.11
Nodes (20): Prisma migrate deploy, Apply pending migrations in production and staging, _prisma_migrations table, Prisma migrate status, Applied, pending, missing, and failed migration status, prisma migrate deploy, CI/CD migration deployment, prisma migrate status (+12 more)

### Community 21 - "package.json"
Cohesion: 0.12
Nodes (21): devDependencies, tailwindcss@4.3.3, @tailwindcss/turbopack@4.3.3, @types/bun@^1.4.4, @types/node@^20, @types/react@^19, @types/react-dom@^19, typescript@^5 (+13 more)

### Community 22 - "Generated Prisma Client"
Cohesion: 0.13
Nodes (18): Prisma db push, Consent checkpoint for data-loss flags, Direct schema synchronization without migration history, Prisma dev, Local database instance lifecycle, Local Prisma PostgreSQL database, Generated Prisma Client, Prisma generate (+10 more)

### Community 23 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 24 - "verify/route.ts"
Cohesion: 0.26
Nodes (12): MfaAttemptRejectedError, POST(), recordFailedAttempt(), rejectAttempt(), GET(), writeSecurityEvent(), getRequestCookie(), HttpInputError (+4 more)

### Community 25 - "PrismaClient Constructor"
Cohesion: 0.14
Nodes (16): Accelerate URL, Client logging and log events, PrismaClient Constructor, Error formatting, Next.js client pattern, Query plan cache, Singleton client pattern, SQL comments for observability (+8 more)

### Community 26 - "migrate-diff.md"
Cohesion: 0.15
Nodes (14): Datasource in prisma.config.ts, SQL output from prisma migrate diff, Native SQL execution, prisma db execute, Baseline migration generation, Database drift detection, Empty, schema, migrations, URL, and configured datasource sources, Database schema comparison (+6 more)

### Community 27 - "setup/route.ts"
Cohesion: 0.31
Nodes (10): POST(), AAD, assertKey(), decryptSecret(), encryptSecret(), createTotpSecret(), createTotpUri(), generateTotp() (+2 more)

### Community 28 - "mcp.md"
Cohesion: 0.13
Nodes (13): prisma db push --accept-data-loss, prisma db push --force-reset, Destructive Prisma commands, Explicit user consent, MCP destructive-command boundary, agent-safety.md consent workflow, Prisma MCP server, migrate-dev MCP tool (+5 more)

### Community 29 - "Payroll system implementation and traceability plan"
Cohesion: 0.14
Nodes (15): Payroll system implementation and traceability plan, Four-role authorization and data-scope foundation, Blocked payroll, attendance, scheduling, leave, and HR domain sources, Implementation sequence and stage gates for payroll system, Requirement-to-role-data-API-UI-security-test traceability matrix, API, export, and audit acceptance criteria, Role, permission, and record-scope acceptance tests, Payroll system acceptance and security test plan (+7 more)

### Community 30 - "dependencies"
Cohesion: 0.14
Nodes (14): dependencies, argon2@^0.45.2, mariadb@3.4.5, next@16.4.6, otpauth@^9.6.0, @prisma/adapter-mariadb@7.10.0, react@19.3.0, react-icons@^5.7.0 (+6 more)

### Community 31 - "Prisma AI safety checkpoint"
Cohesion: 0.15
Nodes (13): Prisma Compute, Prisma MongoDB Upgrade, Prisma ORM Setup, Prisma Postgres Setup, Prisma Postgres Upgrade, Prisma Studio, Explicit consent for destructive Prisma commands, Prisma AI safety checkpoint (+5 more)

### Community 32 - "Prisma Composer app setup"
Cohesion: 0.26
Nodes (12): composer section in prisma.config.ts, Declared rawPostgres or ORM postgres service dependency, Prisma Composer app setup, Service input schema and platform-bound configuration, Composer root module and service declarations, Composer Node and Next.js build adapters, Composer framework build adapters, Built output path matching service entry/dir (+4 more)

### Community 33 - "Prisma MongoDB client API mapping"
Cohesion: 0.20
Nodes (12): Prisma 7 MongoDB connector absence, Prisma MongoDB client API mapping, MongoDB aggregation pipeline builder, MongoDB driver sessions, MongoDB raw query lane, Prisma 8 MongoDB ORM API, MongoDB upgrade decision, MongoDB upgrade blockers (+4 more)

### Community 34 - "Legacy Postgres Migration Docs"
Cohesion: 0.17
Nodes (12): Deprecated prisma-postgres compatibility name, Deprecated prisma-postgres Compatibility Skill, Next.js agent rules, prisma-postgres-setup replacement, Baseline migration planning, Adopting Existing PostgreSQL Schema and Migrations, MySQL/PostgreSQL migration distinction, prisma7Schema schema adoption (+4 more)

### Community 35 - "Authentication Input Schemas"
Cohesion: 0.24
Nodes (10): ROLES, ACCOUNT_STATUSES, loginSchema, passwordChangeSchema, profileUpdateSchema, roleUpdateSchema, statusUpdateSchema, totpVerificationSchema (+2 more)

### Community 36 - "LoginClient.tsx"
Cohesion: 0.26
Nodes (7): LoginPage(), submitMfa(), LoginResponse, buildMfaVerificationPayload(), MfaVerificationMethod, instant, LoginPage()

### Community 37 - "Model queries"
Cohesion: 0.17
Nodes (12): aggregate, count, create, createMany, delete, Model queries, findFirst, findMany (+4 more)

### Community 38 - "Prisma Compute REST and control APIs"
Cohesion: 0.18
Nodes (11): @prisma/composer/control API, Prisma Compute Management REST API, Deprecated @prisma/compute-sdk flow, Deployment log streaming and cursors, Projects, services, deployments, builds, and domains, Prisma Compute agent enrollment, Prisma deploy command and control API, Prisma REST API documentation (+3 more)

### Community 39 - "Prisma CLI agent safety checkpoint"
Cohesion: 0.24
Nodes (11): Explicit consent required before destructive commands, Prisma CLI agent safety checkpoint, db push force-reset and accept-data-loss flags, prisma migrate reset, Prisma MCP server, MCP server exposing Prisma project context, Migration status, migration dev, and Studio tools; no reset tool, Prisma migrate reset (+3 more)

### Community 40 - "app-framework-builds.md"
Cohesion: 0.22
Nodes (10): app-framework-builds.md, Composer build adapters, Bundled and external runtime dependencies, Framework build output and service entry, nextjs() adapter, node() adapter, Runtime PORT and HOST binding, Framework guides (+2 more)

### Community 41 - "Filter conditions and operators"
Cohesion: 0.18
Nodes (11): Array field membership filters, Filter conditions and operators, Full-text search filters, JSON path filters, AND, OR, and NOT conditions, some, every, none, is, and isNot relation filters, Equality, comparison, list, and string filters, Query options (+3 more)

### Community 42 - "Prisma Composer app setup"
Cohesion: 0.18
Nodes (11): Composer app porting guide, Composer getting started guide, Prisma Composer documentation, Prisma Compute deploy guide, Prisma Composer, Composer configuration section, Prisma Composer app setup, Deprecated prisma.compute.ts (+3 more)

### Community 43 - "migrate-resolve.md"
Cohesion: 0.24
Nodes (9): Existing database baselining, Prisma migrate resolve, Failed migration recovery, Manually change migration state, prisma migrate resolve, Migration baselining, Mark migration as applied, Mark migration as rolled back (+1 more)

### Community 44 - "MongoDB cutover checklist"
Cohesion: 0.22
Nodes (10): MongoDB ObjectId mapping, Index parity, MongoDB server version floor, MongoDB schema contract mapping, MongoDB polymorphism, Prisma 8 MongoDB contract, Cutover rollback, MongoDB cutover checklist (+2 more)

### Community 45 - "Prisma Composer Deployment"
Cohesion: 0.24
Nodes (9): Prisma Composer app deployment model, app-composer-setup.md, Composer app scaffold, create-prisma project scaffolder, Scaffold first deploy targets production, Non-deploying --no-deploy scaffold mode, Generated PostgreSQL Composer dependency, Composer deploy and destroy operations (+1 more)

### Community 46 - "Adopt schema and migrations"
Cohesion: 0.20
Nodes (10): MongoDB collection-name addressing, Prisma 8 migration lifecycle, MongoDB collection names, prisma6Schema adapter, Vercel environment variables, Adopt schema and migrations, prisma7Schema, Prisma 8 migration retirement (+2 more)

### Community 47 - "MongoDB Schema-to-Contract Mapping"
Cohesion: 0.22
Nodes (9): BSON scalar mappings, Collection-name addressing, MongoDB Schema-to-Contract Mapping, MongoDB contract environment requirements, MongoDB enum storage values, MongoDB polymorphism and discriminators, prisma6Schema compatibility path, Prisma 8 contract model (+1 more)

### Community 48 - "MongoDB Cutover Verification Checklist"
Cohesion: 0.22
Nodes (9): Collection storage-name audit, Cutover and code rollback, Database-copy rehearsal, MongoDB Cutover Verification Checklist, Raw-call inventory, Read-only soak, Same-database staged migration, Transaction inventory (+1 more)

### Community 50 - "app-composer-setup.md"
Cohesion: 0.22
Nodes (8): compute() service declaration, Prisma Cloud deployment region, node() build adapter, postgres(contract) ORM database dependency, rawPostgres() database dependency, Root module.ts, Composer service input schemas and env bindings, Isolated empty databases per stage

### Community 51 - "deploy"
Cohesion: 0.22
Nodes (9): deploy, project, service, Deployment Workflow, GitHub Actions Workflow, Upgrade Decision Matrix, ORM Version Selection, Provisioning Options (+1 more)

### Community 52 - "db-pull.md"
Cohesion: 0.29
Nodes (7): Prisma db pull, Database schema introspection, MongoDB document sampling, schema.prisma, Database introspection, MongoDB schema inference by sampling, Schema overwrite and customization backup

### Community 53 - "prisma.config.ts"
Cohesion: 0.25
Nodes (5): prisma.config.ts, Prisma Upgrade v7 Skill, Prisma ORM 7 CLI Reference, prisma-client generator, schema.prisma

### Community 54 - "Prisma MongoDB Client API Mapping"
Cohesion: 0.25
Nodes (8): Aggregation pipeline builder, Prisma MongoDB Client API Mapping, MongoDB database commands through MongoClient, MongoDB driver-session transactions, MongoDB ORM collection-name addressing, MongoDB raw query lanes, ObjectId filters, Prisma v6 and Prisma 8 MongoDB client API differences

### Community 55 - "Prisma ORM 6 MongoDB setup"
Cohesion: 0.25
Nodes (8): Prisma v6 MongoDB, Prisma v6 db push, Prisma ORM 6 MongoDB setup, MongoDB ObjectId fields, MongoDB replica set, Prisma 6 MongoDB schema, Prisma db pull, Prisma db push

### Community 56 - "Prisma Postgres provisioning"
Cohesion: 0.25
Nodes (8): Prisma Postgres provisioning, Persistent database provisioning surfaces, Prisma Postgres resource provisioning, Temporary create-db lifecycle and claim flow, Vercel Marketplace Prisma Postgres setup, Direct and pooled Prisma Postgres endpoints, Vercel database environment variable configuration, Vercel-native Prisma Postgres integration

### Community 57 - "Compare two schema sources"
Cohesion: 0.38
Nodes (7): prisma.config.ts datasource, Prisma db execute, Native SQL script execution, Compare two schema sources, Prisma migrate diff, Schema drift detection, SQL script output

### Community 58 - "Prisma Model Queries"
Cohesion: 0.29
Nodes (7): Aggregation: count aggregate groupBy, Create operations: create createMany createManyAndReturn, Delete operations: delete deleteMany, Prisma Model Queries, Model query return types, Read operations: findUnique findFirst findMany, Update operations: update updateMany updateManyAndReturn upsert

### Community 59 - "MongoDB Migration Workflow Mapping"
Cohesion: 0.29
Nodes (7): MongoDB Migration Workflow Mapping, MongoDB migration marker storage, Non-transactional MongoDB DDL, Prisma 8 db update bootstrap, Prisma 8 db verify, Prisma 8 migration plan and migrate lifecycle, Prisma v6 MongoDB db push workflow

### Community 60 - "MongoDB migrations mapping"
Cohesion: 0.29
Nodes (7): MongoDB contract validators, db migrate, db update, db verify, MongoDB migrations mapping, migration plan, Cutover rehearsal

### Community 61 - "scripts"
Cohesion: 0.29
Nodes (7): scripts, build, dev, lint, provision:test-accounts, rotate:test-account-password, start

### Community 62 - "Prisma Upgrade v7 Skill"
Cohesion: 0.38
Nodes (7): Prisma Accelerate Users, Environment Variables, ESM and CommonJS Support, Prisma Config, Removed Features, Schema Changes, Prisma Upgrade v7 Skill

### Community 63 - "Compute automation REST and control APIs"
Cohesion: 0.47
Nodes (6): @prisma/composer/control operations, Compute automation REST and control APIs, Deprecated /v1/apps API and @prisma/compute-sdk flow, Projects, branches, services, deployments, builds, domains, and environment variables, Compute Management REST API, Environment variable values are write-only

### Community 64 - "prisma-orm-setup replacement skill"
Cohesion: 0.40
Nodes (5): Deprecated compatibility entry with no setup recipes, Deprecated prisma-database-setup compatibility entry, prisma-orm-setup replacement skill, Deprecated prisma-database-setup compatibility entry, prisma/skills repository

### Community 65 - "MongoDB Stay-or-Migrate Decision"
Cohesion: 0.33
Nodes (6): MongoDB Stay-or-Migrate Decision, Migration blocker checks, MongoDB platform requirements, MongoDB transaction blocker, Prisma 8 MongoDB Early Access status, Prisma v6 maintenance hygiene

### Community 66 - "Prisma ORM 6 MongoDB Setup"
Cohesion: 0.33
Nodes (6): Prisma ORM 6 MongoDB Setup, MongoDB db push and db pull, MongoDB ObjectId identifiers and relations, MongoDB replica set requirement, Prisma 6 MongoDB schema configuration, Prisma MongoDB connection setup

### Community 67 - "Test accounts and persistent sessions"
Cohesion: 0.33
Nodes (6): Test accounts and persistent sessions, Test account non-production database safeguards, Persistent session lifecycle and revalidation behavior, Reserved Admin, HR, and Employee test identities, Protected local test credential storage, Opt-in test account provisioning and rotation policy

### Community 68 - "eslint.config.mjs"
Cohesion: 0.33
Nodes (5): eslintConfig, eslint@^9, eslint-config-next@16.4.6, eslint, eslint-config-next

### Community 69 - "PrismaClient constructor"
Cohesion: 0.33
Nodes (6): Prisma Accelerate URL and extension, PrismaClient constructor, SQL driver adapter configuration, PrismaClient constructor options, Development and Next.js singleton pattern, Process-local query-plan cache controls

### Community 70 - "create-prisma automation"
Cohesion: 0.40
Nodes (5): First scaffold deploy targets production, create-prisma package, create-prisma automation, Non-deploying unattended scaffold options, create-prisma project scaffolding

### Community 71 - "debug.md"
Cohesion: 0.40
Nodes (4): Prisma engine binaries, Prisma environment diagnostics, Version mismatch troubleshooting, prisma debug

### Community 72 - "format.md"
Cohesion: 0.40
Nodes (4): Editor format-on-save integration, Adding missing relation fields and arguments, Prisma schema formatting, prisma format

### Community 73 - "dotenv"
Cohesion: 0.40
Nodes (4): dotenv@^18.0.10, prisma@7.10.0, dotenv, prisma

### Community 74 - "Prisma 8 Skill"
Cohesion: 0.50
Nodes (4): Prisma 8 Skill, Client API Mapping, Verify Upgrade Checklist, Driver Adapters

### Community 75 - "Project README"
Cohesion: 0.50
Nodes (4): Project README, Next.js App Router page entry point, Next.js application bootstrap, Vercel deployment

### Community 76 - "Prisma model CRUD queries"
Cohesion: 0.50
Nodes (4): Count, aggregate, and groupBy queries, Prisma model CRUD queries, Model read, create, update, and delete queries, Unique, first, many, and upsert methods

### Community 77 - "Relation queries"
Cohesion: 0.50
Nodes (4): Relation queries, Nested create and connect operations, Relation update, upsert, disconnect, delete, and set operations, Reading related records and relation counts

### Community 78 - "Prisma ORM 6 MongoDB setup"
Cohesion: 0.50
Nodes (4): Prisma ORM 6 MongoDB setup, MongoDB replica set requirement for transactions, Classic Prisma ORM 6 MongoDB setup, Prisma 6 db push and db pull workflow

### Community 79 - "Prisma 6/7 schema and migration adoption in Prisma 8"
Cohesion: 0.50
Nodes (4): Prisma 6/7 schema and migration adoption in Prisma 8, Signing existing database and creating baseline migration, Adopting Prisma ORM 6/7 schema in Prisma 8, Retiring Prisma 6/7 migration and generation commands

### Community 80 - "Prisma Console and Management API operations"
Cohesion: 0.67
Nodes (3): Prisma Console and Management API operations, OAuth and secure token storage, Typed Prisma Management API SDK

## Knowledge Gaps
- **459 isolated node(s):** `Deprecated prisma-postgres compatibility name`, `Next.js agent rules`, `Deprecated Prisma Postgres compatibility skill`, `Deprecated prisma-database-setup compatibility entry`, `prisma/skills repository` (+454 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 644 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **31 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@prisma/client` connect `PrismaClient Constructor` to `prisma migrate dev`, `package.json`?**
  _High betweenness centrality (0.127) - this node is a cross-community bridge._
- **What connects `Deprecated prisma-postgres compatibility name`, `Next.js agent rules`, `Deprecated Prisma Postgres compatibility skill` to the rest of the system?**
  _459 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `UsersRolesClient.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05553923009109609 - nodes in this community are weakly interconnected._
- **Why does `prisma db seed` connect `prisma migrate dev` to `PrismaClient Constructor`?**
  _High betweenness centrality (0.123) - this node is a cross-community bridge._
- **Should `PayrollBatchDetails.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.08215488215488216 - nodes in this community are weakly interconnected._
- **Why does `react` connect `UsersRolesClient.tsx` to `PayrollBatchDetails.tsx`, `compensation/page.tsx`, `react-icons`, `LoginClient.tsx`, `SessionRecoveryStatus`, `company/data.ts`, `package.json`, `dependencies`?**
  _High betweenness centrality (0.088) - this node is a cross-community bridge._
- **Should `compensation/page.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.0792156862745098 - nodes in this community are weakly interconnected._