# Test batch 01: 24 videos across 3 channels (director runbook)

**Operator brief (2026-09-28):**
- **Channels and director:** Claude directs production for **INKLIGHT**, **Thimble Town** and **Earthlines**, making 4 long + 4 short test videos per channel.
- **Revisions:** up to **2 targeted revisions per video**, not counting the first generation. A revision re-generates only the weak sections, then re-edits and re-renders.
- **Nothing publishes.** Finished videos wait at Final review for the operator.
- **Voice:** the operator is upgrading ElevenLabs.
- **Other channels:** Tomorrowscape (formerly Future Cities) was reconcepted with no test videos this round. App Testing Lab receives ideas from the operator only.

| Channel (project) | Brief | Model | Base est. | With 2 revisions |
|---|---|---|---|---|
| INKLIGHT | [inklight.md](inklight.md) | Seedance 2.5 (+ Cinema for set-pieces) | $446.78 | $649.39 |
| Thimble Town | [thimble-town.md](thimble-town.md) | Seedance 2.5 (+ Cinema at hard cuts) | $490.80 | $613.40 |
| Earthlines | [earthlines.md](earthlines.md) | Cinema Studio 4.0 | $481.54 | $591.59 |
| **Total** | | | **≈ $1,419** | **≈ $1,854** |

These are video-generation estimates at $0.2057/s. They exclude SOUL stills (about $0.09 each), ElevenLabs, music and Claude. The **first live clip must confirm the real per-second price** via the ledger, which records Higgsfield's `/estimate` quote. If the price differs, rescale this table before continuing.

## Prerequisites (operator)
1. Set a new `STUDIO_MCP_TOKEN` as a GitHub secret, then run **Sync Vercel Env** so the live app uses it.
2. Put the same value in the cloud environment as `STUDIO_MCP_TOKEN`, and start a new session. The repo's `.mcp.json` reads it for the `studio` connector.
3. Upgrade the ElevenLabs plan (Creator tier or above).

> **Before every video, read [`../lessons-learned.md`](../lessons-learned.md) and produce through the directed pipeline ([`../directed-pipeline.md`](../directed-pipeline.md)).** The autonomous path described below rewrites briefs, so it is superseded for this batch.

## Director procedure (per video, via the studio MCP)
1. **Create the video** in its project (INKLIGHT / Thimble Town / Earthlines) with the brief's final title and topic. Paste the brief's section script as the script. Every gate stays on `assist`.
2. **Script gate:** check the sections match the brief's SECTION table (seconds, narration, visual prompt), then approve.
3. **Assets and clips:** run Full Auto with the **cinema** tier. Every section becomes a clip on the project's locked model, using the project's Cinema look, and sections over 30s are stitched seamlessly.
4. **QC:** judge the output against the brief's *QC acceptance criteria*. For a failing section, re-generate only that section (revision 1, then revision 2 if needed). Log every decision.
5. **Edit and render:** apply the brief's edit notes (cut rhythm, captions, highlights), render, and stop at **Final review**. Do not publish.
6. **Spend check:** after each video, compare ledger spend with the table above. Pause and report to the operator if the batch is on track to exceed about $2,000 (the operator approved about $2,000–2,500).

## Production order
Follow the order in each brief's batch plan. Run **one short per channel first**, which is cheap, to validate model, look, price and stitching before starting the long-form videos.
