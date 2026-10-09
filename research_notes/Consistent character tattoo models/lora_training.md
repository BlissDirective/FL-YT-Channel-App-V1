# LoRA / Fine-Tune Training for Exact Photoreal Character Consistency (tattoos, scar, robotic eye), as of October 2026

Research date: 2026-10-08. Prices come from fal.ai model pages and their llms.txt files as cached or fetched in October 2026. fal changes prices often, so confirm on the model page before budgeting. Items dated earlier than 2026 are flagged.

## Q1. Hosted LoRA training services: price per run, steps, time, inference cost

### Takeaway
On fal.ai, a character LoRA costs roughly $1–$8 to train (1,000–2,000 steps). The base model is the biggest price driver: the Qwen-Image and Z-Image trainers cost about $1–$2.3 per 1k steps, and FLUX.2 [dev] costs $6.40–$8 per 1k steps. Inference with a LoRA on FLUX.2 is about $0.021 per megapixel. Replicate bills by H100 time, about $5.50/hr. Civitai prices in Buzz, with conflicting figures. I could not retrieve Astria's pricing.

### Cited Findings
**fal.ai trainers (price per step, from fal model pages)**
- `fal-ai/flux-lora-fast-training` (FLUX.1 dev): $2 per run at the default 1,000 steps, scaling linearly with steps. Requires a `trigger_word`. An `is_style` flag set to true turns off auto-captioning and segmentation masks, so the default subject mode auto-captions and masks. Recommends images of 1024x1024 or larger. No training time is given ("minutes, not hours"). — [fal flux-lora-fast-training](https://fal.ai/models/fal-ai/flux-lora-fast-training)
- `fal-ai/flux-2-trainer` (FLUX.2 [dev] text-to-image): 0.0064 × steps, so $6.40 per 1,000 steps. Default 1,000 steps (range 100–10,000), learning rate 5e-5, output in "fal" or "comfy" format. "Try to use at least 10 images, although more is better." Each image needs a same-name .txt caption, or a `default_caption`; otherwise training fails. No trigger_word parameter is documented, so the trigger goes in the captions. — [fal flux-2-trainer llms.txt](https://fal.ai/models/fal-ai/flux-2-trainer/llms.txt). A different fal page for the same model shows 0.008/step ($8 per 1k), so the two fal pages conflict. — [fal flux-2-trainer](https://fal.ai/models/fal-ai/flux-2-trainer)
- `fal-ai/flux-2-trainer-v2/edit` (FLUX.2 [dev] edit LoRA): 0.0226 × steps × reference multiplier. fal's example is $47.46 for 1,000 steps with 1 reference image. — [fal flux-2-trainer-v2/edit](https://fal.ai/models/fal-ai/flux-2-trainer-v2/edit)
- `fal-ai/flux-2-klein-9b-base-trainer`: 0.0086 × steps ($8.60 per 1k). — [fal klein 9b trainer](https://fal.ai/models/fal-ai/flux-2-klein-9b-base-trainer). The FLUX.2 [klein] 4B base edit trainer is 0.0046 × steps × reference multiplier, $9.71 per 1k steps with 1 reference. — [fal klein 4b edit trainer](https://fal.ai/models/fal-ai/flux-2-klein-4b-base-trainer/edit)
- Qwen-Image trainers on fal:
  - `qwen-image-trainer`: $0.002/step, minimum 250 steps, so $2 per 1k. — [fal qwen-image-trainer](https://fal.ai/models/fal-ai/qwen-image-trainer/llms.txt)
  - `qwen-image-trainer-v2`: $0.002/step, minimum 500 steps. — [fal qwen-image-trainer-v2](https://fal.ai/models/fal-ai/qwen-image-trainer-v2/llms.txt)
  - `qwen-image-2512-trainer`: $0.0015/step, minimum 500. — [fal qwen-image-2512-trainer](https://fal.ai/models/fal-ai/qwen-image-2512-trainer)
  - `qwen-image-2512-trainer-v2`: $0.00095/step, minimum 500. — [fal qwen-image-2512-trainer-v2](https://fal.ai/models/fal-ai/qwen-image-2512-trainer-v2/llms.txt)
- Qwen-Image-Edit-2509 trainer (edit LoRA): $4.00 per 1,000 steps, minimum 100 steps. — [fal qwen-image-edit-2509-trainer](https://fal.ai/models/fal-ai/qwen-image-edit-2509-trainer/llms.txt)
- Z-Image trainers on fal: the Z-Image Turbo trainer (6B) costs $2.26 per 1,000 steps (2,000 steps = $4.52, range 100–10,000). — [fal z-image-trainer](https://fal.ai/models/fal-ai/z-image-trainer/playground). The Z-Image base trainer costs $0.85 per 1,000 steps. — [fal z-image-base-trainer](https://fal.ai/models/fal-ai/z-image-base-trainer)
- Wan trainers on fal:
  - Wan-2.1 trainer: $0.005/step, default 400 steps (range 100–20,000). — [fal wan-trainer](https://fal.ai/models/fal-ai/wan-trainer/llms.txt)
  - Wan 2.2 T2V-A14B trainer: $0.004/step, minimum 100. — [fal wan-22-trainer t2v-a14b](https://fal.ai/models/fal-ai/wan-22-trainer/t2v-a14b)
  - Wan 2.2 I2V-A14B trainer: $0.005/step. Its dataset must contain at least one video; image-only datasets are rejected. — [fal wan-22-trainer i2v-a14b](https://fal.ai/models/fal-ai/wan-22-trainer/i2v-a14b)
  - A separate Wan 2.2 image trainer endpoint exists, but I did not capture its price. — [fal wan-22-image-trainer](https://fal.ai/models/fal-ai/wan-22-image-trainer)
- fal's FLUX.2 training guide (Nov 25, 2025, so slightly older) says training takes "anywhere from a few minutes to hours for larger datasets." It lists the inference endpoints `fal-ai/flux-2/lora` and `fal-ai/flux-2/lora/edit`. — [fal blog: Training FLUX.2 LoRAs](https://blog.fal.ai/training-flux-2-loras)

**Inference with a LoRA**
- `fal-ai/flux-2/lora`: $0.021 per megapixel, so a 1 MP image costs about $0.021. Large LoRAs add a multiplier: 2–3 GB total is 1.5x, 3–4 GB is 2x, 4–5 GB is 2.5x, and 5 GB is the maximum total LoRA size. — [fal flux-2/lora](https://fal.ai/models/fal-ai/flux-2/lora)

**Replicate**
- `ostris/flux-dev-lora-trainer` runs on H100 at $0.001525/s, about $5.49/hr. Another cached page shows $0.001528/s. Replicate does not publish typical run times. — [Replicate ostris/flux-dev-lora-trainer](https://replicate.com/ostris/flux-dev-lora-trainer). A general ai-toolkit trainer is also hosted. — [Replicate lucataco/ai-toolkit](https://replicate.com/lucataco/ai-toolkit)

**Civitai**
- Sources conflict. One 2026 guide puts a Flux 2 training run at about 250 Buzz (~$0.25). Older tutorial summaries say Flux trainings cost 2,000 Buzz. — [Apatero: Civitai LoRA Training 2026](https://apatero.com/blog/civitai-lora-training-2026-flux-2-datasets). A secondary source reports that Civitai Buzz and membership purchases now go through crypto and gift cards. — [vantaige.io Civitai](https://vantaige.io/ai-tool/civitai) (secondary, unverified)

**Third-party comparison (low reliability, vendor marketing)**
- MuAPI lists its own Flux LoRA trainer at $3.20 per run against fal's $2.00, and claims some trainers are "not hosted on fal," which fal's own pages contradict. — [MuAPI comparison](https://muapi.ai/comparison/flux-lora-trainer)

**Self-hosting reference**
- Renting a RunPod RTX PRO 6000 (96 GB) cost about $2/hr. FLUX.2 Dev (24B, plus a 24B Mistral text encoder) needed about 90 GB of system RAM to quantize. — [MesmerTools, Jul 2026](https://mesmer.tools/blog/best-base-model-for-lora-training-2026)

### Inferences
- A Qwen-Image or Z-Image character LoRA on fal costs about $1–$5 per 1–2k-step run, cheap enough to run 3–5 variants (rank, steps, captioning) for under $25. FLUX.2 [dev] runs cost 3–4x more per step, and FLUX.2 edit-LoRA training is far more expensive (~$47 per 1k steps).
- At $0.021/MP, FLUX.2 LoRA inference is a small part of per-image cost. Retries and rejected images will dominate the cost of a consistency pipeline.

### Gaps
- Astria pricing: astria.ai/pricing returned HTTP 403 and search turned up nothing current.
- Inference price for `fal-ai/flux-lora` (FLUX.1 dev + LoRA), Qwen-Image LoRA inference, and Z-Image LoRA inference on fal was not captured.
- fal does not publish wall-clock training times. "Minutes" is fal's only claim.
- I did not verify BFL's own hosted fine-tuning API (FLUX Pro fine-tune), including whether it still exists or what it costs in 2026.
- The two FLUX.2 trainer rates (0.0064 vs 0.008 per step) are unresolved.

## Q2. Which base model gives the best photoreal LoRA results in 2026?

### Takeaway
No controlled benchmark exists. The best 2026 evidence is one practitioner test from July 2026 (two faces, six models, consumer GPU). It ranked Ideogram 4 > Krea 2 > FLUX.1 Dev > Z-Image > FLUX.2 Klein, and FLUX.2 Dev did not finish because of hardware. FLUX.1 Dev remains a "solid" mature default. FLUX.2 Dev is widely called the open-weight photoreal leader but is heavy to train. On fal, which trains it hosted, the hardware issue doesn't apply. Qwen-Image and Z-Image are cheap and permissively licensed.

### Cited Findings
- MesmerTools test (July 14, 2026; same two faces on six base models; RTX 4070 Ti SUPER 16 GB at fp8):
  1. Ideogram 4 "held the likeness on both an easy face and a hard one better than anything else I tested." It needs its native JSON caption format; plain-text captions gave "artifact-ridden results."
  2. Krea 2 jumped "from the bottom third all the way to second place" when sampled with Turbo instead of Raw.
  3. FLUX.1 Dev is "still solid," the author's production model, trained for 2,500 steps.
  4. Z-Image is the fastest; the hard face was "a touch soft." It overfit at 3,000 steps and was fixed at 1,500.
  5. FLUX.2 Klein (9B) at first lightened a subject's skin; caption and rank fixes (rank 64) restored the likeness.
  6. FLUX.2 Dev did not finish: two cloud attempts "looked bad."

  The dataset appears to be about 12–16 photos per subject. Caveat: one author and two subjects. — [MesmerTools](https://mesmer.tools/blog/best-base-model-for-lora-training-2026)
- 2026 overview guides rate FLUX.2 Dev as the open-weight photoreal leader and FLUX.1 Dev as strong with a mature LoRA ecosystem. Qwen-Image is rated 4/5 photoreal; its strength is text rendering. Z-Image Turbo is rated 5/5 photoreal but has a small LoRA ecosystem. These are secondary, opinion-based sources. — [LocalAIMaster](https://localaimaster.com/blog/best-local-image-models-compared); [Thunder Compute](https://www.thundercompute.com/blog/best-open-source-image-generation-models); [Botmonster](https://botmonster.com/ai/best-local-image-generation-models-2026/)
- Licensing per the same guides: FLUX.1 [dev] and FLUX.2 [dev] are non-commercial-licensed weights. Z-Image Turbo, Qwen-Image and FLUX.2 [klein] 4B are Apache 2.0. Krea 2 has a community license with a revenue threshold. — [LocalAIMaster](https://localaimaster.com/blog/best-local-image-models-compared) (secondary; verify against each model card. Commercial use of outputs made through hosted APIs like fal is usually covered by the provider's terms, which I did not verify.)
- I found no character-LoRA benchmark for Wan 2.2 used as an image model. — search results only ([dev.to Wan 2.2 tutorial, 2025](https://dev.to/furkangozukara/wan-22-flux-flux-krea-qwen-image-just-got-upgraded-ultimate-tutorial-for-open-source-sota-ifd))
- Hunyuan Image: no 2026 LoRA-quality evidence surfaced.

### Inferences
- For a hosted fal pipeline, the realistic shortlist is FLUX.2 [dev] (best photoreal, highest cost, edit-LoRA path available), Qwen-Image / Qwen-Image-2512 (cheap, pairs with Qwen-Image-Edit for LoRA + edit workflows), and Z-Image (cheap, fast, photoreal). Ideogram 4 and Krea 2 scored well in the one test, but I did not confirm hosted trainers for them on fal.
- Fine-detail fidelity, which matters most for tattoos, was not measured in any comparison. A small bake-off is needed: the same 15–25 image dataset on 2–3 bases, judged on tattoo line accuracy.

### Gaps
- No head-to-head benchmark of tattoo, scar or fine-mark fidelity across base models.
- No 2026 evidence on Hunyuan Image or Wan 2.2 image character LoRAs.
- I did not confirm whether Ideogram 4 or Krea 2 LoRA training is offered on fal.

## Q3. Dataset size, angles, captions/trigger words; can ~12 generated character-sheet images bootstrap a LoRA?

### Takeaway
Hosted trainers accept 10+ images. fal's FLUX.2 guide recommends 20 or more. Classic character guides aim for about 40 varied shots. Captioning is the biggest quality lever. Anything visible in every image and left uncaptioned gets baked into the trigger, which is what you want for permanent tattoos, the scar and the robotic eye. Synthetic bootstrapping (generate variations from one reference with an edit model, then train) is an established community workflow. With ~12 images, though, the LoRA risks memorizing the images and copying their artifacts.

### Cited Findings
- fal FLUX.2: "gather 20 to 1,000 images that reflect the same style, subject, or identity"; "caption files usually lead to far better LoRA learning retention." — [fal blog (Nov 2025)](https://blog.fal.ai/training-flux-2-loras). The fal FLUX.2 trainer API asks for "at least 10 images, although more is better." — [fal flux-2-trainer llms.txt](https://fal.ai/models/fal-ai/flux-2-trainer/llms.txt)
- Classic character guide (SD1.5-era, older but principles still apply):
  - About 40 images (42 used): mostly close frontal faces, plus 2–3 slight angles per side, one 90° profile per side, one from above, two from behind, one head-and-torso shot and one full body.
  - At least 768 px per side; ~4096 px sources ideal.
  - "Anything you do not tag that is visible in all the images becomes part of 'the character' unless you specifically tag it."
  - Short captions: longer ones reduce quality.

  — [Scott Baker LoRA Training](https://www.scottbaker.ca/AI/LoRA-Training)
- The 2026 test calls captioning "the single biggest quality lever." Captions describing the face "stopped binding to the trigger word"; scene-only captions that let "the trigger word own the face" worked best. It overfit at 3,000 steps on Z-Image (fixed at 1,500). — [MesmerTools](https://mesmer.tools/blog/best-base-model-for-lora-training-2026)
- One creator removed "freckles" from captions so they would "be included by default when the trigger is used." This is the same principle for permanent marks. — surfaced via search from a LoRA guide ([Medium: LoRA Training Step #3](https://medium.com/@alivesin/lora-training-step-3-training-your-first-lora-da8e54a33df2)); I did not fetch the page directly to verify.
- Synthetic bootstrapping (Oct 2025, older):
  - The author used Qwen-Image-Edit to generate many variations of one reference person (a 50-prompt file of poses, environments and outfits), then trained a Wan, Flux, Qwen or SDXL LoRA in ostris AI Toolkit.
  - Caveats: the model does what's asked "most of the time," and the full model wants a 32 GB+ GPU.

  — [WeirdWonderfulAI](https://weirdwonderfulai.art/comfyui/qwen-image-edit-can-create-character-consistent-lora-dataset/)
- Memorization risk: LoRAs "tend to memorize the training images, generating slightly altered versions, particularly when the training image set is as small as three." — [arXiv 2412.12048 "A LoRA is Worth a Thousand Pictures"](https://arxiv.org/pdf/2412.12048)
- A rank-32 fix is suggested when rank 16 gives inconsistent likeness. A 15–30 varied image set with a unique trigger is recommended for repeatable identity. — [modl.run guide](https://modl.run/guides/train-character-lora/); [Flick](https://flick.art/blog/img2img-consistent-character/flux)

### Inferences
- About 12 character-sheet images can work as a seed, but they are below fal's 20+ guidance. The LoRA will also learn any inconsistency in them, for example a tattoo drawn slightly differently on two sheets. Every training image must show the exact canonical tattoo design. Curate hard, and fix tattoo lines in each image (manual or reference-based inpainting) before training.
- Expand to about 20–30 images: the 12 sheets plus close-up crops of the neck, each hand, each forearm, and the scar/robotic-eye region, plus varied lighting and backgrounds. This adds pixel density on the details without adding inconsistent full-body renders.
- Captioning strategy:
  - Use a unique trigger (e.g. "zxq_woman").
  - Caption scene, pose, clothing and lighting.
  - Do not describe the permanent features (tattoo, scar, robotic eye) in full-body shots, so they bind to the trigger.
  - Close-up crops need a short locational caption (e.g. "zxq_woman, close-up of left forearm") so the model learns where each detail lives.
  - This is a synthesis of the cited principles, not a tested recipe.

### Gaps
- No controlled study of how many synthetic vs real images are needed for fine-detail fidelity.
- No source tests "character sheet" (multi-view grid) images vs individual crops as training data. Splitting sheets into individual panels is the common practice but unsourced here.

## Q4. Tattoo fidelity: exact line work or only general style? Left/right asymmetry? What helps?

### Takeaway
I found no reliable source showing that a character LoRA reproduces an exact, intricate tattoo design across new poses. The available evidence (general LoRA behavior, plus the absence of success reports) suggests LoRAs reliably learn "white geometric line tattoo on neck/hands/forearms" as a style and placement, while the exact line geometry drifts. Asymmetry is documented and controllable: random horizontal flip augmentation will move a one-sided feature to the wrong side and must be disabled. This matters for the scar over one eye and the single robotic eye.

### Cited Findings
- kohya_ss docs on flip augmentation: "the image will be horizontally flipped randomly. It can learn left and right angles, which is useful when you want to learn symmetrical people and objects." — [kohya_ss options.md](https://github.com/bmaltais/kohya_ss/blob/master/docs/LoRA/options.md)
- "Flip augmentation: On (unless there are asymmetries in your subject that are important — eg: the hair should always part on the left)." — [Scott Baker](https://www.scottbaker.ca/AI/LoRA-Training)
- A tattoo-specific warning surfaced in search (attribution not directly verified, likely the Medium LoRA guide): "If your images contain an asymmetrical element, ie. diagonal bangs, or tattoo on only one arm — TURN OFF RANDOM FLIP… turning a tattoo on the left arm into a tattoo on the right arm." — [Medium: LoRA Training Step #3](https://medium.com/@alivesin/lora-training-step-3-training-your-first-lora-da8e54a33df2) (search snippet)
- A single-image augmentation experiment showed generated output came out mirrored "because the photo flipped horizontally is contained in the augmented image set." — [Medium: Training LoRA with a single image](https://medium.com/@numq/training-lora-with-a-single-image-the-magic-of-data-augmentation-5c1b4010d73f)
- Flipping breaks laterality and lettering in general CV training. — [Roboflow flip augmentation](https://blog.roboflow.com/how-flip-augmentation-improves-model-performance/)
- Training-data inconsistency: "remove blurry, inconsistent, or problematic images." — [Multic Flux LoRA guide](https://www.multic.com/guides/flux-lora-training/)
- Higher rank improves likeness consistency (16 → 32). — [modl.run](https://modl.run/guides/train-character-lora/). Rank 64 restored likeness on FLUX.2 Klein. — [MesmerTools](https://mesmer.tools/blog/best-base-model-for-lora-training-2026)
- Undertrained versions "may get details wrong," while heavier training gives more consistent details (anime character LoRAs, older). — [HF Trauter_LoRAs README](https://huggingface.co/YoungMasterFromSect/Trauter_LoRAs/raw/6129479c95c7d1d711d360353a653d3df93680c3/README.md)
- Tag-style captions (trigger, tag1, tag2…) beat natural-language captions in the Block-wise LoRA paper's experiments (2024, SD-era). — [arXiv 2403.07500](https://arxiv.org/pdf/2403.07500)
- Tattoo-specific community evidence: targeted searches of r/StableDiffusion and r/FluxAI found no threads documenting exact tattoo reproduction with a character LoRA. The closest is a March 2026 r/StableDiffusion snapshot where commenters call LoRA "the only real route to consistency" for face/look. That is anecdotal and not tattoo-specific. — [Reddit snapshot mirror](https://reddit.sentinel-team.org/posts/1rxfxs5/snapshots/2026-03-20T17%3A36%3A49.07391Z)

### Inferences
- Expect the LoRA to lock the face, the scar, the robotic eye (large, salient features) and the tattoo style and placement. Do not expect pixel-exact geometric line work on hands and forearms in new poses, especially at full-body framing, where a forearm tattoo covers only a few dozen pixels in a 1 MP latent. Thin white lines are high-frequency detail that VAE latents and diffusion sampling smooth out.
- Techniques likely to help, ranked by expected impact (synthesis, not individually verified for tattoos):
  1. Disable flip augmentation. fal's hosted trainers do not expose a flip toggle in the docs I read, so check the trainer, or use ostris ai-toolkit or kohya, where flip is configurable.
  2. Ensure every training image has the identical canonical design.
  3. Add close-up crops of each tattooed region.
  4. Use higher rank (32–64) and train at 1024+ resolution.
  5. Use caption structure that binds the features to the trigger, with locational captions on crops.
  6. At inference, generate at higher resolution or upscale, then run a reference-based detail fix on tattoo regions (see Q5).
- "Approximate tattoo" is the likely ceiling of LoRA-only generation. "Exact tattoo" will probably need a post-pass: inpainting with the reference crop, or compositing or warping the actual design onto the skin.

### Gaps
- No quantitative or credible anecdotal evidence on exact tattoo line reproduction by Flux, Qwen or Z-Image LoRAs.
- I did not verify whether fal's hosted trainers apply flip augmentation by default.
- No evidence found on regional prompting for tattoos specifically.

## Q5. Combining a LoRA with edit / reference models

### Takeaway
Two viable hosted paths exist on fal. (a) Generate with a character LoRA, then fix details with a reference-capable edit model. (b) Train an edit LoRA (FLUX.2 edit trainer, Qwen-Image-Edit-2509 trainer) on start/end image pairs. Edit models like FLUX Kontext preserve identity across a few turns but degrade over many. Qwen-Image-Edit-2511 is reported to drift less than 2509.

### Cited Findings
- fal FLUX.2 edit LoRA training uses paired `_start`/`_end` images, at least 20 sets, with captions describing the transformation. It is served via `fal-ai/flux-2/lora/edit`. — [fal blog (Nov 2025)](https://blog.fal.ai/training-flux-2-loras). The edit trainer v2 is priced at about $47 per 1k steps with 1 reference image. — [fal flux-2-trainer-v2/edit](https://fal.ai/models/fal-ai/flux-2-trainer-v2/edit)
- The Qwen-Image-Edit-2509 trainer on fal is $4 per 1k steps. — [fal qwen-image-edit-2509-trainer](https://fal.ai/models/fal-ai/qwen-image-edit-2509-trainer/llms.txt)
- Qwen-Image-Edit-2509 accepts up to three input images (target, controls, design) for "geometry-aware" edits. The 2511 version is tuned to "reduce drift, preserve identity/structure, and keep edits localized." — [RunComfy 2509 guide](https://www.runcomfy.com/trainer/ai-toolkit/qwen-image-edit-2509-lora-training); [RunComfy 2511 guide](https://www.runcomfy.com/trainer/ai-toolkit/qwen-image-edit-2511-lora-training)
- FLUX.1 Kontext paper: it improves preservation of characters across multiple edit turns compared with other editors, but a failure case with visible artifacts appears after about 6 edits. — [arXiv 2506.15742](https://arxiv.org/html/2506.15742v2) (2025); [eastondev 2026 write-up](https://eastondev.com/blog/en/posts/ai/20260821-comfyui-flux-kontext-character-consistency/)
- Flick recommends Kontext for no-training edits to one reference and a LoRA (15–30 images, unique trigger) for "fully repeatable identity across scenes." — [Flick](https://flick.art/blog/img2img-consistent-character/flux)

### Inferences
- The most practical pipeline for exact tattoos:
  1. Generate the scene with the character LoRA (FLUX.2 or Qwen-Image) for identity, pose, scar, robotic eye and approximate tattoo placement.
  2. Run a reference-based detail pass with a multi-image edit model (Qwen-Image-Edit-2511/2509, FLUX.2 edit with references, or Kontext). Feed it the generated image plus a clean close-up of the canonical tattoo, with an instruction like "make the tattoo on the left forearm exactly match image 2."
  3. Optionally, train an edit LoRA on pairs (approximate tattoo → exact tattoo) to make step 2 more reliable. This is cheap on Qwen-Image-Edit at $4/1k steps and expensive on FLUX.2 edit at ~$47/1k.
- Keep edit passes few (1–2) to avoid Kontext-style degradation.
- Pairing a LoRA from the same model family (Qwen-Image LoRA → Qwen-Image-Edit pass) is likely to keep the look coherent. This is unverified.

### Gaps
- I did not confirm a hosted fal trainer for FLUX.1 Kontext LoRAs.
- I did not confirm whether a text-to-image character LoRA can be loaded directly onto Qwen-Image-Edit or FLUX.2 edit endpoints with good results; these are different weights or modes.
- No evidence on how accurately edit models transfer exact thin-line geometric tattoo designs from a reference crop.
