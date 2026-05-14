# Chimera

Creature Trainer POC repository.

- Linear project: Creature Trainer POC (Chimera)
- Repo: https://github.com/electropicks/chimera
- Production: https://chimera-dnb.pages.dev

## Cloudflare Pages

Chimera deploys the `packages/app` Vite bundle to Cloudflare Pages.

| Setting | Value |
| --- | --- |
| Cloudflare Pages project identifier | `chimera` |
| Production URL / assigned Pages host | `https://chimera-dnb.pages.dev` |
| Production branch | `main` |
| Build command | `pnpm --filter @creature/app build` |
| Output directory | `packages/app/dist` |
| App path | `packages/app` |

Do not use `https://chimera.pages.dev` for this project; that host belongs to a different site. This repo deploys through the Cloudflare Pages project identifier `chimera`; Cloudflare returns `*.chimera-dnb.pages.dev` deployment URLs for that project. Do not change the workflow project identifier to `chimera-dnb` unless the Cloudflare project is renamed first.

The repository workflow in `.github/workflows/cloudflare-pages.yml` runs on every pull request and on pushes to `main`. Pull requests deploy a Cloudflare Pages preview for the PR branch and update a sticky PR comment with the preview URL. Pushes to `main` deploy production.

Required GitHub Actions secrets:

- `CLOUDFLARE_API_TOKEN`: Cloudflare API token scoped to Pages access for the configured Pages project.
- `CLOUDFLARE_ACCOUNT_ID`: Cloudflare account ID that owns the configured Pages project.

Manual Cloudflare setup still required outside the repo:

1. Create or connect the configured Cloudflare Pages project to `https://github.com/electropicks/chimera`.
2. Configure production branch deploys from `main`.
3. Confirm preview deployments are enabled for pull request branches.
4. Confirm the deployment URL returned by the workflow is under `chimera-dnb.pages.dev` unless a custom domain replaces it.
5. Add the two GitHub Actions secrets listed above before relying on the workflow.
