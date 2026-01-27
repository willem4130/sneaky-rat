---
name: update-app
description: Update dependencies, fix deprecations and warnings
---

# Dependency Update & Deprecation Fix

## Step 1: Check for Updates

```bash
npm outdated
```

Review available updates. Note major version changes that may have breaking changes.

## Step 2: Update Dependencies

```bash
npm update
npm audit fix
```

## Step 3: Check for Deprecations & Warnings

Run a fresh install and READ ALL OUTPUT:

```bash
rm -rf node_modules package-lock.json
npm install 2>&1
```

Look for:
- Deprecation warnings
- Security vulnerabilities
- Peer dependency warnings
- Breaking changes

## Step 4: Fix Issues

For each warning/deprecation:
1. Research the recommended replacement
2. Update dependencies or code accordingly
3. Re-run `npm install`
4. Verify no warnings remain

## Step 5: Run Quality Checks

```bash
npm run typecheck
npm run lint
npm run build
```

Fix ALL errors before completing.

## Step 6: Verify Clean Install

Ensure a fresh install works with zero warnings:

```bash
rm -rf node_modules package-lock.json
npm install 2>&1
npm run build
```

Confirm:
- ZERO warnings or errors
- All dependencies resolve correctly
- Build completes successfully
