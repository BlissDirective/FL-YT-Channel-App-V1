# Higgsfield and creator-platform character tools: can they keep a photoreal person (with fine-line neck/hand/forearm tattoos and an eye scar) identical? (as of Oct 8, 2026)

Research scope: Higgsfield (Soul ID, Soul 2 / Soul Cinema, AI Influencer, Popcorn, API) and Midjourney, Runway, Ideogram, Leonardo, Krea, OpenArt. About 22 tool calls. Most tattoo-specific evidence is thin. Only one independent 2026 test explicitly scored tattoo retention, and it is labelled below.

---

## 1. How does Higgsfield Soul ID work (photos, training time, cost), and how well does it keep tattoos and body details compared with faces? What exactly is "AI Influencer"?

### Takeaway
Soul ID is a **training-based** identity model. The official guidance is 20+ photos (up to 80 in the app; 1–100 via the API), and training takes "a few minutes". Higgsfield itself promises "clearly the same person", **not pixel-identical** output. It frames Soul ID around face and identity and makes no claim about tattoos, scars or other body marks. AI Influencer is a separate character builder that generates a character from parameters, a prompt or one photo. It is reference/generation-based, not a trained Soul ID, and its parameter list includes freckles, vitiligo and birthmarks but not tattoos or scars.

### Cited Findings
**Soul ID (official help center, published Aug 1 2026, modified Sep 2 2026)**
- Train on "20 or more photos" of one person; up to 80 are supported. A smaller set of clean, varied photos beats a large inconsistent set. — [Higgsfield Help Center: Soul ID](https://higgsfield.ai/creator-hub/help-center/ai-models/how-do-i-create-and-use-a-soul-id-character)
- "Training takes a few minutes." — [Higgsfield Help Center](https://higgsfield.ai/creator-hub/help-center/ai-models/how-do-i-create-and-use-a-soul-id-character)
- Photo guidance: include **at least one full-height photo** (the page names headshot-only sets as a weakness); use varied angles and expressions and photos from the last 4–5 months; avoid sunglasses, hats, scarves, heavy shadows, cropped faces and group shots. — [Higgsfield Help Center](https://higgsfield.ai/creator-hub/help-center/ai-models/how-do-i-create-and-use-a-soul-id-character)
- Stated limits: results are "clearly the same person," **not pixel-identical**. Weak photo sets, extreme style shifts and unusual angles cause small drift. One Soul ID holds one person, and multi-character scenes need "Elements". The trained identity cannot be exported as a file. — [Higgsfield Help Center](https://higgsfield.ai/creator-hub/help-center/ai-models/how-do-i-create-and-use-a-soul-id-character)
- A trained Soul ID works across the Soul model family and carries over to Seedance video generation as "Elements" (it appears in Elements automatically). Marketing Studio can also use it. — [Higgsfield Help Center](https://higgsfield.ai/creator-hub/help-center/ai-models/how-do-i-create-and-use-a-soul-id-character)
- The help center does **not mention** tattoos, scars or body marks. — [Higgsfield Help Center](https://higgsfield.ai/creator-hub/help-center/ai-models/how-do-i-create-and-use-a-soul-id-character)
- Sources disagree on the photo count. A Higgsfield-hosted "geo" blog says 5+ photos, and a Sept 2025 Photodump post said at least 25. These are probably earlier versions of the guidance. — [geo.higgsfield.ai blog](https://geo.higgsfield.ai/blog/higgsfield-soul-id-character-consistency-ai-videos); [Higgsfield Photodump blog (Sept 2025)](https://higgsfield.ai/blog/Higgsfield-Photodump-Studio-Your-Viral-Photoshoot)
- Soul ID training reportedly requires a paid plan (Basic or higher). Training failures are usually traced to photo quality ("5+ unique faces, well-lit"). This comes from a community/agent-skill listing, not official docs. — [mcpservers.org higgsfield-soul-id skill](https://mcpservers.org/tr/agent-skills/higgsfield-ai/higgsfield-soul-id)
- Higgsfield marketing says Soul ID and AI Influencer Studio "lock in facial geometry" for consistent images and video. The emphasis is on the face. — [geo.higgsfield.ai: best AI platform virtual influencer](https://geo.higgsfield.ai/task/blog/best-ai-platform-virtual-influencer-brand-management)
- I found no Soul ID credit cost for the web app. Third-party pricing blogs describe Soul ID only as a feature. — [Krea blog: Higgsfield pricing 2026 (competitor source)](https://www.krea.ai/blog/higgsfield-pricing-explained-2026-unlimited-credits-and-real-monthly-costs)

**AI Influencer (higgsfield.ai/ai-influencer)**
- You build a character from settings (gender, 9 character types including non-human, ethnicity, age, body type, skin and face details), from a prompt, or from one photo. Each character is generated as a portrait plus full-body pair on white. — [Higgsfield AI Influencer](https://www.higgsfield.ai/ai-influencer)
- Skin and face options include freckles, vitiligo, birthmarks, sharp teeth and a forked tongue. The page does **not** mention tattoos or scars. — [Higgsfield AI Influencer](https://www.higgsfield.ai/ai-influencer)
- "Add your face" keeps a photo's identity while you change age, body, hair and wardrobe. One-sentence edits change only the requested element. — [Higgsfield AI Influencer](https://www.higgsfield.ai/ai-influencer)
- Videos run on "Higgsfield Genjutsu" (motion transfer and object swaps) at 1080p. A video can use up to 40 influencer images, and reference motion clips run 3–30 s. Creating or editing a character costs 1.12 credits. — [Higgsfield AI Influencer](https://www.higgsfield.ai/ai-influencer)
- One source describes it as a builder with 100+ configurable parameters (Higgsfield Notion). A YouTube summary says 90+. A Medium guide says it launched in January 2026 (unconfirmed). — [Higgsfield Notion: AI Influencer Studio](https://higgsfield-ai.notion.site/ebd//ai-influencer-studio-ig?pvs=143); [lilys.ai summary](https://lilys.ai/es/notes/higgsfield-ai-20260128/new-way-make-money-ai-influencers); [Medium guide](https://medium.com/@aisoul/how-to-create-an-ai-influencer-for-free-complete-higgsfield-guide-be4e9fbedfad)

**Popcorn (storyboard tool)**
- Popcorn is a native storyboard generator that makes sequences of up to 8 frames with consistent identity, lighting and atmosphere. It takes up to 4 image references, each addressed by number in the prompt, plus manual or auto modes. — [Higgsfield Help Center: Popcorn](https://higgsfield.ai/creator-hub/help-center/ai-models/how-do-i-use-popcorn); [Higgsfield Popcorn page](https://higgsfield.ai/storyboard-generator)
- Without image references, the character will look different from the previous run. Higgsfield recommends reusing a saved reference portrait, or chaining the last frame as the new reference. — [Higgsfield blog: keep AI persona consistent with Popcorn](https://higgsfield.ai/blog/how-to-keep-ai-persona-consistent-higgsfield-popcorn)
- I found only vendor claims of consistency and no independent tests. — (same sources)

### Inferences
- Soul ID is a per-person fine-tune or embedding trained on 20+ photos. It should hold the face and general look well. The vendor's own "not pixel-identical" disclaimer and the absence of any body-mark claims suggest a specific thin-line white geometric tattoo will be **approximated, not reproduced line-for-line**. White ink fine-line work is low-contrast and small at typical framing, which makes it especially likely to blur or be reinterpreted.
- To give Soul ID a chance at the tattoos, the training set should contain many clear, well-lit shots of the neck, hands and forearms with the tattoo visible, and of the scar. The prompt should also restate the marks in every generation. This is an untested inference.
- AI Influencer suits inventing a synthetic persona, not locking an existing tattoo design. Tattoos and scars are not first-class parameters, so they would have to come from the prompt or photo.

### Gaps
- No official or independent evidence on how well Soul ID keeps tattoos or scars. I found no Reddit or creator reports specifically on Soul ID tattoo retention.
- The Soul ID training cost in web-app credits is not documented in the sources I found.
- Popcorn credit cost is unclear (it is shown on the Generate button only).

---

## 2. What models does Higgsfield wrap, and is there an official developer API (endpoints, models, pricing, Soul ID or AI Influencer availability)?

### Takeaway
Higgsfield has an official, pay-as-you-go REST API at `api.higgsfield.ai`. The docs are at docs.higgsfield.ai and keys come from the console. **Soul ID training is exposed via the API** (`POST /v1/custom-references`, 1–100 images), and the trained ID can be used with Soul v1, Soul V2 and Soul Cinema through `custom_reference_id`. Soul 2 and Soul Cinema cost about $0.0032 per image (launch "starting" rate). The API catalog (84 entries: 17 image, 67 video) does **not** list Nano Banana, Seedream or FLUX, even though the consumer web app offers Nano Banana Pro and Nano Banana 2. I found no AI Influencer endpoint. Genjutsu motion transfer *is* in the API.

### Cited Findings
**API basics**
- The API is a separate product from the website subscription: a prepaid USD balance, a $5 minimum top-up, no subscription required, funds expiring after 1 year, and no charge for failed or moderated requests. — [Higgsfield Help Center: What is the Higgsfield API](https://higgsfield.ai/creator-hub/help-center/integrations/what-is-the-higgsfield-api); [Higgsfield API docs: Billing](https://docs.higgsfield.ai/docs/concepts/billing-and-retention.md)
- REST endpoint `api.higgsfield.ai`. Auth uses the header `Authorization: Key {KEY_ID}:{KEY_SECRET}`. Requests are async: you get a `request_id`, then poll `/requests/{id}/status` or use webhooks. There are official Python and TypeScript SDKs, 20 concurrent requests once a key exists, and outputs are retained for at least 7 days. — [Higgsfield API docs](https://docs.higgsfield.ai/docs); [Higgsfield blog: API (Sep 16 2026)](https://higgsfield.ai/blog/higgsfield-api)
- The console URL is inconsistent across sources. The docs and blog say console.higgsfield.ai, while the help center says open.higgsfield.ai. — [docs llms.txt](https://docs.higgsfield.ai/docs/llms.txt); [Help Center](https://higgsfield.ai/creator-hub/help-center/integrations/what-is-the-higgsfield-api)
- An estimate endpoint (`POST /estimate/<model path>`) returns credits and USD before you run a request. The docs' illustrative example shows Soul V2 at "1.500 credits / $0.094". That example is labelled as format-only and conflicts with the $0.0032 blog rate. — [Higgsfield docs: Billing and retention](https://docs.higgsfield.ai/docs/concepts/billing-and-retention.md)
- Starting rates from the blog: Soul 2 and Soul Cinema $0.0032/image; Marketing Studio Image $0.0059/image; DoP $0.125/generation; Kling 2.5 $0.042/s; Kling 2.6 $0.07/s; Kling 3.0 $0.112/s; Seedance 2.5 $0.0738/s; Seedance 2.0 $0.9332/s; PixVerse 6 $0.115/s; MiniMax H3 $0.13/s; LTX 2.5 Pro $0.17/s; Wan 3.0 $0.20/s. The blog mentions a launch promotion of up to 50% off some models, so these may be promo rates. — [Higgsfield blog: API](https://higgsfield.ai/blog/higgsfield-api)

**Soul ID via API (confirmed in docs)**
- `POST https://api.higgsfield.ai/v1/custom-references` with `name` (max 100 chars), `model_version` (`v1` | `v2` | `cinema`, default v1) and `input_images` (**1–100** public image URLs). Poll `GET /v1/custom-references/{id}`; statuses are not_ready, queued, in_progress, completed and failed. References are scoped to the account. — [Higgsfield docs: Soul ID Create character](https://docs.higgsfield.ai/docs/models/soul-id/create-character.md)
- Generation: `POST /higgsfield-ai/soul/v2/standard` accepts `custom_reference_id` and `custom_reference_strength` (greater than 0 and at most 1, default 1.0; the docs note that 0 fails at runtime). `batch_size` is 1 or 4. — [Higgsfield docs: SOUL V2 generate](https://docs.higgsfield.ai/docs/models/soul-2/generate.md)
- I found no API price for Soul ID *training*. The docs page does not state one; the estimate endpoint may return it. — [Higgsfield docs: Soul ID](https://docs.higgsfield.ai/docs/models/soul-id.md)

**API model catalog**
- Image families (14 families, 17 entries): SOUL, SOUL V2, SOUL Cinema, Soul ID (training), Marketing Studio Image, Ads Studio (renders with "GPT Image 2.5 Flare"), Grok Image 2.0 (up to 10 image references), Recraft V4.1 / Pro / Utility / Utility Pro, Qwen Image 3, Ideogram 4.0 and Z-Image Turbo. — [Higgsfield docs: Image Generation API](https://docs.higgsfield.ai/docs/models/image-generation.md)
- Video includes Seedance 2.0/2.5 reference-to-video, Kling O3 / Kling Omni image-reference and video-reference, Wan, MiniMax, LTX, PixVerse and Grok, plus Genjutsu motion transfer (`POST /higgsfield/genjutsu/motion-transfer/v1.0`). — [Higgsfield docs: Models](https://docs.higgsfield.ai/docs/models.md); [Higgsfield docs index](https://docs.higgsfield.ai/docs)
- The API catalog "may differ from the website lineup." — [Help Center: API](https://higgsfield.ai/creator-hub/help-center/integrations/what-is-the-higgsfield-api)

**Web app (consumer) models and pricing**
- The web app offers Nano Banana Pro (about 2 credits per standard image, about 4 at 4K) and Nano Banana 2, along with Seedance, Kling 3.0, Wan 2.7, Cinema Studio and MiniMax. This was captured Aug 31 2026 by a competitor (Krea) blog. — [Krea blog: Higgsfield pricing 2026](https://www.krea.ai/blog/higgsfield-pricing-explained-2026-unlimited-credits-and-real-monthly-costs)
- Plans: Free $0 (0 credits); Starter $19 (270 credits); Plus $47/mo annual or $59 monthly (1,200 credits); Ultra $99 annual or $129 monthly (3,000 credits). Credit packs require a subscription. "Unlimited" windows rotate per model and apply to the web app only (MCP, CLI and Canvas still deduct credits). — [Krea blog](https://www.krea.ai/blog/higgsfield-pricing-explained-2026-unlimited-credits-and-real-monthly-costs); [Creatify blog: Higgsfield pricing 2026](https://creatify.ai/blog/higgsfield-pricing-(2026)-plans-and-what-you-ll-actually-pay)
- A community "higgsfield" CLI exposes `soul-id list/get` and `--soul-id <id>` with `text2image_soul_v2` / `soul_cinema_studio`. This is a third-party skill listing. — [mcpservers.org skill](https://mcpservers.org/zh-CN/agent-skills/higgsfield-ai/higgsfield-soul-id)

### Inferences
- For an automated pipeline, Higgsfield is one of the few creator platforms where a **trained** character is accessible by API. You train once via `/v1/custom-references`, then generate with Soul V2 or Cinema at a very low per-image cost.
- Seedream, FLUX and Nano Banana Pro are not in the API catalog. If those models are needed (for example, multi-reference editing to fix tattoos), they would have to be called from their own providers or other aggregators.
- Seedance and Kling "reference-to-video" endpoints let a still with the correct tattoos seed video. Whether the tattoos survive motion is untested.

### Gaps
- Soul ID training API price, and whether Soul ID IDs created in the web app are visible to the API (references are "scoped to the account", but web-app and API accounts may be separate).
- Whether Seedream (any version) or FLUX is on the Higgsfield web app in Oct 2026. No source confirmed this.
- I found no AI Influencer or Popcorn endpoints in the API docs.

---

## 3. Midjourney Omni-Reference and character reference: photoreal identity, tattoo fidelity, and API status in 2026

### Takeaway
Omni Reference (`--oref`, `--ow` 0–1000) is reference-based (one image) and works on **V7 only**. On V8.1/8.2 (V8.2 has been the default since July 24 2026) it is replaced by the "Edit Model" (up to 4 reference images, open to all since Aug 27 2026). `--cref` is a legacy V6 control. Midjourney still has **no official public API** as of Sept 2026, and its ToS prohibits automation. I found no tattoo-fidelity tests.

### Cited Findings
- `--oref` transfers face, body proportions, clothing and accessories. `--ow` runs 0–1000 (default 100); 300–1000 gives "maximum fidelity", and the guide suggests staying under about 400. It is V7-only, and the docs say "When using V8.X, use the Edit Model instead." It is not compatible with Conversational Mode. — [Blake Crosley Midjourney guide (updated Sep 22 2026, third-party, cites MJ docs)](https://blakecrosley.com/guides/midjourney)
- Edit Model: open to everyone Aug 27 2026, works with V8.1/V8.2, up to 4 reference images (`--edit` on Discord). A Sept 1 2026 docs revision says it "replaces Omni Reference, Character Reference, and the Retexture tool." — [Blake Crosley guide](https://blakecrosley.com/guides/midjourney)
- Plans: Basic $10 (3.3 fast hrs), Standard $30 (15 hrs), Pro $60 (30 hrs), Mega $120 (60 hrs). — [Blake Crosley guide](https://blakecrosley.com/guides/midjourney)
- API: "as of September 2026, Midjourney offers no official public API" and its ToS prohibit automated access. Third-party "Midjourney APIs" are unofficial wrappers with ban risk. — [Unifically: Midjourney API (2026)](https://unifically.com/blogs/midjourney-api). One review claims an Enterprise-gated official API from late 2025; this is unconfirmed and conflicts with other sources. — [tooldirectory.ai Midjourney review](https://tooldirectory.ai/tools/midjourney)
- I found no source testing Midjourney on tattoo consistency. General guides advise a single clean front-facing anchor image, identical character text across prompts, and raising `--ow` when drift appears. — [aiarty Midjourney consistent character](https://www.aiarty.com/midjourney-guide/midjourney-consistent-character.htm); [echai.ventures oref guide](https://echai.ventures/how-founders-use-ai/video-image-audio/how-do-you-keep-characters-and-brand-look-consistent-across-ai-generated-scenes-and-assets)
- The official MJ docs page for Omni Reference returned HTTP 403 to my fetch, so the details above are via a third-party guide. — (docs.midjourney.com, not retrievable)

### Inferences
- Midjourney is unsuitable for an automated app pipeline because it has no API. Its stylized "aesthetic" bias plus single-image `--oref` makes exact reproduction of a thin-line geometric tattoo unlikely. The Edit Model (multi-reference editing) may do better, but it is untested for tattoos.

### Gaps
- No direct tests of `--oref` or Edit Model on tattoos or scars. I could not read the official MJ docs.

---

## 4. Runway Gen-4 References, Ideogram Character, Leonardo, Krea, OpenArt: body-detail retention, pricing, API

### Takeaway
All of these are mostly **reference-based**. Krea, and optionally Leonardo and OpenArt, also offer **training**. The only independent 2026 test that scored tattoos found **Runway Gen-4 reproduced tattoos as "strange, abstract shapes"**. In the same test, FLUX.2 and gpt-image-2 kept all tattoos and Gemini 3.1 Flash altered one. Runway, Ideogram and Leonardo have official APIs. I found no official character API for Krea or OpenArt.

### Cited Findings
**Independent tattoo test (techstackups, May 2026; single tester, small sample, so treat as indicative)**
- Test: a reference man with a rose tattoo on his cheek, a sunflower tattoo on his arm and green hair, placed into a new barista scene. FLUX.2 kept both tattoos and the hair (ranked #1). gpt-image-2 kept all tattoos but copied the head pose stiffly and had finger artifacts. Gemini 3.1 Flash turned the cheek rose into "a more abstract teardrop tattoo" and *added* an extra sunflower on the neck. Runway Gen-4's "tattoos are strange, abstract shapes that do not match the original at all", and it failed face preservation. — [techstackups: Gemini vs OpenAI vs FLUX vs Runway character consistency (May 2026)](https://techstackups.com/comparisons/gemini-vs-openai-vs-flux-vs-runway-character-consistency-may-2026/)
- Max references and prices per that article: FLUX.2 8 refs via API, $0.03–0.07/MP; Gemini 3.1 Flash 14 refs, about $0.045–0.151; gpt-image-2 16 refs, $0.006–0.211; Runway Gen-4 3 refs, $0.05 (720p) / $0.08 (1080p). — [techstackups](https://techstackups.com/comparisons/gemini-vs-openai-vs-flux-vs-runway-character-consistency-may-2026/)

**Runway**
- Gen-4 References allows up to 3 reference images. It reached all paid plans in May 2025. The Gen-4 Image API costs $0.08/image (May 2025 announcement, flagged as older). — [Runway: Introducing the Gen-4 Image API](https://runwayml.com/news/introducing-runway-api-for-gen-4-images); [AlternativeTo (May 2025)](https://alternativeto.net/news/2025/5/runway-releases-gen-4-references-for-all-paid-plans/)

**Ideogram Character**
- Reference-based (Character Reference). Official API pricing per output image: 3.0 Turbo + Character $0.10, Default $0.15, Quality $0.20. The pricing page was last revised Aug 6 2025, so it may be outdated. — [Ideogram API Pricing](https://ideogram.ai/features/api-pricing)
- Ideogram 4.0 is also available via the Higgsfield API, but character-reference support there is unverified. — [Higgsfield docs: Image Generation](https://docs.higgsfield.ai/docs/models/image-generation.md)
- I found no tattoo-specific reports.

**Leonardo**
- Character Reference is an image-guidance option in the official API: weight 0–2 and strengthType Low/Mid/High. Leonardo states it "is not intended as a face swap feature and does not guarantee a perfect replica of a person." — [Leonardo API docs: Image Guidance](https://docs.leonardo.ai/docs/generate-images-using-image-guidance)
- A custom-model route (training) reportedly uses 20–40 images. This comes from a secondary video summary. — [lilys.ai Leonardo summary](https://lilys.ai/en/notes/consistent-characters-20251101/create-consistent-characters-leonardo-ai-methods)

**Krea**
- Training-based: at least 3 images, 10–30 recommended. It is framed as style, character or object training. — [Krea docs: Training](https://www.krea.ai/docs/features/training)

**OpenArt Characters**
- You create a character from 1 reference image, a text description or a preset builder, save it, and reuse it across image and video generators. Third parties describe LoRA-style training, which is not confirmed by OpenArt. — [OpenArt AI Character](https://openart.ai/features/ai-character/); [devtoollab OpenArt review](https://devtoollab.com/ai-tools/openart-ai)
- I found no official public character API.

### Inferences
- Among the platform tools, **none** documents or demonstrates exact reproduction of a specific fine-line tattoo design. The best evidence of tattoo retention comes from multi-reference *editing* foundation models (FLUX.2, gpt-image-2), not from creator-platform "character" features.
- Thin white-ink geometric linework on the neck, hands and forearms is harder than the colored tattoos in the techstackups test, so expect worse retention. A practical pipeline likely needs one of two approaches. The first is supplying close-up tattoo crops as extra references (possible with 4–16 reference models). The second is a post-pass that composites or inpaints the exact tattoo design onto generated images.
- Runway should be deprioritized for tattoo fidelity.

### Gaps
- No tests of Ideogram, Leonardo, Krea or OpenArt on tattoos or scars.
- Current (Oct 2026) Runway and Ideogram API prices are not re-verified, since the sources are from 2025.
- No OpenArt or Krea public API for characters was found.

---

## 5. User reports about tattoos staying consistent (or not)

### Takeaway
I found almost no user reports specifically on tattoo consistency with these tools. The one concrete data point is the techstackups test above. Searches aimed at Reddit returned app-store noise instead.

### Cited Findings
- FLUX.2 and gpt-image-2 kept the reference tattoos. Gemini 3.1 Flash changed one tattoo and hallucinated another. Runway Gen-4 produced abstract shapes. This is a single-tester article (anecdotal or semi-structured). — [techstackups (May 2026)](https://techstackups.com/comparisons/gemini-vs-openai-vs-flux-vs-runway-character-consistency-may-2026/)
- A guide on prop consistency notes that a text description "is a suggestion, not a lock." Small items described only in text tend to drift. — [HackerNoon: keep AI props consistent](https://hackernoon.com/how-to-keep-ai-generated-props-consistent-shot-to-shot)
- Higgsfield's own docs concede "not pixel-identical" results and drift with extreme styles or angles. — [Higgsfield Help Center](https://higgsfield.ai/creator-hub/help-center/ai-models/how-do-i-create-and-use-a-soul-id-character)

### Inferences
- Treat any claim of "identical" tattoos across many images as unproven for every tool here. Plan for a QA and fix-up step: automated comparison of tattoo regions plus inpainting with the exact design.

### Gaps
- No Reddit or creator-forum threads were retrieved on Soul ID, Midjourney or Ideogram tattoo retention.
- No sources at all on scar-over-one-eye fidelity, including which side the scar stays on (mirroring risk).
