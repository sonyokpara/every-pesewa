---
name: deploy-render
description: Deploy Every Pesewa to Render as a static site from the GitHub repo, or redeploy and check an existing deployment. Use when the user asks to "deploy", "publish the app", "put it online", "host it on Render", "redeploy", or "check the live site / deploy status".
---

# Deploy Every Pesewa to Render

The app is client-only (React + Vite, data in IndexedDB), so it deploys as a Render **static
site**: Render clones `github.com/sonyokpara/every-pesewa`, runs the build, and serves `dist/`
from its CDN. There is no server, database or secret to configure. Routing is hash-based
(`#dashboard`), so no rewrite rules are needed.

`render.yaml` in the repo root is the source of truth for the service settings (build command,
publish path, Node version, cache headers). If you change a setting, change it there too.

## 1. Pre-flight (always)

1. `git status` is clean and `main` is pushed (`git fetch && git status -sb` shows no ahead/behind).
   Render builds what is on GitHub, not the local working tree.
2. `npm test` and `npm run build` pass locally.
3. To mimic Render's clean install, build a fresh clone in the scratchpad rather than running
   `npm ci` in the project: on Windows `npm ci` fails with EPERM while the user's dev server holds
   `lightningcss.win32-x64-msvc.node`, and leaves `node_modules` half-deleted (repair with
   `npm install`).

   ```bash
   git clone -q . "$SCRATCH/render-check" && cd "$SCRATCH/render-check"
   npx -y -p node@22 -- npm ci --silent && npx -y -p node@22 -- npm run build
   ```

## 2. Connect accounts (first time only)

- **Render MCP**: the `claude.ai Render` connector. If its tools aren't loaded (only
  `mcp__claude_ai_Render__authenticate` exists), ask the user to run `/mcp` and pick
  "claude.ai Render" to sign in. Then load the tools with ToolSearch (`+Render`).
- **GitHub access**: the user's Render account must be linked to GitHub with access to the
  `every-pesewa` repo (Render dashboard → Account settings → Git providers / the Render GitHub
  app's repository access). Only the user can grant this; if the create call reports the repo
  isn't accessible, send them there.
- If the account has several workspaces, list them and ask which one to use before creating
  anything (it affects billing).

## 3. Create the service (first deploy)

Check first with `list_services` that `every-pesewa` doesn't already exist; if it does, go to
step 4.

**Preferred: Blueprint** (applies every setting in `render.yaml`, including headers). Give the
user this link and have them click Apply:
`https://dashboard.render.com/blueprint/new?repo=https://github.com/sonyokpara/every-pesewa`

**Or via MCP** (`create_static_site`), mirroring `render.yaml`:

| Field | Value |
|---|---|
| name | `every-pesewa` |
| repo | `https://github.com/sonyokpara/every-pesewa` |
| branch | `main` |
| buildCommand | `npm ci && npm run build` |
| publishPath | `dist` |
| autoDeploy | `yes` |
| envVars | `NODE_VERSION=22` |

A service created this way is not linked to the Blueprint, so the custom headers in
`render.yaml` are not applied. Mention that, and add them in the dashboard (Settings → Headers)
if the user wants them. Creating a service is an outward-facing action: confirm with the user
before calling it, and say it is on the free static-site plan.

## 4. Redeploy

With auto-deploy on, pushing to `main` deploys. To redeploy without a code change, trigger a
manual deploy from the dashboard (or the MCP, if it offers a deploy action).

## 5. Watch the deploy

Poll `list_deploys` / `get_deploy` for the service until the status is `live` or a failure
(builds take about 1–2 minutes; poll every ~30 s, not faster). On failure, read the build logs
(`list_logs`, filtered to the service) and fix the cause. Common ones:

- `Cannot find type definition file for 'vite/client'` or missing packages → dependencies
  incomplete; check `package-lock.json` is committed and in sync.
- Vite/rolldown complaining about the Node version → `NODE_VERSION` must be ≥ 22.12 (Vite 8).

## 6. Verify the live site

Use the `agent-browser` skill on the `onrender.com` URL:

1. The dashboard loads with no console errors (`agent-browser errors`), and the font and
   favicon load (no 404s).
2. Add a transaction, reload, and confirm it's still there (IndexedDB works on the live origin).
3. Hash navigation works: open `<url>/#reports` directly.
4. `curl -sI <url>/assets/<some file>.js` shows the `Cache-Control: ... immutable` header
   (Blueprint deploys only).

Report the live URL, the deploy ID and commit, and anything that failed. Note that data is
stored per origin, so what the user entered at `localhost:5173` won't appear on the live site;
they can move it with Settings → Download backup, then Restore backup on the live site.
