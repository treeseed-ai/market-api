# Market API workspace guidance

Preserve this private first-party service as an independently governed portfolio project and keep credentials outside execution workspaces.

## Branch and deployment boundary

`main` is the only production branch and maps only to the `production` deployment environment. `staging` is the only development-integration branch and maps only to the `staging` deployment environment. Short-lived pull-request branches may validate without deploying, but they must never define another deployment environment. Do not create or use `development`, `preview`, `stable`, or any other GitHub deployment environment; preview deployments are prohibited. Release tags may promote an exact reviewed `staging` commit to `production` without creating another branch or environment. Artifact channel names must never become GitHub deployment environments.

## Project library

Use `trsd library show market-api` and `status` before querying the private `treeseed-ai/market-api-library`. Read root-level paths at an exact commit. Author only through governed library workspaces and reviews; never recreate `src/content` or edit `.treeseed/data` directly.
