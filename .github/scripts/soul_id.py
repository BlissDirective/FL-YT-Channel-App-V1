"""Train Higgsfield Soul IDs for the requests in soul-id/*.json (see .github/workflows/soul-id.yml).

Signed image URLs are created at run time and never printed.
"""
import glob
import json
import os
import sys
import time
import urllib.error
import urllib.request

SUPABASE = "https://reffwibuitzrkertuuvy.supabase.co"
HF = "https://api.higgsfield.ai"
KEY = os.environ["SERVICE_KEY"]
HF_KEY = os.environ["HIGGSFIELD_API_KEY"]
POLL_SEC, POLL_MAX_SEC = 20, 35 * 60


def call(method, url, body=None, headers=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method, headers={"content-type": "application/json", **(headers or {})})
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            raw = r.read()
            return json.loads(raw) if raw else None
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"{method} {url.split('?')[0]} -> {e.code}: {e.read()[:300].decode(errors='replace')}") from None


sb = {"Authorization": f"Bearer {KEY}", "apikey": KEY}
hf = {"Authorization": f"Key {HF_KEY}"}


def soul_state(char_id):
    rows = call("GET", f"{SUPABASE}/rest/v1/characters?id=eq.{char_id}&select=higgsfield_soul", headers=sb)
    if not rows:
        raise RuntimeError(f"character {char_id} not found")
    return rows[0]["higgsfield_soul"] or {}


def save_state(char_id, state):
    call("PATCH", f"{SUPABASE}/rest/v1/characters?id=eq.{char_id}", {"higgsfield_soul": state}, {**sb, "Prefer": "return=minimal"})


def sign(path):
    r = call("POST", f"{SUPABASE}/storage/v1/object/sign/media/{path}", {"expiresIn": 7200}, sb)
    return f"{SUPABASE}/storage/v1{r['signedURL']}"


failed = False
for req_path in sorted(glob.glob("soul-id/*.json")):
    req = json.load(open(req_path))
    cid, name = req["characterId"], req["name"]
    for ver in req.get("modelVersions", ["v1"]):
        state = soul_state(cid)
        cur = state.get(ver) or {}
        if cur.get("status") == "completed":
            print(f"{name} {ver}: already trained ({cur['id']})")
            continue
        if cur.get("id") and cur.get("status") in ("not_ready", "queued", "in_progress"):
            ref_id = cur["id"]
            print(f"{name} {ver}: resuming {ref_id}")
        else:
            images = [{"type": "image_url", "image_url": sign(p)} for p in req["images"]]
            created = call("POST", f"{HF}/v1/custom-references", {"name": f"{name} ({ver})"[:100], "model_version": ver, "input_images": images}, hf)
            ref_id = created["id"]
            state[ver] = {"id": ref_id, "status": created.get("status", "queued"), "images": len(images)}
            save_state(cid, state)
            print(f"{name} {ver}: training {ref_id} on {len(images)} images")
        waited = 0
        while waited < POLL_MAX_SEC:
            r = call("GET", f"{HF}/v1/custom-references/{ref_id}", headers=hf)
            status = r.get("status")
            state = soul_state(cid)
            state[ver] = {**(state.get(ver) or {}), "id": ref_id, "status": status, **({"fail_reason": r["fail_reason"]} if r.get("fail_reason") else {})}
            save_state(cid, state)
            if status in ("completed", "failed"):
                break
            time.sleep(POLL_SEC)
            waited += POLL_SEC
        print(f"{name} {ver}: {status}" + (f" ({r.get('fail_reason')})" if r.get("fail_reason") else ""))
        if status == "failed":
            failed = True
        if os.environ.get("GITHUB_STEP_SUMMARY"):
            with open(os.environ["GITHUB_STEP_SUMMARY"], "a") as f:
                f.write(f"- {name} {ver}: `{ref_id}` {status}\n")

sys.exit(1 if failed else 0)
