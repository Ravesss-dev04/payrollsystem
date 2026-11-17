# Graph Report - payrollsystem  (2026-11-15)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 1370 nodes · 2364 edges · 103 communities (73 shown, 30 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 21 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `b1f760b2`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Authentication Route Handlers
- Password and MFA Cryptography
- Attendance Policy Prototypes
- Account and Admin Shell
- Company and Payroll Prototypes
- Compensation Demo Records
- Approved Workforce Roles
- Prisma Relation Operations
- Company Data Client
- Prisma Client Lifecycle
- Prisma Query Filters
- Dashboard Safe Slice Design
- Prisma CLI Workflow
- MongoDB Upgrade Guidance
- Project Dependency Configuration
- Migration Deployment Workflow
- Migration State Management
- MongoDB Schema Contracts
- TypeScript Compiler Configuration
- Prisma Config and Seeding
- Prisma Development Databases
- MongoDB Client API Migration
- Prisma Postgres Provisioning
- Destructive Command Safety
- System Requirements Traceability
- Database Change Consent
- Prisma Client Configuration
- MongoDB Client Operations
- MongoDB Migration Planning
- SQL Schema Diff Workflows
- MongoDB Schema Mapping
- Application Dependencies
- Prisma Documentation Index
- Prisma Composer Setup
- Legacy Postgres Migration Docs
- Authentication Input Schemas
- Authentication Rate Limiting
- Login and MFA Flow
- Prisma Aggregation Queries
- Prisma Compute REST APIs
- Prisma Console Management
- Composer Build Adapters
- Prisma Filter Semantics
- Composer Application Porting
- Database Schema Introspection
- Prisma Composer Deployment
- Vercel Database Setup
- Composer Service Configuration
- Workflow and Release Gates
- Prisma Upgrade Resources
- Prisma 6 MongoDB Setup
- Postgres Resource Provisioning
- Prisma Schema Comparison
- Prisma Model CRUD
- Project Command Scripts
- Prisma Version Upgrade
- Prisma Compute Control Plane
- Deprecated Database Setup
- MongoDB Replica Set Setup
- Test Account Policy
- ESLint Configuration
- Prisma Adapter Configuration
- Project Scaffolding
- Prisma Debug Diagnostics
- Prisma Schema Formatting
- Prisma Runtime Configuration
- Prisma 8 Upgrade Documentation
- Project README Guidance
- Prisma CRUD Methods
- Prisma Relation Queries
- MongoDB Compatibility
- Existing Schema Adoption
- Prisma Console Operations
- Shell Completion Support
- Prisma Diagnostic Tools
- Schema Formatter Integration
- Next.js Agent Guidance
- Prisma Postgres Setup
- Postgres Upgrade and Compute
- Authentication First Checks
- Prisma Client API
- Prisma Shell Completion
- Deprecated Setup Skill
- Prisma Client Setup
- CockroachDB Adapter Setup
- MySQL Provider Setup
- Prisma Postgres ORM
- SQLite Provider Setup
- SQL Server Provider Setup
- Prisma API Reference
- Prisma Dev Lifecycle
- Postgres Command Reference
- Migration Troubleshooting
- Database Environment Variables
- Platform Limits
- AI Agent Safety
- Prisma Breaking Changes
- Prisma Validation

## God Nodes (most connected - your core abstractions)
1. `loadSecurityConfig()` - 25 edges
2. `react` - 23 edges
3. `react-icons` - 23 edges
4. `requirePagePermission()` - 19 edges
5. `Prisma ORM 7.9.0 release` - 19 edges
6. `POST()` - 18 edges
7. `POST()` - 18 edges
8. `PayrollDetail()` - 18 edges
9. `DashboardUnavailableState()` - 17 edges
10. `provisionTestAccounts()` - 16 edges

## Surprising Connections (you probably didn't know these)
- `PrismaClient constructor` --references--> `@prisma/client`  [EXTRACTED]
  .claude/skills/prisma-client-api/references/constructor.md → package.json
- `prisma db seed` --references--> `@prisma/client`  [EXTRACTED]
  .windsurf/skills/prisma-cli/references/db-seed.md → package.json
- `provisionTestAccounts()` --indirect_call--> `createRecoveryCode()`  [INFERRED]
  prisma/provision-test-accounts.ts → app/lib/auth/tokens.ts
- `rotateTestAccountPassword()` --indirect_call--> `createRecoveryCode()`  [INFERRED]
  prisma/rotate-test-account-password.ts → app/lib/auth/tokens.ts
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

## Communities (103 total, 30 thin omitted)

### Community 0 - "Authentication Route Handlers"
Cohesion: 0.05
Nodes (79): POST(), POST(), POST(), MfaAttemptRejectedError, POST(), recordFailedAttempt(), rejectAttempt(), GET() (+71 more)

### Community 1 - "Password and MFA Cryptography"
Cohesion: 0.07
Nodes (44): COMMON_PASSWORDS, hashPassword(), isValidEmail(), normalizeEmail(), validateNewPassword(), verifyPassword(), AAD, assertKey() (+36 more)

### Community 2 - "Attendance Policy Prototypes"
Cohesion: 0.07
Nodes (48): AttendancePolicies(), badge, base, conflicts(), days, Details(), Dialog(), Editor() (+40 more)

### Community 3 - "Account and Admin Shell"
Cohesion: 0.07
Nodes (36): EmployeeAccountPage(), instant, AdminShell(), AdminHeader(), AdminNotifications(), initial, Notice, AdminProfileMenu() (+28 more)

### Community 4 - "Company and Payroll Prototypes"
Cohesion: 0.08
Nodes (41): CompanyPage(), DemoDataNotice(), Adjustments(), Badge(), Breakdown(), deduct, Dialog(), download() (+33 more)

### Community 5 - "Compensation Demo Records"
Cohesion: 0.08
Nodes (45): adjustments, allowances, bonuses, employees, grades, adjustmentFields, allowanceFields, BonusDetails() (+37 more)

### Community 6 - "Approved Workforce Roles"
Cohesion: 0.05
Nodes (51): Admin role, Cross-role employee self-service, Role and feature specification, Employee role, Feature inventory, HR role, Policy and data gates, Team Leader role (+43 more)

### Community 7 - "Prisma Relation Operations"
Cohesion: 0.05
Nodes (43): Count related records, Create or connect related records, Disconnect and delete related records, Prisma Relation Queries, Include and select relations, Nested writes, Update and upsert related records, Prisma Transactions (+35 more)

### Community 8 - "Company Data Client"
Cohesion: 0.12
Nodes (23): businessTypes, holidayTypes, initialBranches, initialCompany, initialDepartments, initialHolidays, BusinessType, CompanyBranch (+15 more)

### Community 9 - "Prisma Client Lifecycle"
Cohesion: 0.06
Nodes (27): Client lifecycle: $connect and $disconnect, Prisma Client Methods, Prisma event subscriptions: $on, Prisma extensions: $extends, Prisma transactions: $transaction, Prisma type utilities, Raw query methods: $queryRaw and $executeRaw, Type-safe query fragments with satisfies (+19 more)

### Community 10 - "Prisma Query Filters"
Cohesion: 0.08
Nodes (30): Array field filters, Comparison filters, Filter Conditions and Operators, Equality filters, Full-text search, JSON filters, List filters, Logical operators: AND OR NOT (+22 more)

### Community 11 - "Dashboard Safe Slice Design"
Cohesion: 0.07
Nodes (26): Admin-only dashboard authorization, Dashboard unavailable states, Admin Dashboard Safe Slice Plan, Manila-local dashboard date and greeting, Non-persistent demo-data notice, Payroll HR domain-workflow plan, Server-validated session principal, Three-role safe-slice constraint (+18 more)

### Community 12 - "Prisma CLI Workflow"
Cohesion: 0.10
Nodes (21): Prisma shell completion, Supported shells: zsh, bash, fish, PowerShell, Migration history is not tracked by db push, Direct schema synchronization, Seed configuration in prisma.config.ts, Prisma Postgres instance management, Local Prisma Postgres, prisma generate (+13 more)

### Community 13 - "MongoDB Upgrade Guidance"
Cohesion: 0.09
Nodes (24): Prisma 6 to Prisma 8 MongoDB client API mapping, Prisma 8 MongoDB typed aggregation pipeline, MongoDB driver sessions for multi-document atomicity, Prisma 6-to-8 MongoDB client API mapping, MongoDB stay-or-migrate decision, Prisma 8 MongoDB Early Access status and requirements, Decision to migrate MongoDB projects to Prisma 8 or stay on v6, Prisma 6 maintenance and setup hygiene (+16 more)

### Community 14 - "Project Dependency Configuration"
Cohesion: 0.12
Nodes (21): devDependencies, tailwindcss@4.3.3, @tailwindcss/turbopack@4.3.3, @types/bun@^1.4.4, @types/node@^20, @types/react@^19, @types/react-dom@^19, typescript@^5 (+13 more)

### Community 15 - "Migration Deployment Workflow"
Cohesion: 0.13
Nodes (20): Prisma migrate deploy, Apply pending migrations in production and staging, _prisma_migrations table, Prisma migrate status, Applied, pending, missing, and failed migration status, MongoDB db push workflow, prisma db push, Migration history not tracked by db push (+12 more)

### Community 16 - "Migration State Management"
Cohesion: 0.12
Nodes (17): Existing database baselining, Prisma migrate resolve, Failed migration recovery, Manually change migration state, prisma migrate deploy, CI/CD migration deployment, prisma migrate resolve, prisma migrate status (+9 more)

### Community 17 - "MongoDB Schema Contracts"
Cohesion: 0.11
Nodes (20): BSON scalar mappings, Collection-name addressing, MongoDB Schema-to-Contract Mapping, MongoDB contract environment requirements, MongoDB enum storage values, MongoDB ObjectId mapping, MongoDB polymorphism and discriminators, prisma6Schema compatibility path (+12 more)

### Community 18 - "TypeScript Compiler Configuration"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 19 - "Prisma Config and Seeding"
Cohesion: 0.14
Nodes (18): prisma.config.ts migrations.seed, Prisma db seed, Configured database seed script, Idempotent seeding with upsert, Existing database introspection, prisma db pull, MongoDB schema sampling, Prisma schema (+10 more)

### Community 20 - "Prisma Development Databases"
Cohesion: 0.16
Nodes (15): Prisma dev, Local database instance lifecycle, Local Prisma PostgreSQL database, Generated Prisma Client, Prisma generate, Prisma schema generator blocks, Project schema, config, environment file, and gitignore, Prisma init (+7 more)

### Community 21 - "MongoDB Client API Migration"
Cohesion: 0.15
Nodes (16): Prisma 7 MongoDB connector absence, Index parity, Prisma MongoDB client API mapping, MongoDB aggregation pipeline builder, MongoDB driver sessions, MongoDB raw query lane, Prisma 8 MongoDB ORM API, MongoDB upgrade decision (+8 more)

### Community 22 - "Prisma Postgres Provisioning"
Cohesion: 0.12
Nodes (16): Standalone Prisma Postgres Provisioning, Management API provisioning, Prisma Platform CLI provisioning, Provisioning authentication and errors, Resource regions and asynchronous creation, Reuse existing Prisma Postgres resources, Secret storage for database credentials, Temporary create-db lifecycle (+8 more)

### Community 23 - "Destructive Command Safety"
Cohesion: 0.13
Nodes (13): prisma db push --accept-data-loss, prisma db push --force-reset, Destructive Prisma commands, Explicit user consent, MCP destructive-command boundary, agent-safety.md consent workflow, Prisma MCP server, migrate-dev MCP tool (+5 more)

### Community 24 - "System Requirements Traceability"
Cohesion: 0.14
Nodes (15): Payroll system implementation and traceability plan, Four-role authorization and data-scope foundation, Blocked payroll, attendance, scheduling, leave, and HR domain sources, Implementation sequence and stage gates for payroll system, Requirement-to-role-data-API-UI-security-test traceability matrix, API, export, and audit acceptance criteria, Role, permission, and record-scope acceptance tests, Payroll system acceptance and security test plan (+7 more)

### Community 25 - "Database Change Consent"
Cohesion: 0.19
Nodes (14): Explicit consent required before destructive commands, Prisma CLI agent safety checkpoint, db push force-reset and accept-data-loss flags, prisma migrate reset, Prisma db push, Consent checkpoint for data-loss flags, Direct schema synchronization without migration history, Prisma MCP server (+6 more)

### Community 26 - "Prisma Client Configuration"
Cohesion: 0.16
Nodes (14): Accelerate URL, Client logging and log events, PrismaClient Constructor, Error formatting, Next.js client pattern, Query plan cache, Singleton client pattern, SQL comments for observability (+6 more)

### Community 27 - "MongoDB Client Operations"
Cohesion: 0.14
Nodes (14): Aggregation pipeline builder, Prisma MongoDB Client API Mapping, MongoDB database commands through MongoClient, MongoDB driver-session transactions, MongoDB ORM collection-name addressing, MongoDB raw query lanes, ObjectId filters, Prisma v6 and Prisma 8 MongoDB client API differences (+6 more)

### Community 28 - "MongoDB Migration Planning"
Cohesion: 0.14
Nodes (14): MongoDB Migration Workflow Mapping, MongoDB contract validators, MongoDB migration marker storage, Non-transactional MongoDB DDL, Prisma 8 db update bootstrap, Prisma 8 db verify, Prisma 8 migration plan and migrate lifecycle, Prisma v6 MongoDB db push workflow (+6 more)

### Community 29 - "SQL Schema Diff Workflows"
Cohesion: 0.16
Nodes (12): Datasource in prisma.config.ts, SQL output from prisma migrate diff, Native SQL execution, prisma db execute, Baseline migration generation, Database drift detection, Empty, schema, migrations, URL, and configured datasource sources, Database schema comparison (+4 more)

### Community 30 - "MongoDB Schema Mapping"
Cohesion: 0.15
Nodes (14): MongoDB collection-name addressing, Prisma 8 migration lifecycle, MongoDB schema contract mapping, MongoDB collection names, MongoDB polymorphism, prisma6Schema adapter, Prisma 8 MongoDB contract, Same-database cutover (+6 more)

### Community 31 - "Application Dependencies"
Cohesion: 0.14
Nodes (14): dependencies, argon2@^0.45.2, mariadb@3.4.5, next@16.4.6, otpauth@^9.6.0, @prisma/client@7.10.0, react@19.3.0, react-icons@^5.7.0 (+6 more)

### Community 32 - "Prisma Documentation Index"
Cohesion: 0.15
Nodes (13): Prisma Compute, Prisma MongoDB Upgrade, Prisma ORM Setup, Prisma Postgres Setup, Prisma Postgres Upgrade, Prisma Studio, Explicit consent for destructive Prisma commands, Prisma AI safety checkpoint (+5 more)

### Community 33 - "Prisma Composer Setup"
Cohesion: 0.26
Nodes (12): composer section in prisma.config.ts, Declared rawPostgres or ORM postgres service dependency, Prisma Composer app setup, Service input schema and platform-bound configuration, Composer root module and service declarations, Composer Node and Next.js build adapters, Composer framework build adapters, Built output path matching service entry/dir (+4 more)

### Community 34 - "Legacy Postgres Migration Docs"
Cohesion: 0.17
Nodes (12): Deprecated prisma-postgres compatibility name, Deprecated prisma-postgres Compatibility Skill, Next.js agent rules, prisma-postgres-setup replacement, Baseline migration planning, Adopting Existing PostgreSQL Schema and Migrations, MySQL/PostgreSQL migration distinction, prisma7Schema schema adoption (+4 more)

### Community 35 - "Authentication Input Schemas"
Cohesion: 0.24
Nodes (10): ROLES, ACCOUNT_STATUSES, loginSchema, passwordChangeSchema, profileUpdateSchema, roleUpdateSchema, statusUpdateSchema, totpVerificationSchema (+2 more)

### Community 36 - "Authentication Rate Limiting"
Cohesion: 0.20
Nodes (4): RateLimitOptions, RateLimitResult, RateLimitStore, MemoryRateLimitStore

### Community 37 - "Login and MFA Flow"
Cohesion: 0.26
Nodes (7): LoginPage(), submitMfa(), LoginResponse, buildMfaVerificationPayload(), MfaVerificationMethod, instant, LoginPage()

### Community 38 - "Prisma Aggregation Queries"
Cohesion: 0.17
Nodes (12): aggregate, count, create, createMany, delete, Model queries, findFirst, findMany (+4 more)

### Community 39 - "Prisma Compute REST APIs"
Cohesion: 0.18
Nodes (11): @prisma/composer/control API, Prisma Compute Management REST API, Deprecated @prisma/compute-sdk flow, Deployment log streaming and cursors, Projects, services, deployments, builds, and domains, Prisma Compute agent enrollment, Prisma deploy command and control API, Prisma REST API documentation (+3 more)

### Community 40 - "Prisma Console Management"
Cohesion: 0.18
Nodes (11): Credential handling and pagination, Prisma Postgres Console and Management Operations, OAuth token refresh and secure storage, Prisma Console resource inspection, Prisma Management API SDK, Version-matched ORM migrations, Database credentials, Prisma Postgres operations (+3 more)

### Community 41 - "Composer Build Adapters"
Cohesion: 0.22
Nodes (10): app-framework-builds.md, Composer build adapters, Bundled and external runtime dependencies, Framework build output and service entry, nextjs() adapter, node() adapter, Runtime PORT and HOST binding, Framework guides (+2 more)

### Community 42 - "Prisma Filter Semantics"
Cohesion: 0.18
Nodes (11): Array field membership filters, Filter conditions and operators, Full-text search filters, JSON path filters, AND, OR, and NOT conditions, some, every, none, is, and isNot relation filters, Equality, comparison, list, and string filters, Query options (+3 more)

### Community 43 - "Composer Application Porting"
Cohesion: 0.18
Nodes (11): Composer app porting guide, Composer getting started guide, Prisma Composer documentation, Prisma Compute deploy guide, Prisma Composer, Composer configuration section, Prisma Composer app setup, Deprecated prisma.compute.ts (+3 more)

### Community 44 - "Database Schema Introspection"
Cohesion: 0.22
Nodes (9): Prisma db pull, Database schema introspection, MongoDB document sampling, schema.prisma, Database introspection, MongoDB schema inference by sampling, prisma init, Schema overwrite and customization backup (+1 more)

### Community 45 - "Prisma Composer Deployment"
Cohesion: 0.24
Nodes (9): Prisma Composer app deployment model, app-composer-setup.md, Composer app scaffold, create-prisma project scaffolder, Scaffold first deploy targets production, Non-deploying --no-deploy scaffold mode, Generated PostgreSQL Composer dependency, Composer deploy and destroy operations (+1 more)

### Community 46 - "Vercel Database Setup"
Cohesion: 0.22
Nodes (9): Vercel deployment validation, create-db temporary database, Database resource readiness, Prisma Postgres provisioning, Prisma Platform CLI, Direct database endpoint, Prisma Postgres Vercel Marketplace, Pooled database endpoint (+1 more)

### Community 47 - "Composer Service Configuration"
Cohesion: 0.22
Nodes (8): compute() service declaration, Prisma Cloud deployment region, node() build adapter, postgres(contract) ORM database dependency, rawPostgres() database dependency, Root module.ts, Composer service input schemas and env bindings, Isolated empty databases per stage

### Community 48 - "Workflow and Release Gates"
Cohesion: 0.22
Nodes (9): deploy, project, service, Deployment Workflow, GitHub Actions Workflow, Upgrade Decision Matrix, ORM Version Selection, Provisioning Options (+1 more)

### Community 49 - "Prisma Upgrade Resources"
Cohesion: 0.25
Nodes (5): prisma.config.ts, Prisma Upgrade v7 Skill, Prisma ORM 7 CLI Reference, prisma-client generator, schema.prisma

### Community 50 - "Prisma 6 MongoDB Setup"
Cohesion: 0.25
Nodes (8): Prisma v6 MongoDB, Prisma v6 db push, Prisma ORM 6 MongoDB setup, MongoDB ObjectId fields, MongoDB replica set, Prisma 6 MongoDB schema, Prisma db pull, Prisma db push

### Community 51 - "Postgres Resource Provisioning"
Cohesion: 0.25
Nodes (8): Prisma Postgres provisioning, Persistent database provisioning surfaces, Prisma Postgres resource provisioning, Temporary create-db lifecycle and claim flow, Vercel Marketplace Prisma Postgres setup, Direct and pooled Prisma Postgres endpoints, Vercel database environment variable configuration, Vercel-native Prisma Postgres integration

### Community 52 - "Prisma Schema Comparison"
Cohesion: 0.38
Nodes (7): prisma.config.ts datasource, Prisma db execute, Native SQL script execution, Compare two schema sources, Prisma migrate diff, Schema drift detection, SQL script output

### Community 53 - "Prisma Model CRUD"
Cohesion: 0.29
Nodes (7): Aggregation: count aggregate groupBy, Create operations: create createMany createManyAndReturn, Delete operations: delete deleteMany, Prisma Model Queries, Model query return types, Read operations: findUnique findFirst findMany, Update operations: update updateMany updateManyAndReturn upsert

### Community 54 - "Project Command Scripts"
Cohesion: 0.29
Nodes (7): scripts, build, dev, lint, provision:test-accounts, rotate:test-account-password, start

### Community 55 - "Prisma Version Upgrade"
Cohesion: 0.38
Nodes (7): Prisma Accelerate Users, Environment Variables, ESM and CommonJS Support, Prisma Config, Removed Features, Schema Changes, Prisma Upgrade v7 Skill

### Community 56 - "Prisma Compute Control Plane"
Cohesion: 0.47
Nodes (6): @prisma/composer/control operations, Compute automation REST and control APIs, Deprecated /v1/apps API and @prisma/compute-sdk flow, Projects, branches, services, deployments, builds, domains, and environment variables, Compute Management REST API, Environment variable values are write-only

### Community 57 - "Deprecated Database Setup"
Cohesion: 0.40
Nodes (5): Deprecated compatibility entry with no setup recipes, Deprecated prisma-database-setup compatibility entry, prisma-orm-setup replacement skill, Deprecated prisma-database-setup compatibility entry, prisma/skills repository

### Community 58 - "MongoDB Replica Set Setup"
Cohesion: 0.33
Nodes (6): Prisma ORM 6 MongoDB Setup, MongoDB db push and db pull, MongoDB ObjectId identifiers and relations, MongoDB replica set requirement, Prisma 6 MongoDB schema configuration, Prisma MongoDB connection setup

### Community 59 - "Test Account Policy"
Cohesion: 0.33
Nodes (6): Test accounts and persistent sessions, Test account non-production database safeguards, Persistent session lifecycle and revalidation behavior, Reserved Admin, HR, and Employee test identities, Protected local test credential storage, Opt-in test account provisioning and rotation policy

### Community 60 - "ESLint Configuration"
Cohesion: 0.33
Nodes (5): eslintConfig, eslint@^9, eslint-config-next@16.4.6, eslint, eslint-config-next

### Community 61 - "Prisma Adapter Configuration"
Cohesion: 0.33
Nodes (6): Prisma Accelerate URL and extension, PrismaClient constructor, SQL driver adapter configuration, PrismaClient constructor options, Development and Next.js singleton pattern, Process-local query-plan cache controls

### Community 62 - "Project Scaffolding"
Cohesion: 0.40
Nodes (5): First scaffold deploy targets production, create-prisma package, create-prisma automation, Non-deploying unattended scaffold options, create-prisma project scaffolding

### Community 63 - "Prisma Debug Diagnostics"
Cohesion: 0.40
Nodes (4): Prisma engine binaries, Prisma environment diagnostics, Version mismatch troubleshooting, prisma debug

### Community 64 - "Prisma Schema Formatting"
Cohesion: 0.40
Nodes (4): Editor format-on-save integration, Adding missing relation fields and arguments, Prisma schema formatting, prisma format

### Community 65 - "Prisma Runtime Configuration"
Cohesion: 0.40
Nodes (4): dotenv@^18.0.10, prisma@7.10.0, dotenv, prisma

### Community 66 - "Prisma 8 Upgrade Documentation"
Cohesion: 0.50
Nodes (4): Prisma 8 Skill, Client API Mapping, Verify Upgrade Checklist, Driver Adapters

### Community 67 - "Project README Guidance"
Cohesion: 0.50
Nodes (4): Project README, Next.js App Router page entry point, Next.js application bootstrap, Vercel deployment

### Community 68 - "Prisma CRUD Methods"
Cohesion: 0.50
Nodes (4): Count, aggregate, and groupBy queries, Prisma model CRUD queries, Model read, create, update, and delete queries, Unique, first, many, and upsert methods

### Community 69 - "Prisma Relation Queries"
Cohesion: 0.50
Nodes (4): Relation queries, Nested create and connect operations, Relation update, upsert, disconnect, delete, and set operations, Reading related records and relation counts

### Community 70 - "MongoDB Compatibility"
Cohesion: 0.50
Nodes (4): Prisma ORM 6 MongoDB setup, MongoDB replica set requirement for transactions, Classic Prisma ORM 6 MongoDB setup, Prisma 6 db push and db pull workflow

### Community 71 - "Existing Schema Adoption"
Cohesion: 0.50
Nodes (4): Prisma 6/7 schema and migration adoption in Prisma 8, Signing existing database and creating baseline migration, Adopting Prisma ORM 6/7 schema in Prisma 8, Retiring Prisma 6/7 migration and generation commands

### Community 72 - "Prisma Console Operations"
Cohesion: 0.67
Nodes (3): Prisma Console and Management API operations, OAuth and secure token storage, Typed Prisma Management API SDK

## Knowledge Gaps
- **459 isolated node(s):** `Deprecated prisma-postgres compatibility name`, `Next.js agent rules`, `Deprecated Prisma Postgres compatibility skill`, `Deprecated prisma-database-setup compatibility entry`, `prisma/skills repository` (+454 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 627 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **30 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@prisma/client` connect `Application Dependencies` to `Prisma Client Configuration`, `Prisma Config and Seeding`, `Project Dependency Configuration`?**
  _High betweenness centrality (0.153) - this node is a cross-community bridge._
- **What connects `Deprecated prisma-postgres compatibility name`, `Next.js agent rules`, `Deprecated Prisma Postgres compatibility skill` to the rest of the system?**
  _459 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Authentication Route Handlers` be split into smaller, more focused modules?**
  _Cohesion score 0.05224346956630421 - nodes in this community are weakly interconnected._
- **Why does `prisma db seed` connect `Prisma Config and Seeding` to `Application Dependencies`, `Migration Deployment Workflow`?**
  _High betweenness centrality (0.141) - this node is a cross-community bridge._
- **Should `Password and MFA Cryptography` be split into smaller, more focused modules?**
  _Cohesion score 0.06832298136645963 - nodes in this community are weakly interconnected._
- **Why does `react` connect `Attendance Policy Prototypes` to `Password and MFA Cryptography`, `Account and Admin Shell`, `Company and Payroll Prototypes`, `Login and MFA Flow`, `Compensation Demo Records`, `Company Data Client`, `Project Dependency Configuration`, `Application Dependencies`?**
  _High betweenness centrality (0.092) - this node is a cross-community bridge._
- **Should `Attendance Policy Prototypes` be split into smaller, more focused modules?**
  _Cohesion score 0.07203751065643649 - nodes in this community are weakly interconnected._