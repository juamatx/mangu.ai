# Screener → mangu.ai · Handoff Instructions

This folder contains a **fully static** copy of the signals_lab watchlist/screener,
ready to drop into the `juamatx/mangu.ai` GitHub Pages repo so it lives at
**`https://mangu.ai/screener/`**.

No backend, no API, no build step for the screener itself. All data is baked into
`data.json`. Charts render client-side via Plotly (CDN). Everything else is vanilla
JS + inline CSS — same visual language as the live regime-ui (JetBrains Mono,
`#FAF9F6` paper, `#2D2A26` ink, green/amber/red regimes).

---

## What's in this folder

```
for-mangu/
├── INSTRUCTIONS.md          ← you are here
└── screener/
    ├── index.html           ← page shell (crumbs, list view, detail view containers)
    ├── app.js               ← all logic: watchlist grid + detail (ResultView replica) + Plotly chart
    └── data.json            ← 5 tickers (SOL, DIS, BUG, HACK, ETH) with full price/regime/AI data
```

## What it does

- **List view** — watchlist grouped by regime (Uptrend / Sideways / Downtrend), each
  ticker a card with price, RSI, support/resistance. Click a card → detail.
- **Detail view** — faithful replica of the regime-ui `ResultView`:
  - Header with ticker + live price
  - Technicals row: 50d MA, 200d MA, RSI gauge, Support/Resistance bar
  - Plotly regime chart with shaded regime bands, trend-fit lines, ±1.5σ channels, annotations
  - Regime sidebar (duration, price change, strength, detection reason)
  - AI Analysis: Claude / GPT-4o / Gemini cards with signal pills + consensus badge
- **Deep links** — `#TICKER` in the URL opens that ticker directly (e.g. `/screener/#BUG`).

---

## How to ship it (for the next Kiro session on the mangu.ai repo)

The screener is self-contained and must NOT go through Vite's JS bundler (it uses a
CDN Plotly + its own inline everything). The right home is the `public/` folder, which
Vite copies **verbatim** to `dist/` at build time.

### Steps

1. **Copy the folder** into the repo's `public/` directory:
   ```
   public/screener/index.html
   public/screener/app.js
   public/screener/data.json
   ```
   (Create `public/` if it doesn't exist — it's already referenced in the repo tree.)

2. **No vite.config.js changes needed.** `base: '/'` is already correct, and `public/*`
   is copied to the dist root untouched. After `npm run build`, the files land at
   `dist/screener/` and serve at `https://mangu.ai/screener/`.

3. **Verify the relative fetch path.** `app.js` fetches `./data.json` (relative), so it
   works whether served at `/screener/` or any other subpath. Don't change it to an
   absolute path.

4. **Optional — link it from the landing page.** Add an anchor somewhere in
   `index.html` (e.g. the contact or nav area):
   ```html
   <a href="/screener/">Screener</a>
   ```

5. **Deploy.** The repo's existing GitHub Action (`.github/workflows/deploy.yml`) builds
   and pushes to Pages on every push to `main`. Just commit and push:
   ```
   git add public/screener
   git commit -m "Add static regime screener at /screener"
   git push
   ```

### Verify locally before pushing

```bash
npm run build && npm run preview
# open http://localhost:4173/screener/
```
Or test the screener folder standalone (no Vite needed):
```bash
cd public/screener && python3 -m http.server 4555
# open http://localhost:4555/
```

---

## Refreshing the data later

The data is a point-in-time snapshot from the signals_lab API. To regenerate it from a
running signals_lab backend (`uv run server.py` on :8787):

```bash
curl -s http://localhost:8787/api/watchlist | python3 -c "
import json, sys
d = json.load(sys.stdin)
out = {}
for ticker, entry in d['tickers'].items():
    if entry.get('data'):
        out[ticker] = {
            'added_at': entry.get('added_at'),
            'refreshed_at': entry.get('refreshed_at'),
            'source': entry.get('source'),
            'ai_rationale': entry.get('ai_rationale'),
            'data': entry['data'],
        }
json.dump({'tickers': out}, open('data.json','w'), separators=(',', ':'))
print('wrote', len(out), 'tickers')
"
```
Drop the new `data.json` into `public/screener/`, rebuild, push. No code changes.

The `data` object shape per ticker must keep these keys (app.js reads them):
`prices[{date,price}]`, `classified_regimes[]`, `llm_summary.current_regime`,
`llm_summary.current_price`, `llm_summary.analysis_date`, `llm_summary.pattern`,
`technical_indicators{ma_50d, ma_200d, rsi_14d, support_60d, resistance_60d, ...}`,
`analyses{anthropic|openai|gemini: {parsed: {signal, conviction, setup_type, thesis, risk}}}`.

---

## Notes / gotchas

- **Plotly version** is pinned to `2.35.2` via CDN in `index.html`. If the CDN ever
  changes, swap the `<script src>` — no other change needed.
- **No "+ Watch" button** here (it was an API write in the live app — pointless on a
  static page, so it's omitted). All read-only views are preserved.
- **No vision/BRIEF button** either — that was a live LLM call. The pre-computed AI
  analysis cards are kept since they're baked into the data.
- The page is responsive (mobile breakpoints match the original at 640/1024/1280px).
- Total payload is ~80KB of data + ~20KB of code. No images except the model logo
  icons (loaded from lobehub/wikipedia CDNs, same as the live app).
