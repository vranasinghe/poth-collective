# Deploy Poth Collective

Use the standalone `vranasinghe/poth-collective` repository. It contains no local credentials, database exports or original Git history.

## Render API

Import the repository as a Blueprint using `render.yaml`. It declares a Docker web service named `poth-collective-api` and `/health`. Confirm the configured free plan before creation.

Provide private Render environment values:

- `MONGO_URI`: a connection targeting the separate `poth-collective-demo` database.
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`: upload credentials.
- `CORS_ORIGINS`: the exact Vercel production origin; comma-separated explicit additional origins if needed.
- `JWT_SECRET`: generated independently by the Blueprint.

Keep `NODE_ENV=production`, `DEMO_ENABLED=true`. Do not use a test upload driver or destructive seeding. Demo entry creates temporary labeled sample content. Atlas must allow the service's outbound addresses; use Render's networking details rather than weakening network/authentication protections.

Record the assigned API origin and confirm `<API_ORIGIN>/health` returns HTTP 200 with `status: ok`.

## Vercel frontend

Import the same repository with **Root Directory `frontend`**, framework **Other**. `frontend/vercel.json` defines `npm ci`, the build command and `dist` output.

Set `EXPO_PUBLIC_API_URL` to the actual HTTPS Render API origin without `/api`. It is public and embedded at build time. Never place MongoDB, JWT or Cloudinary secrets in frontend variables. The build rejects a missing/non-HTTPS API origin.

Generated HTML and assets are served before the `/index.html` fallback for client-side dynamic paths. The API trusts the production origin `https://poth-collective-frontend.vercel.app` by default. Custom domains and preview deployments require their own explicitly allowed origins in Render's `CORS_ORIGINS` configuration (origin only, without a path or trailing slash).

If the page loads but demo entry fails, check the browser's request to `/api/users/demo`. A 403 response containing `Not allowed by CORS` means the frontend origin is missing from the API allowlist. Add that exact origin to Render's `CORS_ORIGINS` and restart the API, or deploy the API revision containing the production-origin default. Verify the preflight response includes `Access-Control-Allow-Origin` matching the frontend origin; `/health` returning 200 alone does not verify browser access.

## Handoff

Check public entry, both demo roles, API connectivity, images and direct book/shop URL refresh. These are deployment smoke checks, not end-to-end certification. Do not use real payments or personal delivery details to fill the showcase. Record confirmed URLs and limitations in `DEPLOYMENT_STATUS.md`.

References: [Expo static rendering](https://docs.expo.dev/router/web/static-rendering/), [Vercel configuration](https://vercel.com/docs/project-configuration), [Render Blueprint specification](https://render.com/docs/blueprint-spec).
