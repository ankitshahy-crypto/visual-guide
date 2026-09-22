# Exported drafts

Creator drafts live in the browser (IndexedDB) while you work. To put a draft in git:

1. Open the draft in the player.
2. Download draft JSON.
3. Save it here as `projects/<guide_id>/guide.json`.
4. Put rasterized pages next to it as `projects/<guide_id>/pages/…` and point `source.manual.pages[].image` at those files (under `public/` if the player should load them).

The golden MagicH fixture stays in `golden/`, not here. It is the assembly sample, not a separate schema.
