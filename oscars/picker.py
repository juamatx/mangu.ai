#!/usr/bin/env python3
"""Local Oscar winner picker UI. Run with: uv run picker.py"""

import csv
import json
from pathlib import Path
from flask import Flask, jsonify, send_from_directory

app = Flask(__name__)
app.json.sort_keys = False

BASE = Path(__file__).resolve().parent
LINKS_CSV = BASE / "links.csv"
WINNERS_JSON = BASE / "winners.json"
PUBLIC_HTML = BASE.parent / "public" / "oscars" / "index.html"
TEMPLATE_HTML = BASE / "oscar-latest.html"


def load_nominees():
    """Parse links.csv into {category: [{nominee, film, vote, image}, ...]}"""
    cats = {}
    with open(LINKS_CSV, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            cat = row["Category"]
            # Image URL contains commas — rejoin overflow columns
            image = row["Image URL"]
            overflow = row.get(None, [])
            if overflow:
                image = image + "," + ",".join(overflow)
            cats.setdefault(cat, []).append({
                "nominee": row["Nominee"],
                "film": row["Film"],
                "vote": row["Vote %"],
                "image": image,
            })
    # Return in ceremony-style order
    order = [
        "Best Supporting Actress",
        "Best Animated Feature",
        "Best Animated Short",
        "Best Costume Design",
        "Best Makeup and Hairstyling",
        "Best Casting",
        "Best Live-Action Short",
        "Best Supporting Actor",
        "Best Adapted Screenplay",
        "Best Original Screenplay",
        "Best Production Design",
        "Best Visual Effects",
        "Best Documentary Short",
        "Best Documentary Feature",
        "Best Original Score",
        "Best Sound",
        "Best Film Editing",
        "Best Cinematography",
        "Best International Feature",
        "Best Original Song",
        "Best Director",
        "Best Actor",
        "Best Actress",
        "Best Picture",
    ]
    ordered = {}
    for cat in order:
        if cat in cats:
            ordered[cat] = cats[cat]
    # Add any remaining categories not in the order list
    for cat in cats:
        if cat not in ordered:
            ordered[cat] = cats[cat]
    return ordered


def load_winners():
    if WINNERS_JSON.exists():
        return json.loads(WINNERS_JSON.read_text(encoding="utf-8"))
    return {}


def save_winners(winners):
    WINNERS_JSON.write_text(json.dumps(winners, indent=2, ensure_ascii=False), encoding="utf-8")


def rebuild_html(winners):
    """Rewrite public/oscars/index.html with updated OSCAR_WINNERS object."""
    html = TEMPLATE_HTML.read_text(encoding="utf-8")

    person_cats = {"Best Actor", "Best Actress", "Best Supporting Actor",
                   "Best Supporting Actress", "Best Director"}

    def make_entry(cat, data):
        safe_pick = data["nominee"].replace("'", "\\'")
        safe_film = data["film"].replace("'", "\\'")
        img = data["image"]
        display = safe_pick if cat in person_cats else safe_film
        return f"{{ pick: '{safe_pick}', film: '{safe_film}', display: '{display}', image: '{img}' }}"

    lines = []
    for cat, data in winners.items():
        safe_cat = cat.replace("'", "\\'")
        # Normalize to list
        items = data if isinstance(data, list) else [data]
        if len(items) == 1:
            lines.append(f"  '{safe_cat}': {make_entry(cat, items[0])},")
        else:
            entries = ", ".join(make_entry(cat, d) for d in items)
            lines.append(f"  '{safe_cat}': [{entries}],")

    js_obj = "{\n" + "\n".join(lines) + "\n}" if lines else "{}"

    # Use a robust approach: find the exact start marker and match to the closing ";
    start_marker = "const OSCAR_WINNERS = "
    start_idx = html.find(start_marker)
    if start_idx == -1:
        return
    # Find the matching closing ";" after the opening "{"
    brace_start = html.index("{", start_idx + len(start_marker))
    depth = 0
    i = brace_start
    while i < len(html):
        ch = html[i]
        if ch == '{':
            depth += 1
        elif ch == '}':
            depth -= 1
            if depth == 0:
                break
        elif ch == "'" or ch == '"':
            # skip string contents
            quote = ch
            i += 1
            while i < len(html) and html[i] != quote:
                if html[i] == '\\':
                    i += 1
                i += 1
        elif ch == '[':
            depth += 1
        elif ch == ']':
            depth -= 1
        i += 1
    # i now points to the closing }
    end_idx = html.index(";", i) + 1
    html = html[:start_idx] + f"const OSCAR_WINNERS = {js_obj};" + html[end_idx:]

    PUBLIC_HTML.write_text(html, encoding="utf-8")


# ── Routes ──────────────────────────────────────────────────────────────

@app.route("/")
def index():
    return PICKER_HTML


@app.route("/api/nominees")
def api_nominees():
    return jsonify(load_nominees())


@app.route("/api/winners")
def api_winners():
    return jsonify(load_winners())


@app.route("/api/pick/<path:category>", methods=["POST"])
def api_pick(category):
    from flask import request
    nominees = load_nominees()
    if category not in nominees:
        return jsonify({"error": "invalid category"}), 400
    data = request.get_json()
    indices = data.get("indices", [])
    cat_noms = nominees[category]
    selected = []
    for idx in indices:
        if idx < len(cat_noms):
            selected.append(cat_noms[idx])
    if not selected:
        return jsonify({"error": "no valid selections"}), 400
    winners = load_winners()
    winners[category] = selected if len(selected) > 1 else selected[0]
    save_winners(winners)
    rebuild_html(winners)
    return jsonify({"ok": True, "winners": winners})


@app.route("/api/reset/<path:category>", methods=["POST"])
def api_reset(category):
    winners = load_winners()
    winners.pop(category, None)
    save_winners(winners)
    rebuild_html(winners)
    return jsonify({"ok": True, "winners": winners})


# ── Picker UI ───────────────────────────────────────────────────────────

PICKER_HTML = """\
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Oscar Picker</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { background:#111; color:#eee; font-family:system-ui,sans-serif; padding:20px; max-width:900px; margin:0 auto; }
  h1 { text-align:center; margin-bottom:30px; font-size:24px; color:#f0a500; }
  .category { margin-bottom:32px; }
  .cat-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; padding-bottom:8px; border-bottom:1px solid #333; }
  .cat-title { font-size:16px; font-weight:700; letter-spacing:1px; text-transform:uppercase; }
  .cat-winner { font-size:12px; color:#c9a84c; }
  .nominees { display:grid; grid-template-columns:repeat(auto-fill, minmax(140px, 1fr)); gap:10px; }
  .nom { background:#1a1a1a; border:2px solid #222; border-radius:8px; padding:8px; cursor:pointer;
    text-align:center; transition:all 0.2s; user-select:none; }
  .nom:hover { border-color:#555; background:#222; }
  .nom.pending { border-color:#6c8cff; background:#141828; }
  .nom.saved { border-color:#c9a84c; background:#1a1710; }
  .nom img { width:100%; aspect-ratio:1; object-fit:cover; border-radius:4px; margin-bottom:6px; background:#222; }
  .nom-name { font-size:12px; font-weight:600; line-height:1.3; }
  .nom-film { font-size:10px; color:#888; margin-top:2px; }
  .nom-vote { font-size:10px; color:#555; margin-top:2px; }
  .cat-actions { display:flex; gap:8px; margin-top:12px; justify-content:flex-end; }
  .btn { border:none; font-size:12px; padding:6px 16px; border-radius:5px; cursor:pointer;
    letter-spacing:1px; text-transform:uppercase; font-weight:600; transition:all 0.2s; }
  .btn:disabled { opacity:0.2; cursor:default; }
  .btn-submit { background:#c9a84c; color:#111; }
  .btn-submit:hover:not(:disabled) { background:#ddb94f; }
  .btn-reset { background:none; border:1px solid #555; color:#888; }
  .btn-reset:hover:not(:disabled) { border-color:#e05297; color:#e05297; }
  .status { position:fixed; bottom:20px; right:20px; background:#c9a84c; color:#111; padding:8px 16px;
    border-radius:6px; font-size:13px; font-weight:600; opacity:0; transition:opacity 0.3s; pointer-events:none; }
  .status.show { opacity:1; }
</style>
</head>
<body>
<h1>🏆 Oscar Winner Picker</h1>
<div id="app"></div>
<div class="status" id="status">Saved!</div>
<script>
let nominees = {};
let winners = {};
let pending = {};  // { category: Set of indices } — local selections before submit

async function init() {
  [nominees, winners] = await Promise.all([
    fetch('/api/nominees').then(r => r.json()),
    fetch('/api/winners').then(r => r.json()),
  ]);
  render();
}

function render() {
  const app = document.getElementById('app');
  app.innerHTML = '';
  for (const [cat, noms] of Object.entries(nominees)) {
    const w = winners[cat];
    const wList = w ? (Array.isArray(w) ? w : [w]) : [];
    const hasWinner = wList.length > 0;
    const pendingSet = pending[cat] || new Set();
    const hasPending = pendingSet.size > 0;

    const div = document.createElement('div');
    div.className = 'category';
    const esc = cat.replace(/'/g, "\\\\'");

    const winnerNames = wList.map(function(x){ return x.nominee; });

    div.innerHTML =
      '<div class="cat-header">' +
        '<div>' +
          '<div class="cat-title">' + cat + '</div>' +
          (hasWinner ? '<div class="cat-winner">✓ Winner: ' + winnerNames.join(' & ') + '</div>' : '') +
        '</div>' +
      '</div>' +
      '<div class="nominees">' +
        noms.map(function(n, i) {
          let cls = 'nom';
          if (hasPending && pendingSet.has(i)) cls += ' pending';
          else if (hasWinner && winnerNames.indexOf(n.nominee) !== -1 && !hasPending) cls += ' saved';
          var personCats = ['Best Actor','Best Actress','Best Supporting Actor','Best Supporting Actress','Best Director'];
          var mainName = personCats.indexOf(cat) !== -1 ? n.nominee : n.film;
          var subName = personCats.indexOf(cat) !== -1 ? n.film : n.nominee;
          return '<div class="' + cls + '" onclick="select(\\'' + esc + '\\', ' + i + ')">' +
            '<img src="' + n.image + '" alt="' + mainName + '" loading="lazy">' +
            '<div class="nom-name">' + mainName + '</div>' +
            '<div class="nom-film">' + subName + '</div>' +
            '<div class="nom-vote">' + n.vote + '</div>' +
          '</div>';
        }).join('') +
      '</div>' +
      '<div class="cat-actions">' +
        '<button class="btn btn-reset" ' + (!hasWinner ? 'disabled' : '') + ' onclick="resetCat(\\'' + esc + '\\')">Reset</button>' +
        '<button class="btn btn-submit" ' + (!hasPending ? 'disabled' : '') + ' onclick="submitCat(\\'' + esc + '\\')">Submit Winner</button>' +
      '</div>';

    app.appendChild(div);
  }
}

function select(cat, idx) {
  if (!pending[cat]) pending[cat] = new Set();
  if (pending[cat].has(idx)) pending[cat].delete(idx);
  else pending[cat].add(idx);
  if (pending[cat].size === 0) delete pending[cat];
  render();
}

async function submitCat(cat) {
  const indices = Array.from(pending[cat] || []);
  if (indices.length === 0) return;
  const res = await fetch('/api/pick/' + encodeURIComponent(cat), {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({indices: indices})
  });
  const data = await res.json();
  winners = data.winners;
  delete pending[cat];
  render();
  flash('Saved! ' + cat);
}

async function resetCat(cat) {
  const res = await fetch('/api/reset/' + encodeURIComponent(cat), { method: 'POST' });
  const data = await res.json();
  winners = data.winners;
  delete pending[cat];
  render();
  flash('Reset: ' + cat);
}

function flash(msg) {
  const el = document.getElementById('status');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 1500);
}

init();
</script>
</body>
</html>
"""

if __name__ == "__main__":
    print("\\n  🏆 Oscar Picker running at http://localhost:5555\\n")
    app.run(port=5555, debug=True)
