---
name: fix
description: Run typechecking, linting, and formatting, then spawn parallel agents to fix all issues
---

# Project Code Quality Check

This command runs all linting and typechecking tools for this project, collects errors, groups them by domain, and spawns parallel agents to fix them.

## Step 1: Run Linting and Typechecking

Run these commands and collect all errors:

```bash
npm run typecheck 2>&1
npm run lint 2>&1
```

## Step 2: Collect and Parse Errors

Parse the output from the commands above. Group errors by domain:
- **Type errors**: Issues from TypeScript (`tsc --noEmit`)
- **Lint errors**: Issues from ESLint (`eslint .`)

Create a list of all files with issues and the specific problems in each file.

## Step 3: Spawn Parallel Agents

For each domain that has issues, spawn an agent in parallel using the Task tool.

**IMPORTANT**: Use a SINGLE response with MULTIPLE Task tool calls to run agents in parallel.

Example agent prompts:

**Type Error Fixer Agent**:
```
Fix all TypeScript type errors in this project. Here are the errors:
[paste type errors]

For each file:
1. Read the file
2. Fix the type errors
3. Run `npm run typecheck` to verify

Do NOT modify any behavior - only fix type errors.
```

**Lint Error Fixer Agent**:
```
Fix all ESLint errors in this project. Here are the errors:
[paste lint errors]

For each file:
1. Read the file
2. Fix the lint errors (or add eslint-disable comments for false positives)
3. Run `npm run lint` to verify

Do NOT modify any behavior - only fix lint issues.
```

## Step 4: Verify All Fixes

After all agents complete, run the full check again:

```bash
npm run typecheck && npm run lint
```

Report success or any remaining issues.
