# Deployment status

Prepared 24 November 2026.

- Project: **Poth Collective**
- Repository: [vranasinghe/poth-collective](https://github.com/vranasinghe/poth-collective) — public repository created
- Frontend: Vercel, root `frontend` — account sign-in pending
- API: Render Blueprint — account sign-in/private configuration pending
- Live URLs: not assigned or verified

The original repository and remotes are unchanged. This sanitized source snapshot has independent Git history.

## Standalone validation

- Clean lockfile installs completed for both projects.
- TypeScript and production web export passed; 48 routes generated.
- Build used `https://example.com` strictly as a packaging placeholder, not a live API. The actual deployment must use Render's assigned API origin.
- Backend syntax check passed for 60 files; authentication/CORS suite passed all 35 tests against isolated local MongoDB.
- Private local MongoDB/JWT/Cloudinary values were checked against the release source: no matches. Only placeholder `.env.example` files are included.
- CI runs the full backend/frontend checks under Node.js 22. Local packaging used the available Node.js 24 runtime; deployment/runtime status remains pending.
