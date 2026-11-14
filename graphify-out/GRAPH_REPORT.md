# Graph Report - payrollsystems  (2026-11-13)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 135 nodes · 107 edges · 35 communities (11 shown, 24 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 6 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `4feb0e80`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Community 0
- Community 1
- Community 2
- Community 3
- Community 4
- Community 5
- Community 6
- Community 7
- Community 8
- Community 9
- Community 10
- Community 12
- Community 13
- Community 14
- Community 15
- Community 18
- Community 19
- Community 20
- Community 21
- Community 22
- Community 23
- Community 24
- Community 25
- Community 26
- Community 27
- Community 28
- Community 29
- Community 30
- Community 31
- Community 32
- Community 33

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 16 edges
2. `Prisma Upgrade v7 Skill` - 6 edges
3. `scripts` - 5 edges
4. `deploy` - 5 edges
5. `next` - 4 edges
6. `Prisma ORM Setup` - 4 edges
7. `ORM Version Selection` - 3 edges
8. `prisma.config.ts` - 3 edges
9. `prisma-cli` - 3 edges
10. `Prisma Config` - 3 edges

## Surprising Connections (you probably didn't know these)
- `Prisma Compute Skill` --references--> `Prisma Postgres Upgrade Skill`  [EXTRACTED]
  .claude/skills/prisma-compute/SKILL.md → .agents/skills/prisma-postgres-upgrade/SKILL.md
- `Postgres Upgrade Path` --conceptually_related_to--> `deploy`  [INFERRED]
  .claude/skills/prisma-postgres-upgrade/SKILL.md → .claude/skills/prisma-compute/references/cli-command-map.md
- `Prisma ORM 7 CLI Reference` --references--> `prisma.config.ts`  [EXTRACTED]
  .claude/skills/prisma-cli/SKILL.md → .agents/skills/prisma-upgrade-v7/references/prisma-config.md
- `prisma-client-api` --conceptually_related_to--> `prisma-driver-adapter-implementation`  [INFERRED]
  .agents/skills/prisma-client-api/SKILL.md → .agents/skills/prisma-driver-adapter-implementation/SKILL.md
- `Prisma Client API` --conceptually_related_to--> `Prisma Driver Adapter Implementation`  [INFERRED]
  .windsurf/skills/prisma-client-api/SKILL.md → .windsurf/skills/prisma-driver-adapter-implementation/SKILL.md

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
- **Prisma Postgres Upgrade Path** — windsurf_skills_prisma_postgres_upgrade_references_client_api_mapping, windsurf_skills_prisma_postgres_upgrade_references_verify_upgrade_checklist, prisma_8_skill [INFERRED 0.80]
- **Prisma 8 Upgrade & Compute Path** — agents_skills_prisma_postgres_upgrade_skill [INFERRED 0.85]
- **Prisma ORM Version Management** — prisma_orm_setup_selection, prisma_postgres_upgrade_path, prisma_mongodb_upgrade_decision, prisma_upgrade_v7_breaking_changes [INFERRED 0.85]

## Communities (35 total, 24 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.10
Nodes (19): eslintConfig, ignoreScripts, name, packageManager, private, trustedDependencies, version, eslint (+11 more)

### Community 1 - "Community 1"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 2 - "Community 2"
Cohesion: 0.18
Nodes (5): geistMono, geistSans, metadata, nextConfig, next

### Community 3 - "Community 3"
Cohesion: 0.20
Nodes (10): devDependencies, eslint, eslint-config-next, prisma, tailwindcss, @tailwindcss/turbopack, @types/node, @types/react (+2 more)

### Community 4 - "Community 4"
Cohesion: 0.22
Nodes (9): deploy, project, service, Deployment Workflow, GitHub Actions Workflow, Upgrade Decision Matrix, ORM Version Selection, Provisioning Options (+1 more)

### Community 5 - "Community 5"
Cohesion: 0.25
Nodes (5): prisma.config.ts, Prisma Upgrade v7 Skill, Prisma ORM 7 CLI Reference, prisma-client generator, schema.prisma

### Community 6 - "Community 6"
Cohesion: 0.38
Nodes (7): Prisma Accelerate Users, Environment Variables, ESM and CommonJS Support, Prisma Config, Removed Features, Schema Changes, Prisma Upgrade v7 Skill

### Community 7 - "Community 7"
Cohesion: 0.33
Nodes (6): Prisma Compute, Prisma MongoDB Upgrade, Prisma ORM Setup, Prisma Postgres Setup, Prisma Postgres Upgrade, Prisma Studio

### Community 8 - "Community 8"
Cohesion: 0.40
Nodes (5): dependencies, next, @prisma/client, react, react-dom

### Community 9 - "Community 9"
Cohesion: 0.40
Nodes (5): scripts, build, dev, lint, start

### Community 10 - "Community 10"
Cohesion: 0.50
Nodes (4): Prisma 8 Skill, Client API Mapping, Verify Upgrade Checklist, Driver Adapters

## Knowledge Gaps
- **51 isolated node(s):** `@prisma/client`, `react`, `react-dom`, `tailwindcss`, `@tailwindcss/turbopack` (+46 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 106 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **24 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `Community 2` to `Community 0`?**
  _High betweenness centrality (0.050) - this node is a cross-community bridge._
- **What connects `@prisma/client`, `react`, `react-dom` to the rest of the system?**
  _51 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.09523809523809523 - nodes in this community are weakly interconnected._
- **Why does `devDependencies` connect `Community 3` to `Community 0`?**
  _High betweenness centrality (0.047) - this node is a cross-community bridge._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.10526315789473684 - nodes in this community are weakly interconnected._
- **Why does `dependencies` connect `Community 8` to `Community 0`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._