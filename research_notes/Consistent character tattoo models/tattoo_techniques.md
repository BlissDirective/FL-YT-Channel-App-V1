# Practical techniques for keeping one tattoo design identical across AI-generated images of the same photoreal person (as of Oct 2026)

Scope note: About 17 searches and fetches. Almost nothing published tests tattoo consistency directly, and nothing tests thin-line white geometric tattoos specifically. Most of what follows is general character-consistency or reference-insertion material that can be adapted to tattoos. Much of the "how-to" web content is SEO or vendor material, flagged where it applies. Anything not tied to a source is labelled as an inference.

## Q1. What do professional AI character artists and studios do to keep tattoos identical across shots?

### Takeaway
I found no published studio pipeline for tattoo continuity specifically. The general consistency guidance in 2025–2026 converges on five steps: (1) keep one locked "hero" reference plus close-up references for small identity details; (2) always generate from the original anchor rather than from the previous output; (3) name the tattoo explicitly in every prompt; (4) fix local defects with inpainting instead of re-rolling; (5) train a character LoRA for the strongest lock. Tattoos fall under the "small, distinctive detail that deserves its own close-up reference" rule.

### Cited Findings
- Guides recommend one approved hero image as the main reference, with supporting images for details the hero image doesn't show (e.g. a recurring accessory). — [CapCut: Character Consistency in AI Images](https://www.capcut.com/create/character-consistency-in-ai-images-workflow)
- If only one area is wrong, use a localized correction (inpainting) rather than regenerating from scratch. Return to the original anchor reference for each new scene rather than chaining outputs. — [CapCut workflow](https://www.capcut.com/create/character-consistency-in-ai-images-workflow); [Oakgen guide](https://oakgen.ai/blog/ai-character-consistency-guide)
- Distinguishing features such as scars and tattoos should be stated in prompts as "anchor points". — [Oakgen guide](https://oakgen.ai/blog/ai-character-consistency-guide); [Picsart tutorial](https://picsart.com/tutorials/how-to-create-consistent-ai-characters-across-multiple-images/)
- For maximum consistency, train a LoRA on 15–30 high-quality images of the character from multiple angles, expressions and lighting conditions. — [Oakgen guide](https://oakgen.ai/blog/ai-character-consistency-guide) (vendor blog)
- A full-body turnaround cannot capture every part of a character at useful resolution. If a feature is small, complex, distinctive or identity-critical, it may deserve its own close-up reference. This applies directly to neck and hand tattoos. — [Kapwing: How to Create a Character Reference Sheet With AI](https://www.kapwing.com/resources/how-to-create-a-character-reference-sheet-with-ai/)
- Recommended reference set: front portrait, three-quarter view and full-body shot at high resolution, which reportedly improves consistency over a single reference. — [Astorie character-consistency workflow (2026)](https://astorie.ai/workflows/character-consistency) (vendor)
- FLUX.2 reportedly supports up to 10 simultaneous reference images. — [Oakgen guide](https://oakgen.ai/blog/ai-character-consistency-guide) (secondary; not verified against BFL docs)
- Approve images as a set against a checklist (face, hair, proportions, signature items) rather than judging each image alone. — [CapCut workflow](https://www.capcut.com/create/character-consistency-in-ai-images-workflow)
- Existing tattoo LoRAs on Hugging Face (e.g. SDXL "tattoo-maker-xl", trigger `proto_tat`; "yet-another-sdxl-tattoo-lora") generate tattoo *styles*. They do not lock one specific design. — [HF brushpenbob/tattoo-maker-xl](https://huggingface.co/brushpenbob/tattoo-maker-xl/blob/main/README.md); [HF Norod78 tattoo LoRA](https://huggingface.co/Norod78/yet-another-sdxl-tattoo-lora/tree/ce2c98dd3293a6e6ed0908f255da61a5d4792205)

### Inferences
- The most likely professional practice (inferred, not documented) is "generate the body or pose with AI, then make the tattoo deterministic in post." The tattoo is composited or warped from a master flat design, then optionally harmonized with a low-denoise inpaint. This is the only route that guarantees pixel-level identical line geometry. Generative models redraw thin lines every time.
- A character LoRA trained on images that show the tattoo will help the tattoo *appear* in the right place. It will probably not reproduce exact fine geometry (thin parallel lines, exact angles and counts), because LoRAs learn approximate appearance. Expect "similar geometric white tattoo" rather than "identical." This is my inference; I found no test of it.
- A practical studio-style asset kit for this project would be:
  - A flat high-res stencil per placement (neck, each hand, each forearm), with left/right orientation marked.
  - One photoreal close-up "hero" photo per placement.
  - A turnaround sheet.
  - A written spec block: placement, size in cm, line weight, white ink, healed, side of body.

### Gaps
- I found no first-hand write-up from a film, ad or AI-influencer studio describing tattoo continuity, and no Reddit threads surfaced in search. Community practice could not be verified.
- I found no quantitative benchmark of tattoo fidelity across any model.

## Q2. Does a single multi-panel "character turnaround" generation (Nano Banana Pro, GPT Image) keep tattoos more consistent than separate generations?

### Takeaway
There is a plausible mechanism and indirect evidence: In-Context LoRA research shows that DiT models generate coherent panel sets when the images are concatenated into one canvas, and vendor guides use single-shot sheets. But I found no direct tattoo comparison. At turnaround-sheet resolution, thin neck and hand lines get too few pixels to be reliable. Use the sheet for global placement only, and use per-placement close-ups or post-compositing for the line geometry.

### Cited Findings
- In-Context LoRA (Alibaba Tongyi, arXiv 2410.23775) argues that text-to-image DiTs (FLUX) already have in-context generation ability. Concatenating images into one canvas with joint captioning, plus a small task LoRA (20–100 samples), yields coherent multi-panel image sets. — [arXiv 2410.23775](https://www.arxiv.org/pdf/2410.23775); [ComfyUI workflow: Flux & 10 In-Context LoRA models](https://www.runcomfy.com/de/comfyui-workflows/flux-in-context-lora)
- A community "multiview in-context" LoRA for FLUX.1-dev targets multiple coherent views of the same subject at once (consistency claims unverified). — [PromptLayer: multiview-incontext](https://www.promptlayer.com/models/multiview-incontext)
- A Dreamina "GPT Image 2" turnaround tutorial (Apr 23, 2026) uses one consolidated prompt for a front, side and back sheet. It locks "identity anchors" with exact counts (e.g. scarf stripe count, buckle count), uses a neutral A/T-pose, a 3:2 aspect ratio, a plain background and constant camera height. It still tells users to check details across angles and regenerate if they drift, so consistency is not automatic. It does not mention tattoos. — [Dreamina: GPT Image 2 character turnaround sheets](https://dreamina.capcut.com/resource/gpt-image-2-for-character-turnaround-sheets) (vendor; does not clearly say which model runs underneath)
- Nano Banana Pro sheet guides suggest generating a character, then conversationally asking for other angles. Another suggests 4–8 base images (headshots, full-body, expressions) uploaded as references, with a sheet prompt such as "front, side, back full-body in one row, close-up portraits below, consistent lighting." — [invideo FAQ](https://invideo.io/faq/how-do-you-create-a-character-reference-sheet-using-nano/); [SelfieLab character sheets guide](https://selfielabstudio.com/blog/nano-banana-pro-consistent-character-sheets-guide-20260216) (SEO/vendor; stated "93–97% consistency" figures are unverified marketing)
- Held props create inconsistencies across the angles of a sheet, and these propagate into downstream video generations. — [selfielabstudio / invideo results summarized in search](https://selfielabstudio.com/blog/nano-banana-pro-master-character-consistency-prompts-20260302) (low-quality source)
- Nano Banana Pro (Gemini 3 Pro Image, `gemini-3-pro-image-preview`) reportedly accepts up to 14 reference images and keeps up to 5 people consistent. One third-party source splits this as 6 object + 5 human images. — [Scenario help center](https://help.scenario.com/articles/7568607761-gemini-image-models-nano-banana-family); [MindStudio](https://www.mindstudio.ai/blog/what-is-gemini-3-pro-image); official model page: [Google AI: Nano Banana](https://ai.google.dev/gemini-api/docs/nanobanana) (the official doc page fetched did not surface the limit section)
- **Risk for thin lines:** a Google developer-forum user reports that since the Gemini 3.1 Flash Image launch, the 3.0 Pro Image model seems to downsample reference images so aggressively that it can't replicate fine details. This is a single anecdotal report. — [Google AI Dev forum thread](https://discuss.ai.google.dev/t/gemini-3-0-pro-image-preview-inconsistent-performance-with-multiple-reference-images-since-3-1-launch/128648)

### Inferences
- A single-shot sheet probably improves *relative* consistency between panels, because all panels share one attention context. This matches the In-Context LoRA mechanism. But each panel gets a fraction of the output pixels. At 4K, a 3-panel full-body sheet gives a neck tattoo perhaps tens of pixels wide, too few for thin white geometric lines to be stable. Recommendation: use the sheet for placement and left/right side, then do separate high-res close-up panels or sheets per tattoo region ("hands sheet", "neck sheet").
- White tattoos are low-contrast against light skin, so models may soften them, drop them, or turn them into scars. Expect more drift than with black ink. This is inferred from how white ink looks in reality and how models weight low-contrast detail; it is untested.
- Mirroring risk: generators often flip asymmetric details between views. Write "LEFT forearm (viewer's right in the front view)" explicitly in the prompt.

### Gaps
- I found no side-by-side experiment of single-sheet vs separate generations for tattoos with Nano Banana Pro, GPT Image 2, FLUX.2 or Seedream.
- I could not confirm official reference-image limits from Google's docs. The limit section did not surface.

## Q3. Best tools for reference-guided inpainting of a tattoo onto a specific body area, and how to supply the design

### Takeaway
Four tool families are usable, in roughly descending ease:
- **Instruction editors with a second reference image**: Nano Banana Pro edit, Qwen-Image-Edit-2509/2511, FLUX Kontext/FLUX.2. Pass the photo and the flat design; the prompt separates "keep" from "change".
- **Masked in-context insertion**: the "diptych" trick from Insert Anything / ACE++ / In-Context LoRA on FLUX Fill. The reference goes on the left; the masked target region goes on the right.
- **Crop-and-stitch FLUX Fill inpainting in ComfyUI**: gives the small tattoo region more pixels.
- **Photoshop Generative Fill**: no strong evidence it reproduces a supplied design.

All of these *redraw* the design, so exact geometry is not guaranteed. Pair them with a deterministic composite (Q4) when exactness matters.

### Cited Findings
- **Nano Banana (Gemini) prompt structure for tattoo placement**: split the prompt into what stays fixed (identity, anatomy, pose, skin tone, lighting, clothing, background) and what changes. Add the supplied design to e.g. "outer forearm at a set height, following the arm's curvature, healed ink with natural skin texture", and end with "only the tattoo region should change." Use Nano Banana 2 for cheap placement tests and Nano Banana Pro for final complex or multi-reference edits. Multiple references improve control but do not guarantee likeness. — [MyClaw: Gemini AI tattoo generator guide](https://myclaw.ai/blog/gemini-ai-tattoo-generator) (third-party blog)
- Prompt collections include "place this design on the person's arm" tattoo try-on edits for Nano Banana. — [Atlabs: 69 Nano Banana prompts](https://www.atlabs.ai/blog/69-creative-nano-banana-promts)
- AI tattoo art can look fine digitally but be unrealistic on skin: lines blur into shading, details are too fine for skin, and the composition ignores body flow. — [Morphed: Nano Banana prompts for tattoo design (2026)](https://morphed.app/blog/nano-banana-prompts-for-tattoo-design)
- **Qwen-Image-Edit**:
  - It has strong multi-image editing and identity-preservation ability.
  - Qwen-Image-Edit-2511 integrates selected popular community LoRAs into the base model.
  - A community "qwen-edit-skin" LoRA (on 2509, trained with AI-Toolkit) improves skin realism and detail. It does not place tattoos.
  - I found no tattoo-specific Qwen edit LoRA.
  - Sources: [Qwen-Image-Edit-2511 docs](https://docs.qwenlm.ai/qwen-image-edit-2511/index.html); [HF tlennon-ie/qwen-edit-skin](https://huggingface.co/tlennon-ie/qwen-edit-skin); [RunComfy edit-skin LoRA API](https://www.runcomfy.com/models/qwen/qwen-edit-2509/lora/edit-skin/api)
- **Insert Anything** (arXiv 2504.15009; AAAI 2026):
  - A unified reference-based insertion model on a DiT, with both mask-prompt and text-prompt modes.
  - In mask mode, the reference image and the masked source image are concatenated horizontally into a diptych. A binary mask marks the reference half as 0 and the insertion region as 1.
  - It was trained on the AnyInsertion dataset (120K pairs in v1, 136K in the AAAI version) covering person, object and garment insertion.
  - It is evaluated on AnyInsertion, DreamBooth and VTON-HD.
  - Sources: [arXiv 2504.15009](https://arxiv.org/abs/2504.15009); [AAAI page](https://ojs.aaai.org/index.php/AAAI/article/view/37866); [project page](https://song-wensong.github.io/insert-anything/)
  - Whether it is built on FLUX Fill was not confirmed in the sources fetched.
- A newer insertion framework, InsertFuse (arXiv 2608.06490), describes "multi-category reference-guided image insertion". I did not read beyond the title. — [arXiv 2608.06490](https://arxiv.org/pdf/2608.06490)
- **ACE++** (Alibaba, Feb 2025):
  - Unifies reference generation, local editing and controllable generation.
  - Post-trained on FLUX.1-Fill-dev. Its local-editing LoRA redraws masked areas while preserving structure.
  - The team called it likely the final ACE iteration and moved focus to Wan 2.1, so it is older and not actively developed.
  - Sources: [ComfyUI Wiki news](https://comfyui-wiki.com/en/news/2025-02-10-alibaba-ace-plus-zero-training-image-generation); [HF ACE_Plus README](https://huggingface.co/ali-vilab/ACE_Plus/blob/refs%2Fpr%2F12/README.md)
- **ComfyUI FLUX inpaint with crop-and-stitch**: the workflow crops the masked region, resizes it to an optimal size, inpaints with ControlNet plus a turbo LoRA, and pastes it back. v2 adds a FLUX Fill option and a LanPaint alternative. This matters for small tattoo regions. — [Ko-fi workflow listing](https://ko-fi.com/s/af148d1863)
- ComfyUI's official inpaint tutorial covers the built-in MaskEditor (right-click the LoadImage node, then "Open in MaskEditor") and VAE Encode (for Inpainting). — [docs.comfy.org inpaint](https://docs.comfy.org/tutorials/basic/inpaint); [ComfyUI Wiki inpaint](https://comfyui-wiki.com/en/workflows/inpaint)
- **Virtual try-on evidence on tattoo preservation**: a 2024 identity-consistent VTON paper notes that a competing method (DCI-VTON) "alters tattoos, creating artifacts" on arms, while theirs preserves them. Tattoos are treated as identity detail that diffusion editing tends to corrupt. — [arXiv 2403.07371](https://arxiv.org/html/2403.07371v1)

### Inferences
- **How to supply the design**: give a flat, high-contrast stencil (white lines on mid-gray or dark, or black on white with the instruction "render as white ink"), tightly cropped, at the same aspect as the target body region. Also give one photoreal "hero" close-up of the tattoo already on skin. Models copy an on-skin example more faithfully than a flat graphic. Inferred, untested.
- **For masked tools** (FLUX Fill, ACE++, Insert Anything-style diptychs): build the canvas as [design reference | target crop with mask on the tattoo zone]. Upscale the crop so the tattoo area is about 512–1024 px wide before inpainting, then stitch back. This combines the Insert Anything diptych layout with the crop-and-stitch practice.
- A good hybrid (inferred) is to paste a deterministically warped tattoo first (Q4), then run a low-denoise (about 0.2–0.35) masked inpaint or Kontext/Qwen "make this tattoo look healed and integrated into the skin" pass. The model then only adds skin texture and lighting and does not reinvent the geometry. Check the line geometry afterwards and re-paste if it drifted.
- Photoshop Generative Fill with a reference image: I found no evidence about its tattoo fidelity, so treat it as untested.

### Gaps
- I found no head-to-head test of Nano Banana Pro vs Qwen-Image-Edit-2511 vs FLUX Kontext/FLUX.2 for exact tattoo reproduction.
- No tattoo-transfer-specific LoRA (Kontext or Qwen) was found, though one may exist on Civitai, which web search does not index well.
- Per-image API cost was not researched here; other researchers may cover model pricing.

## Q4. Deterministic approaches: warping a flat design onto skin (displacement, Photoshop warp, ComfyUI nodes) and white-ink realism

### Takeaway
The only way to guarantee identical geometry is classic compositing:
1. Warp the flat stencil per view (Photoshop Warp, Puppet Warp, Perspective Warp, or a TPS warp in ComfyUI).
2. Apply the Displace filter with a blurred grayscale map of the skin.
3. Blend, mask, and optionally harmonize with a low-denoise AI pass.

ComfyUI has building blocks: a TPS warp node and a "BodyDecal" node set with surface warp driven by depth and displacement. Their provenance is unclear.

### Cited Findings
- **Photoshop displacement method** (older tutorials; the steps are still valid, but menu names may differ in current Photoshop):
  1. Duplicate the body photo, desaturate it, add slight contrast with Levels, and blur it about 2 px so it bends with major creases and not pores.
  2. Save it as a PSD.
  3. On the tattoo layer, run Filter > Distort > Displace with H/V scale around 5 as a starting point. Choose "Stretch to Fit" and "Repeat Edge Pixels".
  4. Set the blend mode (Multiply for black ink; Overlay or Soft Light are alternatives) and reduce opacity, about 80%.
  5. Mask away areas with a large soft low-opacity brush.
  - Sources: [Planet Photoshop: digital tattoos](https://planetphotoshop.com/digital-tattoos.html); [Photoshop Gold: Applying a realistic tattoo](https://photoshopgold.yolasite.com/applying-a-realistic-tattoo.php); [Adobe: displacement map](https://www.adobe.com/products/photoshop/displacement-map.html)
- A Tuts+ tutorial warns that simply setting the tattoo layer to Overlay "does NOT look like a tattoo". It needs masks, adjustment layers and brushwork on top of displacement. — [Tuts+: Photoshop a tattoo](https://design.tutsplus.com/tutorials/photoshop-a-tattoo--psd-35) (older)
- **ComfyUI "CV Thin Plate Spline Warp" node**: takes an image plus `points_from` and `points_to` control points and warps so each source point lands on its target. Intended for warping one shape onto another after feature matching. — [comfy.icu node page](https://comfy.icu/node/CV_ThinPlateSplineWarp)
- **ComfyUI "BodyDecal" node set**:
  - BodyDecalRegion, BodyDecalPlace (scale, rotation, width/height)
  - BodyDecalSurfaceWarp (bends decals with depth and displacement maps and strengths, optional masks)
  - BodyDecalApply (region, anchor, scale, blend mode, opacity)
  - BodyDecalComposite (blend modes, opacity, decal mask)
  - The documentation is on a third-party site that now redirects to stackblend.com. Parameter names are inconsistent between pages, and I couldn't identify the source node pack. Treat these as unverified.
  - Sources: [BodyDecalSurfaceWarp](https://comfyai.run/documentation/BodyDecalSurfaceWarp); [BodyDecalApply](https://comfyai.run/documentation/BodyDecalApply); [BodyDecalComposite](https://comfyai.run/documentation/BodyDecalComposite); [BodyDecalPlace](https://comfyai.run/documentation/BodyDecalPlace)
- RyanOnTheInside's ComfyUI pack includes a "FlexImageWarp" node (generic image warping). — [InstaSD node listing](https://www.instasd.com/comfyui/custom-nodes/comfyui_ryanontheinside/fleximagewarp)
- "Image Mesh Drag" applies a random cloth-like mesh warp, which is not suitable for controlled placement. — [RunComfy node page](https://www.runcomfy.com/comfyui-nodes/ComfyUI-FlowMatching-Upscaler/image-mesh-drag)
- **How white ink looks in reality** (low-quality or SEO sources, so treat as rough background only):
  - Healed white ink is subtle and can be nearly invisible on light skin.
  - It tends to yellow or fade with age and sun.
  - It often looks slightly raised or scar-like because the pigment is dense.
  - It is muted on darker skin.
  - Sources: [Tommy's Supplies: white & pastel inks on dark skin](https://www.tommyssupplies.com/blogs/news/white-ink-yellow-ink-pastels-on-dark-skin-what-to-expect); [white-ink pros & cons guide](https://centos.pepipost.com/white-ink-tattoos-pros-cons-the-ultimate-expert-guide-2024) (spam-like site)

### Inferences
- **Compositing recipe for white thin-line tattoos** (inferred from the cited methods plus how white ink looks):
  - The white lines need a lighten-type blend (Screen, Lighten or Soft Light), not Multiply. Keep opacity well below 100% (perhaps 50–80%) and tint slightly warm or ivory, not pure #FFFFFF.
  - Add a very subtle emboss or bevel and a 0.5–1 px blur so the lines read as slightly raised, scar-like ink.
  - Let skin texture show through. Use the luminosity of the base skin as a mask (Blend If) so pores and highlights break up the lines.
  - Match the scene's lighting: reduce the effect in shadows and boost it on specular highlights.
- **Forearms** suit displacement plus Warp and cylindrical wrapping (Photoshop Warp "Arc" or a mesh warp).
- **Hands** (knuckles and fingers) need per-segment pieces, because each finger phalanx is a separate plane. Use multiple small decals or Puppet Warp. Pose changes make hands the hardest region.
- **The neck** wraps around a cylinder and folds with head turns. TPS with a few anchor points (sternocleidomastoid edge, jaw angle, collarbone) works for three-quarter views. Extreme profile views need partial occlusion masking.
- **Semi-automation in ComfyUI**: detect pose (DWPose or OpenPose keypoints for wrist, elbow and neck), map stencil corner points to keypoint-derived targets, apply TPS warp, add a depth map (Depth Anything) for displacement, composite, then apply a low-denoise inpaint. This is buildable but I found no off-the-shelf workflow.
- Difficulty and cost: in Photoshop, manual work runs maybe 10–30 min per image per tattoo with no AI cost. The ComfyUI version has a high setup cost and a low marginal cost. Both are estimates.

### Gaps
- I found no published ComfyUI workflow that does stencil, pose-aware TPS warp, displacement and composite end-to-end for tattoos.
- I found no authoritative (dermatology or tattoo-industry) source on the visual appearance of healed white ink. The sources found are low quality.
- I found no evidence on Photoshop's newer AI tools (Generative Fill with reference, Harmonize) for tattoo integration.

## Q5. 3D/UV pipelines: feasibility with Blender + SMPL-X, Meshcapade, AI 3D human generators; ComfyUI with rendered tattoo masks as guidance

### Takeaway
Feasible in principle, and the most robust approach for many views and poses, but I found no documented end-to-end tattoo example. The pipeline:
1. Fit or obtain a body mesh (SMPL-X, or a Daz/MetaHuman-type character).
2. Paint or project the stencil into the UV texture.
3. Render views (color, depth, normals and a tattoo-only mask pass).
4. Do a photoreal pass with ControlNet depth/normal plus identity references.
5. Composite the rendered tattoo mask back, or use it as an inpaint mask.

The supporting pieces exist (SMPL UV semantics, Blender import, StableGen, Daz tattoo layering), but the effort is high.

### Cited Findings
- The SMPL-X UV layout maps semantically equivalent vertices to fixed UV positions. Texture maps are therefore stable across fitted meshes and can be repainted or transferred. One paper fine-tunes SD plus ControlNet for texture inpainting on this layout. — [arXiv 2403.02561: Semantic Human Mesh Reconstruction with Textures](https://arxiv.org/pdf/2403.02561)
- SMPL models can be imported and textured in Blender. — [Paperspace: Working on SMPL models with Blender](https://blog.paperspace.com/smpl-models-with-blender/) (older)
- StableGen is a Blender add-on (Czech Technical University thesis) that uses diffusion models through a ComfyUI backend, with ControlNet conditioning, to texture 3D surfaces and bake the results. — [CVUT DSpace: StableGen](https://dspace.cvut.cz/handle/10467/123567)
- Daz Studio "Tattoo Artist" plugin: layers the tattoo over existing skin maps (non-destructive) and wraps images around limbs via UV islands. This is evidence that the 3D-decal approach is standard in 3D character work. — [RenderHub: Tattoo Artist](https://www.renderhub.com/ap3nciler/tattooartist)
- SMPLpix shows neural rendering of photoreal humans from SMPL-based 3D models (older, 2020). — [DeepAI: SMPLpix](https://deepai.org/publication/smplpix-neural-avatars-from-3d-human-models)

### Inferences
- **Recommended practical 3D route** (inferred):
  1. Build the character's body in a 3D tool. Daz/MetaHuman/Character Creator are faster than raw SMPL-X for photoreal skin. Or fit SMPL-X to the hero photo.
  2. Apply the stencil as a UV decal (Blender decal, Daz layer).
  3. Pose and render each view, outputting (a) a beauty render, (b) depth and normal maps, and (c) a pure tattoo mask or emission pass.
  4. Generate the photoreal image with depth/normal ControlNet plus face/identity references (or an edit model with the render as structure).
  5. Composite the warped tattoo from pass (c) using the white-ink blend recipe from Q4.
  6. Optionally run a low-denoise harmonize.
  - Exact geometry then comes from the 3D render, and the AI only supplies photorealism. This is the "deterministic tattoo, generative body" pattern from Q1.
- Feeding the tattoo mask render as a ControlNet input (e.g. lineart or canny of the tattoo-only pass) is possible. But ControlNet lineart only loosely enforces thin lines, and the model may still bend or merge them. Compositing the render pass is more reliable than conditioning on it.
- Difficulty and cost: high skill (Blender or Daz, rigging and posing, ComfyUI), mostly free or open-source tools, and GPU time. Worth it only if many poses or videos are needed. For a single multi-view character sheet (about 4–8 images), the 2D warp plus composite route (Q4) is probably cheaper.
- Hands remain the hardest part even in 3D, because the AI pass tends to re-pose fingers. Lock the hand pose with OpenPose and depth, and inspect each result.

### Gaps
- I found no tutorial or case study that does a SMPL-X/Meshcapade tattoo decal, render, ControlNet photoreal pass, and composite for a consistent photoreal person.
- Meshcapade, and AI 3D human generators such as Hunyuan3D-type avatar tools, were not researched in depth because the call budget ran out. Their 2026 photoreal-skin and UV-export capabilities are unverified.
- I found no evidence on how well modern edit models (Nano Banana Pro, Qwen Edit) preserve a pasted tattoo when given a 3D render as the structure reference.
