# Market API workspace guidance

Preserve this private first-party service as an independently governed portfolio project and keep credentials outside execution workspaces.

## Project library

Use `trsd library show market-api` and `status` before querying the private `treeseed-ai/market-api-library`. Read root-level paths at an exact commit. Author only through governed library workspaces and reviews; never recreate `src/content` or edit `.treeseed/data` directly.
