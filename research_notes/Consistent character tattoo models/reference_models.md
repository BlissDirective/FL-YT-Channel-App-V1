# Multi-reference image models for identical photoreal character consistency (incl. fine tattoo detail), as of Oct 8, 2026

Research date: 2026-10-08. Sources were gathered through web search and fetch. Many pages are vendor or reseller blogs, and they are labeled as such. Fal.ai and Google docs were fetched directly where noted.

## Q1. Model-by-model: identity consistency, max references, resolution, availability

### Takeaway
As of October 2026 the frontier has moved well past the models in the brief. Google now has **Nano Banana 2.1** (GA Oct 6, 2026), OpenAI has **GPT Image 2 / 2.5**, BFL has **FLUX 3 Image** (live on fal), ByteDance has **Seedream 5.0 Pro/Lite**, and Alibaba has **Qwen-Image 3.0 / 2.1**. New contenders include Microsoft MAI-Image-2.5/2.6, Meta Muse Image, Grok Imagine Image 2.0 and Reve 2.1. Google's Nano Banana line is the only family with a documented, dedicated "character reference" slot (4–5 humans) and is the most-cited choice for recurring characters. No vendor documents fine-detail (tattoo) fidelity.

### Cited Findings

**Google Nano Banana family (Gemini image)**
- Current Gemini API image models are `gemini-nano-banana-2.1` (Nano Banana 2.1, "recommended for new projects"), `gemini-3.1-flash-lite-image` (Nano Banana 2 Lite), `gemini-3.1-flash-image` (Nano Banana 2), `gemini-3-pro-image` (Nano Banana Pro) and `gemini-2.5-flash-image` (legacy) — [Google Gemini API image-generation docs](https://ai.google.dev/gemini-api/docs/image-generation)
- Reference limits are **14 images total** for all models. **Nano Banana 2.1 / 3.1 Flash** takes up to 10 object images plus **up to 4 character images**. **Nano Banana Pro** takes up to 6 object images plus **up to 5 character images** and up to 3 style references. Flash Lite takes 14 object images, has no character slot, and is "Not optimized for multiple reference inputs or multi-turn sequential editing." (The docs table rendered flattened, so the column mapping is the fetch tool's best reading.) — [Google docs](https://ai.google.dev/gemini-api/docs/image-generation)
- Output is 1K/2K/4K, default 1K. Sizes must be uppercase ("1k" is rejected). 512px is offered only on Nano Banana 2 (3.1 Flash). Thinking is always on and cannot be disabled; the model can make up to two interim images. Nano Banana 2.1 has minimal/medium/high thinking levels, default medium. All outputs carry a SynthID watermark — [Google docs](https://ai.google.dev/gemini-api/docs/image-generation)
- Nano Banana 2.1 went GA on Oct 6, 2026. Google claims improved "multi-turn character consistency," prompt adherence and text rendering, plus a fix for tiling artifacts at 2K/4K wide aspect ratios. It fuses up to 14 references. This comes from one secondhand news report — [LetsDataScience](https://letsdatascience.com/news/google-rolls-out-nano-banana-21-image-model-c6ac3b89)
- On fal, `fal-ai/nano-banana-pro/edit` says "Combine up to 14 images in single composition" with character consistency for up to 5 people. Options: aspect ratio auto or 21:9…9:16, resolution 1K/2K/4K, `num_images` 1–4, output PNG/JPEG/WebP — [fal model page](https://fal.ai/models/fal-ai/nano-banana-pro/edit)
- Hands-on and vendor guides commonly rank the Nano Banana family first for recurring characters, but no independent controlled benchmark backs this (anecdotal) — [Picsart](https://picsart.com/blog/nano-banana-alternatives/); [Atlas Cloud](https://www.atlascloud.ai/blog/guides/best-ai-image-editing-models-2026); [ScreenWeaver](https://www.screenweaver.ai/blog/nano-banana-pro-vs-midjourney-flux-ai-image-models)
- One Linocut review (Aug 18, 2026) rates Nano Banana 2 "Strong all-around identity and style consistency." The review is based on docs and community tests, "not controlled laboratory benchmarks" — [Linocut](https://linocut.ai/blogs/multi-reference-ai-image-models/)

**Black Forest Labs: FLUX.2, FLUX 3, Kontext**
- FLUX.2 shipped Nov 25, 2025 in [max], [pro], [flex], [dev] (32B open weights) and [klein] variants — [BFL blog](https://bfl.ai/blog/flux-2); [MindStudio](https://www.mindstudio.ai/models/flux-pro-2)
- FLUX.2 editing takes **up to 8 reference images via API and up to 10 in the playground**, with output up to 4MP. Prompts refer to images by index ("image 1", "images 2, 3, 4…"). BFL says `flux-2-pro-preview` reflects its latest advances and `flux-2-pro` is the pinned version — [BFL docs](https://docs.bfl.ai/flux_2/flux2_image_editing)
- Reviewers credit FLUX.2 with the strongest raw photorealism and typography. They say Nano Banana Pro wins on instruction-following and editing (anecdotal) — [Morphed](https://morphed.app/blog/flux-2-vs-nano-banana-pro)
- **FLUX 3** was announced Jul 23, 2026 as a multimodal model covering image, video, audio and action. Video launched first, around Aug 4, 2026 — [DataNorth](https://datanorth.ai/news/black-forest-labs-releases-flux-3); [OpenRouter](https://openrouter.ai/black-forest-labs/flux-3-video-20260804)
- **FLUX 3 Image edit is now live on fal** at `blackforestlabs/flux-3/edit-image`. It takes **up to 10 reference images** (`image_urls`, 1–10; the first is "image 1"), each 256px to 4MP. Resolutions are 512sq/768sq/1k/2k/4k. The page claims multi-reference keeps "characters, products and objects recognizable" but gives no metrics. Fal charges "One flat price per image, whatever the number of references" — [fal FLUX 3 edit page](https://fal.ai/models/blackforestlabs/flux-3/edit-image)
- FLUX.1 Kontext is legacy. On AA editing, Kontext [max] scores Elo 931 and [pro] 913, far behind 2026 models — [Artificial Analysis editing leaderboard](https://artificialanalysis.ai/image/leaderboard/editing)

**ByteDance Seedream / SeedEdit**
- **Seedream 5.0 Pro** (Jul 2026) and **5.0 Lite** (Feb 2026) are current. Seedream 4.5 (Dec 2025), 4.0 (Sep 2025) and SeedEdit 3.0 (Jun 2025) are older — [AA leaderboard](https://artificialanalysis.ai/image/leaderboard/editing)
- 5.0 Pro edit takes "up to ten" references per Linocut and Runway. ComfyUI's page says up to 14, so the limit may vary by provider — [Linocut](https://linocut.ai/blogs/multi-reference-ai-image-models/); [ComfyUI docs](https://docs.comfy.org/tutorials/api-nodes/bytedance/seedream-5-pro)
- Fal endpoints are `bytedance/seedream/v5/pro/edit` and `bytedance/seedream/v5/pro/text-to-image`. Pro targets up to **2K**; 5.0 Lite goes to 4K — [fal guide](https://fal.ai/learn/tools/how-to-use-seedream-5-0-pro-v2); [Muapi comparison](https://muapi.ai/comparison/bytedance-seedream-5.0-pro-edit)
- In one comparison, Seedream 4.0 often failed to keep the input pose in human edits, and 5.0 Lite improved identity preservation (anecdotal) — [PixMax](https://www.pixmax.ai/blog/nano-banana-vs-seedream.html)
- Seedream 4.5 ran much faster per image than Nano Banana Pro in one timed test (anecdotal) — [Morphed](https://morphed.app/blog/flux-2-vs-nano-banana-pro)

**OpenAI GPT Image**
- AA lists GPT Image 1 (Apr 2025), GPT Image 1.5 (Dec 2025), **GPT Image 2** (Apr 2026), and **GPT Image 2.5 "Flare" and "Sunburst"** (Sep 2026) — [AA leaderboard](https://artificialanalysis.ai/image/leaderboard/editing)
- GPT Image 2.5 was announced Sep 8, 2026. Flare is the default, faster tier; Sunburst is slower and tuned for "maximum precision." One reseller said the API was early access at the time — [CometAPI](https://www.cometapi.com/models/openai/gpt-image-2-5/); [Letz.ai](https://letz.ai/blog/gpt-image-25-announcement)
- GPT Image 2 size limits: long side ≤3840px, sides multiples of 16, aspect ≤3:1, total pixels 655,360–8,294,400. Anything above 2560×1440 is "experimental." This is from a third-party guide — [laozhang blog](https://blog.laozhang.ai/ko/posts/gpt-image-2-4k-image-generation)
- Reference count for GPT Image 2.5 is unconfirmed. One tool page says 16 and another says 14 — [CometAPI](https://www.cometapi.com/models/openai/gpt-image-2-5/); [creati.ai](https://creati.ai/ai-tools/gptimage-2-5/)
- GPT Image 2 can keep identity while applying a new pose. However, **left/right limb confusion** was reported in a community sprite-sheet workflow, and it "may preserve identity… while still missing the structural relationship you care about" (anecdotal) — [Linocut](https://linocut.ai/blogs/multi-reference-ai-image-models/)
- Fal endpoints are `openai/gpt-image-2` and `openai/gpt-image-2/edit`. They are priced in "units" ($1/unit), not per image, which suggests token pass-through billing — [fal pricing](https://fal.ai/pricing)

**Alibaba Qwen**
- On the AA editing board, Qwen-Image-3.0-Pro (Jul 2026, API) scores Elo 1077. **Qwen-Image-2.1** (Sep 2026, open weights, "No API") scores 1074 and is the top open-weights model. Qwen Image Edit Plus 2511 (open) scores 1021, 2509 scores 982, and Qwen Image Edit Max 2601 scores 999 — [AA leaderboard](https://artificialanalysis.ai/image/leaderboard/editing)
- Qwen-Image-Edit-2511 is on fal at `fal-ai/qwen-image-edit-2511` and accepts an array of image URLs. Fal does not state a maximum — [fal dev guide](https://fal.ai/learn/devs/qwen-image-edit-2511-developer-guide)
- Third-party pages say 2511 has "notably better consistency" than 2509, and a LoRA variant accepts up to 3 references. These are marketing claims — [Runflow](https://www.runflow.io/models/alibaba/qwen-image-edit-2511); [Muapi](https://muapi.ai/playground/qwen-image-edit-2511-lora)
- On Reddit (Aug 2026), Qwen Image Edit was described as "working reasonably for character consistency," but identity "may weaken on demanding edits" (anecdotal) — [Linocut](https://linocut.ai/blogs/multi-reference-ai-image-models/)

**Other 2026 contenders (from AA's editing board)**
- **Microsoft MAI-Image-2.6** (Aug 2026, Elo 1139, $38.9/1k), MAI-Image-2.6-Flash, MAI-Image-2.5/Pro; **Meta Muse Image** (Jul 2026, 1120, $10/1k); **Grok Imagine Image 2.0** (Aug 2026, 1110); **HunyuanImage 3.5 Preview** (Sep 2026, 1087); HunyuanImage 3.0 Instruct (open, 1068); **Kling Image 3.0** (998) and 3.0 Omni (958); **Wan 2.7 Pro** (1042) and Wan 2.7 (1038); Reve V1 (Dec 2025, 1008) — [AA leaderboard](https://artificialanalysis.ai/image/leaderboard/editing)
- Other snapshots of the same board show **Reve 2.1** near the top (Elo 1261–1263), and an Aug 10, 2026 update reportedly put Reve 2.1 in first place. Reve 2.1 does **not** appear in the Oct 2026 fetch, so the board appears to have been re-baselined — [benchmarklist](https://benchmarklist.com/arenas/artificial_analysis_image_editing/); [tech-insider](https://tech-insider.org/best-ai-image-generator-2026/); [247wallst](https://247wallst.com/cards/msft-xpost-01m0ww8hz1mtxqzdr3sdzntw6z)
- **MiniMax H3** (open, local) is reported to handle up to 9 references in one community workflow, with "strong identity retention." This rests on a single Reddit creator's test (anecdotal) — [Linocut](https://linocut.ai/blogs/multi-reference-ai-image-models/)
- **Runway Gen-4 References** takes up to 3 references and gives "strong character reuse from a single anchor image" — [Linocut](https://linocut.ai/blogs/multi-reference-ai-image-models/)

### Inferences
- For a photoreal recurring person, the strongest documented setup is Nano Banana Pro or Nano Banana 2.1. They are the only models with an explicit, separately counted "character image" reference slot, and both top the general editing board among Google models (2.1 Elo 1137 vs Pro 1101).
- GPT Image 2.5 Sunburst ranks #1 in general editing preference, but it costs about $0.21/image at max and has a reported left/right structural weakness. That makes it a strong candidate to test, but not obviously the best for asymmetric tattoos.
- FLUX 3 Image edit (10 refs, 4K, flat price regardless of reference count) is the newest BFL option. It is not yet on the AA board, so its ranking is unknown.
- General editing Elo measures overall human preference on edits, not identity or fine-detail fidelity. Don't treat it as a character-consistency score.

### Gaps
- No official OpenAI doc was fetched for GPT Image 2/2.5 reference limits, `input_fidelity`, or 4K pricing; only resellers were found. The `input_fidelity="high"` parameter introduced for gpt-image-1 in 2025 is unverified for 2.x.
- No official BFL doc on FLUX 3 Image release date or per-variant limits (pro/flex/max) was found; the only source is the fal page.
- No official ByteDance doc on Seedream 5.0 reference limits (10 vs 14 conflict).
- The Nano Banana 2.1 fal page (`fal-ai/nano-banana-2.1/edit`) did not show price or reference limit in the fetch.
- No primary source on Reve 2.1, MAI-Image-2.6 or Muse Image reference-image support or API availability on fal.

## Q2. Fine, asymmetric details (tattoo on one side, scar over one eye): which model preserves them, and do models swap left/right?

### Takeaway
**No benchmark, vendor doc, or credible hands-on test measures tattoo-design fidelity or left/right consistency for any of these models.** The available evidence says fine details such as tattoo specifics and jewelry patterns are a known failure mode even for Nano Banana. Left/right confusion has been reported for GPT Image 2. Every model should be expected to redraw thin-line geometric tattoos slightly differently each time, and the right workflow controls are needed (see Q3/Q4).

### Cited Findings
- Nano Banana storyboard guide (Mar 12, 2026), Limitations: "Small details like jewelry patterns or tattoo specifics may vary." Long sequences see "Cumulative drift," and "periodic re-anchoring is essential." With good technique, "90%+ of frames will maintain recognizable consistency" over 50 frames. That figure is for recognizable identity, not exact detail (vendor blog, anecdotal) — [Flowith](https://flowith.io/blog/nano-banana-consistent-characters-storyboard/)
- GPT Image 2 showed left/right limb confusion in a community sprite-sheet workflow (anecdotal) — [Linocut](https://linocut.ai/blogs/multi-reference-ai-image-models/)
- A Nano Banana character-sheet post claims the model kept a tattoo correctly deformed with a facial expression and kept a shaved side of the head on the correct side. This is a single promotional anecdote — [Nerdbot (Sep 24, 2026)](https://nerdbot.com/2026/09/24/using-nano-banana-to-build-an-original-character-sheet-that-stays-consistent/)
- Advice found in guides: re-upload the original reference every time instead of editing the latest output, because errors (e.g. a mirrored tattoo) propagate through chained edits. Re-anchor periodically — [Flowith](https://flowith.io/blog/nano-banana-consistent-characters-storyboard/); [Medium/Paul's World](https://medium.com/pauls-world/your-ai-characters-keep-changing-faces-heres-how-to-fix-it-c7cc5c2f7247) (403 on fetch; claim seen only in a search snippet)
- The 2026 academic benchmark MIBE (arXiv 2607.01383, Jul 2026) found state-of-the-art models "frequently omitting subjects, failing to preserve reference appearances, or misattributing interactions" — [arXiv](https://arxiv.org/abs/2607.01383)
- The MultiBind benchmark (arXiv 2603.21937, Mar 2026) targets cross-subject **attribute misbinding**, where an attribute lands on the wrong person. This is the multi-person analogue of a tattoo moving to the wrong place — [papers.cool](https://papers.cool/arxiv/2603.21937)
- I found no Reddit or r/StableDiffusion thread that specifically documents mirrored or flipped tattoos for Nano Banana or FLUX.2 (the search was done, with no direct hits).

### Inferences
- Diffusion and AR image models often treat a person's left/right as weakly constrained, especially when the camera angle changes (a front view shows the subject's right arm on the viewer's left). Expect occasional side swaps. Specifying the side in subject-relative terms ("on HER LEFT forearm") and providing a reference that clearly shows that side should help, but this is untested.
- Thin white geometric line-work is especially hard. It is high-frequency, low-contrast on skin, and has exact geometry, so models tend to regenerate it plausibly but not identically. Close-up and medium shots will likely look consistent at a glance, but pattern-level identity (the same line count and same shapes) is unlikely to hold reliably across many generations on any current model.
- Practical mitigations, which are inference and not tested: (1) keep a canonical close-up "tattoo plate" image per body area and pass it as a reference on every generation; (2) generate from the canonical references, never from previous outputs; (3) for hero shots, composite or inpaint the exact tattoo design in post (warp the real design onto skin, or use an inpainting pass with a masked region plus the tattoo plate); (4) generate 4 variants and QC-select; (5) consider a LoRA, trained on FLUX.2 [dev], FLUX.2 [klein], or Qwen-Image open weights, that includes the tattoos, if many hundreds of images are needed.

### Gaps
- No controlled test compares tattoo or scar fidelity across models. A small in-house A/B test is the only way to answer "which model is best for this specific tattoo." Suggested test: the same 3 references plus a tattoo close-up, 5 poses × 4 seeds per model, then score side-correctness and design match.
- No data was found on whether the models' reasoning or "thinking" modes (Nano Banana 2.1 high thinking, GPT Image 2.5 Sunburst) reduce side swaps.

## Q3. Max number of reference images; does a close-up reference of the tattoo improve fidelity?

### Takeaway
Total reference limits are now 8–16 for most frontier models. Google is the only vendor that separately caps "character" references (4 on Nano Banana 2.1, 5 on Pro). No source directly tests whether adding a tattoo close-up improves fidelity. Guides recommend extra angle references, and fal's FLUX 3 billing makes adding references free.

### Cited Findings
- Nano Banana 2.1/Flash: 14 total (10 object + 4 character). Pro: 14 total (6 object + 5 character + 3 style) — [Google docs](https://ai.google.dev/gemini-api/docs/image-generation)
- FLUX.2: 8 via API, 10 in the playground — [BFL docs](https://docs.bfl.ai/flux_2/flux2_image_editing). FLUX 3 Image edit on fal: 10, flat price regardless of reference count — [fal](https://fal.ai/models/blackforestlabs/flux-3/edit-image)
- Seedream 5.0 Pro: 10, or 14 per ComfyUI — [Linocut](https://linocut.ai/blogs/multi-reference-ai-image-models/); [ComfyUI](https://docs.comfy.org/tutorials/api-nodes/bytedance/seedream-5-pro). On fal the first input image is free and each additional one costs $0.0045 — [Muapi comparison](https://muapi.ai/comparison/bytedance-seedream-5.0-pro-edit)
- GPT Image 2.5: unconfirmed, 14–16 per third parties — [CometAPI](https://www.cometapi.com/models/openai/gpt-image-2-5/)
- Qwen Image Edit 2511: 3 per the LoRA variant page; fal states no maximum — [Muapi](https://muapi.ai/ko/playground/qwen-image-edit-2511-lora); [fal guide](https://fal.ai/learn/devs/qwen-image-edit-2511-developer-guide)
- Runway Gen-4 References: 3. MiniMax H3: 9 in one community workflow — [Linocut](https://linocut.ai/blogs/multi-reference-ai-image-models/)
- Guides recommend generating "2-3 additional references showing the character from different angles (three-quarter, side profile, full body)" and locking a reference sheet — [Flowith](https://flowith.io/blog/nano-banana-consistent-characters-storyboard/)
- FLUX.2 / FLUX 3 prompts can point to a specific reference by index ("image 1", "image 2"), which allows instructions like "the neck tattoo exactly as in image 3" — [BFL docs](https://docs.bfl.ai/flux_2/flux2_image_editing); [fal FLUX 3](https://fal.ai/models/blackforestlabs/flux-3/edit-image)

### Inferences
- A recommended reference pack for this use case, within the 14-image limit: 2–4 identity shots (face front, three-quarter, profile, full body) in the "character" slots, plus 3–5 tattoo close-ups (neck, each hand, each forearm) as "object" references. Name each one explicitly in the prompt with its side. This is likely the best available lever, but it is unbenchmarked.
- Nano Banana 2.1's 4-character-image cap means tattoo close-ups should probably be treated as object references (10 slots available). Whether Google routes these internally differently is undocumented.

### Gaps
- No source quantifies the fidelity gain from a close-up detail reference. This needs in-house testing.
- Whether more references beyond about 5 improve or dilute identity is not documented for any model.

## Q4. Multi-panel character sheets in one shot vs. separate generations

### Takeaway
All frontier models (Nano Banana Pro/2.x, GPT Image 2) can produce multi-view character sheets in one shot, and creators commonly use them as the "source of truth" reference for later image and video generation. No source directly measures whether a single-sheet generation is more consistent than separate generations. The inference is yes within a sheet, since one forward pass shares context, but each panel is lower resolution, so fine tattoo detail suffers.

### Cited Findings
- Documented workflow (Apr 2026): one Nano Banana sheet with full-body front/side/back on the left, six head angles at upper right and six close-up details at lower right, then loaded into Seedance 2.0 as a reference. Another creator built sheets in GPT Image 2.0. The page does not compare the approach with separate generations and reports no failure modes — [pixelsham](https://www.pixelsham.com/2026/04/18/creating-a-character-sheet-for-ai-videos-using-nano-banana/)
- Nano Banana character sheets reportedly held asymmetric features (shaved side of the head, a tattoo) in one example (promotional anecdote) — [Nerdbot](https://nerdbot.com/2026/09/24/using-nano-banana-to-build-an-original-character-sheet-that-stays-consistent/)
- Guides recommend a continuity check that generates a side-by-side of the original reference and the new view — [search summary of Nano Banana consistency guides](https://www.nenobanana.com/blogs/nano-banana-character-consistency-12-prompts-that-actually-work--2026-guide) (not fetched)
- GPT Image 2 left/right confusion was reported specifically in a **sprite-sheet** (multi-panel) workflow — [Linocut](https://linocut.ai/blogs/multi-reference-ai-image-models/)

### Inferences
- Recommended pipeline: (1) generate a 4K one-shot turnaround sheet plus a separate 4K tattoo detail sheet (each body area large); (2) human-QC and fix the tattoos on the sheet, by inpainting or manual compositing, until it is canonical; (3) crop the panels into individual reference images; (4) pass the crops as references for every downstream shot. Each panel of a 4K sheet with 6–12 views is only about 600–1000px, which is too small to carry thin-line tattoo geometry, so dedicated detail crops are needed.

### Gaps
- No controlled comparison of sheet vs. separate-generation consistency exists.

## Q5. Pricing (fal.ai and native) at 1K/2K/4K, and fal endpoint slugs

### Takeaway
Fal per-image prices, checked Sep–Oct 2026: Nano Banana Pro $0.15 (1K/2K), $0.30 (4K); Nano Banana 2 $0.08; FLUX 3 Image edit $0.024 (promo, ending Oct 8) then $0.048 at 1K; FLUX.2 [pro] $0.03 for the first MP; Seedream 5.0 Pro $0.0675 (≤1536²) or $0.135 (2048²); GPT Image 2 is billed in token "units." Native APIs are often cheaper: Google's Nano Banana Pro is $0.134.

### Cited Findings
**Fal endpoint slugs and prices**
| Model | fal slug | fal price | Source |
|---|---|---|---|
| Nano Banana Pro (edit / t2i) | `fal-ai/nano-banana-pro/edit`, `fal-ai/nano-banana-pro` | $0.15/image at 1K and 2K; 4K "charged at double the standard rate" (about $0.30); +$0.015 for web search grounding | [fal pricing](https://fal.ai/pricing); [fal model page](https://fal.ai/models/fal-ai/nano-banana-pro/edit); [fal search snippet](https://fal.ai/nano-banana-pro) |
| Nano Banana 2 (edit / t2i) | `fal-ai/nano-banana-2/edit`, `fal-ai/nano-banana-2` | $0.08/image (an older fal guide said $0.06 at 512px) | [fal pricing](https://fal.ai/pricing) |
| Nano Banana 2.1 (edit) | `fal-ai/nano-banana-2.1/edit` | not shown in fetch | [fal page](https://fal.ai/models/fal-ai/nano-banana-2.1/edit) |
| Nano Banana (legacy) | `fal-ai/nano-banana/edit` | $0.0398 | [fal pricing](https://fal.ai/pricing) |
| FLUX 3 Image edit | `blackforestlabs/flux-3/edit-image` | $0.024/MP on the pricing page; model page: 1K $0.024 promo → **$0.048** after promo ("ends October 8"); "starting at $0.0205"; flat regardless of reference count | [fal pricing](https://fal.ai/pricing); [fal model page](https://fal.ai/models/blackforestlabs/flux-3/edit-image) |
| FLUX.2 [pro] | (slug not confirmed; nav links to `fal-ai/flux-2-flex`) | $0.03 for the first MP | [Teamday, Sep 23 2026](https://www.teamday.ai/blog/ai-api-pricing-comparison-2026) |
| FLUX.2 [flex] | `fal-ai/flux-2-flex` | $0.05/MP | [Teamday](https://www.teamday.ai/blog/ai-api-pricing-comparison-2026) |
| FLUX.2 [dev] | — | $0.012/MP | [Teamday](https://www.teamday.ai/blog/ai-api-pricing-comparison-2026) |
| FLUX.2 [klein] 4B | — | $0.005/MP | [Teamday](https://www.teamday.ai/blog/ai-api-pricing-comparison-2026) |
| Seedream 5.0 Pro (edit) | `bytedance/seedream/v5/pro/edit` | $0.0675 (≤1536²), $0.135 (≤2048²), +$0.0045 per extra input image; marked "tentative" | [Muapi comparison](https://muapi.ai/comparison/bytedance-seedream-5.0-pro-edit); [Teamday](https://www.teamday.ai/blog/ai-api-pricing-comparison-2026) |
| Seedream 5.0 Lite | — | $0.035 | [Teamday](https://www.teamday.ai/blog/ai-api-pricing-comparison-2026) |
| Seedream 4.5 | — | $0.04 (older guide) | [fal search snippet](https://fal.ai/learn/tools/nano-banana-vs-seedream) |
| GPT Image 2 (edit / t2i) | `openai/gpt-image-2/edit`, `openai/gpt-image-2` | "$1 per unit" (token pass-through). About $0.006 low, $0.053 medium, $0.211 high at about 1MP | [fal pricing](https://fal.ai/pricing); [Teamday](https://www.teamday.ai/blog/ai-api-pricing-comparison-2026) |
| GPT Image 2.5 | (nav link only) | $0.0059 low, $0.0132 medium, $0.0527 high at 1024² (Teamday; the column mapping may be ambiguous) | [Teamday](https://www.teamday.ai/blog/ai-api-pricing-comparison-2026) |
| Qwen Image Edit 2511 | `fal-ai/qwen-image-edit-2511` | about $0.031/image at 1024² (third party); Muapi says $0.05 | [pricepertoken](https://pricepertoken.com/image/model/qwen-qwen-image-edit-2511); [Muapi](https://muapi.ai/comparison/qwen-image-edit-2511) |
| Qwen Image 3.0 | (nav link "Qwen Image 3") | $0.04 at 1K | [Teamday](https://www.teamday.ai/blog/ai-api-pricing-comparison-2026) |

**Native API prices**
- Google Nano Banana Pro $0.134/image (1K/2K). Nano Banana 2 $0.067 at 1K; Teamday's tips section gives about $0.151 at 4K — [Teamday](https://www.teamday.ai/blog/ai-api-pricing-comparison-2026)
- AA's price per 1k images at 1024² on the creator API: Nano Banana 2.1 $33.6 (about $0.034/img), Nano Banana 2 $67, Nano Banana Pro $134, GPT Image 2.5 Sunburst/Flare (max) $210.7, GPT Image 2 (high) $211, Seedream 5.0 Pro $90, Seedream 5.0 Lite $35, FLUX.2 [pro] $45, FLUX.2 [max] $140, FLUX.2 [flex] $120, MAI-Image-2.6 $38.9, Qwen-Image-3.0-Pro $40 — [AA leaderboard](https://artificialanalysis.ai/image/leaderboard/editing)
- BytePlus Seedream 5.0 Pro $0.045 and Lite $0.035. Alibaba Qwen Image 3.0 $0.03 (Pro $0.04). Wan 2.7 Image $0.03 (Pro $0.075) — [Teamday](https://www.teamday.ai/blog/ai-api-pricing-comparison-2026)
- GPT Image 2.5 GA pricing reportedly unpublished. One reseller cites $0.18 for 3840×2160 on "Flare xhigh" (unverified) — [apipass](https://apipass.dev/model/gpt-image-25/openai_gpt-image-2.5)

### Inferences
- If AA's $33.6/1k for Nano Banana 2.1 is right, it is about 4× cheaper than Nano Banana Pro and ranks higher on editing. It is the cost-effective default to test first, with Pro as the comparison.
- For iteration-heavy tattoo QC (4 variants × many shots), FLUX 3 at a flat price per image regardless of reference count is attractive. Note the promo pricing expires on Oct 8.

### Gaps
- No confirmed fal prices for Nano Banana 2.1, FLUX.2 [max], FLUX.2 edit slugs, GPT Image 2.5, Reve, MAI, Hunyuan or Kling image.
- No confirmed native Google 4K price for Nano Banana Pro. (Training knowledge from Nov 2025 says $0.24 at 4K, but this is unverified in this session.)
- Fal prices on resolution-tiered models change often. Re-check model pages before budgeting.

## Q6. Published benchmarks and leaderboards for identity or character consistency

### Takeaway
No public leaderboard isolates character or identity consistency, let alone fine-detail consistency. The best available signals are Artificial Analysis's general Image Editing arena (Oct 2026 top: GPT Image 2.5 Sunburst 1183, Flare 1163, MAI-Image-2.6 1139, Nano Banana 2.1 1137) and a handful of 2025–2026 academic multi-reference and identity benchmarks that mostly report that models still fail at precise appearance preservation.

### Cited Findings
- AA-Image-Editing v2.0 (81 models, "Overall" only, no character-consistency category), as of the Oct 2026 fetch: #1 GPT Image 2.5 Sunburst (max) 1183; #2 GPT Image 2.5 Flare (max) 1163; #3–4 MAI-Image-2.6 1139 and Nano Banana 2.1 1137; MAI-Image-2.6-Flash 1127; GPT Image 2 (high) 1125; Meta Muse Image 1120; Nano Banana 2 1110; Seedream 5.0 Pro 1108; GPT Image 1.5 1103; Nano Banana Pro 1101; HunyuanImage 3.5 Preview 1087; Qwen-Image-3.0-Pro 1077; Qwen-Image-2.1 (open) 1074; Seedream 4.5 1037; Qwen Edit 2511 1021; FLUX.2 [pro] 1007; FLUX.2 [max] 997; Kling Image 3.0 998; FLUX.1 Kontext [pro] 913 — [AA](https://artificialanalysis.ai/image/leaderboard/editing)
- AA's board was re-baselined during 2026. Earlier snapshots had MAI-Image-2.6-Preview at 1286, MAI-Image-2.5-Pro at 1272 and Reve 2.1 at 1261–1263 at the top — [benchmarklist (scraped 2026-09-02)](https://benchmarklist.com/arenas/artificial_analysis_image_editing/); [247wallst](https://247wallst.com/cards/msft-xpost-01m0ww8hz1mtxqzdr3sdzntw6z)
- LMArena-style "arena score" boards exist on third-party sites. One ranks Gemini 3.1 Flash Image first at 2858 on a different scale — [llm-stats](https://llm-stats.com/leaderboards/best-ai-for-image-editing); [magichour](https://magichour.ai/model-leaderboard/image-editing)
- **MultiBanana** (arXiv 2511.22989, late 2025) is a multi-reference T2I benchmark. Nano Banana (2.5 Flash) scored about 7.8/10 on single-reference, about 4.9 on two references, and about 3.6 on background replacement. Older models only — [arXiv](https://arxiv.org/pdf/2511.22989)
- **OmniContext** (OmniGen2 project) is a 400-example subject-driven benchmark with SINGLE/MULTIPLE/SCENE settings. Scores for current models were not retrieved — [Codesota](https://www.codesota.com/browse/computer-vision/image-generation/408)
- **DSH-Bench** (arXiv 2603.08090, Tencent, 2026) proposes a "Subject Identity Consistency Score" that it says correlates better with human judgment — [arXiv](https://arxiv.org/html/2603.08090)
- **MIBE** (arXiv 2607.01383, Jul 2026): SOTA models "frequently omitting subjects, failing to preserve reference appearances, or misattributing interactions" — [arXiv](https://arxiv.org/abs/2607.01383)
- **MultiBind** (arXiv 2603.21937) covers cross-subject attribute misbinding. **CogCanvas** (arXiv 2606.15867) has 1,952 references across 100 celebrity identities in 2–5-person groups — [papers.cool](https://papers.cool/arxiv/2603.21937); [papers.cool](https://papers.cool/arxiv/2606.15867)

### Inferences
- General editing Elo correlates only loosely with identity preservation. For this use case (one person, many shots, exact tattoos), an in-house eval using face-embedding similarity (e.g. ArcFace) for identity plus manual tattoo scoring will be more informative than any public leaderboard.

### Gaps
- Per-model scores on DSH-Bench, MIBE, CogCanvas and OmniContext for current models (Nano Banana 2.1/Pro, GPT Image 2.5, FLUX 3, Seedream 5.0) were not retrieved.
- I found no benchmark that measures tattoo, scar or other fine-mark persistence, or left/right correctness.
- The live LMArena image-edit leaderboard was not fetched directly.
