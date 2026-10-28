/* Deutsch Drill — studie-app Duits 5 HAVO
   Alle leerstof staat in /content en /beloningen.json. Deze code hoef je niet aan te passen. */
'use strict';

const STORE_KEY = 'duits5h-v1';
const INTERVAL = { 1: 1, 2: 2, 3: 4, 4: 8, 5: 16 }; // dagen tot volgende herhaling per bakje
const MASTER_BOX = 4;                                  // vanaf bakje 4 telt een item als "beheerst"
const XP = { flash: 5, mc: 10, art: 8, type: 15, build: 15, mini: 15, read: 20 };
const LEVELS = [0, 150, 400, 800, 1400, 2200, 3200, 4500, 6000, 8000, 10500, 13500];
const TITLES = ['Anfänger', 'Lehrling', 'Entdecker', 'Kenner', 'Profi', 'Experte', 'Meister', 'Champion', 'Legende', 'Sprachgott', 'Unaufhaltsam', 'GOAT'];
const AVATARS = ['🦊', '🐺', '🐉', '🦅', '🤖', '👾', '🦁', '🐼', '🥷', '🧙'];
const BADGES = [
  { id: 'eerste', e: '🚀', t: 'Eerste sessie' },
  { id: 'honderd', e: '💯', t: '100 antwoorden' },
  { id: 'vijfhonderd', e: '🔥', t: '500 antwoorden' },
  { id: 'perfect', e: '🎯', t: 'Foutloze missie' },
  { id: 'sprint20', e: '⚡', t: '20+ in sprint' },
  { id: 'lezer', e: '📖', t: '3 teksten gelezen' },
  { id: 'week', e: '📅', t: '7 dagen streak' },
  { id: 'level5', e: '👑', t: 'Level 5' }
];

/* ---------- helpers ---------- */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pick = a => a[Math.floor(Math.random() * a.length)];
const pad = n => String(n).padStart(2, '0');
const dayStr = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseDay = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (s, n) => { const d = parseDay(s); d.setDate(d.getDate() + n); return dayStr(d); };
const diffDays = (a, b) => Math.round((parseDay(b) - parseDay(a)) / 864e5);
const today = () => { const d = new Date(); d.setDate(d.getDate() + (S.dayOffset || 0)); return dayStr(d); };
const weekId = s => { const d = parseDay(s); const day = (d.getDay() + 6) % 7; d.setDate(d.getDate() - day); return dayStr(d); };

/* ---------- opslag ---------- */
function defaultState() {
  return { name: null, avatar: null, theme: 'dark', tentamen: null, items: {}, xp: 0,
    streak: { count: 0, last: null, best: 0, shieldWeek: null }, days: {}, claims: {}, tests: [],
    reading: {}, records: { sprint: 0, match: 0 }, badges: {}, answered: 0, dayOffset: 0, letters: {}, drafts: {}, redeemed: {} };
}
let memStore = null;
function load() {
  try { const r = localStorage.getItem(STORE_KEY); if (r) return Object.assign(defaultState(), JSON.parse(r)); } catch (e) {}
  return memStore || defaultState();
}
let S = defaultState();
function save() { try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); } catch (e) { memStore = S; } }

/* ---------- content laden ---------- */
const C = { cfg: null, tent: [], titels: {}, items: {}, decks: {}, grammar: {}, writing: {}, letterList: [], reading: {}, tips: [], errors: [] };

async function getText(p) { const r = await fetch(p, { cache: 'no-cache' }); if (!r.ok) throw new Error(`${p} niet gevonden (${r.status})`); return (await r.text()).replace(/^﻿/, ''); }
async function getJSON(p) { const t = await getText(p); try { return JSON.parse(t); } catch (e) { throw new Error(`${p}: fout in JSON (${e.message})`); } }

function parseCSV(txt) {
  const rows = []; let row = [], f = '', q = false;
  for (let i = 0; i < txt.length; i++) {
    const c = txt[i];
    if (q) { if (c === '"') { if (txt[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(f); f = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && txt[i + 1] === '\n') i++; row.push(f); rows.push(row); row = []; f = ''; }
    else f += c;
  }
  if (f || row.length) { row.push(f); rows.push(row); }
  const head = (rows.shift() || []).map(s => s.trim().toLowerCase());
  return rows.filter(r => r.some(x => x.trim())).map(r => {
    // komma's in de laatste kolom (voorbeeldzin) mogen zonder aanhalingstekens
    if (r.length > head.length) r = [...r.slice(0, head.length - 1), r.slice(head.length - 1).join(',')];
    return Object.fromEntries(head.map((h, i) => [h, (r[i] || '').trim()]));
  });
}

function addItem(it, tid) {
  if (!C.items[it.id]) C.items[it.id] = it;
  const t = C.tent.find(x => x.id === tid); if (t && !t.ids.includes(it.id)) t.ids.push(it.id);
}

async function loadContent() {
  const [tj, cfg, tips] = await Promise.all([
    getJSON('content/tentamens.json'),
    getJSON('beloningen.json').catch(e => { C.errors.push(e.message); return { mijlpalen: [] }; }),
    getJSON('content/examentips.json').catch(() => ({ tips: [] }))
  ]);
  C.cfg = cfg; C.tips = tips.tips || []; C.titels = tj.titels || {};
  C.tent = (tj.tentamens || []).map(t => ({ ...t, ids: [] }));
  const need = { woorden: new Set(), grammatica: new Set(), idiomen: new Set(), lezen: new Set(), schrijven: new Set() };
  C.tent.forEach(t => Object.keys(need).forEach(k => (t[k] || []).forEach(f => need[k].add(f))));
  const cache = {};
  const jobs = [];
  for (const k of Object.keys(need)) for (const f of need[k]) {
    const path = k === 'woorden' || k === 'idiomen' ? `content/${k}/${f}.csv` : `content/${k}/${f}.json`;
    jobs.push((path.endsWith('.csv') ? getText(path).then(parseCSV) : getJSON(path))
      .then(d => { cache[k + ':' + f] = d; }).catch(e => C.errors.push(e.message)));
  }
  await Promise.all(jobs);
  for (const t of C.tent) {
    for (const f of t.woorden || []) {
      const rows = cache['woorden:' + f]; if (!rows) continue;
      C.decks[f] = { id: f, kind: 'w', titel: C.titels[f] || f, ids: [] };
      rows.forEach(r => { if (!r.duits || !r.nederlands) return;
        const it = { id: `w:${f}:${r.duits}`, kind: 'word', cat: 'w', deck: f, de: r.duits, nl: r.nederlands, art: (r.lidwoord || '').toLowerCase(), pl: r.meervoud || '', ex: r.voorbeeldzin || '' };
        addItem(it, t.id); if (!C.decks[f].ids.includes(it.id)) C.decks[f].ids.push(it.id); });
    }
    for (const f of t.idiomen || []) {
      const rows = cache['idiomen:' + f]; if (!rows) continue;
      C.decks[f] = { id: f, kind: 'i', titel: C.titels[f] || f, ids: [] };
      rows.forEach(r => { if (!r.duits || !r.nederlands) return;
        const it = { id: `i:${f}:${r.duits}`, kind: 'idiom', cat: 'i', deck: f, de: r.duits, nl: r.nederlands, ex: r.voorbeeldzin || '' };
        addItem(it, t.id); if (!C.decks[f].ids.includes(it.id)) C.decks[f].ids.push(it.id); });
    }
    for (const f of t.grammatica || []) {
      const g = cache['grammatica:' + f]; if (!g) continue;
      C.grammar[f] = { id: f, titel: g.onderwerp || f, uitleg: g.uitleg || '', tabellen: g.tabellen || [], ids: [] };
      (g.vragen || []).forEach((q, i) => {
        const kind = q.type === 'zinsbouw' ? 'build' : 'gap';
        const it = { id: `g:${f}:${i}`, kind, cat: 'g', deck: f, ...q };
        addItem(it, t.id); if (!C.grammar[f].ids.includes(it.id)) C.grammar[f].ids.push(it.id);
      });
    }
    for (const f of t.schrijven || []) {
      const w = cache['schrijven:' + f]; if (!w) continue;
      if (!C.writing[f]) { C.writing[f] = { id: f, titel: w.onderwerp || f, uitleg: w.uitleg || '', ids: [], opdrachten: w.opdrachten || [] }; (w.opdrachten || []).forEach(o => C.letterList.push({ f, o })); }
      const add = (q, i, pre, kind) => { const it = { ...q, id: `s:${f}:${pre}${i}`, kind, cat: 's', deck: f }; addItem(it, t.id); if (!C.writing[f].ids.includes(it.id)) C.writing[f].ids.push(it.id); };
      (w.briefbouw || []).forEach((q, i) => add(q, i, 'b', 'build'));
      (w.conventies || []).forEach((q, i) => add(q, i, 'c', 'gap'));
      (w.mini || []).forEach((q, i) => add(q, i, 'm', 'mini'));
    }
    for (const f of t.lezen || []) { const r = cache['lezen:' + f]; if (r) C.reading[f] = { id: f, ...r, tentamen: t.id }; }
  }
  if (cfg.appnaam) document.title = cfg.appnaam;
}

/* ---------- voortgang & beheersing ---------- */
const prog = id => S.items[id];
const isMastered = id => (S.items[id]?.box || 0) >= MASTER_BOX;
function idsFor(tid) { if (tid === 'ALLE') return Object.keys(C.items); return C.tent.find(t => t.id === tid)?.ids || []; }
function mastery(ids) { if (!ids.length) return 0; return Math.round(100 * ids.filter(isMastered).length / ids.length); }
function catIds(tid, cat) { return idsFor(tid).filter(id => C.items[id].cat === cat); }
function lettersDone() { return Object.values(S.letters || {}).flat().filter(x => x.words >= 40 || x.via === 'code').length; }
function activeTent() { const t = C.tent.find(x => x.id === S.tentamen); return t || C.tent[0]; }
function level(xp = S.xp) { let l = 0; while (l < LEVELS.length - 1 && xp >= LEVELS[l + 1]) l++; return l; }

function grade(id, ok, counts = true) {
  const t = today(); const p = S.items[id] || { box: 0, due: t, ok: 0, bad: 0 };
  const isDue = !S.items[id] || p.due <= t;
  if (ok) { p.ok++; if (counts && isDue) { p.box = Math.min(5, p.box + 1); p.due = addDays(t, INTERVAL[p.box]); } }
  else { p.bad++; p.box = counts ? 1 : Math.max(1, p.box - 1); p.due = t; }
  p.last = t; S.items[id] = p;
}

function addXP(n) {
  const before = level(); S.xp += n; const d = S.days[today()] || (S.days[today()] = { n: 0, xp: 0 }); d.xp += n;
  if (level() > before) { toast(`Level up! Je bent nu ${TITLES[level()]} 🎉`); confetti(); }
}

function updateStreak() {
  const t = today(); const st = S.streak;
  if (st.last === t) return false;
  const gap = st.last ? diffDays(st.last, t) : 99;
  if (gap === 1) st.count++;
  else if (gap === 2 && st.shieldWeek !== weekId(t)) { st.count++; st.shieldWeek = weekId(t); toast('🛡️ Streak-schild gebruikt voor gisteren'); }
  else st.count = 1;
  st.last = t; st.best = Math.max(st.best, st.count); return true;
}
function streakAlive() { const st = S.streak; if (!st.last) return 0; const g = diffDays(st.last, today()); return g <= 1 || (g === 2 && st.shieldWeek !== weekId(today())) ? st.count : 0; }

/* ---------- mijlpalen ---------- */
function milestoneStatus(m) {
  const t = activeTent()?.id;
  if (m.type === 'streak') return { cur: S.streak.best, max: m.waarde, label: `${Math.min(S.streak.best, m.waarde)} / ${m.waarde} dagen streak` };
  if (m.type === 'beheersing') { const v = mastery(idsFor(m.tentamen || t)); return { cur: v, max: m.waarde, label: `${v}% / ${m.waarde}% beheerst` }; }
  if (m.type === 'alles') { const v = mastery(idsFor('ALLE')); return { cur: v, max: m.waarde, label: `${v}% / ${m.waarde}% van alle stof` }; }
  if (m.type === 'tentamenklaar') {
    const tid = m.tentamen || t; const v = mastery(idsFor(tid)); const best = Math.max(0, ...S.tests.filter(x => x.tid === tid).map(x => x.score));
    const okM = v >= m.beheersing, okT = best >= m.toets; const nb = m.brieven || 0, lb = lettersDone(), okB = lb >= nb;
    const parts = [Math.min(v / m.beheersing, 1), Math.min(best / m.toets, 1)]; if (nb) parts.push(Math.min(lb / nb, 1));
    return { cur: parts.reduce((a, b) => a + b, 0) / parts.length * 100, max: 100, label: `${v}% / ${m.beheersing}% beheerst · eindtoets ${best}% / ${m.toets}%${nb ? ` · brieven ${Math.min(lb, nb)} / ${nb}` : ''}`, done: okM && okT && okB };
  }
  return { cur: 0, max: 1, label: '' };
}
function checkMilestones() {
  const fresh = [];
  for (const m of C.cfg.mijlpalen || []) {
    if (S.claims[m.id]) continue;
    const s = milestoneStatus(m); const done = s.done ?? s.cur >= s.max;
    if (done) { S.claims[m.id] = { date: today(), code: claimCode(m.id), score: Math.round(s.cur), given: false }; fresh.push(m); }
  }
  return fresh;
}
function claimCode(id) { const str = `${S.name}|${id}|${today()}|${S.xp}`; let h = 5381; for (const c of str) h = ((h << 5) + h + c.charCodeAt(0)) >>> 0; return h.toString(36).toUpperCase().slice(-6).padStart(6, '7'); }
function checkBadges() {
  const B = S.badges; const set = id => { if (!B[id]) { B[id] = today(); toast(`Badge: ${BADGES.find(b => b.id === id).t} ${BADGES.find(b => b.id === id).e}`); } };
  if (S.answered >= 1) set('eerste');
  if (S.answered >= 100) set('honderd');
  if (S.answered >= 500) set('vijfhonderd');
  if (S.records.sprint >= 20) set('sprint20');
  if (Object.keys(S.reading).length >= 3) set('lezer');
  if (S.streak.best >= 7) set('week');
  if (level() >= 4) set('level5');
}

/* ---------- UI basis ---------- */
function setTheme() { document.documentElement.dataset.theme = S.theme; const m = document.querySelector('meta[name=theme-color]'); if (m) m.content = S.theme === 'light' ? '#f4f4f6' : '#000000'; }
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => t.hidden = true, 2600); }
function confetti() {
  const box = document.createElement('div'); box.className = 'confetti';
  const cols = ['#ffce00', '#ef4444', '#22c55e', '#60a5fa', '#f4f4f5'];
  for (let i = 0; i < 70; i++) { const p = document.createElement('i'); p.style.left = Math.random() * 100 + 'vw'; p.style.background = pick(cols); p.style.animationDelay = Math.random() * .6 + 's'; p.style.animationDuration = 1.4 + Math.random() + 's'; box.appendChild(p); }
  document.body.appendChild(box); setTimeout(() => box.remove(), 3200);
}
function ask(msg, yes, cb) {
  const m = document.createElement('div'); m.className = 'modal';
  m.innerHTML = `<div class="card"><p><b>${esc(msg)}</b></p><div class="btn-row"><button class="btn ghost" data-r="0">Annuleren</button><button class="btn" data-r="1">${esc(yes)}</button></div></div>`;
  m.onclick = e => { const b = e.target.closest('[data-r]'); if (!b && e.target !== m) return; m.remove(); if (b?.dataset.r === '1') cb(); };
  document.body.appendChild(m);
}
function xpPop(n) { const d = document.createElement('div'); d.className = 'xp-pop'; d.textContent = `+${n} XP`; document.body.appendChild(d); setTimeout(() => d.remove(), 900); }
function ring(pct, color = 'var(--accent)') {
  const r = 27, c = 2 * Math.PI * r;
  return `<div class="ring"><svg width="56" height="56" viewBox="0 0 64 64"><circle cx="32" cy="32" r="${r}" fill="none" stroke="var(--card2)" stroke-width="7"/><circle cx="32" cy="32" r="${r}" fill="none" stroke="${color}" stroke-width="7" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - pct / 100)}"/></svg><b>${pct}%</b></div>`;
}
function avatarHTML(big) { return `<div class="avatar ${big ? 'big' : ''}">${S.avatar || '🦊'}<span class="lvl">${level() + 1}</span></div>`; }
function render(html, nav, wide) {
  stopTimers(); $('#app').innerHTML = html; $('#app').classList.toggle('wide', !!wide); window.scrollTo(0, 0);
  const n = $('#nav'); n.hidden = !nav;
  if (nav) n.innerHTML = [['home', '🏠', 'Home'], ['oefenen', '🎮', 'Oefenen'], ['doelen', '🏆', 'Doelen'], ['profiel', '👤', 'Profiel']]
    .map(([k, i, t]) => `<button data-go="${k}" class="${nav === k ? 'on' : ''}"><span class="i">${i}</span>${t}</button>`).join('');
}
let timers = [];
function stopTimers() { timers.forEach(clearInterval); timers = []; }
const routes = {};
function go(r, arg) { (routes[r] || routes.home)(arg); }
document.addEventListener('click', e => {
  const g = e.target.closest('[data-go]'); if (g) { go(g.dataset.go, g.dataset.arg); return; }
});

/* ---------- schermen ---------- */
routes.welkom = () => {
  let name = S.name || C.cfg.naam || ''; let av = S.avatar || AVATARS[0];
  render(`<h1>Willkommen! 👋</h1><p class="muted">Kies je avatar. Hij groeit mee met je level.</p>
    <div class="avatars" id="av">${AVATARS.map(a => `<button class="${a === av ? 'on' : ''}" data-a="${a}">${a}</button>`).join('')}</div>
    <h2>Hoe heet je?</h2><input class="field" id="nm" value="${esc(name)}" placeholder="Je naam" autocomplete="off">
    <div style="height:20px"></div><button class="btn" id="go">Los geht's →</button>`);
  $('#av').onclick = e => { const b = e.target.closest('button'); if (!b) return; av = b.dataset.a; $('#av').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); };
  $('#go').onclick = () => { S.name = $('#nm').value.trim() || 'Speler'; S.avatar = av; save(); go('home'); };
};

routes.home = () => {
  if (!S.name) return go('welkom');
  const t = activeTent(); const td = S.days[today()] || { n: 0, xp: 0 }; const goal = C.cfg.dagdoel || 20;
  const lv = level(); const nxt = LEVELS[lv + 1] ?? S.xp; const lvPct = nxt > LEVELS[lv] ? Math.round(100 * (S.xp - LEVELS[lv]) / (nxt - LEVELS[lv])) : 100;
  const missionDone = td.mission; const st = streakAlive();
  const days = t?.datum ? diffDays(today(), t.datum) : null;
  const next = (C.cfg.mijlpalen || []).find(m => !S.claims[m.id]);
  const ns = next && milestoneStatus(next);
  const lezen = (t?.lezen || []).filter(f => S.reading[f]).length;
  const due = idsFor(t?.id).filter(id => S.items[id] && S.items[id].due <= today()).length;
  render(`
    ${C.errors.length ? `<div class="card warn"><b>Let op: niet alle leerstof kon geladen worden</b><p class="small muted">${C.errors.map(esc).join('<br>')}</p></div>` : ''}
    <div class="hero">${avatarHTML()}<div class="grow"><h1>Hallo ${esc(S.name)}!</h1>
      <div class="small muted">${TITLES[lv]} · ${S.xp} XP</div><div class="bar" style="margin-top:6px"><i style="width:${lvPct}%"></i></div></div></div>
    <div class="stats">
      <div class="stat"><b>${st ? '🔥 ' + st : '0'}</b><span>dagen streak</span></div>
      <div class="stat"><b>${td.xp}</b><span>XP vandaag</span></div>
      <div class="stat"><b>${days !== null ? (days >= 0 ? days : '–') : '–'}</b><span>dagen tot ${t ? 'tentamen' : 'toets'}</span></div>
    </div>
    <div class="card mission">
      <div class="row between"><h3>${missionDone ? '✅ Dagmissie gehaald!' : '🎯 Dagmissie'}</h3><span class="pill">${Math.min(td.n, goal)}/${goal}</span></div>
      <p class="small muted">${missionDone ? 'Je streak is veilig. Extra ronde = extra XP.' : `${due ? due + ' herhalingen klaar + ' : ''}nieuwe stof, kort en gemengd.`}</p>
      <div class="bar" style="margin:4px 0 14px"><i style="width:${Math.min(100, 100 * td.n / goal)}%"></i></div>
      <button class="btn" data-go="missie">${missionDone ? 'Nog een ronde' : td.n ? 'Verder gaan' : 'Start dagmissie'}</button>
    </div>
    <div class="card">
      <div class="row between" style="margin-bottom:12px"><h3>${esc(t?.naam || 'Leerstof')}</h3><button class="chip" data-go="profiel">wissel</button></div>
      <div class="rings">
        ${[['w', 'Woorden'], ['g', 'Grammatica'], ['i', 'Zinnen'], ['s', 'Briefregels']].filter(([c]) => catIds(t?.id, c).length).map(([c, l]) => `<div>${ring(mastery(catIds(t?.id, c)))}<span>${l}</span></div>`).join('')}
        ${(t?.lezen || []).length ? `<div>${ring(Math.round(100 * lezen / t.lezen.length), 'var(--info)')}<span>Lezen</span></div>` : ''}
        ${(t?.schrijven || []).length ? `<div>${ring(Math.min(100, Math.round(100 * lettersDone() / ((C.cfg.mijlpalen || []).find(m => m.brieven)?.brieven || 3))), 'var(--good)')}<span>Brieven</span></div>` : ''}
      </div>
    </div>
    ${next ? `<div class="card tap" data-go="doelen"><div class="goal"><div class="medal">🎁</div><div class="grow"><div class="small muted">Volgende beloning</div><h3>${esc(next.titel)}: ${esc(next.beloning)}</h3><div class="small muted">${esc(ns.label)}</div><div class="bar" style="margin-top:8px"><i style="width:${Math.min(100, 100 * ns.cur / ns.max)}%"></i></div></div></div></div>` : ''}
    ${C.tips.length ? (() => { const tp = C.tips[(parseDay(today()).getDate()) % C.tips.length]; return `<div class="card tip"><div class="small muted">Examentip van de dag</div><h3>${esc(tp.titel)}</h3><p class="small">${esc(tp.tekst)}</p></div>`; })() : ''}
  `, 'home');
};

routes.oefenen = () => {
  const t = activeTent();
  const deckRow = (d, ico) => { const ids = d.ids.filter(id => t.ids.includes(id)); return `<button class="list-item" data-go="deck" data-arg="${esc(d.id)}"><span class="ico">${ico}</span><span class="grow"><b>${esc(d.titel)}</b><div class="bar" style="margin-top:6px"><i style="width:${mastery(ids)}%"></i></div></span><span class="small muted">${mastery(ids)}%</span></button>`; };
  const decks = [...(t.woorden || []).map(f => C.decks[f]).filter(Boolean).map(d => deckRow(d, '🔤')), ...(t.idiomen || []).map(f => C.decks[f]).filter(Boolean).map(d => deckRow(d, '💬'))].join('');
  const gram = (t.grammatica || []).map(f => C.grammar[f]).filter(Boolean).map(d => deckRow(d, '🧩')).join('');
  const lees = (t.lezen || []).map(f => C.reading[f]).filter(Boolean).map(r => `<button class="list-item" data-go="lezen" data-arg="${esc(r.id)}"><span class="ico">📰</span><span class="grow"><b>${esc(r.titel)}</b><div class="small muted">${r.vragen.length} vragen</div></span>${S.reading[r.id] ? `<span class="pill good">${S.reading[r.id].best}/${r.vragen.length}</span>` : ''}</button>`).join('');
  render(`<h1>Oefenen</h1><p class="muted">${esc(t.naam)} · kies zelf wat je doet</p>
    ${(t.schrijven || []).map(f => C.writing[f]).filter(Boolean).map(w => `<h2>Schrijven: ${esc(w.titel)}</h2>${deckRow(w, '🧱').replace(esc(w.titel), 'Bouwstenen: opbouw, regels en zinnen')}
      ${w.opdrachten.map(o => `<button class="list-item" data-go="brief" data-arg="${esc(w.id + '|' + o.id)}"><span class="ico">✉️</span><span class="grow"><b>${esc(o.titel)}</b><div class="small muted">${S.drafts[o.id]?.text ? 'concept bewaard · ' : ''}${({ brief: 'zakelijke brief', email: 'e-mail', sollicitatie: 'sollicitatiebrief' })[o.soort] || 'brief'} · liefst op laptop</div></span>${(S.letters[o.id] || []).length ? `<span class="pill good">${S.letters[o.id].length}×</span>` : ''}</button>`).join('')}
      <button class="list-item" data-go="code"><span class="ico">🔑</span><span class="grow"><b>Code van laptop invoeren</b><div class="small muted">XP ophalen voor een brief die je op een ander apparaat schreef</div></span></button>`).join('')}
    <h2>Spellen</h2>
    <button class="list-item" data-go="sprint"><span class="ico">⚡</span><span class="grow"><b>Der/die/das-sprint</b><div class="small muted">60 seconden · record ${S.records.sprint}</div></span></button>
    <button class="list-item" data-go="koppel"><span class="ico">🔗</span><span class="grow"><b>Koppelspel</b><div class="small muted">Koppel Duits aan Nederlands${S.records.match ? ' · record ' + S.records.match + 's' : ''}</div></span></button>
    <h2>Woorden & uitdrukkingen</h2>${decks || '<p class="muted">Nog geen woordenlijsten.</p>'}
    <h2>Grammatica</h2>${gram || '<p class="muted">Nog geen grammatica.</p>'}
    <h2>Leesvaardigheid</h2>${lees || '<p class="muted">Nog geen teksten.</p>'}
    <button class="list-item" data-go="tips"><span class="ico">💡</span><span class="grow"><b>Examentips</b><div class="small muted">Wat ging vaak mis bij recente examens</div></span></button>
    <h2>Toets</h2>
    <button class="list-item" data-go="toets"><span class="ico">📝</span><span class="grow"><b>Eindtoets ${esc(t.naam)}</b><div class="small muted">30 vragen, uitslag aan het eind${S.tests.filter(x => x.tid === t.id).length ? ' · beste ' + Math.max(...S.tests.filter(x => x.tid === t.id).map(x => x.score)) + '%' : ''}</div></span></button>
  `, 'oefenen');
};

routes.deck = id => {
  const d = C.decks[id] || C.grammar[id] || C.writing[id]; if (!d) return go('oefenen');
  const t = activeTent(); const ids = d.ids.filter(x => t.ids.includes(x));
  const dueIds = ids.filter(x => !S.items[x] || S.items[x].due <= today());
  const pickIds = [...shuffle(dueIds), ...shuffle(ids.filter(x => !dueIds.includes(x)))].slice(0, 12);
  render(`<div class="topbar"><button class="x" data-go="oefenen">←</button><h1 class="grow" style="font-size:21px">${esc(d.titel)}</h1></div>
    <div class="card"><div class="row between"><span>Beheerst</span><b>${mastery(ids)}%</b></div><div class="bar good" style="margin-top:8px"><i style="width:${mastery(ids)}%"></i></div>
    <p class="small muted" style="margin-top:10px">${ids.length} items · ${dueIds.length} klaar om te oefenen. Een item telt als beheerst als je het op verschillende dagen goed hebt.</p></div>
    <button class="btn" id="st">Oefen ${pickIds.length} items</button><div style="height:12px"></div>
    ${d.uitleg ? `<div class="card"><div class="q-label">Uitleg</div><p class="explain">${esc(d.uitleg)}</p></div>` : ''}
    ${(d.tabellen || []).map(t => `<div class="card"><div class="q-label">${esc(t.titel || 'Schema')}</div><div class="tbl-wrap"><table class="tbl"><thead><tr>${t.kop.map(k => `<th>${esc(k)}</th>`).join('')}</tr></thead><tbody>${t.rijen.map(r => `<tr>${r.map((c, i) => i ? `<td>${esc(c)}</td>` : `<th>${esc(c)}</th>`).join('')}</tr>`).join('')}</tbody></table></div></div>`).join('')}

    ${C.decks[id] ? `<h2>Alle items</h2>${ids.map(x => { const it = C.items[x]; return `<div class="list-item" style="cursor:default"><span class="grow"><b>${esc(nounDE(it))}</b><div class="small muted">${esc(it.nl)}</div></span>${isMastered(x) ? '<span class="pill good">✓</span>' : `<span class="pill">${S.items[x]?.box || 0}/5</span>`}</div>`; }).join('')}` : ''}
  `, false);
  $('#st').onclick = () => startSession(pickIds, { mode: 'practice', back: ['deck', id] });
};

/* ---------- sessie ---------- */
let sess = null;
function buildMission() {
  const t = activeTent(); const ids = idsFor(t.id); const now = today(); const goal = C.cfg.dagdoel || 20;
  const due = shuffle(ids.filter(id => S.items[id] && S.items[id].due <= now)).sort((a, b) => S.items[a].box - S.items[b].box);
  const fresh = shuffle(ids.filter(id => !S.items[id]));
  let list = due.slice(0, goal);
  const room = goal - list.length; list = list.concat(fresh.slice(0, Math.max(Math.min(room, 8), list.length < goal / 2 ? room : 0)));
  if (list.length < goal) list = list.concat(shuffle(ids.filter(id => !list.includes(id))).slice(0, goal - list.length));
  return shuffle(list);
}
routes.missie = () => startSession(buildMission(), { mode: 'mission', back: ['home'] });

function nounDE(it) { return it.art ? `${it.art} ${it.de}` : it.de; }
function chooseExercise(it, hard) {
  const box = S.items[it.id]?.box || 0;
  if (it.kind === 'build') return 'build';
  if (it.kind === 'mini') return 'mini';
  if (it.kind === 'gap') return (hard || box >= 3) && it.antwoord.length <= 14 && Math.random() < .6 ? 'gaptype' : 'gapmc';
  if (it.kind === 'idiom') return hard ? 'mc' : box === 0 ? 'flash' : 'mc';
  if (hard) return it.art && Math.random() < .25 ? 'art' : Math.random() < .6 ? 'type' : 'mc';
  if (box === 0) return Math.random() < .6 ? 'flash' : 'mc';
  if (box >= 2 && it.art && Math.random() < .25) return 'art';
  if (box >= 3) return Math.random() < .75 ? 'type' : 'mc';
  return 'mc';
}
function startSession(ids, opts) {
  if (!ids.length) { toast('Geen items gevonden voor deze stof'); return go('home'); }
  sess = { queue: ids.map(id => ({ id, ex: chooseExercise(C.items[id], opts.mode === 'test') })), i: 0, ok: 0, bad: 0, xp: 0, retried: new Set(), ...opts, results: [] };
  showQuestion();
}
function sessHeader() {
  const total = sess.queue.length; const pct = Math.round(100 * sess.i / total);
  return `<div class="topbar"><button class="x" id="quit">✕</button><div class="grow bar"><i style="width:${pct}%"></i></div><span class="small muted">${sess.i + 1}/${total}</span></div>`;
}
function showQuestion() {
  if (sess.i >= sess.queue.length) return endSession();
  const { id, ex } = sess.queue[sess.i]; const it = C.items[id];
  const H = sessHeader();
  const R = { flash: qFlash, mc: qMC, type: qType, art: qArt, gapmc: qGapMC, gaptype: qGapType, build: qBuild, mini: qMini }[ex];
  R(it, H);
  const q = $('#quit'); if (q) q.onclick = () => { if (sess.i === 0) finishEarly(); else ask('Stoppen? Je voortgang tot nu toe is bewaard.', 'Stoppen', finishEarly); };
}
function finishEarly() { document.querySelector('.feedback')?.remove(); if (sess.mode === 'test') { sess = null; return go('oefenen'); } sess.queue = sess.queue.slice(0, sess.i); endSession(); }

function distractors(it, n, field) {
  let pool = Object.values(C.items).filter(x => x.kind === it.kind && x.id !== it.id && x[field] !== it[field]);
  const same = pool.filter(x => x.deck === it.deck); if (same.length >= n) pool = same;
  const out = []; for (const x of shuffle(pool)) { const v = field === 'de' ? nounDE(x) : x[field]; if (!out.includes(v)) out.push(v); if (out.length === n) break; }
  return out;
}
function qFlash(it, H) {
  render(`${H}<div class="q"><div class="q-label">Ken je dit? Tik om te draaien</div>
    <div class="flash" id="fc"><div class="flash-inner"><div class="face"><div class="big">${esc(nounDE(it))}</div>${it.pl ? `<div class="muted">mv. ${esc(it.pl)}</div>` : ''}</div>
    <div class="face back"><div class="big">${esc(it.nl)}</div>${it.ex ? `<p class="muted" style="margin-top:12px"><i>${esc(it.ex)}</i></p>` : ''}</div></div></div>
    <div class="btn-row" id="fb" style="visibility:hidden"><button class="btn ghost" id="no">Wist ik niet</button><button class="btn" id="yes">Wist ik!</button></div></div>`);
  $('#fc').onclick = () => { $('#fc').classList.add('flipped'); $('#fb').style.visibility = 'visible'; };
  $('#yes').onclick = () => answer(true, 'flash', null, true);
  $('#no').onclick = () => answer(false, 'flash', `${nounDE(it)} = ${it.nl}`, true, it.ex);
}
function qMC(it, H) {
  const toNL = Math.random() < .5;
  const prompt = toNL ? nounDE(it) : it.nl; const right = toNL ? it.nl : nounDE(it);
  const opts = shuffle([right, ...distractors(it, 3, toNL ? 'nl' : 'de')]);
  render(`${H}<div class="q"><div class="q-label">${toNL ? 'Wat betekent' : 'Hoe zeg je in het Duits'}</div><div class="q-prompt">${esc(prompt)}</div>
    <div class="q-sub">${it.kind === 'idiom' ? 'uitdrukking' : ''}</div><div class="opts" id="o">${opts.map(o => `<button class="opt">${esc(o)}</button>`).join('')}</div></div>`);
  bindOpts(right, ok => answer(ok, 'mc', `${nounDE(it)} = ${it.nl}`, false, it.ex));
}
function bindOpts(right, cb) {
  $('#o').onclick = e => { const b = e.target.closest('.opt'); if (!b || $('#o').dataset.done) return; $('#o').dataset.done = 1;
    const ok = b.textContent === right; if (sess?.mode !== 'test') { b.classList.add(ok ? 'good' : 'bad'); if (!ok) [...$('#o').children].find(x => x.textContent === right)?.classList.add('good'); }
    cb(ok); };
}
function qArt(it, H) {
  render(`${H}<div class="q"><div class="q-label">Welk lidwoord?</div><div class="q-prompt">… ${esc(it.de)}</div><div class="q-sub">${esc(it.nl)}</div>
    <div class="opts art" id="o">${['der', 'die', 'das'].map(o => `<button class="opt">${o}</button>`).join('')}</div></div>`);
  bindOpts(it.art, ok => answer(ok, 'art', `${it.art} ${it.de}`));
}
function umlautBar() { return `<div class="umlauts">${['ä', 'ö', 'ü', 'ß'].map(u => `<button type="button" data-u="${u}">${u}</button>`).join('')}</div>`; }
function bindUmlauts(f) { document.querySelectorAll('[data-u]').forEach(b => b.onclick = () => { const s = f.selectionStart ?? f.value.length; f.value = f.value.slice(0, s) + b.dataset.u + f.value.slice(f.selectionEnd ?? s); f.focus(); f.selectionStart = f.selectionEnd = s + 1; f.dispatchEvent(new Event('input')); }); }
function bindTyping(check) {
  const f = $('#in'); setTimeout(() => f.focus(), 50); bindUmlauts(f);
  const go = () => { if (!f.value.trim()) return; f.disabled = true; check(f.value); };
  $('#chk').onclick = go; f.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); go(); } };
}
function qType(it, H) {
  render(`${H}<div class="q"><div class="q-label">Typ in het Duits</div><div class="q-prompt">${esc(it.nl)}</div>
    <div class="q-sub">${it.art ? 'zelfstandig naamwoord · lidwoord mag erbij' : '&nbsp;'}</div>
    <input class="field" id="in" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="Antwoord…">${umlautBar()}
    <button class="btn" id="chk">Controleer</button></div>`);
  bindTyping(v => { const r = checkWord(v, it); answer(r.ok, 'type', `${nounDE(it)}${r.note ? ' — ' + r.note : ''}`, false, it.ex); });
}
function qGapMC(it, H) {
  render(`${H}<div class="q"><div class="q-label">Vul in</div><div class="q-sentence">${gapHTML(it.zin)}</div>
    <div class="opts" id="o">${shuffle(it.opties || [it.antwoord]).map(o => `<button class="opt">${esc(o)}</button>`).join('')}</div></div>`);
  bindOpts(it.antwoord, ok => answer(ok, 'mc', it.zin.replace('___', it.antwoord), false, it.waarom));
}
function qGapType(it, H) {
  render(`${H}<div class="q"><div class="q-label">Typ wat er op de streep hoort</div><div class="q-sentence">${gapHTML(it.zin)}</div>
    <input class="field" id="in" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="…">${umlautBar()}<button class="btn" id="chk">Controleer</button></div>`);
  bindTyping(v => { const r = checkText(v, [it.antwoord]); answer(r.ok, 'type', it.zin.replace('___', it.antwoord) + (r.note ? ' — ' + r.note : ''), false, it.waarom); });
}
function qMini(it, H) {
  render(`${H}<div class="q"><div class="q-label">Schrijf in het Duits</div><div class="q-sub" style="font-size:19px;color:var(--text);font-weight:700">${esc(it.nl)}</div>
    <textarea class="field" id="in" spellcheck="false" autocapitalize="sentences" placeholder="Jouw zin…"></textarea>${umlautBar()}
    <div id="mm"><button class="btn" id="cmp">Vergelijk met voorbeeld</button></div></div>`);
  const f = $('#in'); bindUmlauts(f); setTimeout(() => f.focus(), 50);
  $('#cmp').onclick = () => { f.disabled = true;
    $('#mm').innerHTML = `<div class="card" style="background:var(--card2)"><div class="small muted">Voorbeeld</div><p style="font-size:18px"><b>${esc(it.model)}</b></p>${it.tip ? `<p class="small">${esc(it.tip)}</p>` : ''}<p class="small muted">Klopt de kern, de woordvolgorde en de Sie-vorm? Andere woorden mogen.</p>
      <div class="btn-row"><button class="btn ghost" id="mn">Nog niet goed</button><button class="btn" id="my">(Bijna) goed</button></div></div>`;
    $('#my').onclick = () => answer(true, 'mini', it.model, true);
    $('#mn').onclick = () => answer(false, 'mini', it.model, true, it.tip); };
}
function gapHTML(z) { return esc(z).replace('___', '<span class="gap">?</span>'); }
function qBuild(it, H) {
  const words = it.delen || it.zin.split(' '); const toks = shuffle(words.map((w, i) => ({ w, i }))); const chosen = []; const blk = it.delen ? ' blocks' : '';
  render(`${H}<div class="q"><div class="q-label">Zet de woorden in de goede volgorde</div><div class="q-sub" style="font-size:18px;color:var(--text)">${esc(it.nl)}</div>
    <div class="tokens answer-line${blk}" id="ans"></div><div class="tokens${blk}" id="pool">${toks.map((t, k) => `<button class="tok" data-k="${k}">${esc(t.w)}</button>`).join('')}</div>
    <div style="height:18px"></div><button class="btn" id="chk" disabled>Controleer</button></div>`);
  const draw = () => {
    $('#ans').innerHTML = chosen.map((k, j) => `<button class="tok" data-j="${j}">${esc(toks[k].w)}</button>`).join('');
    document.querySelectorAll('#pool .tok').forEach(b => b.classList.toggle('used', chosen.includes(+b.dataset.k)));
    $('#chk').disabled = chosen.length !== toks.length;
  };
  $('#pool').onclick = e => { const b = e.target.closest('.tok'); if (!b || chosen.includes(+b.dataset.k)) return; chosen.push(+b.dataset.k); draw(); };
  $('#ans').onclick = e => { const b = e.target.closest('.tok'); if (!b) return; chosen.splice(+b.dataset.j, 1); draw(); };
  $('#chk').onclick = () => { const s = chosen.map(k => toks[k].w).join(it.delen ? ' | ' : ' '); const goal = it.delen ? it.delen.join(' | ') : it.zin; const ok = [goal, ...(it.alternatieven || [])].includes(s); $('#chk').disabled = true; answer(ok, 'build', it.delen ? it.delen.join(' → ') : it.zin); };
}

/* ---------- antwoord controleren ---------- */
const norm = s => s.toLowerCase().normalize('NFC').replace(/[.!?¿,;:„“"']/g, '').replace(/\s+/g, ' ').trim().replace(/ß/g, 'ss');
const deUml = s => s.replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ae/g, 'a').replace(/oe/g, 'o').replace(/ue/g, 'u');
function lev(a, b) { const m = [...Array(b.length + 1).keys()]; for (let i = 1; i <= a.length; i++) { let prev = m[0]; m[0] = i; for (let j = 1; j <= b.length; j++) { const t = m[j]; m[j] = Math.min(m[j] + 1, m[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = t; } } return m[b.length]; }
function checkText(input, answers) {
  const v = norm(input);
  for (const a of answers) { const n = norm(a);
    if (v === n) return { ok: true };
    if (deUml(v) === deUml(n)) return { ok: true, note: 'let op de umlaut/ß' };
    if (n.length >= 6 && lev(v, n) === 1) return { ok: true, note: 'kleine typfout' };
  }
  return { ok: false };
}
function checkWord(input, it) {
  let v = input.trim(); const m = v.match(/^(der|die|das)\s+(.+)$/i);
  if (m && it.art) { if (m[1].toLowerCase() !== it.art) return { ok: false, note: `lidwoord is ${it.art}` }; v = m[2]; }
  const alts = [it.de]; if (/^sich /.test(it.de)) alts.push(it.de.slice(5));
  return checkText(v, alts);
}

function answer(ok, kind, solution, selfRated, extra) {
  const cur = sess.queue[sess.i]; const isRetry = sess.retried.has(cur.id + '#' + sess.i);
    if (sess.mode === 'test') { sess.results.push(ok); if (ok) sess.ok++; else sess.bad++; grade(cur.id, ok, false); S.answered++; save(); sess.i++; return setTimeout(showQuestion, 150); }
  grade(cur.id, ok, !isRetry);
  S.answered++;
  const d = S.days[today()] || (S.days[today()] = { n: 0, xp: 0 }); if (sess.mode === 'mission') d.n++;
  let gained = 0;
  if (ok) { sess.ok++; gained = Math.round((XP[kind] || 10) * (isRetry ? .5 : 1)); sess.xp += gained; addXP(gained); xpPop(gained); }
  else { sess.bad++; if (!isRetry && sess.mode !== 'test') { const pos = sess.queue.length; sess.queue.push({ id: cur.id, ex: cur.ex === 'flash' ? 'mc' : cur.ex }); sess.retried.add(cur.id + '#' + pos); } }
  save();
  if (ok) { const note = solution && solution.includes(' — '); if (note) toast('✓ ' + solution); sess.i++; return setTimeout(showQuestion, selfRated ? 250 : note ? 1400 : 650); }
  const fb = document.createElement('div'); fb.className = `feedback ${ok ? 'good' : 'bad'}`;
  fb.innerHTML = `<div class="inner"><h3>${ok ? pick(['Richtig! 🎉', 'Super!', 'Genau!', 'Klasse!', 'Stark! 💪']) : 'Nicht ganz…'}</h3>
    ${solution ? `<p><b>${esc(solution)}</b></p>` : ''}${extra && (!ok || kind !== 'flash') ? `<p class="small">${esc(extra)}</p>` : ''}
    ${!ok ? '<p class="small muted">Deze komt aan het eind van de ronde nog een keer terug.</p>' : ''}
    <button class="btn" id="next">Verder</button></div>`;
  document.body.appendChild(fb); const nb = $('#next'); nb.focus();
  nb.onclick = () => { fb.remove(); sess.i++; showQuestion(); };
}

function endSession() {
  const s = sess; document.querySelector('.feedback')?.remove();
  if (s.mode === 'test') return endTest();
  const total = s.ok + s.bad; const goal = C.cfg.dagdoel || 20; const td = S.days[today()] || { n: 0, xp: 0 };
  let streakMsg = '';
  if (s.mode === 'mission' && td.n >= goal && !td.mission) {
    td.mission = true; S.days[today()] = td; updateStreak(); streakMsg = `🔥 Streak: ${S.streak.count} ${S.streak.count === 1 ? 'dag' : 'dagen'}!`;
    if (s.bad === 0 && total >= goal) S.badges.perfect = S.badges.perfect || today();
  }
  checkBadges(); const fresh = checkMilestones(); save();
  sess = null;
  if (!total) return go(...s.back);
  if (fresh.length || streakMsg) confetti();
  render(`<div style="text-align:center;padding-top:6vh">${avatarHTML(true).replace('class="avatar big"', 'class="avatar big" style="margin:0 auto 16px"')}
    <h1>${s.bad === 0 ? 'Perfekt!' : s.ok >= s.bad * 2 ? 'Gut gemacht!' : 'Weiter so!'}</h1>
    <p class="muted">${s.ok} van ${total} goed · +${s.xp} XP</p>${streakMsg ? `<p style="font-size:20px;font-weight:800">${streakMsg}</p>` : ''}
    ${s.mode === 'mission' && !td.mission ? `<p class="muted">Nog ${goal - td.n} vragen voor je dagmissie.</p>` : ''}</div>
    ${fresh.map(m => `<div class="card claim"><div style="font-size:40px">🏆</div><h2 style="margin:6px 0">Mijlpaal gehaald: ${esc(m.titel)}</h2><p>Beloning: <b>${esc(m.beloning)}</b></p><button class="btn" data-go="claim" data-arg="${esc(m.id)}">Bekijk claim</button></div>`).join('')}
    <div style="height:16px"></div><div class="btn-row"><button class="btn ghost" data-go="home">Home</button><button class="btn" id="again">Nog een ronde</button></div>`, false);
  $('#again').onclick = () => s.mode === 'mission' ? go('missie') : go(...s.back);
}

/* ---------- eindtoets ---------- */
routes.toets = () => {
  const t = activeTent();
  render(`<div class="topbar"><button class="x" data-go="oefenen">←</button><h1 class="grow" style="font-size:21px">Eindtoets</h1></div>
    <div class="card"><h3>${esc(t.naam)}</h3><p class="muted">30 vragen over alle stof van dit tentamen, op toetsniveau (veel zelf typen). Je ziet pas aan het eind hoe je het deed.</p>
    <p class="small muted">Voor de beloning 'Tentamenklaar' telt je beste score. Spreek met je ouder af dat je deze toets samen doet.</p></div>
    <button class="btn" id="st">Start toets</button>`, false);
  $('#st').onclick = () => startSession(shuffle(idsFor(t.id).filter(x => C.items[x].kind !== 'mini')).slice(0, 30), { mode: 'test', back: ['oefenen'], tid: t.id });
};
function endTest() {
  const s = sess; sess = null; const total = s.ok + s.bad; const score = total ? Math.round(100 * s.ok / total) : 0;
  S.tests.push({ tid: s.tid, date: today(), score }); addXP(score); checkBadges(); const fresh = checkMilestones(); save();
  if (score >= 80) confetti();
  render(`<div style="text-align:center;padding-top:8vh"><div style="font-size:64px">${score >= 80 ? '🏅' : score >= 55 ? '👍' : '💪'}</div><h1>${score}% goed</h1>
    <p class="muted">${s.ok} van ${total} · ${today()}</p><p>${score >= 80 ? 'Toetsklaar op dit onderdeel!' : 'Oefen de dagmissies en probeer het later opnieuw.'}</p></div>
    ${fresh.map(m => `<div class="card claim"><h2>Mijlpaal: ${esc(m.titel)}</h2><button class="btn" data-go="claim" data-arg="${esc(m.id)}">Bekijk claim</button></div>`).join('')}
    <button class="btn" data-go="home">Klaar</button>`, false);
}

/* ---------- lezen ---------- */
/* ---------- schrijven ---------- */
const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
const deDate = s => { const d = parseDay(s); return `${d.getDate()}. ${MONTHS[d.getMonth()]} ${d.getFullYear()}`; };
const dotDate = s => { const d = parseDay(s); return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`; };
function hash4(str) { let h = 5381; for (const c of str) h = ((h << 5) + h + c.charCodeAt(0)) >>> 0; return h.toString(36).toUpperCase().padStart(4, '0').slice(-4); }
function letterCode(idx, xp, day) {
  const dn = diffDays('2026-01-01', day); const body = `B${idx.toString(36)}${Math.round(xp / 5).toString(36).padStart(2, '0')}${dn.toString(36).padStart(3, '0')}`.toUpperCase();
  return `${body}-${hash4(body + '|deutsch-drill')}`;
}
function bodyText(text) { const m = text.match(/(Sehr geehrte|Liebe|Hallo)/); return m ? text.slice(m.index) : text; }
function countWords(text) { return (bodyText(text).match(/[A-Za-zÄÖÜäöüß]+/g) || []).length; }
function letterChecks(text, o, ticks) {
  const soort = o.soort || 'brief'; const words = countWords(text); const [lo, hi] = String(o.woorden || '').split(/[–-]/).map(Number);
  const head = (text.match(/(Sehr geehrte|Liebe|Hallo)/) ? text.slice(0, text.search(/(Sehr geehrte|Liebe|Hallo)/)) : text);
  const list = [];
  if (soort === 'email') {
    list.push({ ok: /^\s*An:\s*\S+@\S+/m.test(head), t: 'E-mailkop: An: met e-mailadres' });
    list.push({ ok: /^\s*Betreff:\s*\S+/m.test(head), t: 'E-mailkop: Betreff: met onderwerp' });
  } else {
    list.push({ ok: /NL\s*[–-]\s*\d{4}\s?[A-Z]{2}/.test(head), t: 'Je adres links boven, postcode als NL – 2565 PH Den Haag' });
    list.push({ ok: /\b\d{1,2}\.\s?(\d{1,2}\.\s?\d{2,4}|(Januar|Februar|März|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember)\s+\d{4})/.test(head) && !/[A-Za-zäöüß]+,\s*(den\s+)?\d{1,2}\./.test(head), t: 'Datum rechts boven zonder plaatsnaam (19.11.2026)' });
    list.push({ ok: /(Herrn|Frau|z\.\s?Hd?\.)[\s\S]*\b(D|A|CH)\s*[–-]\s*\d{4,5}/.test(head), t: 'Adres ontvanger: Herrn/Frau … en postcode als D – 50672 Köln' });
    list.push({ ok: !/Betreff\s*:/.test(head), t: "Onderwerpregel zonder het woord 'Betreff:'" });
  }
  list.push({ ok: /Sehr geehrte(r\s+Herr\s|\s+Frau\s|\s+Damen und Herren)/.test(text) && !/Sehr geehrte\s+Herr\b|Sehr geehrter?\s+Herrn\b/.test(text), t: 'Aanhef: Sehr geehrter Herr … / Sehr geehrte Frau … / Sehr geehrte Damen und Herren' });
  list.push({ ok: /Sehr geehrte[^\n,]*,\s*[a-zäöü]/.test(text), t: 'Komma na de aanhef, daarna verder met een kleine letter' });
  list.push({ ok: /(freuen|Vielen Dank|Im Voraus|im Voraus)/.test(bodyText(text)), t: 'Slotzin, bijv. Ich würde mich sehr über eine baldige Antwort freuen.' });
  list.push({ ok: /(Mit freundlichen Grüßen|Mit freundlichem Gruß|Freundliche Grüße)(?!\s*,)/.test(text), t: 'Afsluiting: Mit freundlichen Grüßen / Freundliche Grüße (zonder komma)' });
  list.push({ ok: !/\b(du|dich|dir|dein|deine|deinen|deinem|deiner)\b/i.test(text), t: 'Overal de Sie-vorm, nergens du/dir/dein' });
  list.push({ ok: !/\bihnen\b/.test(bodyText(text).replace(/^\s*ihnen/gm, '')), t: 'Ihnen / Ihr met hoofdletter als je "u" bedoelt' });
  list.push({ ok: bodyText(text).split(/\n\s*\n/).filter(x => x.trim()).length >= 5, t: 'Witregel na elke alinea' });
  if (soort === 'sollicitatie') {
    list.push({ ok: /Bewerbung als/.test(text), t: "Onderwerp: 'Bewerbung als …'" });
    list.push({ ok: /Lebenslauf/.test(text) && /(Anlage|Anhang)/.test(text), t: 'Verwijzing naar je Lebenslauf in de Anlage' });
  }
  list.push({ ok: !lo || (words >= lo && words <= (hi || 999)), t: `Lengte: ${words} woorden vanaf de aanhef (opdracht: ${o.woorden})` });
  list.push({ ok: ticks.length === o.punten.length, t: `Alle ${o.punten.length} punten uit de opdracht verwerkt (afgevinkt)` });
  return { words, list };
}
function aiPrompt(o, text) {
  const soort = { brief: 'zakelijke brief', email: 'zakelijke e-mail', sollicitatie: 'sollicitatiebrief' }[o.soort || 'brief'];
  return `Je bent docent Duits in 5 havo. Beoordeel de ${soort} hieronder, geschreven door een leerling. Het eindniveau schrijfvaardigheid voor havo is ERK A2+; beoordeel op dat niveau.

OPDRACHT
${o.situatie}
Punten die erin moeten staan:
${o.punten.map((p, i) => `${i + 1}. ${p}`).join('\n')}
Lengte: ${o.woorden} woorden (geteld vanaf de aanhef).

BEOORDEEL OP
1. Inhoud: zijn alle punten duidelijk en volledig verwerkt?
2. Indeling volgens de Duitse briefconventies: ${o.soort === 'email' ? 'An: en Betreff: in de kop' : 'adres afzender links met NL – postcode, datum rechts zonder plaatsnaam (19.11.2026), adres ontvanger (Herrn/Frau, D – postcode), onderwerp zonder "Betreff:"'}, aanhef met komma (Sehr geehrter Herr … / Sehr geehrte Frau … / Sehr geehrte Damen und Herren), daarna kleine letter, witregel na elke alinea, slotzin, afsluiting zonder komma, naam.${o.soort === 'sollicitatie' ? ' Bij een sollicitatie ook: onderwerp "Bewerbung als …", bron van de advertentie, verwijzing naar Lebenslauf in der Anlage.' : ''}
3. Formules en register: passende vaste uitdrukkingen, overal Sie / Ihnen / Ihr, nergens du.
4. Taalverzorging: werkwoordsvormen, uitgangen van bijvoeglijke naamwoorden, naamvallen, woordvolgorde (persoonsvorm op plek 2, achteraan in bijzinnen), hoofdletters en umlauts, samenhang met signaalwoorden.

GEEF
- Per onderdeel een kort oordeel (goed / voldoende / onvoldoende).
- Maximaal 5 concrete fouten: citeer het stukje, geef de verbetering en leg in één zin uit waarom.
- Twee tips voor de volgende brief.
- Een indicatie van het cijfer (1-10).
Herschrijf de brief NIET in zijn geheel. Antwoord in het Nederlands, kort en bemoedigend.

TEKST VAN DE LEERLING
-----
${text.trim()}
-----`;
}
routes.brief = arg => {
  const [f, oid] = String(arg).split('|'); const w = C.writing[f]; const o = w?.opdrachten.find(x => x.id === oid); if (!o) return go('oefenen');
  const dr = S.drafts[oid] || (S.drafts[oid] = { text: '', ticks: [] });
  render(`<div class="topbar"><button class="x" data-go="oefenen">←</button><h1 class="grow" style="font-size:21px">${esc(o.titel)}</h1><span class="chip" id="tm"></span><span class="chip" id="wc">0 woorden</span></div>
    <div class="write-grid"><div>
      <div class="card"><div class="q-label">Situatie</div><p>${esc(o.situatie)}</p>
        <div class="q-label" style="margin-top:14px">Verwerk deze punten · vink af als je ze hebt</div>
        <div id="pts">${o.punten.map((p, i) => `<label class="check"><input type="checkbox" data-i="${i}" ${dr.ticks.includes(i) ? 'checked' : ''}><span>${esc(p)}</span></label>`).join('')}</div>
        <p class="small muted" style="margin-top:8px">Lengte: ${esc(o.woorden || '')} woorden, geteld vanaf de aanhef. Op school heb je meestal ongeveer anderhalf uur.</p></div>
      <details class="card"><summary><b>Spiekbriefje: opbouw van de brief</b></summary><p class="explain small" style="margin-top:10px">${esc(w.uitleg)}</p></details>
    </div><div>
      <textarea class="field letter" id="tx" spellcheck="false" placeholder="${o.soort === 'email' ? 'An: …&#10;Betreff: …&#10;&#10;Sehr geehrte Damen und Herren,&#10;&#10;ich …' : 'Je naam&#10;Straat en huisnummer&#10;NL – 1234 AB Plaats&#10;&#10;' + esc(dotDate(today())) + '&#10;&#10;Naam en adres ontvanger&#10;&#10;Onderwerp&#10;&#10;Sehr geehrte Damen und Herren,&#10;&#10;ich …'}">${esc(dr.text)}</textarea>${umlautBar()}
      <button class="btn" id="done">Klaar – nakijken</button><p class="small muted" style="margin-top:8px">Je tekst wordt automatisch bewaard. Op een laptop schrijft het makkelijker.</p>
    </div></div>`, false, true);
  const tx = $('#tx'); bindUmlauts(tx);
  const upd = () => { dr.text = tx.value; $('#wc').textContent = countWords(tx.value) + ' woorden'; save(); };
  if (!dr.start) dr.start = Date.now(); const tick = () => { const m = Math.floor((Date.now() - dr.start) / 60000); const t = $('#tm'); if (t) t.textContent = '⏱ ' + m + ' min'; }; tick(); timers.push(setInterval(tick, 15000));
  tx.oninput = upd; upd();
  $('#pts').onchange = e => { const i = +e.target.dataset.i; dr.ticks = e.target.checked ? [...new Set([...dr.ticks, i])] : dr.ticks.filter(x => x !== i); save(); };
  $('#done').onclick = () => {
    const chk = letterChecks(tx.value, o, dr.ticks);
    if (chk.words < 40) return toast('Schrijf eerst je brief (minstens 40 woorden)');
    const nOk = chk.list.filter(c => c.ok).length; const xp = 40 + nOk * 5; const idx = C.letterList.findIndex(x => x.o.id === oid);
    const code = letterCode(Math.max(0, idx), xp, today());
    (S.letters[oid] = S.letters[oid] || []).push({ date: today(), words: chk.words, code, checks: nOk });
    addXP(xp); const mins = dr.start ? Math.round((Date.now() - dr.start) / 60000) : 0; delete S.drafts[oid]; checkBadges(); const fresh = checkMilestones(); save(); if (fresh.length) confetti();
    const prompt = aiPrompt(o, tx.value); const text = tx.value; const ticks = dr.ticks;
    render(`<div class="topbar"><button class="x" data-go="oefenen">←</button><h1 class="grow" style="font-size:21px">Nakijken: ${esc(o.titel)}</h1></div>
      <div class="write-grid"><div>
        <div class="card"><div class="row between"><h3>Stap 1: automatische check</h3><span class="pill accent">+${xp} XP</span></div>
          ${chk.list.map(c => `<div class="row" style="align-items:flex-start;padding:6px 0"><span>${c.ok ? '✅' : '⚠️'}</span><span class="small">${esc(c.t)}</span></div>`).join('')}
          <p class="small muted">Schrijftijd: ${mins} min. De app controleert alleen de vorm. Voor inhoud en grammatica: stap 2.</p></div>
        <div class="card"><h3>Stap 2: feedback van AI</h3><p class="small">Kopieer je brief met de beoordelingsinstructie en plak hem in Claude of ChatGPT.</p>
          <button class="btn" id="cp">Kopieer voor AI-feedback</button>
          <details style="margin-top:10px"><summary class="small muted">Lukt kopiëren niet? Toon de tekst</summary><textarea class="field" id="pr" readonly style="min-height:160px;font-size:13px;margin-top:8px">${esc(prompt)}</textarea></details></div>
        <div class="card"><h3>Code voor je telefoon</h3><p class="small muted">Geschreven op een laptop? Voer deze code op je telefoon in (Oefenen → Code van laptop invoeren) voor je XP en je mijlpaal.</p><div class="code-box">${code}</div></div>
      </div><div>
        <details class="card" open><summary><b>Jouw brief</b></summary><p class="explain small" style="margin-top:10px">${esc(text)}</p></details>
        <details class="card"><summary><b>Bekijk een modelbrief</b></summary><p class="explain small" style="margin-top:10px">${esc(o.model || '')}</p></details>
        <div class="btn-row"><button class="btn ghost" id="again">Verbeteren en opnieuw</button><button class="btn" data-go="home">Klaar</button></div>
      </div></div>`, false, true);
    $('#cp').onclick = () => { const fb = () => { const d = $('#pr'); d.closest('details').open = true; d.select(); toast('Selecteer en kopieer de tekst hieronder'); };
      try { navigator.clipboard.writeText(prompt).then(() => toast('Gekopieerd! Plak het in Claude of ChatGPT'), fb); } catch (e) { fb(); } };
    $('#again').onclick = () => { S.drafts[oid] = { text, ticks }; save(); go('brief', arg); };
  };
};
routes.code = () => {
  render(`<div class="topbar"><button class="x" data-go="oefenen">←</button><h1 class="grow" style="font-size:21px">Code invoeren</h1></div>
    <p class="muted">Heb je een brief op je laptop geschreven? Voer hier de code in die je daar kreeg.</p>
    <input class="field" id="cd" placeholder="B0000000-XXXX" autocapitalize="characters" autocomplete="off" style="text-transform:uppercase;letter-spacing:.1em">
    <div style="height:14px"></div><button class="btn" id="ok">XP ophalen</button>`, false);
  $('#ok').onclick = () => {
    const c = $('#cd').value.trim().toUpperCase().replace(/\s/g, ''); const m = c.match(/^(B[0-9A-Z]{6})-([0-9A-Z]{4})$/);
    if (!m || hash4(m[1] + '|deutsch-drill') !== m[2]) return toast('Deze code klopt niet. Controleer de tekens.');
    if (S.redeemed[c] || Object.values(S.letters).flat().some(x => x.code === c)) return toast('Deze code is al gebruikt');
    const idx = parseInt(m[1][1], 36), xp = parseInt(m[1].slice(2, 4), 36) * 5; const o = C.letterList[idx]?.o;
    S.redeemed[c] = today(); const key = o ? o.id : 'brief' + idx; (S.letters[key] = S.letters[key] || []).push({ date: today(), words: 0, code: c, via: 'code' });
    addXP(xp); checkBadges(); const fresh = checkMilestones(); save(); confetti();
    render(`<div style="text-align:center;padding-top:10vh"><div style="font-size:60px">✉️</div><h1>+${xp} XP</h1><p class="muted">Brief ${o ? '"' + esc(o.titel) + '" ' : ''}bijgeschreven.</p></div>
      ${fresh.map(f => `<div class="card claim"><h2>Mijlpaal: ${esc(f.titel)}</h2><button class="btn" data-go="claim" data-arg="${esc(f.id)}">Bekijk claim</button></div>`).join('')}<button class="btn" data-go="home">Klaar</button>`, false);
  };
};

routes.tips = () => {
  render(`<div class="topbar"><button class="x" data-go="oefenen">←</button><h1 class="grow" style="font-size:21px">Examentips</h1></div>
    <p class="muted">Leestips: wat docenten zagen misgaan bij de centrale examens havo Duits van 2024 en 2025. Schrijftips: uit de Examenbundel.</p>
    ${C.tips.map(t => `<div class="card tip"><h3>${esc(t.titel)}</h3><p class="small">${esc(t.tekst)}</p></div>`).join('')}`, false);
};
routes.lezen = id => {
  const r = C.reading[id]; if (!r) return go('oefenen');
  let qi = 0, score = 0;
  const tip = C.tips.length ? pick(C.tips) : null;
  render(`<div class="topbar"><button class="x" data-go="oefenen">←</button><h1 class="grow" style="font-size:21px">${esc(r.titel)}</h1></div>
    ${tip ? `<div class="card tip"><div class="small muted">Tip</div><b>${esc(tip.titel)}</b><p class="small">${esc(tip.tekst)}</p></div>` : ''}
    <div class="reading">${r.tekst.map((p, i) => `<p class="alinea"><span class="nr">${i + 1}</span>${esc(p)}</p>`).join('')}</div>
    ${r.bron ? `<p class="small muted">${esc(r.bron)}</p>` : ''}<div id="qs"></div>`, false);
  const box = $('#qs');
  const next = () => {
    if (qi >= r.vragen.length) {
      const prev = S.reading[id]; S.reading[id] = { best: Math.max(score, prev?.best || 0), date: today() }; checkBadges(); save();
      box.insertAdjacentHTML('beforeend', `<div class="card claim"><h2>${score}/${r.vragen.length} goed</h2><button class="btn" data-go="oefenen">Klaar</button></div>`);
      return;
    }
    const q = r.vragen[qi]; const n = qi + 1; const el = document.createElement('div'); el.className = 'card'; el.id = 'q' + qi;
    if (q.type === 'mc') {
      el.innerHTML = `<div class="q-label">Vraag ${n}</div><p><b>${esc(q.vraag)}</b></p><div class="opts">${q.opties.map((o, k) => `<button class="opt" data-k="${k}">${'ABCD'[k]}. ${esc(o)}</button>`).join('')}</div><div class="fbk"></div>`;
      box.appendChild(el);
      el.querySelector('.opts').onclick = e => { const b = e.target.closest('.opt'); if (!b || el.dataset.done) return; el.dataset.done = 1;
        const ok = +b.dataset.k === q.antwoord; b.classList.add(ok ? 'good' : 'bad'); el.querySelectorAll('.opt')[q.antwoord].classList.add('good');
        done(el, ok, q.uitleg); };
    } else {
      el.innerHTML = `<div class="q-label">Vraag ${n} · open vraag</div><p><b>${esc(q.vraag)}</b></p><textarea class="field" placeholder="Jouw antwoord…"></textarea><div style="height:10px"></div><button class="btn ghost show">Toon modelantwoord</button><div class="fbk"></div>`;
      box.appendChild(el);
      el.querySelector('.show').onclick = ev => { ev.target.remove(); el.querySelector('textarea').disabled = true;
        const f = el.querySelector('.fbk'); f.innerHTML = `<div class="card" style="margin-top:12px;background:var(--card2)"><div class="small muted">Modelantwoord</div><p><b>${esc(q.model)}</b></p><p class="small">${esc(q.uitleg || '')}</p><p class="small muted">Vergelijk eerlijk: had jij de kern?</p><div class="btn-row"><button class="btn ghost" data-r="0">Fout</button><button class="btn" data-r="1">Goed</button></div></div>`;
        f.querySelector('.btn-row').onclick = e2 => { const b = e2.target.closest('[data-r]'); if (!b) return; f.querySelector('.btn-row').remove(); done(el, b.dataset.r === '1', null); }; };
    }
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const done = (el, ok, uitleg) => {
    if (ok) { score++; addXP(XP.read); xpPop(XP.read); } S.answered++; save();
    const f = el.querySelector('.fbk'); f.insertAdjacentHTML('beforeend', `${uitleg ? `<p class="small" style="margin-top:12px">${ok ? '✅' : '❌'} ${esc(uitleg)}</p>` : ''}<button class="btn" style="margin-top:10px">Volgende</button>`);
    const b = f.querySelector('.btn:last-child'); b.onclick = () => { b.remove(); qi++; next(); };
  };
  const st = document.createElement('button'); st.className = 'btn'; st.textContent = 'Ik heb de tekst gelezen → vragen'; box.appendChild(st);
  st.onclick = () => { st.remove(); next(); };
};

/* ---------- spellen ---------- */
routes.sprint = () => {
  const nouns = shuffle(idsFor(activeTent().id).map(id => C.items[id]).filter(it => it.kind === 'word' && it.art));
  if (nouns.length < 3) { toast('Te weinig zelfstandige naamwoorden in deze stof'); return go('oefenen'); }
  render(`<div class="topbar"><button class="x" data-go="oefenen">←</button><h1 class="grow" style="font-size:21px">Der/die/das-sprint</h1></div>
    <div class="card" style="text-align:center"><p>Zoveel mogelijk goede lidwoorden in 60 seconden. Fout = 2 seconden straftijd.</p><p class="muted">Record: ${S.records.sprint}</p></div><button class="btn" id="st">Start</button>`, false);
  $('#st').onclick = () => {
    let left = 60, score = 0, k = 0; const end = () => { stopTimers(); const rec = score > S.records.sprint; if (rec) S.records.sprint = score; addXP(score * 2); checkBadges(); save(); if (rec) confetti();
      render(`<div style="text-align:center;padding-top:10vh"><div style="font-size:60px">⚡</div><h1>${score} goed</h1><p class="muted">${rec ? 'Nieuw record!' : 'Record: ' + S.records.sprint} · +${score * 2} XP</p></div><div class="btn-row"><button class="btn ghost" data-go="oefenen">Terug</button><button class="btn" data-go="sprint">Nog eens</button></div>`, false); };
    const show = () => { const it = nouns[k % nouns.length];
      $('#app').innerHTML = `<div class="timer" id="tm">${left}</div><p class="muted" style="text-align:center">score ${score}</p><div class="q-prompt" style="text-align:center;margin:28px 0 6px">${esc(it.de)}</div><p class="muted" style="text-align:center">${esc(it.nl)}</p><div style="height:20px"></div><div class="opts art" id="o">${['der', 'die', 'das'].map(o => `<button class="opt">${o}</button>`).join('')}</div>`;
      $('#o').onclick = e => { const b = e.target.closest('.opt'); if (!b) return; if (b.textContent === it.art) { score++; k++; show(); } else { b.classList.add('bad'); left = Math.max(0, left - 2); $('#tm').textContent = left; } }; };
    show(); timers.push(setInterval(() => { left--; const t = $('#tm'); if (t) t.textContent = left; if (left <= 0) end(); }, 1000));
  };
};
routes.koppel = () => {
  const pool = shuffle(idsFor(activeTent().id).map(id => C.items[id]).filter(it => it.kind === 'word' || it.kind === 'idiom')).slice(0, 6);
  if (pool.length < 3) { toast('Te weinig woorden'); return go('oefenen'); }
  const L = shuffle(pool.map(p => ({ id: p.id, t: p.de }))), Rr = shuffle(pool.map(p => ({ id: p.id, t: p.nl })));
  let sel = null, found = 0, sec = 0, miss = 0;
  render(`<div class="topbar"><button class="x" data-go="oefenen">←</button><h1 class="grow" style="font-size:21px">Koppelspel</h1><span class="chip" id="tm">0s</span></div>
    <p class="muted">Tik een Duits woord en daarna de vertaling.</p><div class="match" id="m">${L.map((x, i) => `<button class="opt" data-s="L" data-id="${esc(x.id)}" style="grid-column:1;grid-row:${i + 1}">${esc(x.t)}</button>`).join('')}${Rr.map((x, i) => `<button class="opt" data-s="R" data-id="${esc(x.id)}" style="grid-column:2;grid-row:${i + 1}">${esc(x.t)}</button>`).join('')}</div>`, false);
  timers.push(setInterval(() => { sec++; const t = $('#tm'); if (t) t.textContent = sec + 's'; }, 1000));
  $('#m').onclick = e => { const b = e.target.closest('.opt'); if (!b || b.classList.contains('gone')) return;
    if (!sel || sel.dataset.s === b.dataset.s) { sel?.classList.remove('sel'); sel = b; b.classList.add('sel'); return; }
    if (sel.dataset.id === b.dataset.id) { [sel, b].forEach(x => { x.classList.add('good'); setTimeout(() => x.classList.add('gone'), 250); }); found++; sel = null;
      if (found === pool.length) { stopTimers(); const rec = !S.records.match || sec < S.records.match; if (rec && !miss) S.records.match = sec; addXP(20); save();
        setTimeout(() => render(`<div style="text-align:center;padding-top:10vh"><div style="font-size:60px">🔗</div><h1>${sec} seconden</h1><p class="muted">${miss} fout · +20 XP${rec && !miss ? ' · nieuw record!' : ''}</p></div><div class="btn-row"><button class="btn ghost" data-go="oefenen">Terug</button><button class="btn" data-go="koppel">Nog eens</button></div>`, false), 400); } }
    else { miss++; b.classList.add('bad'); const s = sel; setTimeout(() => { b.classList.remove('bad'); s.classList.remove('sel'); }, 400); sel = null; } };
};

/* ---------- doelen & claim ---------- */
routes.doelen = () => {
  const ms = C.cfg.mijlpalen || [];
  render(`<h1>Doelen</h1><p class="muted">Haal een mijlpaal en claim je beloning.</p>
    ${ms.map(m => { const s = milestoneStatus(m); const c = S.claims[m.id]; const pct = c ? 100 : Math.min(100, Math.round(100 * s.cur / s.max));
      return `<div class="card ${c ? 'tap' : ''}" ${c ? `data-go="claim" data-arg="${esc(m.id)}"` : ''}><div class="goal ${c ? 'done' : ''}"><div class="medal">${c ? '🏆' : '🎁'}</div><div class="grow">
        <div class="row between"><h3>${esc(m.titel)}</h3>${c ? `<span class="pill ${c.given ? 'good' : 'accent'}">${c.given ? 'uitgereikt' : 'claim!'}</span>` : ''}</div>
        <div class="small"><b>${esc(m.beloning)}</b></div><div class="small muted">${esc(s.label)}</div><div class="bar" style="margin-top:8px"><i style="width:${pct}%"></i></div></div></div></div>`; }).join('')}
    <h2>Badges</h2><div class="badges">${BADGES.map(b => `<div class="badge ${S.badges[b.id] ? 'on' : ''}"><span class="e">${b.e}</span>${b.t}</div>`).join('')}</div>
    <h2>Statistiek</h2><div class="card small"><div class="row between"><span>Totaal beantwoord</span><b>${S.answered}</b></div><div class="row between"><span>Langste streak</span><b>${S.streak.best} dagen</b></div><div class="row between"><span>Alle stof beheerst</span><b>${mastery(idsFor('ALLE'))}%</b></div></div>
  `, 'doelen');
};
routes.claim = id => {
  const m = (C.cfg.mijlpalen || []).find(x => x.id === id); const c = S.claims[id]; if (!m || !c) return go('doelen');
  render(`<div class="topbar"><button class="x" data-go="doelen">←</button></div>
    <div class="card claim">${avatarHTML(true).replace('class="avatar big"', 'class="avatar big" style="margin:0 auto 12px"')}
      <div class="small muted">MIJLPAAL BEHAALD</div><h1>${esc(m.titel)}</h1><p style="font-size:18px">${esc(m.beloning)}</p>
      <div class="code">${esc(c.code)}</div><p class="small muted">${esc(S.name)} · behaald op ${esc(c.date)}<br>Laat dit scherm aan je ouder zien.</p></div>
    ${c.given ? '<p class="muted" style="text-align:center">✅ Beloning is uitgereikt</p>' : '<button class="btn ghost" id="given">Ouder: markeer als uitgereikt</button>'}`, false);
  const g = $('#given'); if (g) g.onclick = () => ask('Is de beloning uitgereikt?', 'Ja, uitgereikt', () => { c.given = today(); save(); go('claim', id); });
};

/* ---------- profiel / instellingen ---------- */
routes.profiel = () => {
  render(`<h1>Profiel</h1>
    <div class="hero">${avatarHTML()}<div><h3>${esc(S.name)}</h3><div class="small muted">${TITLES[level()]} · ${S.xp} XP</div></div></div>
    <h2>Avatar</h2><div class="avatars" id="av">${AVATARS.map(a => `<button class="${a === S.avatar ? 'on' : ''}" data-a="${a}">${a}</button>`).join('')}</div>
    <h2>Leerstof</h2><div class="seg" id="tt">${C.tent.map(t => `<button class="${t.id === activeTent().id ? 'on' : ''}" data-t="${esc(t.id)}">${esc(t.naam)}</button>`).join('')}</div>
    <p class="small muted" style="margin-top:8px">${activeTent().datum ? 'Datum: ' + esc(activeTent().datum) + ' · ' : ''}${idsFor(activeTent().id).length} items</p>
    <h2>Weergave</h2><div class="seg" id="th"><button data-v="dark" class="${S.theme === 'dark' ? 'on' : ''}">🌙 Donker</button><button data-v="light" class="${S.theme === 'light' ? 'on' : ''}">☀️ Licht</button></div>
    <h2>Naam</h2><input class="field" id="nm" value="${esc(S.name)}">
    <h2>Voor ouders: testen</h2>
    <div class="card small"><p class="muted">Simuleer een volgende dag om streaks, herhalingen en beloningen te testen. Gesimuleerde dag: <b>${today()}</b></p>
      <div class="btn-row"><button class="btn ghost small" id="d1">+1 dag</button><button class="btn ghost small" id="d0">Terug naar vandaag</button><button class="btn ghost small" id="rs" style="color:var(--bad)">Alles wissen</button></div></div>
    <p class="small muted" style="text-align:center">Voortgang wordt alleen op dit apparaat bewaard.</p>`, 'profiel');
  $('#av').onclick = e => { const b = e.target.closest('button'); if (!b) return; S.avatar = b.dataset.a; save(); go('profiel'); };
  $('#tt').onclick = e => { const b = e.target.closest('button'); if (!b) return; S.tentamen = b.dataset.t; save(); go('profiel'); };
  $('#th').onclick = e => { const b = e.target.closest('button'); if (!b) return; S.theme = b.dataset.v; setTheme(); save(); go('profiel'); };
  $('#nm').onchange = e => { S.name = e.target.value.trim() || S.name; save(); };
  $('#d1').onclick = () => { S.dayOffset = (S.dayOffset || 0) + 1; save(); toast('Dag: ' + today()); go('profiel'); };
  $('#d0').onclick = () => { S.dayOffset = 0; save(); go('profiel'); };
  $('#rs').onclick = () => ask('Alle voortgang wissen? Dit kan niet ongedaan worden.', 'Wissen', () => { S = defaultState(); save(); setTheme(); go('welkom'); });
};

/* ---------- start ---------- */
(async function init() {
  S = load(); setTheme();
  try { await loadContent(); }
  catch (e) { $('#app').innerHTML = `<div class="card warn"><h3>Leerstof kon niet geladen worden</h3><p class="small">${esc(e.message)}</p><p class="small muted">Open de app via de website (GitHub Pages), niet als los bestand.</p></div>`; return; }
  if (!C.tent.length) { $('#app').innerHTML = '<div class="card warn">Geen tentamens gevonden in content/tentamens.json</div>'; return; }
  if (!C.tent.find(t => t.id === S.tentamen)) { const up = C.tent.filter(t => t.datum && t.datum >= today()).sort((a, b) => a.datum < b.datum ? -1 : 1)[0]; S.tentamen = (up || C.tent[0]).id; }
  checkMilestones(); save(); go('home');
  if ('serviceWorker' in navigator && location.protocol === 'https:' && /github\.io$/.test(location.hostname)) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
