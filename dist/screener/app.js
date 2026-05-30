/* ============================================================================
   Screener — static replica of the regime-ui watchlist + detail views.
   Data is baked into data.json (no backend). Plotly via CDN.
   ============================================================================ */

const REGIME_GROUPS = [
  { key: "uptrend",   label: "UPTREND",   accent: "#16a34a" },
  { key: "sideways",  label: "SIDEWAYS",  accent: "#d97706" },
  { key: "downtrend", label: "DOWNTREND", accent: "#dc2626" },
];

const MODEL_META = [
  { key: "anthropic", label: "Claude Sonnet 4",  img: "https://raw.githubusercontent.com/lobehub/lobe-icons/refs/heads/master/packages/static-png/dark/claude-color.png", accent: "#e8956a" },
  { key: "openai",    label: "GPT-4o",           img: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ef/ChatGPT-Logo.svg/960px-ChatGPT-Logo.svg.png", accent: "#74aa9c" },
  { key: "gemini",    label: "Gemini 2.5 Flash", img: "https://raw.githubusercontent.com/lobehub/lobe-icons/refs/heads/master/packages/static-png/dark/gemini-color.png", accent: "#669df6" },
];

const REGIME_COLORS = {
  uptrend:   { line: "#4ade80", fill: "rgba(74,222,128,0.15)", bg: "rgba(74,222,128,0.06)" },
  downtrend: { line: "#f87171", fill: "rgba(248,113,113,0.15)", bg: "rgba(248,113,113,0.06)" },
  sideways:  { line: "#facc15", fill: "rgba(250,204,21,0.15)", bg: "rgba(250,204,21,0.06)" },
};
const REGIME_NAMES = { uptrend: "Uptrend", downtrend: "Downtrend", sideways: "Sideways" };

let WATCHLIST = { tickers: {} };

// ---- utils -----------------------------------------------------------------
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmt = (v, d = 2) => (v == null || isNaN(v)) ? "—" : Number(v).toFixed(d);

// ---- boot ------------------------------------------------------------------
async function boot() {
  try {
    const res = await fetch("./data.json");
    WATCHLIST = await res.json();
  } catch (e) {
    document.getElementById("list-view").innerHTML =
      '<div class="card4" style="padding:1rem"><div class="down black">Failed to load data.json</div></div>';
    return;
  }
  // deep-link support: #TICKER
  const hash = decodeURIComponent(location.hash.replace(/^#/, "")).toUpperCase();
  if (hash && WATCHLIST.tickers[hash]) showDetail(hash);
  else renderList();
}

// ---- list view -------------------------------------------------------------
function renderList() {
  const entries = Object.entries(WATCHLIST.tickers);
  const total = entries.length;

  // group by current regime type
  const grouped = new Map();
  for (const [ticker, entry] of entries) {
    const data = entry.data || {};
    const regime = data.llm_summary?.current_regime?.type || "sideways";
    if (!grouped.has(regime)) grouped.set(regime, []);
    grouped.get(regime).push({ ticker, entry });
  }

  let html = `
    <div style="display:flex;align-items:center;gap:.5rem;margin-bottom:1.5rem">
      <span class="muted" style="font-size:.85rem;font-weight:800">${total} symbols · regime-classified</span>
    </div>`;

  for (const group of REGIME_GROUPS) {
    const items = grouped.get(group.key) || [];
    if (!items.length) continue;
    html += `
      <section class="section">
        <div class="group-h">
          <div class="dot" style="background:${group.accent}"></div>
          <h2>${group.label}</h2>
          <span class="cnt">${items.length}</span>
        </div>
        <div class="grid grid-cards">
          ${items.map((it, i) => cardHTML(it.ticker, it.entry, i)).join("")}
        </div>
      </section>`;
  }

  document.getElementById("list-view").innerHTML = html;
}

function cardHTML(ticker, entry, i) {
  const data = entry.data || {};
  const summary = data.llm_summary || {};
  const regime = summary.current_regime || {};
  const tech = data.technical_indicators || {};
  const price = summary.current_price;
  const rsi = tech.rsi_14d;
  const rsiColor = rsi == null ? "faint" : rsi > 70 ? "down" : rsi < 30 ? "up" : "muted";
  const regClass = regime.type === "uptrend" ? "up" : regime.type === "downtrend" ? "down" : "side";
  const pattern = (summary.pattern || "").replace(/_/g, " ");

  return `
    <div class="fade-in" style="animation-delay:${i * 60}ms">
      <div class="tcard card4" onclick="showDetail('${ticker}')">
        <div class="row">
          <div style="display:flex;align-items:center;gap:.6rem">
            <span class="tk">${esc(ticker)}</span>
            ${price != null ? `<span class="px">$${fmt(price)}</span>` : ""}
          </div>
          <span class="faint" style="font-size:.7rem">›</span>
        </div>
        <div style="display:flex;align-items:center;gap:.8rem;margin-bottom:.5rem">
          ${regime.type ? `<span class="regime-tag ${regClass}">${esc(regime.type)}</span>` : ""}
          ${pattern ? `<span class="faint" style="font-size:.62rem;text-transform:capitalize">${esc(pattern)}</span>` : ""}
        </div>
        <div class="tiles" style="grid-template-columns:repeat(3,1fr);gap:1px;background:var(--border);margin-top:.5rem">
          <div style="background:#fff;padding:.4rem .5rem">
            <div style="font-size:.6rem;color:var(--text-muted);text-transform:uppercase">RSI</div>
            <div class="black ${rsiColor}" style="font-size:.8rem">${rsi != null ? Math.round(rsi) : "—"}</div>
          </div>
          <div style="background:#fff;padding:.4rem .5rem">
            <div style="font-size:.6rem;color:var(--text-muted);text-transform:uppercase">Support</div>
            <div class="black muted" style="font-size:.8rem">${tech.support_60d != null ? "$" + fmt(tech.support_60d) : "—"}</div>
          </div>
          <div style="background:#fff;padding:.4rem .5rem">
            <div style="font-size:.6rem;color:var(--text-muted);text-transform:uppercase">Resist</div>
            <div class="black muted" style="font-size:.8rem">${tech.resistance_60d != null ? "$" + fmt(tech.resistance_60d) : "—"}</div>
          </div>
        </div>
        ${summary.analysis_date ? `<div class="faint upper" style="font-size:.6rem;margin-top:.6rem">${esc(summary.analysis_date)}</div>` : ""}
      </div>
    </div>`;
}

// ---- navigation ------------------------------------------------------------
function showList() {
  document.getElementById("detail-view").classList.add("hidden");
  document.getElementById("list-view").classList.remove("hidden");
  document.getElementById("crumb-sep2").classList.add("hidden");
  document.getElementById("crumb-ticker").classList.add("hidden");
  document.getElementById("crumb-title").classList.remove("hidden");
  document.getElementById("crumb-screener").classList.remove("here");
  history.replaceState(null, "", location.pathname);
  window.scrollTo(0, 0);
}

function showDetail(ticker) {
  const entry = WATCHLIST.tickers[ticker];
  if (!entry || !entry.data) return;
  document.getElementById("list-view").classList.add("hidden");
  document.getElementById("detail-view").classList.remove("hidden");
  document.getElementById("crumb-title").classList.add("hidden");
  document.getElementById("crumb-sep2").classList.remove("hidden");
  const tk = document.getElementById("crumb-ticker");
  tk.textContent = ticker;
  tk.classList.remove("hidden");
  history.replaceState(null, "", "#" + ticker);
  window.scrollTo(0, 0);
  renderDetail(ticker, entry.data);
}

window.showList = showList;
window.showDetail = showDetail;
window.addEventListener("DOMContentLoaded", boot);


// ---- detail view (ResultView replica) --------------------------------------
function renderDetail(ticker, data) {
  const summary = data.llm_summary || {};
  const currentRegime = summary.current_regime;
  const tech = data.technical_indicators || {};
  const price = summary.current_price;

  let html = `<div style="display:flex;flex-direction:column;gap:1.5rem">`;

  // header
  html += `
    <div style="margin-bottom:.5rem">
      <div style="display:flex;align-items:baseline;gap:.75rem;margin-bottom:.75rem">
        <h2 style="font-size:3rem;font-weight:800;letter-spacing:-.04em">${esc(ticker)}</h2>
        ${price != null ? `<span class="countup" data-countup="${price}" data-decimals="2" data-prefix="$" style="font-size:1.8rem;font-weight:800;color:var(--text-muted)">$0.00</span>` : ""}
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between">
        <button class="btn btn-back" onclick="showList()">← BACK</button>
        ${summary.analysis_date ? `<span class="faint upper" style="font-size:.62rem;font-weight:800">${esc(summary.analysis_date)}</span>` : ""}
      </div>
    </div>`;

  // technicals
  if (data.technical_indicators) {
    html += technicalsHTML(tech, price);
  }

  // chart + regime sidebar
  html += `
    <div class="detail-grid">
      <div style="margin:0 -0.5rem"><div id="chart" class="chart-box chart-reveal"></div></div>
      ${currentRegime ? regimeSidebarHTML(currentRegime) : ""}
    </div>`;

  // AI analysis
  if (data.analyses) {
    html += aiAnalysisHTML(data.analyses);
  }

  html += `</div>`;
  document.getElementById("detail-view").innerHTML = html;

  // draw chart after DOM is in place
  drawChart(data.prices || [], data.classified_regimes || []);

  // fire entrance animations (count-up numbers + sliding levers + fades)
  runEntranceAnimations();
}

// ---- entrance animations ---------------------------------------------------
const prefersReducedMotion = () =>
  window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function animateCountUp(elNode, target, decimals, prefix, duration = 500) {
  const start = performance.now();
  const ease = (t) => 1 - Math.pow(1 - t, 3); // ease-out cubic
  function tick(now) {
    const p = Math.min(1, (now - start) / duration);
    const val = ease(p) * target;
    elNode.textContent = prefix + val.toFixed(decimals);
    if (p < 1) requestAnimationFrame(tick);
    else elNode.textContent = prefix + Number(target).toFixed(decimals);
  }
  requestAnimationFrame(tick);
}

function runEntranceAnimations() {
  const root = document.getElementById("detail-view");
  if (!root) return;
  const reduced = prefersReducedMotion();

  // 1. Count-up numbers (with scale pop)
  root.querySelectorAll(".countup").forEach((node) => {
    const target = parseFloat(node.getAttribute("data-countup"));
    const decimals = parseInt(node.getAttribute("data-decimals") || "0", 10);
    const prefix = node.getAttribute("data-prefix") || "";
    if (isNaN(target)) return;
    if (reduced) {
      node.textContent = prefix + target.toFixed(decimals);
      return;
    }
    node.style.display = "inline-block";
    node.style.animation = "numberPop 0.5s ease-out";
    animateCountUp(node, target, decimals, prefix);
  });

  // 2. Sliding levers (RSI + S/R dots glide from center to real value)
  //    + S/R label/percent fades. rAF defers the style write one frame past
  //    injection so the CSS transition has a "from" state to animate from.
  const dots = root.querySelectorAll(".tech-dot-animate");
  const fades = root.querySelectorAll(".tech-fade");
  const settle = () => {
    dots.forEach((dot) => {
      const to = dot.getAttribute("data-slide-left");
      if (to) dot.style.left = to;
    });
    fades.forEach((f) => f.classList.add("alive"));
  };
  if (reduced) {
    settle();
  } else {
    requestAnimationFrame(() => requestAnimationFrame(settle));
  }
}

// ---- technicals block ------------------------------------------------------
function technicalsHTML(t, price) {
  const rsi = t.rsi_14d;
  const rsiPct = rsi != null ? Math.min(100, Math.max(0, rsi)) : null;

  return `
    <div style="display:flex;flex-direction:column;gap:.75rem">
      <span style="font-size:1rem;font-weight:800;color:var(--text-muted);text-transform:uppercase;letter-spacing:.04em">Technicals</span>
      <div style="border-bottom:1px solid var(--border);margin-bottom:1rem"></div>
      <div class="tiles">
        ${maTileHTML("50-Day MA", t.ma_50d, t.flg_above_ma_50d, t.pct_from_ma_50d, price)}
        ${maTileHTML("200-Day MA", t.ma_200d, t.flg_above_ma_200d, t.pct_from_ma_200d, price)}
        ${rsiTileHTML(rsi, rsiPct, t)}
        ${srTileHTML(t, price)}
      </div>
    </div>`;
}

function maTileHTML(label, value, above, pct, price) {
  if (value == null || price == null) return `<div class="tile card"><div class="faint" style="font-size:.85rem">N/A</div></div>`;
  const lo = Math.min(value, price) * 0.995;
  const hi = Math.max(value, price) * 1.005;
  const range = (hi - lo) || 1;
  const maPct = ((value - lo) / range) * 100;
  const youPct = ((price - lo) / range) * 100;
  const leftPct = Math.min(maPct, youPct);
  const widthPct = Math.abs(youPct - maPct);
  const isAbove = above === true;
  const color = isAbove ? "var(--uptrend)" : "var(--sideways)";
  const bg = isAbove ? "#22c55e" : "#f59e0b";
  const barBg = isAbove ? "rgba(34,197,94,.4)" : "rgba(245,158,11,.4)";

  return `
    <div class="tile card">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.75rem">
        <span class="lbl">${label}</span>
      </div>
      <div style="position:relative;height:3.5rem;margin-bottom:.5rem">
        <div style="position:absolute;top:50%;transform:translateY(-50%);left:0;right:0;height:3px;background:var(--border)"></div>
        <div style="position:absolute;top:50%;transform:translateY(-50%);height:3px;background:${barBg};left:${leftPct}%;width:${widthPct}%"></div>
        <div style="position:absolute;bottom:0;display:flex;flex-direction:column;align-items:center;left:${maPct}%;transform:translateX(-50%)">
          <div style="width:2px;height:.75rem;background:var(--text-faint)"></div>
          <span style="font-size:.55rem;color:var(--text-faint);font-weight:800;line-height:1;margin-top:.1rem">MA</span>
          <span style="font-size:.55rem;color:var(--text-muted);font-weight:800;line-height:1">$${fmt(value)}</span>
        </div>
        <div class="tech-dot-animate" data-slide-left="${youPct}%" style="position:absolute;top:0;display:flex;flex-direction:column;align-items:center;left:50%;transform:translateX(-50%)">
          <span style="font-size:.55rem;font-weight:800;line-height:1;color:${color}">$${fmt(price)}</span>
          <span style="font-size:.5rem;font-weight:800;line-height:1;margin-top:.1rem;color:${color}">Current</span>
          <div style="width:.75rem;height:.75rem;margin-top:.1rem;border:2px solid #fff;box-shadow:0 1px 2px rgba(0,0,0,.2);background:${bg}"></div>
        </div>
      </div>
      <div class="black" style="font-size:.85rem;text-align:center;color:${color}">
        ${fmt(Math.abs(pct ?? 0), 1)}% ${isAbove ? "above" : "below"} MA
      </div>
    </div>`;
}

function rsiTileHTML(rsi, rsiPct, t) {
  if (rsiPct == null) return `<div class="tile card"><div class="lbl" style="margin-bottom:.75rem">RSI (14-day)</div><div class="faint black" style="font-size:.85rem">N/A</div></div>`;
  let trend = "";
  if (t.rsi_trend) {
    const change = Math.round(Math.abs(t.rsi_change_5d ?? 0));
    const up = t.rsi_trend === "RISING";
    trend = `<span class="black ${up ? "up" : "down"}" style="font-size:.75rem">(${up ? "+" : "−"}${change})</span>`;
  }
  return `
    <div class="tile card">
      <div style="margin-bottom:.75rem"><span class="lbl">RSI (14-day)</span></div>
      <div style="display:flex;align-items:baseline;gap:.5rem;margin-bottom:.5rem">
        <span class="black countup" data-countup="${rsi}" data-decimals="0" style="font-size:1.5rem">0</span>${trend}
      </div>
      <div style="position:relative;height:.6rem;background:var(--border);overflow:hidden">
        <div style="position:absolute;inset:0 auto 0 0;background:rgba(34,197,94,.3);width:30%"></div>
        <div style="position:absolute;inset:0;left:30%;background:rgba(100,116,139,.3);width:40%"></div>
        <div style="position:absolute;inset:0 0 0 auto;background:rgba(239,68,68,.3);width:30%"></div>
        <div class="tech-dot-animate" data-slide-left="calc(${rsiPct}% - 6px)" style="position:absolute;top:50%;transform:translateY(-50%);width:.75rem;height:.75rem;background:#fff;border:2px solid #000;box-shadow:0 1px 2px rgba(0,0,0,.2);left:calc(50% - 6px)"></div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:.55rem;color:var(--text-muted);margin-top:.25rem;font-weight:800;text-transform:uppercase">
        <span class="up">Oversold</span><span class="faint">Neutral</span><span class="down">Overbought</span>
      </div>
    </div>`;
}

function srTileHTML(t, price) {
  if (t.support_60d == null || t.resistance_60d == null || price == null)
    return `<div class="tile card"><div class="lbl" style="margin-bottom:.75rem">Support &amp; Resistance</div><div class="faint black" style="font-size:.85rem">N/A</div></div>`;
  const support = t.support_60d, resistance = t.resistance_60d;
  const range = resistance - support;
  const pricePct = range > 0 ? Math.min(100, Math.max(0, ((price - support) / range) * 100)) : 50;
  return `
    <div class="tile card">
      <div class="lbl" style="margin-bottom:.75rem">Support &amp; Resistance</div>
      <div style="display:flex;align-items:center;justify-content:space-between;font-size:.55rem;margin-bottom:.5rem;font-weight:800">
        <span class="up">Support $${fmt(support)}</span>
        <span class="down">Resistance $${fmt(resistance)}</span>
      </div>
      <div style="position:relative;height:1.5rem;margin-bottom:.5rem">
        <div style="position:absolute;top:50%;transform:translateY(-50%);left:0;right:0;height:6px;background:var(--border);overflow:hidden">
          <div style="position:absolute;inset:0 auto 0 0;background:rgba(34,197,94,.15);width:33%"></div>
          <div style="position:absolute;inset:0 0 0 auto;background:rgba(239,68,68,.15);width:33%"></div>
        </div>
        <div style="position:absolute;top:50%;transform:translateY(-50%);left:0;width:2px;height:1rem;background:#22c55e"></div>
        <div style="position:absolute;top:50%;transform:translateY(-50%);right:0;width:2px;height:1rem;background:#ef4444"></div>
        <div class="tech-dot-animate" data-slide-left="${pricePct}%" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%)">
          <div style="width:.75rem;height:.75rem;background:var(--text);border:2px solid #fff;box-shadow:0 2px 4px rgba(0,0,0,.3)"></div>
        </div>
      </div>
      <div class="tech-fade" style="text-align:center;margin-bottom:.5rem"><span class="black" style="font-size:.55rem">Current: $${fmt(price)}</span></div>
      <div class="tech-fade" style="display:flex;justify-content:space-between;font-size:.55rem;color:var(--text-muted);font-weight:800">
        <span>${fmt(Math.abs(t.pct_to_support ?? 0), 1)}% to support</span>
        <span>${fmt(Math.abs(t.pct_to_resistance ?? 0), 1)}% to resistance</span>
      </div>
    </div>`;
}

// ---- regime sidebar --------------------------------------------------------
function regimeSidebarHTML(r) {
  const cls = r.type === "uptrend" ? "up" : r.type === "downtrend" ? "down" : "side";
  const pcCls = r.price_change_pct > 0 ? "up" : r.price_change_pct < 0 ? "down" : "";
  const strength = r.strength ? r.strength.charAt(0).toUpperCase() + r.strength.slice(1) : "—";
  return `
    <div class="card" style="padding:1.25rem">
      <span class="lbl">Regime</span>
      <div class="black ${cls}" style="font-size:1.25rem;margin:.5rem 0 1rem">${esc((r.type || "").toUpperCase())}</div>
      <div style="border-top:1px solid var(--border);padding-top:1rem;display:flex;flex-direction:column;gap:1rem">
        <div>
          <div class="lbl" style="margin-bottom:.1rem">Duration</div>
          <div class="black" style="font-size:.85rem">${r.duration_days}d</div>
          <div class="faint" style="font-size:.6rem">since ${esc(r.since)}</div>
        </div>
        <div>
          <div class="lbl" style="margin-bottom:.1rem">Price Change</div>
          <div class="black ${pcCls}" style="font-size:.85rem">${r.price_change_pct > 0 ? "+" : ""}${fmt(r.price_change_pct, 1)}%</div>
          <div class="faint" style="font-size:.6rem">$${r.start_price} → $${r.end_price}</div>
        </div>
        <div>
          <div class="lbl" style="margin-bottom:.1rem">Strength</div>
          <div class="black" style="font-size:.85rem">${esc(strength)}</div>
          <div class="faint" style="font-size:.6rem">Slope: ${fmt(r.slope, 4)}</div>
        </div>
        <div>
          <div class="lbl" style="margin-bottom:.1rem">Detection</div>
          <div class="muted" style="font-size:.7rem;line-height:1.5">${esc(r.reason)}</div>
        </div>
      </div>
    </div>`;
}

// ---- AI analysis -----------------------------------------------------------
function aiAnalysisHTML(analyses) {
  const cards = MODEL_META.map((m) => {
    const a = analyses[m.key];
    if (!a) return null;
    const p = a.parsed;
    return { ...m, a, p, signal: p?.signal || "Unknown" };
  }).filter(Boolean);

  const order = { Bullish: 0, Neutral: 1, Bearish: 2 };
  cards.sort((a, b) => (order[a.signal] ?? 9) - (order[b.signal] ?? 9));

  const signals = [...new Set(cards.map((c) => c.signal))];
  const allAgree = signals.length === 1;
  const consensusBadge = allAgree
    ? `<span class="pill ${signals[0] === "Bullish" ? "pill-green" : signals[0] === "Bearish" ? "pill-red" : "pill-neutral"}">Consensus: ${esc(signals[0])}</span>`
    : `<span class="pill" style="background:rgba(245,158,11,.2);color:#d97706">Split opinion</span>`;

  const pill = (sig) => {
    if (sig === "Bullish") return `<span class="pill pill-green">BULLISH</span>`;
    if (sig === "Bearish") return `<span class="pill pill-red">BEARISH</span>`;
    return `<span class="pill pill-neutral">NEUTRAL</span>`;
  };

  const card = (c) => {
    const p = c.p;
    let body = "";
    if (c.a.error) body = `<div class="down black" style="font-size:.85rem">Error: ${esc(c.a.error)}</div>`;
    else if (p) {
      body = `<div style="display:flex;flex-direction:column;gap:.75rem">
        ${p.conviction ? `<div class="lbl">${esc(p.conviction)} conviction · ${esc(p.setup_type || "")}</div>` : ""}
        ${p.thesis ? `<div style="font-size:.85rem;line-height:1.6;color:var(--text)">${esc(p.thesis)}</div>` : ""}
        ${p.risk ? `<div style="font-size:.72rem;line-height:1.6;color:var(--text-muted);border-top:1px solid var(--border);padding-top:.75rem"><span class="lbl" style="color:var(--text-faint)">Risk: </span>${esc(p.risk)}</div>` : ""}
      </div>`;
    } else if (c.a.raw) body = `<div style="font-size:.72rem;line-height:1.6;white-space:pre-line;color:var(--text-muted)">${esc(c.a.raw)}</div>`;

    return `
      <div class="card" style="padding:1.25rem">
        <div style="display:flex;align-items:center;gap:.5rem;margin-bottom:1rem">
          <img src="${c.img}" alt="${esc(c.label)}" style="width:1rem;height:1rem" />
          <span class="black" style="font-size:.85rem;color:${c.accent}">${esc(c.label)}</span>
          ${p?.signal ? pill(p.signal) : ""}
        </div>
        ${body}
      </div>`;
  };

  return `
    <div style="display:flex;flex-direction:column;gap:.75rem">
      <div style="display:flex;align-items:center;gap:.75rem">
        <span style="font-size:1rem;font-weight:800;color:var(--text-muted);text-transform:uppercase;letter-spacing:.04em">AI Analysis</span>
        ${consensusBadge}
      </div>
      <div style="border-bottom:1px solid var(--border);margin-bottom:1rem"></div>
      <div class="ai-grid">${cards.map(card).join("")}</div>
    </div>`;
}


// ---- Plotly chart (port of PlotlyRegimeChart) ------------------------------
function drawChart(prices, regimes) {
  const el = document.getElementById("chart");
  if (!el || !prices.length) return;
  const isMobile = window.innerWidth < 640;

  const dates = prices.map((p) => p.date);
  const priceValues = prices.map((p) => p.price);
  const traces = [];

  for (const regime of regimes) {
    const colors = REGIME_COLORS[regime.type] || REGIME_COLORS.sideways;
    const startIdx = prices.findIndex((p) => p.date >= regime.start_date);
    let endIdx = prices.findIndex((p) => p.date > regime.end_date);
    if (endIdx === -1) endIdx = prices.length;
    const segPrices = priceValues.slice(startIdx, endIdx);
    const segDates = dates.slice(startIdx, endIdx);
    if (segPrices.length < 2) continue;

    const n = segPrices.length;
    const mean = segPrices.reduce((a, b) => a + b, 0) / n;
    const xMean = (n - 1) / 2;
    const intercept = mean - regime.slope * xMean;
    const fitted = Array.from({ length: n }, (_, i) => regime.slope * i + intercept);
    const sigma = regime.sigma;
    const upper = fitted.map((v) => v + 1.5 * sigma);
    const lower = fitted.map((v) => v - 1.5 * sigma);

    traces.push({ x: segDates, y: lower, mode: "lines", line: { width: 0 }, showlegend: false, hoverinfo: "skip", type: "scatter" });
    traces.push({ x: segDates, y: upper, mode: "lines", line: { width: 0 }, fill: "tonexty", fillcolor: colors.fill, showlegend: false, hoverinfo: "skip", type: "scatter" });

    const isFirst = regime === regimes[0];
    traces.push({ x: segDates, y: fitted, mode: "lines", line: { color: colors.line, width: isFirst ? 2.5 : 1.8 }, showlegend: false, hoverinfo: "skip", type: "scatter" });
    traces.push({ x: segDates, y: upper, mode: "lines", line: { color: colors.line, width: 0.8, dash: "dot" }, showlegend: false, hoverinfo: "skip", type: "scatter" });
    traces.push({ x: segDates, y: lower, mode: "lines", line: { color: colors.line, width: 0.8, dash: "dot" }, showlegend: false, hoverinfo: "skip", type: "scatter" });
  }

  traces.push({ x: dates, y: priceValues, mode: "lines", line: { color: "#a8a29e", width: 1.5 }, showlegend: false, hovertemplate: "%{x}<br>$%{y:.2f}<extra></extra>", type: "scatter" });

  // shapes + annotations
  const shapes = [], annotations = [];
  const fontSize = isMobile ? 9 : 11;
  const arrowLen = isMobile ? 30 : 50;

  for (const regime of regimes) {
    const colors = REGIME_COLORS[regime.type] || REGIME_COLORS.sideways;
    shapes.push({ type: "rect", xref: "x", yref: "paper", x0: regime.start_date, x1: regime.end_date, y0: 0, y1: 1, fillcolor: colors.bg, line: { width: 0 }, layer: "below" });

    const startIdx = prices.findIndex((p) => p.date >= regime.start_date);
    let endIdx = prices.findIndex((p) => p.date > regime.end_date);
    if (endIdx === -1) endIdx = prices.length;
    const seg = prices.slice(startIdx, endIdx);
    if (seg.length < 2) continue;
    const midIdx = Math.floor(seg.length / 2);
    const name = REGIME_NAMES[regime.type] || regime.type;
    const label = isMobile
      ? `<b>${name}</b> ${regime.duration_days}d`
      : `<b>${name}</b> · ${regime.duration_days}d<br>Slope: ${regime.slope >= 0 ? "+" : ""}${regime.slope.toFixed(3)}`;
    annotations.push({
      x: seg[midIdx].date, y: seg[midIdx].price, text: label,
      showarrow: true, arrowhead: 0, arrowcolor: colors.line,
      ax: 0, ay: regime.slope >= 0 ? -arrowLen : arrowLen,
      bordercolor: colors.line, borderwidth: 1.5, borderpad: isMobile ? 3 : 6,
      bgcolor: "rgba(255,255,255,0.92)",
      font: { size: fontSize, color: colors.line, family: "JetBrains Mono, monospace" },
    });
  }

  if (regimes.length > 0) {
    const cur = regimes[0];
    const colors = REGIME_COLORS[cur.type] || REGIME_COLORS.sideways;
    const name = REGIME_NAMES[cur.type] || cur.type;
    const since = new Date(cur.start_date).toLocaleDateString("en-US", { month: "short", year: "numeric" });
    const txt = isMobile
      ? `<b>${name}</b> · ${cur.duration_days}d`
      : `<b>Current: ${name}</b><br>Since: ${since} (${cur.duration_days} days)<br>Slope: ${cur.slope >= 0 ? "+" : ""}${cur.slope.toFixed(3)}`;
    annotations.push({
      xref: "paper", yref: "paper", x: 0.99, y: 0.99, text: txt, showarrow: false,
      borderpad: isMobile ? 4 : 8, bgcolor: "rgba(255,255,255,0.95)",
      bordercolor: colors.line, borderwidth: 2,
      font: { size: isMobile ? 9 : 11, color: colors.line, family: "JetBrains Mono, monospace" },
      xanchor: "right", yanchor: "top",
    });
  }

  const margin = isMobile ? { t: 40, r: 10, b: 40, l: 40 } : { t: 60, r: 40, b: 60, l: 60 };
  const layout = {
    paper_bgcolor: "#FFFFFF",
    plot_bgcolor: "#FAF9F6",
    font: { color: "#8C8579", family: "JetBrains Mono, ui-monospace, monospace" },
    margin,
    xaxis: {
      title: isMobile ? undefined : { text: "Date", font: { size: 12, color: "#8C8579" } },
      gridcolor: "#E8E2DA", linecolor: "#D4CEC6",
      tickfont: { color: "#8C8579", size: isMobile ? 8 : 10 }, type: "date",
      nticks: isMobile ? 5 : undefined,
    },
    yaxis: {
      title: isMobile ? undefined : { text: "Price (close)", font: { size: 12, color: "#8C8579" } },
      gridcolor: "#E8E2DA", linecolor: "#D4CEC6",
      tickfont: { color: "#8C8579", size: isMobile ? 8 : 10 }, tickprefix: "$",
    },
    shapes, annotations,
    hovermode: isMobile ? "closest" : "x unified",
    dragmode: isMobile ? false : "zoom",
    height: isMobile ? 350 : 520,
  };

  Plotly.newPlot(el, traces, layout, { responsive: true, displayModeBar: false, displaylogo: false, scrollZoom: isMobile ? false : true })
    .then(() => {
      // wipe the chart in left-to-right once it's actually drawn
      if (prefersReducedMotion()) { el.classList.add("alive"); return; }
      requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add("alive")));
    });
}
