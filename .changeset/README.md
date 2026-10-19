# Changesets

This repository uses [Changesets](https://github.com/changesets/changesets) to manage versioning and releases for the `@spilecms/sdk` package.

## Adding a Changeset

When you open a PR that modifies `@spilecms/sdk`, run:

```bash
pnpm changeset
```

Follow the interactive prompts:
1. Select `@spilecms/sdk`.
2. Choose the release type:
   - **patch**: Bug fixes and small internal enhancements.
   - **minor**: New features, new hooks, or backward-compatible API additions.
   - **major**: Breaking changes.
3. Write a summary describing what changed.

Commit the generated `.changeset/*.md` file with your pull request.

## How Releases Work

1. When a PR with a changeset is merged into `main`, GitHub Actions automatically creates or updates a **"Version Packages (SDK)"** pull request.
2. The Version PR bumps versions, updates `CHANGELOG.md`, and removes consumed changeset files.
3. When maintainers merge the **"Version Packages (SDK)"** PR, GitHub Actions automatically builds and publishes the new version to npm with provenance.
