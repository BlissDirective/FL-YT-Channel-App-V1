-- Seed the "Gigantic Journeys — Launch Ads" project (operator decision,
-- 2026-09-29): 10 go-to-market ads for the Gigantic Journeys iOS game, each
-- rendered 9:16 and 16:9, produced through the directed (Higgsfield-only)
-- pipeline over the studio MCP. Idempotent: inserted only when no project with
-- that name exists, so a re-run (or a manual create) never dupes.
--
-- Safety: every gate starts on "assist" (nothing publishes without approval),
-- auto_intelligence keeps its default (off), no YouTube channel is linked and
-- no Auto Pilot run is started. Budget is informational; the batch's $1,000
-- all-in cap is enforced by the operator's spend governor.

insert into projects (name, niche, audience, angle, tone, brand_kit, autonomy, budget,
                      max_video_usd, library_size_limit, visual_style, pipeline_mode,
                      preferred_video_model, instructions)
select 'Gigantic Journeys — Launch Ads',
       'iOS game launch ads for Gigantic Journeys (camera-first real-environment traversal game)',
       'iOS players 13+: platformer and parkour fans, Lego and tabletop builders, cozy-creative players',
       'A real room becomes a gigantic world for a 15 cm character: scan it, choose a character, journey to the summit, share the route',
       'warm',
       $j${"primary":"#F2A93B","secondary":"#1C1F26","thumbnailStyle":"cinematic","font":"bold-sans",
           "cinemaControls":{"genre":"epic","pacing":"calm","camera_model":"modern","camera_lens":"anamorphic","era":"2020s","color_palette":"yellow-room"}}$j$::jsonb,
       '{"IDEA":"assist","SCRIPT":"assist","ASSETS":"assist","FINAL":"assist"}'::jsonb,
       '{"perVideoUsd":100,"monthlyUsd":1000}'::jsonb,
       100, 30, 'footage', 'autonomous', 'hf-cinema-studio-4',
       $txt$Ad batch for Gigantic Journeys (source of truth: the Gigantic-Journeys repo SPEC.md, design/MOVEMENT_BIBLE.md, design/DESIGN_SYSTEM.md).
GAME: the player scans a real indoor room (walkthrough) or a tabletop build such as Lego (orbit), chooses one of 8 pre-made semi-photoreal characters at 1:12 scale (about 15 cm tall), and journeys to the summit along routes, finding vistas, then plants a flag. Environments can be published, rated (fun, interesting, interactive, exciting) and raced with per-route leaderboards and ghost replays; a friend plays from a link.
SIGNATURE SHOT: a continuous pull-back where the real room's edges soften into a floating diorama over the blurred room; the character drops in with a dust puff; the thin warm summit beam ignites last.
VERBS: walk, jog, run, sprint, balance-walk, step-up, hop-over, vaults, mantle, precision jump, wall-run, tic-tac, dive-roll, slide, ledge hang and shimmy, rung climb, Lego stud-climb, free climb (bookshelf, wicker, curtain), pole climb, hanging traverse, slip-and-catch. TOOLS: safety-pin and twine grapple (swing, ascend, rappel) and a matchstick pole-vault. Reactive world: cushions dent, curtains sway, papers flutter, plants rustle. Falls cost time only (+0:04).
LOOK: photoreal real homes, macro probe-lens low angles at character height, warm rim light, charcoal shadows, cream highlights. Palette: amber #F2A93B (under 10% of frame), amber light #FFD27A (beam core), charcoal #1C1F26, cream #F5EFE6.
NEVER SHOW OR SAY: enemies, creatures, coins, hazards, platforms, health; several characters playing together; outdoor or street scans; a scanned likeness of the player; knocking objects over; glider, picks, zipline; Android; faces inside a scan; speed claims; flashing above 3 Hz; the words level, map, goal, user, shrunk. All on-screen text is composited (labels), never generated.$txt$
where not exists (select 1 from projects where name = 'Gigantic Journeys — Launch Ads');
