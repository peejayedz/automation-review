// Classic editor (old), was "Edit wording" v1.4.0 (v1.6.0: reachable only from Details → ⋯ → Classic editor (old), with an
// "Old editor" banner; to be deleted ~15 Dec 2026 once the Review admin's Edit tab is proven) (team only, lfmp-admin.pages.dev behind Google sign-in): the classic review page with its edit
// controls on. Moved here from the public index.html, which no longer has an admin mode (16 Nov 2026).
// Same features as the old "&admin" mode: edit automation name / summary / summary boxes, start a new review round
// (version), edit step title / timing / description / note, edit text and email copy, edit questions, rename the client,
// request status + reply, delete one response or answer or approval, clear all responses on an automation, the
// all-clients Submissions view and the client picker. Everything else on the page is the client's own view.
// Admin actions go through the team site's server (/api/review), which adds the review admin key and the signed-in
// person's first name; the browser never holds a key. Client data is read from the public site.
import { startSession, api, signOut, TOOLS } from "./lfmp-session.js";

const CFG = window.REVIEW_CONFIG || {};
const SAVE_URL = (CFG.saveUrl || "").trim();
const params = new URLSearchParams(location.search);
const clientKey = (params.get("c") || "").replace(/[^a-z0-9-]/gi, "");
let autoId = params.get("a") || "";
// On the team site the client pages and data/ aren't there: read them from the public site (as admin.js does).
const PUBLIC_BASE = "https://dashboard.lawfirmmarketingpros.com/automation-review/";
const BASE = /(^|\.)lfmp-admin\.pages\.dev$/.test(location.hostname) ? PUBLIC_BASE : "../";
const REVIEW_ADMIN = TOOLS.find(t => t.id === "review").path;
let ME = { name: "", first: "LFMP team", email: "" };

let baseData = null, data = null, auto = null, responses = [], content = [], selected = null, lastLoaded = null;
let wantAdmin = true; let adminClients = []; let clientNames = {}; let pickOpen = false;
let justSignedIn = false, signInError = "";
let isAdmin = false, adminForm = null, rendered = false, loaded = false, loadFailed = false;
const CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" stroke-width="1.8"/><path d="m7.5 12.5 3 3 6-6.5"/></svg>';
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const chips = (s) => esc(s).replace(/\[([^\]]+)\]/g, '<span class="chip">$1</span>');
// Request statuses. Older rows (Open / In progress / Done) are read as the new ones.
const ST = { REQ: "Changes Requested", PROG: "In Progress", UPD: "Updated — Ready for Review", OK: "Approved" };
const TEAM_ST = [ST.REQ, ST.PROG, ST.UPD];
const isReq = (r) => r && (r.action === "change" || r.action === "copy");
function normStatus(s){
  s = String(s == null ? "" : s).trim(); if (!s) return "";
  const k = s.toLowerCase(), L = { "open": ST.REQ, "in progress": ST.PROG, "done": ST.UPD };
  if (L[k]) return L[k];
  const m = Object.values(ST).find(x => x.toLowerCase() === k); if (m) return m;
  return /^updated/i.test(s) ? ST.UPD : s;
}
function normRows(rows){ (rows || []).forEach(r => { if (isReq(r)) r.status = normStatus(r.status) || ST.REQ; }); return rows || []; }
let revlog = [];
const fmt = (iso) => { try { return new Date(iso).toLocaleString("en-US", {timeZone:"America/New_York", month:"short", day:"numeric", hour:"numeric", minute:"2-digit"}) + " ET"; } catch(e) { return ""; } };

/* ---------- reviewer identity (per browser) ---------- */

/* ---------- storage: Google Sheet via Apps Script, or demo (this browser) ---------- */
const demoKey = "ar_demo_" + clientKey;
async function loadAll(){
  if (!SAVE_URL){
    let rows = [], cont = [];
    try { rows = JSON.parse(localStorage.getItem(demoKey) || "[]"); cont = JSON.parse(localStorage.getItem(demoKey + "_content") || "[]"); } catch(e){}
    return {rows, content: cont};
  }
  const res = await fetch(SAVE_URL + "?client=" + encodeURIComponent(clientKey) + "&t=" + Date.now(), {cache:"no-store"});
  const j = await res.json();
  if (!j.ok) throw new Error(j.error || "Could not load responses");
  return {rows: j.rows || [], content: j.content || [], log: j.log || []};
}
async function loadResponses(){ return (await loadAll()).rows; }
// Admin actions only (admin_ping / all / status / delete / edit): through the team site's server, never with a key here.
async function postJSON(obj){
  try { return await api("review", obj); }
  catch(e){ return { ok:false, error: e.message }; }
}
/* ---------- admin: content edits and request status ---------- */
async function adminEdit(automation, field, value){
  const who = ME.first;   // the server records the signed-in person's first name; this is for the local copy
  if (!SAVE_URL){
    const row = {timestamp:new Date().toISOString(), client:clientKey, automation, field, value, edited_by:who};
    const all = (await loadAll()).content; all.push(row);
    try { localStorage.setItem(demoKey + "_content", JSON.stringify(all)); } catch(e){}
    content.push(row); return row;
  }
  const j = await postJSON({action:"admin_edit", client:clientKey, automation, field, value, name:who});
  if (!j.ok) throw new Error(j.error || "Could not save");
  content.push(j.content); return j.content;
}
async function adminStatus(id, status, reply, client){
  client = client || clientKey;
  const who = ME.first, now = new Date().toISOString();
  if (!SAVE_URL){
    const key = "ar_demo_" + client; let rows = [];
    try { rows = JSON.parse(localStorage.getItem(key) || "[]"); } catch(e){}
    const r = rows.find(x => x.id === id); if (!r) return null;
    const before = normStatus(r.status) || ST.REQ;
    if (status !== before || reply !== String(r.lfmp_reply || "")){
      r.status = status; r.lfmp_reply = reply; r.updated_at = now; r.updated_by = who;
      let log = []; try { log = JSON.parse(localStorage.getItem(key + "_log") || "[]"); } catch(e){}
      log.push({timestamp:now, client, automation:r.automation, version:r.version, request_id:id, step:r.step, event:"status", status, note:reply !== String(r.lfmp_reply||"") ? reply : reply, previous:before, revised:"", by:who});
      try { localStorage.setItem(key + "_log", JSON.stringify(log)); } catch(e){}
      if (client === clientKey) revlog = log;
    }
    try { localStorage.setItem(key, JSON.stringify(rows)); } catch(e){}
    if (client === clientKey){ const i = responses.findIndex(x => x.id === id); if (i > -1) responses[i] = r; }
    return r;
  }
  const j = await postJSON({action:"admin_status", client, id, status, lfmp_reply:reply, name:who});
  if (!j.ok) throw new Error(j.error || "Could not save");
  if (client === clientKey){ const i = responses.findIndex(x => x.id === id); if (i > -1) responses[i] = j.row; }
  return j.row;
}
// Rebuild the automations from the data file plus any admin edits (newest edit wins).
function applyContent(){
  data = JSON.parse(JSON.stringify(baseData));
  content.slice().sort((a,b) => String(a.timestamp).localeCompare(String(b.timestamp))).forEach(c => {
    if (String(c.field) === "client:name"){ if (String(c.value || "").trim()){ data.client.name = String(c.value).trim(); clientNames[clientKey] = data.client.name; } return; }
    const a = data.automations.find(x => x.id === c.automation); if (!a) return;
    const f = String(c.field || ""), v = c.value == null ? "" : String(c.value);
    if (f !== "version"){ a._edits = (a._edits || 0) + 1; if (!a._lastEdit || String(c.timestamp) > a._lastEdit) a._lastEdit = String(c.timestamp); }
    else { a._edits = 0; a._lastEdit = null; a._roundStart = String(c.timestamp); }
    if (["name","summary","version"].includes(f)){ a[f] = v; a._edited = true; return; }
    const g = f.match(/^glance:(\d+):(label|value)$/);
    if (g){ a.glance = a.glance || []; const i = +g[1]; a.glance[i] = a.glance[i] || ["", ""]; a.glance[i][g[2] === "label" ? 0 : 1] = v; return; }
    const q = f.match(/^q:([^:]+):(text|why|options)$/);
    if (q){ const qq = (a.questions || []).find(x => x.id === q[1]); if (!qq) return; qq[q[2]] = q[2] === "options" ? v.split("\n").map(x => x.trim()).filter(Boolean) : v; qq._edited = true; return; }
    const m = f.match(/^step:([^:]+):(sms|title|body|when|gap|note|email\.subject|email\.body)$/); if (!m) return;
    const st = a.steps.find(x => x.id === m[1]); if (!st) return;
    if (m[2].startsWith("email.")){ st.email = st.email || {subject:"", body:""}; st.email[m[2].slice(6)] = v; }
    else st[m[2]] = v;
    st._edited = true;
  });
  const id = auto ? auto.id : autoId;
  auto = data.automations.find(a => a.id === id) || data.automations[0];
}

/* ---------- derived state ---------- */
// Google Sheets can turn "1.0" into the number 1, so compare versions both as text and as numbers.
const sameV = (a, b) => String(a) === String(b) || (a !== "" && b !== "" && Number(a) === Number(b));
const mine = () => responses.filter(r => r.automation === auto.id);
const cur = () => mine().filter(r => sameV(r.version, auto.version));
// A request is still open if it isn't Done and the client hasn't marked the step "Looks good" after it.
// A later "Looks good" means the client is happy with the step as it is, so it replaces earlier requests.
function isReplaced(r, rs){
  const t = Date.parse(r.timestamp) || 0;
  return rs.some(x => x.step === r.step && x.action === "approve" && (Date.parse(x.timestamp) || 0) > t);
}
// Open = still with LFMP (requested or in progress) and not replaced by a later "Looks good".
function isOpenReq(r, rs){ const st = normStatus(r.status) || ST.REQ; return isReq(r) && (st === ST.REQ || st === ST.PROG) && !isReplaced(r, rs); }
// Awaiting = LFMP has updated it and the client hasn't reviewed it since.
function isAwaiting(r, rs){ return isReq(r) && normStatus(r.status) === ST.UPD && !isReplaced(r, rs); }
function stepState(stepId){
  if (!loaded) return "loading";
  const rs = cur().filter(r => r.step === stepId && ["approve","undo","change","copy"].includes(r.action));
  if (!rs.length) return "pending";
  const last = rs[rs.length - 1];
  const open = rs.filter(r => isOpenReq(r, rs));
  if (open.length) return open.every(r => normStatus(r.status) === ST.PROG) ? "progress" : "changes";
  if (last.action === "approve") return "approved";
  if (last.action === "undo") return "pending";
  return "updated"; // LFMP has updated it; the client hasn't reviewed it again yet
}
const stateLabel = {loading:"Loading…", pending:"Needs your review", changes:"Changes requested", progress:"In progress with LFMP", updated:"Updated · please review", approved:"✓ Looks good"};
const pillCls = (st) => ({approved:"approved", changes:"changes", progress:"progress", updated:"updated"})[st] || "none";
function autoState(a){
  if (!loaded) return "loading";
  const rs = responses.filter(r => r.automation === a.id && sameV(r.version, a.version));
  if (rs.some(r => r.action === "approve_all")) return "approved";
  if (rs.some(r => isOpenReq(r, rs))) return "changes";
  if (rs.some(r => isAwaiting(r, rs))) return "updated";
  return "pending";
}
const reviewable = () => auto.steps.filter(s => s.type !== "start");

/* ---------- icons ---------- */
const ICON = {
  sms:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h16v11H9l-5 4z"/></svg>',
  email:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>',
  call:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/></svg>',
  vm:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="6.5" cy="12" r="3.5"/><circle cx="17.5" cy="12" r="3.5"/><path d="M6.5 15.5h11"/></svg>',
  team:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0 1 12 0"/><path d="M16 11a3 3 0 1 0 0-6M21 20a6 6 0 0 0-4-5.6"/></svg>',
  start:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 4v16l12-8z"/></svg>',
  end:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>'
};
ICON.chat = ICON.sms; // live chat replies use the text-message icon
const TYPE = {sms:"Text message", chat:"Live chat message", email:"Email", call:"Phone call", vm:"Voicemail", team:"Team action", start:"Start", end:"End"};

/* ---------- admin: all submissions (every client) ---------- */
let view = params.get("view") === "submissions" ? "subs" : "review";
let subs = null, subsLoading = false, subsF = { client: "all", status: "open", q: "" };
const clientData = {}; // code -> data file (for automation names)
async function loadSubs(){
  subsLoading = true; render();
  try {
    if (!SAVE_URL){
      const rows = [], log = [], clients = {};
      for (let i = 0; i < localStorage.length; i++){
        const k = localStorage.key(i); const m = k && k.match(/^ar_demo_([a-z0-9-]+)$/i); if (!m) continue;
        let rs = []; try { rs = JSON.parse(localStorage.getItem(k) || "[]"); } catch(e){}
        let lg = []; try { lg = JSON.parse(localStorage.getItem(k + "_log") || "[]"); } catch(e){}
        rs.forEach(r => { r.client = r.client || m[1]; rows.push(r); }); log.push(...lg); clients[m[1]] = m[1] === clientKey ? data.client.name : prettyClient(m[1]);
      }
      subs = { rows: normRows(rows), log, clients };
    } else {
      const j = await postJSON({action:"admin_all", client:clientKey});
      if (!j.ok) throw new Error(j.error || "Could not load");
      subs = { rows: normRows(j.rows), log: j.log || [], clients: j.clients || {} }; Object.assign(clientNames, j.clients || {});
    }
    clientData[clientKey] = data;
    const codes = [...new Set(subs.rows.map(r => r.client))].filter(c => !clientData[c]);
    await Promise.all(codes.map(async c => { try { const r = await fetch(BASE + "data/" +c + ".json?t=" + Date.now(), {cache:"no-store"}); if (r.ok) clientData[c] = await r.json(); } catch(e){} }));
  } catch(e){ toast("Couldn't load submissions: " + e.message); }
  subsLoading = false; render();
}
async function loadSubsQuiet(){
  if (!isAdmin) return;
  try {
    if (!SAVE_URL){ const v = view; await loadSubs(); view = v; }
    else { const j = await postJSON({action:"admin_all", client:clientKey}); if (j.ok){ subs = { rows: normRows(j.rows), log: j.log || [], clients: j.clients || {} }; Object.assign(clientNames, j.clients || {}); } }
  } catch(e){}
  const q = $("#cpickQ") ? $("#cpickQ").value : ""; const hadFocus = document.activeElement && document.activeElement.id === "cpickQ";
  renderAdminBar();
  const i = $("#cpickQ"); if (i){ i.value = q; const l = $("#cpickList"); if (l) l.innerHTML = clientListHTML(q); if (hadFocus) i.focus(); }
}
const subKind = (r) => isReq(r) ? "req" : r.action;
function subStatusKey(r, all){
  if (!isReq(r)) return r.action;
  const st = normStatus(r.status) || ST.REQ;
  if ((st === ST.REQ || st === ST.PROG) && isReplaced(r, all.filter(x => x.client === r.client && x.automation === r.automation && sameV(x.version, r.version)))) return "ok";
  return st === ST.OK ? "ok" : st === ST.UPD ? "upd" : st === ST.PROG ? "prog" : "req";
}
function autoName(c, a){ const d = clientData[c]; const x = d && d.automations && d.automations.find(y => y.id === a); return x ? x.name : a === "setup-questions" ? "Setup questions" : a; }
function clientName(c){ return clientNames[c] || (subs && subs.clients[c]) || (clientData[c] && clientData[c].client && clientData[c].client.name) || prettyClient(c); }
function subsCounts(){
  const all = subs.rows, n = { open:0, req:0, prog:0, upd:0, ok:0, answer:0, approve_all:0, approve:0 };
  all.filter(r => subsF.client === "all" || r.client === subsF.client).forEach(r => {
    const k = subStatusKey(r, all); if (k in n) n[k]++; if (k === "req" || k === "prog") n.open++;
  });
  return n;
}
function subsHTML(){
  if (!subs) return `<section class="subs"><div class="none">${subsLoading ? "Loading every client's submissions…" : "No submissions loaded yet."}</div></section>`;
  const all = subs.rows, n = subsCounts(), q = subsF.q.toLowerCase();
  const want = (r) => {
    if (subsF.client !== "all" && r.client !== subsF.client) return false;
    const k = subStatusKey(r, all);
    if (subsF.status === "open" && !(k === "req" || k === "prog")) return false;
    if (["req","prog","upd","ok","answer","approve_all","approve"].includes(subsF.status) && k !== subsF.status) return false;
    if (subsF.status === "requests" && !isReq(r)) return false;
    if (subsF.status === "everything" && r.action === "approve") return false;
    if (q && ![r.details, r.new_copy, r.step_title, r.name, r.type, r.lfmp_reply, autoName(r.client, r.automation), clientName(r.client)].join(" ").toLowerCase().includes(q)) return false;
    return true;
  };
  const list = all.filter(want).sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp)));
  const btn = (k, label, num) => `<button type="button" data-subs-status="${k}" aria-pressed="${subsF.status === k}"><b>${num}</b>${label}</button>`;
  const clients = (Object.keys(subs.clients).length ? Object.keys(subs.clients) : [...new Set(all.map(r => r.client))]).sort((a, b) => clientName(a).localeCompare(clientName(b)));
  const label = { req:"Changes requested", prog:"In progress", upd:"Updated · waiting for the client", ok:"Approved" };
  const cards = list.map(r => {
    const k = subStatusKey(r, all);
    const kindTxt = r.action === "answer" ? "Answered a question" : r.action === "approve_all" ? "Approved the whole automation" : r.action === "approve" ? (r.type === "Everything else looks good" ? "Marked looks good (Everything else looks good)" : "Marked looks good") : r.action === "undo" ? "Took back \u201clooks good\u201d" : r.action === "copy" ? "Sent new wording" : (r.type || "Requested a change");
    return `<article class="scard ${isReq(r) ? "st-" + k : "k-" + r.action}">
      <div class="shead"><span class="where"><b>${esc(clientName(r.client))}</b> · ${esc(autoName(r.client, r.automation))}${r.version ? " · v" + esc(r.version) : ""}</span>${isReq(r) ? `<span class="pill ${k === "ok" ? "approved" : k === "upd" ? "updated" : k === "prog" ? "progress" : "changes"}">${label[k]}</span>` : ""}</div>
      <div class="stitle">${esc(r.step_title || r.step || "")}</div>
      <div>${esc(kindTxt)}${r.action === "answer" ? `: <b>${esc(r.details)}</b>` : ""}</div>
      ${r.action !== "answer" && r.details ? `<div>${esc(r.details)}</div>` : ""}
      ${r.new_copy ? `<div class="copytxt">${esc(r.new_copy)}</div>` : ""}
      ${shotsHTML(r.attachments)}
      ${r.lfmp_reply ? `<div class="reply"><b>Reply from LFMP</b>${esc(r.lfmp_reply)}</div>` : ""}
      ${stampsHTML(r)}
      ${isReq(r) ? timelineHTML(r, subs.log) : ""}
      ${statusFormHTML(r, r.client)}
      <div class="srow"><a class="golink" href="?c=${encodeURIComponent(r.client)}&a=${encodeURIComponent(r.automation)}&admin">Open this on the client's dashboard →</a><button class="del ${armed === "s:" + r.id ? "armed" : ""}" type="button" data-subdel="${esc(r.id)}" data-client="${esc(r.client)}">${armed === "s:" + r.id ? "Click again to delete for good" : "Delete"}</button></div>
    </article>`;
  }).join("");
  return `<section class="subs">
    <button class="btn small" type="button" data-subs-close>← Back to the review page</button>
    <h1>Client submissions</h1>
    <p class="hint" style="font-size:14px">Every change request, new wording, answer and approval from your clients, newest first. Update the status and reply here, and the client sees it on their dashboard straight away. Statuses: Changes Requested → In Progress → Updated (ready for the client) → Approved (only when the client approves).</p>
    <div class="sumrow">${btn("open", "Open (needs work)", n.open)}${btn("upd", "Waiting for the client", n.upd)}${btn("ok", "Approved", n.ok)}${btn("answer", "Answers", n.answer)}${btn("approve_all", "Automations approved", n.approve_all)}${btn("approve", "Looks good clicks", n.approve)}${btn("everything", "Everything", all.filter(r => r.action !== "approve" && (subsF.client === "all" || r.client === subsF.client)).length)}</div>
    <div class="filters"><label class="hint" for="subsClient">Client</label><select id="subsClient"><option value="all">All clients</option>${clients.map(c => `<option value="${esc(c)}" ${subsF.client === c ? "selected" : ""}>${esc(clientName(c))}</option>`).join("")}</select>
      <input type="search" id="subsQ" placeholder="Search requests, names, steps…" value="${esc(subsF.q)}">
      <button class="btn small" type="button" data-subs-reload>↻ Reload</button></div>
    ${cards || `<div class="none">Nothing here${subsF.status === "open" ? ": no open requests" : ""}.</div>`}
  </section>`;
}

/* ---------- render ---------- */
function render(){
  { const ap = document.querySelector(".autopick"); if (ap) ap.hidden = false; }
  if (view === "subs" && isAdmin){
    $("#clientName").textContent = "All clients · Submissions";
    $("#clientSub").textContent = "Admin only · Powered by Law Firm Marketing Pros";
    document.title = "Submissions · Classic editor (old) · LFMP";
    const ap = document.querySelector(".autopick"); if (ap) ap.hidden = true;
    $("#app").innerHTML = subsHTML();
    renderAdminBar();
    return;
  }
  $("#clientName").textContent = data.client.name + " · Automation Review";
  $("#clientSub").textContent = "Powered by Law Firm Marketing Pros";
  document.title = "Classic editor (old) · " + data.client.name + " · LFMP";
  const mark = {loading:"Loading…", approved:"✓ Approved", changes:"● Changes requested", updated:"◐ Updated · please review", pending:"○ Needs review"};
  $("#autoSelect").innerHTML = data.automations.map((a, i) => `<option value="${esc(a.id)}" ${a.id===auto.id?"selected":""}>${i+1}. ${esc(a.name)} · ${mark[autoState(a)]}</option>`).join("");
  const nApproved = data.automations.filter(a => autoState(a) === "approved").length;
  $("#autoCount").textContent = nApproved + " of " + data.automations.length + " approved";

  const steps = reviewable();
  const counts = {loading:0, approved:0, changes:0, updated:0, pending:0};
  steps.forEach(s => { const k = stepState(s.id); counts[k === "progress" ? "changes" : k]++; });
  const pct = (n) => (100 * n / steps.length) + "%";
  const as = autoState(auto);
  const asPill = as === "approved" ? '<span class="pill approved">✓ Approved</span>' : as === "changes" ? '<span class="pill changes">Changes requested</span>' : as === "updated" ? '<span class="pill updated">Updated · please review</span>' : as === "loading" ? '<span class="pill none">Loading saved responses…</span>' : '<span class="pill pending">Needs your review</span>';

  let html = `<section class="hero">
    <div>
      <div class="eyebrow">Automation ${data.automations.indexOf(auto)+1} of ${data.automations.length}</div>
      <h1>${esc(auto.name)}</h1>
      <div class="meta">${asPill}<span>Version ${esc(auto.version)}</span><span>Sent ${esc(auto.sent)}</span>${auto._lastEdit ? `<span class="updated">Updated ${fmt(auto._lastEdit)}${isAdmin ? ` · ${auto._edits} edit${auto._edits===1?"":"s"} this round` : ""}</span>` : ""}${isAdmin?`<button class="adm" type="button" data-admin="details">✎ Edit name, summary, boxes</button>`:""}</div>
      ${isAdmin && adminForm === "details" ? detailsFormHTML() : `<p class="lead">${esc(auto.summary)}</p>`}
      ${approvedBanner()}
    </div>
    <div class="progress">
      <b>${counts.approved + counts.changes} of ${steps.length} steps reviewed</b>
      <div class="bar" aria-hidden="true"><span style="width:${pct(counts.approved)};background:var(--ok)"></span><span style="width:${pct(counts.changes)};background:var(--warn)"></span><span style="width:${pct(counts.updated)};background:var(--team)"></span></div>
      <div class="legend"><span><i class="dot approved"></i>${counts.approved} looks good</span><span><i class="dot changes"></i>${counts.changes} changes</span>${counts.updated?`<span><i class="dot" style="background:var(--team)"></i>${counts.updated} updated</span>`:""}<span><i class="dot"></i>${counts.pending} to review</span></div>
      <ol class="howto"><li>Click a step to see it and its responses.</li><li>Use the <b>✎ admin</b> buttons to edit the wording.</li><li>Only the client marks steps and approves, on their own page.</li></ol>
    </div>
  </section>
  <div class="glance">${auto.glance.map(g => `<div><b>${esc(g[0])}</b>${chips(g[1])}</div>`).join("")}</div>
  ${overviewHTML()}
  <div class="main">
    <div class="flow" id="flow">${flowHTML()}</div>
    <aside id="sideInspector" aria-live="polite">${selected && !matchMedia("(max-width:980px)").matches ? `<div class="inspector">${inspectorHTML()}</div>` : ""}</aside>
  </div>
  ${questionsHTML()}
  ${approveHTML()}
  <p class="foot">Team view: the client's own buttons are hidden here. Only the client marks steps, answers questions and approves, on their review page.</p>`;
  $("#app").innerHTML = html;
  renderAdminBar();
  $("#updated").textContent = lastLoaded ? "Updated " + lastLoaded.toLocaleTimeString("en-US", {timeZone:"America/New_York", hour:"numeric", minute:"2-digit"}) + " ET" : "";
}

function flowHTML(){
  const narrow = matchMedia("(max-width:980px)").matches;
  let h = "", lastDay = "";
  auto.steps.forEach((s) => {
    if (s.day !== lastDay){ h += `<div class="dayhead">${esc(s.day)}</div>`; lastDay = s.day; }
    else if (s.gap){ h += `<div class="conn">${esc(s.gap)}</div>`; }
    let st = stepState(s.id); if (s.type === "start" && (st === "pending" || st === "loading")) st = null;
    const cls = (s.type === "team" || s.type === "call") ? "team" : (s.type === "start" || s.type === "end") ? "startend" : "";
    const who = s.who === "patient" ? " · " + (data.audience || "Patient") + " receives" : s.who === "team" ? " · Your team" : "";
    h += `<button class="node ${cls} ${st==="approved"?"isok":""}" data-step="${esc(s.id)}" aria-pressed="${selected===s.id}">
      <span class="icon">${st==="approved" ? CHECK : (ICON[s.type]||"")}</span>
      <span><span class="ntitle">${chips(s.title)}</span><span class="nsub" style="display:block">${(s.type==="start"||s.type==="end") ? TYPE[s.type] : esc(s.when) + " · " + TYPE[s.type] + who}</span>${s.type === "sms" ? `<span class="nreq">⚠️ Needs a phone number + A2P/10DLC approval</span>` : ""}</span>
      ${st ? `<span class="pill ${pillCls(st)}">${stateLabel[st]}</span>` : ""}
    </button>`;
    if (narrow && selected === s.id) h += `<div class="inspector inline">${inspectorHTML()}</div>`;
  });
  return h;
}

function shotsHTML(v){
  const urls = String(v || "").split(/\s+/).filter(u => /^(https?:|data:image)/.test(u));
  if (!urls.length) return "";
  return `<div class="shots">${urls.map((u, i) => {
    const m = u.match(/\/d\/([\w-]+)/); const thumb = m ? "https://drive.google.com/thumbnail?id=" + m[1] + "&sz=w400" : u;
    return `<a href="${esc(u)}" target="_blank" rel="noopener"><img src="${esc(thumb)}" alt="Attached screenshot ${i+1}" loading="lazy"></a>`; }).join("")}</div>`;
}
function nextVersion(v){
  const m = String(v || "1.0").match(/^(\d+)\.(\d+)$/);
  return m ? m[1] + "." + (Number(m[2]) + 1) : (Number(v) ? (Number(v) + 0.1).toFixed(1) : String(v || "1") + ".1");
}
function histItemsHTML(list){
  return list.map(r => `
     <div class="hitem ${r.action} ${[ST.UPD, ST.OK].includes(normStatus(r.status))?"isdone":""} ${!sameV(r.version, auto.version)?"old":""}">
       <span class="who">${esc(r.name||"Someone")}</span> <span class="when">· ${fmt(r.timestamp)}${!sameV(r.version, auto.version)?" · v"+esc(r.version):""}</span>
       <div>${r.action==="approve"?"Marked this step as looks good":r.action==="copy"?"Suggested new wording":esc(r.type||"Requested a change")}${isReq(r)?` · ${isOpenReq(r, []) && isReplaced(r, cur()) ? '<span class="rs done">Replaced by Looks good</span>' : statusTag(r.status)}`:""}</div>
       ${r.details?`<div>${esc(r.details)}</div>`:""}
       ${r.new_copy?`<div class="copytxt">${esc(r.new_copy)}</div>`:""}
       ${shotsHTML(r.attachments)}
       ${r.lfmp_reply?`<div class="reply"><b>Reply from LFMP</b>${esc(r.lfmp_reply)}</div>`:""}
       ${isReq(r) ? stampsHTML(r) + timelineHTML(r, revlog) : ""}
       ${isAdmin ? statusFormHTML(r) : ""}
       ${isAdmin ? `<div style="margin-top:6px">${delBtn(r.id)}</div>` : ""}
     </div>`).join("");
}
function overviewHTML(){
  const list = mine().filter(r => r.step === "overview" && r.action === "change").slice().reverse();
  let h = "";   // team page: only the client requests corrections, so history only
  if (list.length) h += `<div class="hist ovhist"><h3>Corrections requested for this overview</h3>${histItemsHTML(list)}</div>`;
  return h ? `<div class="overview">${h}</div>` : "";
}
/* ---------- SMS setup requirement (informational only, never part of the message) ---------- */
function smsCompliance(s){
  // A step can override the extra lines with "smsCompliance": ["..."] in the data file ([] hides them).
  if (Array.isArray(s.smsCompliance)) return s.smsCompliance;
  const id = (auto.id || "").toLowerCase();
  const text = ((s.sms || "") + " " + (s.body || "") + " " + (s.title || "")).toLowerCase();
  const out = [];
  const marketing = /reactivation|review|nurture|newsletter|promo/.test(id) || /promotion|offer|gift card|discount|review/.test(text);
  if (/appointment|consultation|no-show|noshow|reminder/.test(id)) {
    out.push("Appointment texts are registered as a customer-care / reminder use case. The contact still needs to have agreed to receive texts, e.g. a consent checkbox on the booking form.");
  } else if (/new-lead|new-patient|enquiry|inquiry|lead/.test(id)) {
    out.push("Texting new leads: the website form needs an SMS consent checkbox and disclosure, and the first text should include opt-out wording such as “Reply STOP to opt out.”");
  }
  if (marketing) out.push("This text is promotional (an offer, review request or re-engagement). The A2P campaign must be registered for marketing use, the contact must have opted in to marketing texts, and the message should include opt-out wording.");
  if ((data.client && data.client.smsHealthcare) || data.smsHealthcare) out.push("Healthcare: keep texts free of treatment or health details (HIPAA).");
  return out;
}
function smsReqHTML(s){
  const extra = smsCompliance(s);
  return `<div class="smsreq" role="note">
    <div class="smsreq-h"><b>⚠️ SMS Requirement</b><span class="smsreq-tag">Setup note · not part of the text</span></div>
    Sending SMS through GoHighLevel requires a purchased phone number and an approved A2P/10DLC registration. Business/EIN information may be required for registration, and approval must be in place before any text can be sent.
    ${extra.length ? `<ul>${extra.map(x => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}
  </div>`;
}
function inspectorHTML(){
  const s = auto.steps.find(x => x.id === selected); if (!s) return "";
  let st = stepState(s.id); if (s.type === "start" && (st === "pending" || st === "loading")) st = null;
  let content = "";
  if (s.body) content += `<p>${chips(s.body)}</p>`;
  if (s.sms){
    const len = s.sms.replace(/\[[^\]]+\]/g, "Maria").length;
    content += `<div class="sms">${chips(s.sms)}</div>${s.type === "sms" ? `<div class="len">About ${Math.round(len/10)*10} characters with names filled in${len>160?` · sends as ${Math.ceil(len/153)} text segments`:""}</div>` : ""}`;
  }
  if (s.type === "sms") content += smsReqHTML(s);
  if (s.email){
    content += `<div class="email"><div class="subj"><b>Subject:</b> ${chips(s.email.subject)}</div><div class="body">${s.email.body ? chips(s.email.body) : `<span class="pendingtxt">${esc(s.email.pending||"")}</span>`}</div></div>`;
  }
  if (s._edited && isAdmin) content += `<div class="edited">Edited on this page</div>`;
  if (s.note) content += `<div class="note"><b>Our note:</b> ${chips(s.note)}</div>`;
  if (isAdmin && (s.sms || s.email)){
    content += adminForm === "copy:" + s.id ? copyAdminFormHTML(s) : `<div style="margin-top:10px"><button class="adm" type="button" data-admin="copy:${esc(s.id)}">✎ Edit this ${s.sms ? "text" : "email"} (admin)</button></div>`;
  }
  if (isAdmin){
    content += adminForm === "step:" + s.id ? stepAdminFormHTML(s) : `<div style="margin-top:8px"><button class="adm" type="button" data-admin="step:${esc(s.id)}">✎ Edit step title, timing, description, note (admin)</button></div>`;
  }

  let actions = "";   // team page: no client buttons (Looks good / Request a change / Edit the wording); only clients respond
  if (!loaded && s.type !== "start"){
    actions = `<div class="loadnote">${loadFailed ? "Couldn't load saved responses and comments. Click ↻ Refresh at the top to try again." : "Loading saved responses and comments… this can take up to 30 seconds."}</div>`;
  }
  const hist = mine().filter(r => r.step === s.id && ["approve","change","copy"].includes(r.action)).slice().reverse();
  const histHTML = hist.length ? `<div class="hist"><h3>Responses on this step</h3>${histItemsHTML(hist)}</div>` : "";
  return `<div class="ihead">${ICON[s.type]?`<span class="icon" style="width:28px;height:28px">${ICON[s.type]}</span>`:""}<span>${esc(s.day)} · ${esc(s.when)} · ${TYPE[s.type]}</span>${st?`<span class="pill ${pillCls(st)}">${stateLabel[st]}</span>`:""}</div>
    <h2>${chips(s.title)}</h2>${content}${actions}${histHTML}`;
}

function approvedBanner(){
  const rs = cur().filter(r => r.action === "approve_all"); if (!rs.length) return "";
  const a = rs[rs.length-1];
  return `<div class="okbanner">${CHECK}<span><b>Approved</b> by ${esc(a.name)} on ${fmt(a.timestamp)} · version ${esc(auto.version)}</span></div>`;
}
function detailsFormHTML(){
  return `<form class="form admform" data-form="details">
    <label for="ad-name">Automation name</label><input type="text" id="ad-name" value="${esc(auto.name)}">
    <label for="ad-summary">Summary</label><textarea id="ad-summary" rows="3">${esc(auto.summary)}</textarea>
    <label>Version</label>
    <div class="verlock"><span class="vbadge">🔒 v${esc(auto.version)}</span><span class="hint">${auto._lastEdit ? `Last updated ${fmt(auto._lastEdit)} · ${auto._edits} edit${auto._edits===1?"":"s"} this round` : "No edits yet this round"}</span>
      <button class="del ${armed==="newround"?"armed":""}" type="button" data-newround>${armed==="newround" ? `Click again to start v${esc(nextVersion(auto.version))}` : `Start new review round (v${esc(nextVersion(auto.version))})`}</button></div>
    <fieldset class="glanceedit"><legend>Summary boxes</legend>${(auto.glance || []).map((g, i) => `<div class="row2"><div><label for="ag-l${i}">Box ${i+1} label</label><input type="text" id="ag-l${i}" value="${esc(g[0])}"></div><div><label for="ag-v${i}">Box ${i+1} text</label><textarea id="ag-v${i}" rows="2">${esc(g[1])}</textarea></div></div>`).join("")}</fieldset>
    <span class="hint">The version is locked. Saving edits updates the "Updated" date without resetting the client's reviews. When you're ready for the client to re-review everything, start a new review round: all steps go back to "Needs review" and earlier responses stay in each step's history.</span>
    <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn primary" type="submit">Save changes</button><button class="btn" type="button" data-admin-cancel>Cancel</button></div>
  </form>`;
}
function stepAdminFormHTML(s){
  const timing = s.type === "start" ? "" : `<div class="row2"><div><label for="as-when">When (shown under the title)</label><input type="text" id="as-when" value="${esc(s.when||"")}"></div><div><label for="as-gap">Line between steps</label><input type="text" id="as-gap" value="${esc(s.gap||"")}"></div></div>`;
  return `<form class="form admform" data-form="stepadmin">
    <label for="as-title">Step title</label><input type="text" id="as-title" value="${esc(s.title||"")}">
    ${timing}
    <label for="as-body">Description</label><textarea id="as-body" rows="3">${esc(s.body||"")}</textarea>
    <label for="as-note">Our note (leave empty to hide it)</label><textarea id="as-note" rows="3">${esc(s.note||"")}</textarea>
    <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn primary" type="submit">Save step</button><button class="btn" type="button" data-admin-cancel>Cancel</button></div></form>`;
}
function questionAdminFormHTML(q){
  return `<form class="form admform" data-form="qadmin" data-qid="${esc(q.id)}">
    <label for="aq-text">Question</label><input type="text" id="aq-text" value="${esc(q.text||"")}">
    <label for="aq-why">Why we're asking</label><textarea id="aq-why" rows="2">${esc(q.why||"")}</textarea>
    <label for="aq-opts">Answer buttons (one per line)</label><textarea id="aq-opts" rows="4">${esc((q.options||[]).join("\n"))}</textarea>
    <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn primary" type="submit">Save question</button><button class="btn" type="button" data-admin-cancel>Cancel</button></div></form>`;
}
function copyAdminFormHTML(s){
  if (s.sms) return `<form class="form admform" data-form="copyadmin">
    <label for="ac-sms">Text message</label><textarea id="ac-sms" rows="${Math.min(14, s.sms.split("\n").length + 4)}">${esc(s.sms)}</textarea>
    <span class="hint">Write names as [First name], [Team member's first name], [Office phone].</span>
    <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn primary" type="submit">Save text</button><button class="btn" type="button" data-admin-cancel>Cancel</button></div></form>`;
  const e = s.email || {};
  return `<form class="form admform" data-form="copyadmin">
    <label for="ac-subj">Subject</label><input type="text" id="ac-subj" value="${esc(e.subject||"")}">
    <label for="ac-body">Email body</label><textarea id="ac-body" rows="10" placeholder="Paste the email wording from GHL">${esc(e.body||"")}</textarea>
    <span class="hint">Write names as [First name], [Team member's signature], [Office text number].</span>
    <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn primary" type="submit">Save email</button><button class="btn" type="button" data-admin-cancel>Cancel</button></div></form>`;
}
let armed = null; // two-click confirm for deletes
function statusTag(st){ st = normStatus(st) || ST.REQ;
  return st === ST.OK ? '<span class="rs done">✓ Approved</span>' : st === ST.UPD ? '<span class="rs upd">Updated · ready for review</span>' : st === ST.PROG ? '<span class="rs prog">In progress</span>' : '<span class="rs open">Changes requested</span>'; }
function stampsHTML(r){
  return `<div class="stamps">Submitted ${fmt(r.timestamp)}${r.name ? " by " + esc(r.name) : ""}${r.updated_at ? ` · Last updated ${fmt(r.updated_at)}${r.updated_by ? " by " + esc(r.updated_by) : ""}` : ""}</div>`;
}
function timelineHTML(r, log){
  const ev = (log || []).filter(l => l.request_id === r.id && l.event !== "requested" && l.event !== "content").sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp)));
  if (!ev.length) return "";
  return `<ol class="tline">${ev.map(l => `<li><span class="tl-when">${fmt(l.timestamp)}${l.by ? " · " + esc(l.by) : ""}</span>${l.event === "approved" ? esc(l.note || "Approved") : statusTag(l.status)}${l.event !== "approved" && l.note ? ` · “${esc(l.note)}”` : ""}</li>`).join("")}</ol>`;
}
function statusFormHTML(r, client){
  if (!isReq(r)) return "";
  const st = normStatus(r.status) || ST.REQ;
  if (st === ST.OK) return `<div class="hint" style="margin-top:4px">✓ Approved by the client. Nothing more to do.</div>`;
  return `<form class="hadmin" data-form="status" data-id="${esc(r.id)}"${client ? ` data-client="${esc(client)}"` : ""}>
     <select aria-label="Status" name="status">${TEAM_ST.map(o => `<option value="${esc(o)}" ${st === o ? "selected" : ""}>${o === ST.UPD ? "Updated — ready for client review" : o}</option>`).join("")}</select>
     <input type="text" name="reply" aria-label="Reply to client" placeholder="Reply shown to the client (what you changed)" value="${esc(r.lfmp_reply||"")}">
     <button class="btn small" type="submit">Save</button></form>`;
}
function delBtn(id, label){ const on = armed === id; return `<button class="del ${on?"armed":""}" type="button" data-del="${esc(id)}">${on ? "Click again to delete" : (label || "Delete")}</button>`; }
async function adminDelete(ids){
  if (!SAVE_URL){ responses = responses.filter(r => !ids.includes(r.id)); try { localStorage.setItem(demoKey, JSON.stringify(responses)); } catch(e){} return; }
  const j = await postJSON({action:"admin_delete", client:clientKey, ids});
  if (!j.ok) throw new Error(j.error || "Could not delete");
  responses = responses.filter(r => !ids.includes(r.id));
}
function prettyClient(k){ if (clientNames[k]) return clientNames[k]; if (k === clientKey && data && data.client) return data.client.name; return String(k).replace(/-(?=[a-z0-9]*\d)[a-z0-9]{6}$/i, "").split("-").map(w => w ? w[0].toUpperCase() + w.slice(1) : w).join(" "); }
async function ping(){
  if (!SAVE_URL) return {ok:true, clients:(window.__PREVIEW_CLIENTS ? Object.keys(window.__PREVIEW_CLIENTS) : [clientKey]), names:(window.__PREVIEW_CLIENTS || {})};
  let j = {ok:false};
  for (let i = 0; i < 2; i++){ // retry once: the first call after the script sits idle can fail
    j = await postJSON({action:"admin_ping", client:clientKey}); if (j && j.ok) return j;
  }
  return j || {ok:false};
}
/* client picker: type to filter, scales to any number of clients */
function openCount(c){ if (!subs) return 0; return subs.rows.filter(r => r.client === c && ["req","prog"].includes(subStatusKey(r, subs.rows))).length; }
function clientListHTML(q){
  q = String(q || "").trim().toLowerCase();
  const list = adminClients.map(c => ({ c, n: prettyClient(c) })).sort((a, b) => a.n.localeCompare(b.n))
    .filter(x => !q || x.n.toLowerCase().includes(q) || x.c.toLowerCase().includes(q));
  if (!list.length) return `<div class="cfoot">No client matches “${esc(q)}”.</div>`;
  return list.map(x => { const k = openCount(x.c); return `<button type="button" data-cgo="${esc(x.c)}" class="${x.c === clientKey ? "cur" : ""}"><span><span class="cn">${x.c === clientKey ? "✓ " : ""}${esc(x.n)}</span><span class="cc">${esc(x.c)}</span></span>${k ? `<span class="cnt" title="${k} open request${k > 1 ? "s" : ""}">${k}</span>` : ""}</button>`; }).join("");
}
function clientPickHTML(){
  return `<div class="cpick"><button type="button" id="cpickBtn" data-cpick aria-haspopup="listbox" aria-expanded="${pickOpen}"><span class="lbl">Client</span>${esc(prettyClient(clientKey))} ▾</button>${pickOpen ? `<div class="cpanel" role="dialog" aria-label="Choose a client">
    <input type="search" id="cpickQ" placeholder="Search ${adminClients.length} clients…" autocomplete="off" aria-label="Search clients">
    <div class="clist" id="cpickList">${clientListHTML("")}</div>
    <div class="cfoot">${subs ? "Orange numbers = open change requests." : "Loading open request counts…"}</div></div>` : ""}</div>`;
}
function goClient(c){ if (!c || c === clientKey){ pickOpen = false; renderAdminBar(); return; } const u = new URL(location.href); u.search = "?c=" + encodeURIComponent(c) + (view === "subs" ? "&view=submissions" : ""); location.href = u.toString(); }
function renderAdminBar(){
  const bar = $("#adminbar"); if (!wantAdmin){ bar.hidden = true; return; }
  bar.hidden = false;
  bar.classList.toggle("welcome", isAdmin && justSignedIn);
  $("#adminbarIn").innerHTML = isAdmin
    ? `<a class="btn small" href="${esc(REVIEW_ADMIN)}#/client/${encodeURIComponent(clientKey)}">← Review admin</a><span class="adminbadge"><i class="pulse" aria-hidden="true"></i>Classic editor (old)</span><span class="hint" data-me>Signed in as <b>${esc(ME.name || ME.email)}</b></span><button class="btn small subsbtn" type="button" data-subs-open>📥 Submissions${subs ? (() => { const c = subs.rows.filter(r => ["req","prog"].includes(subStatusKey(r, subs.rows))).length; return c ? `<span class="cnt">${c}</span>` : ""; })() : ""}</button>${justSignedIn ? `<span class="welcomemsg">✓ Signed in. You can now edit copy, statuses and replies.</span>` : ""}${adminForm === "clientname" ? `<form class="cren" data-form="clientname"><label for="cnameIn" class="hint">Client name</label><input type="text" id="cnameIn" value="${esc(data.client.name)}" maxlength="120" required><button class="btn small primary" type="submit">Save name</button><button class="btn small" type="button" data-admin-cancel>Cancel</button></form>` : `${adminClients.length ? clientPickHTML() : ""}<button class="adm" type="button" data-admin="clientname" title="Change how this client's name appears on their dashboard">✎ Rename client</button>`}<span>Edit names, versions and copy, update statuses, and delete test responses. Team only: clients never see this page.</span><button class="del ${armed==="clear"?"armed":""}" type="button" data-clear>${armed==="clear" ? "Click again to delete ALL responses on this automation" : "Clear all responses on this automation"}</button>${data && data.customPage ? `<a class="btn small" href="${esc(BASE + data.customPage)}?c=${encodeURIComponent(clientKey)}" target="_blank" rel="noopener" title="This client is sent to a custom review page">Client's review page ↗</a>` : ""}<button class="btn small" type="button" data-admin-exit>Sign out</button>`
    : `<a class="btn small" href="${esc(REVIEW_ADMIN)}">← Review admin</a><b>Classic editor is off</b><span class="akmsg bad" role="alert">${esc(signInError || "Checking your sign-in…")}</span><button class="btn small" type="button" data-admin-exit>Sign out</button>`;
}

function questionsHTML(){
  if (!auto.questions || !auto.questions.length) return "";
  const ans = (qid) => { const rs = cur().filter(r => r.action === "answer" && r.step === qid); return rs.length ? rs[rs.length-1] : null; };
  return `<section class="section"><h2>${auto.questions.length} question${auto.questions.length>1?"s":""} for the client</h2>
    <p class="hint" style="font-size:14px;margin:0">The client answers these on their review page. Their answers show here.</p>
    <div class="qs">${auto.questions.map((q,i) => { const a = ans(q.id); if (isAdmin && adminForm === "q:" + q.id) return `<div class="q">${questionAdminFormHTML(q)}</div>`; return `<div class="q">
      <p><b>${i+1}. ${esc(q.text)}</b></p><p class="hint">${esc(q.why)}</p>${isAdmin ? `<div><button class="adm" type="button" data-admin="q:${esc(q.id)}">✎ Edit question (admin)</button></div>` : ""}
      <p class="qanswer">${a ? `<b>Client's answer:</b> ${esc(a.details)}` : `<span class="hint">Not answered yet. Options: ${q.options.map(esc).join(" · ")}</span>`}</p>
      ${a?`<span class="hint">Saved · ${esc(a.name||"")} · ${fmt(a.timestamp)}</span>${a.lfmp_reply?`<div class="reply"><b>Reply from LFMP</b>${esc(a.lfmp_reply)}</div>`:""}${isAdmin ? `<div>${delBtn(a.id, "Delete answer")}</div>` : ""}`:""}
    </div>`; }).join("")}</div></section>`;
}

function approveHTML(){
  const rs = cur().filter(r => r.action === "approve_all");
  if (rs.length){
    const a = rs[rs.length-1];
    return `<section class="section"><h2>Approval</h2><div class="approveall done"><b>Approved by ${esc(a.name)} on ${fmt(a.timestamp)}</b><span>Version ${esc(auto.version)} of ${esc(auto.name)} is approved exactly as shown on this page. We'll turn it on and let you know when it's live.</span>${isAdmin ? `<div>${delBtn(a.id, "Delete this approval")}</div>` : ""}</div></section>`;
  }
  if (!loaded) return `<section class="section"><h2>Approval</h2><div class="loadnote">${loadFailed ? "Couldn't load saved responses. Click ↻ Refresh at the top to try again." : "Loading saved responses…"}</div></section>`;
  const open = cur().filter(r => isOpenReq(r, cur())).length;
  const pending = reviewable().filter(s => stepState(s.id) === "pending").length;
  return `<section class="section"><h2>Approval</h2>
    <div class="approveall"><b>Not approved yet</b><span>Only the client approves, on their review page.${open ? ` ${open} change request${open>1?"s":""} still open.` : ""}${pending ? ` ${pending} step${pending>1?"s":""} not reviewed yet.` : ""}</span></div></section>`;
}

/* ---------- actions ---------- */
function toast(msg){ const t = $("#toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(toast._t); toast._t = setTimeout(()=>t.classList.remove("show"), 2600); }
// One save at a time: stops double clicks while Google takes a few seconds to answer.
let busy = false;
function lockUI(scope){
  busy = true; document.body.classList.add("saving");
  const b = (scope && scope.querySelector && scope.querySelector("button[type=submit]"));
  if (b){ lockUI.btn = b; lockUI.label = b.textContent; b.textContent = "Saving…"; }
  toast("Saving…");
}
function unlockUI(){
  busy = false; document.body.classList.remove("saving");
  if (lockUI.btn && document.body.contains(lockUI.btn)) lockUI.btn.textContent = lockUI.label;
  lockUI.btn = null;
}
async function guarded(scope, fn){
  if (busy){ toast("Still saving, one moment…"); return; }
  lockUI(scope); try { return await fn(); } finally { unlockUI(); }
}

document.addEventListener("change", (e) => { if (e.target.id === "subsClient"){ subsF.client = e.target.value; render(); } });
document.addEventListener("input", (e) => { if (e.target.id === "cpickQ"){ const l = $("#cpickList"); if (l) l.innerHTML = clientListHTML(e.target.value); } });
document.addEventListener("input", (e) => { if (e.target.id === "subsQ"){ subsF.q = e.target.value; const pos = e.target.selectionStart; render(); const i = $("#subsQ"); if (i){ i.focus(); i.setSelectionRange(pos, pos); } } });
document.addEventListener("click", (e) => { if (pickOpen && !e.target.closest(".cpick")){ pickOpen = false; renderAdminBar(); } }, true);
document.addEventListener("keydown", (e) => {
  if (!pickOpen) return;
  if (e.key === "Escape"){ pickOpen = false; renderAdminBar(); const b = $("#cpickBtn"); if (b) b.focus(); }
  if (e.key === "Enter" && e.target.id === "cpickQ"){ e.preventDefault(); const f = document.querySelector("#cpickList [data-cgo]"); if (f) goClient(f.dataset.cgo); }
  if (e.key === "ArrowDown" && (e.target.id === "cpickQ" || e.target.closest("#cpickList"))){ e.preventDefault(); const all = [...document.querySelectorAll("#cpickList [data-cgo]")]; const i = all.indexOf(document.activeElement); (all[i + 1] || all[0]) && (all[i + 1] || all[0]).focus(); }
  if (e.key === "ArrowUp" && e.target.closest("#cpickList")){ e.preventDefault(); const all = [...document.querySelectorAll("#cpickList [data-cgo]")]; const i = all.indexOf(document.activeElement); i <= 0 ? $("#cpickQ").focus() : all[i - 1].focus(); }
});
document.addEventListener("click", async (e) => {
  const t = e.target.closest("button, a"); if (!t) return;
  if (t.id === "refreshBtn"){ if (view === "subs" && isAdmin){ await loadSubs(); return; } await refresh(true); return; }
  if (t.hasAttribute("data-cpick")){ pickOpen = !pickOpen; renderAdminBar(); if (pickOpen){ const i = $("#cpickQ"); if (i) i.focus(); if (!subs && !subsLoading) loadSubsQuiet(); } return; }
  if (t.dataset.cgo){ goClient(t.dataset.cgo); return; }
  if (t.hasAttribute("data-subs-open")){ view = "subs"; window.scrollTo(0, 0); if (!subs) await loadSubs(); else render(); return; }
  if (t.hasAttribute("data-subs-close")){ view = "review"; render(); return; }
  if (t.hasAttribute("data-subs-reload")){ await loadSubs(); return; }
  if (t.dataset.subsStatus){ subsF.status = t.dataset.subsStatus; render(); return; }
  if (t.dataset.subdel){
    // v9: delete one submission from the Submissions view (any client). Two clicks to confirm.
    const id = t.dataset.subdel, c = t.dataset.client, k = "s:" + id;
    if (armed !== k){ armed = k; render(); setTimeout(() => { if (armed === k){ armed = null; render(); } }, 4000); return; }
    armed = null; if (busy){ toast("Still saving, one moment…"); return; }
    busy = true; toast("Deleting…");
    try {
      if (SAVE_URL){ const j = await postJSON({action:"admin_delete", client:c, ids:[id]}); if (!j.ok || !j.deleted) throw new Error(j.error || "Not found"); }
      if (subs) subs.rows = subs.rows.filter(r => r.id !== id);
      responses = responses.filter(r => r.id !== id);
      toast("Deleted");
    } catch(err){ toast("Couldn't delete: " + err.message); } finally { busy = false; }
    render(); return;
  }
  if (t.dataset.del){
    const id = t.dataset.del;
    if (armed !== id){ armed = id; render(); setTimeout(() => { if (armed === id){ armed = null; render(); } }, 4000); return; }
    armed = null; if (busy){ toast("Still saving, one moment…"); return; }
    busy = true; toast("Deleting…");
    try { await adminDelete([id]); toast("Deleted"); } catch(err){ toast("Couldn't delete: " + err.message); } finally { busy = false; }
    render(); return;
  }
  if (t.hasAttribute("data-newround")){
    if (armed !== "newround"){ armed = "newround"; render(); setTimeout(() => { if (armed === "newround"){ armed = null; render(); } }, 5000); return; }
    armed = null; const nv = nextVersion(auto.version);
    await guarded(null, async () => { try { await adminEdit(auto.id, "version", nv); applyContent(); adminForm = null; unlockUI(); toast("New review round started · v" + nv); render(); } catch(err){ toast("Couldn't save: " + err.message); } });
    return;
  }
  if (t.hasAttribute("data-clear")){
    if (armed !== "clear"){ armed = "clear"; render(); setTimeout(() => { if (armed === "clear"){ armed = null; render(); } }, 5000); return; }
    armed = null;
    const ids = responses.filter(r => r.automation === auto.id).map(r => r.id);
    if (!ids.length){ toast("Nothing to clear"); render(); return; }
    try { await adminDelete(ids); toast("Cleared " + ids.length + " response" + (ids.length > 1 ? "s" : "")); } catch(err){ toast("Couldn't clear: " + err.message); }
    render(); return;
  }
  if (t.dataset.admin){ adminForm = adminForm === t.dataset.admin ? null : t.dataset.admin; render(); return; }
  if (t.hasAttribute("data-admin-cancel")){ adminForm = null; render(); return; }
  if (t.hasAttribute("data-admin-exit")){ signOut(); return; }
  if (t.dataset.auto){ e.preventDefault(); adminForm = null; autoId = t.dataset.auto; auto = data.automations.find(a=>a.id===autoId); selected = null; history.replaceState(null,"",t.getAttribute("href")); render(); window.scrollTo(0,0); return; }
  if (t.dataset.step){ selected = selected === t.dataset.step && matchMedia("(max-width:980px)").matches ? null : t.dataset.step; render(); return; }
});
document.addEventListener("change", (e) => {
  if (e.target.id === "autoSelect"){
    adminForm = null; autoId = e.target.value; auto = data.automations.find(a => a.id === autoId);
    selected = matchMedia("(max-width:980px)").matches ? null : (reviewable().find(s => stepState(s.id) === "pending") || auto.steps[0]).id;
    const u = new URL(location.href); u.searchParams.set("a", autoId); history.replaceState(null, "", u.toString());
    render(); window.scrollTo(0, 0);
  }
  if (e.target.id === "clientSelect" && e.target.value && e.target.value !== clientKey){
    const u = new URL(location.href); u.search = "?c=" + encodeURIComponent(e.target.value); location.href = u.toString();
  }
});
document.addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = e.target; const kind = f.dataset.form;
  const s = auto.steps.find(x=>x.id===selected);
  if (kind === "clientname"){
    const v = $("#cnameIn").value.trim(); if (!v){ $("#cnameIn").focus(); return; }
    if (v === data.client.name && (clientNames[clientKey] || v) === v){ adminForm = null; render(); toast("No changes"); return; }
    await guarded(f, async () => { try { await adminEdit("", "client:name", v); applyContent(); clientNames[clientKey] = v; adminForm = null; unlockUI(); toast("Client name saved"); render(); }
    catch(err){ toast("Couldn't save: " + err.message); } });
    return;
  }
  if (kind === "details"){
    const changes = [["name", $("#ad-name").value.trim()], ["summary", $("#ad-summary").value.trim()]]
      .filter(([k, v]) => v && v !== String(auto[k]));
    (auto.glance || []).forEach((g, i) => {
      const l = $("#ag-l" + i).value.trim(), v = $("#ag-v" + i).value.trim();
      if (l !== String(g[0])) changes.push(["glance:" + i + ":label", l]);
      if (v !== String(g[1])) changes.push(["glance:" + i + ":value", v]);
    });
    if (!changes.length){ adminForm = null; render(); return; }
    await guarded(f, async () => { try { for (const [k, v] of changes) await adminEdit(auto.id, k, v); applyContent(); adminForm = null; unlockUI(); toast("Saved"); render(); }
    catch(err){ toast("Couldn't save: " + err.message); } });
    return;
  }
  if (kind === "stepadmin"){
    const val = (id) => { const el = $(id); return el ? el.value.trim() : null; };
    const edits = [["title", val("#as-title")], ["when", val("#as-when")], ["gap", val("#as-gap")], ["body", val("#as-body")], ["note", val("#as-note")]]
      .filter(([k, v]) => v !== null && v !== String(s[k] || ""));
    if (!edits.length){ adminForm = null; render(); return; }
    await guarded(f, async () => { try { for (const [k, v] of edits) await adminEdit(auto.id, "step:" + s.id + ":" + k, v); applyContent(); adminForm = null; unlockUI(); toast("Step saved"); render(); }
    catch(err){ toast("Couldn't save: " + err.message); } });
    return;
  }
  if (kind === "qadmin"){
    const q = auto.questions.find(x => x.id === f.dataset.qid); if (!q) return;
    const opts = $("#aq-opts").value.split("\n").map(x => x.trim()).filter(Boolean);
    const edits = [["text", $("#aq-text").value.trim()], ["why", $("#aq-why").value.trim()], ["options", opts.join("\n")]]
      .filter(([k, v]) => v !== (k === "options" ? (q.options || []).join("\n") : String(q[k] || "")));
    if (!opts.length){ toast("Add at least one answer button"); return; }
    if (!edits.length){ adminForm = null; render(); return; }
    await guarded(f, async () => { try { for (const [k, v] of edits) await adminEdit(auto.id, "q:" + q.id + ":" + k, v); applyContent(); adminForm = null; unlockUI(); toast("Question saved"); render(); }
    catch(err){ toast("Couldn't save: " + err.message); } });
    return;
  }
  if (kind === "copyadmin"){
    const edits = s.sms ? [["sms", $("#ac-sms").value.trim()]] : [["email.subject", $("#ac-subj").value.trim()], ["email.body", $("#ac-body").value.trim()]];
    const cur0 = { "sms": s.sms, "email.subject": s.email && s.email.subject, "email.body": s.email && s.email.body };
    const changes = edits.filter(([k, v]) => v !== String(cur0[k] || ""));
    await guarded(f, async () => { try { for (const [k, v] of changes) await adminEdit(auto.id, "step:" + s.id + ":" + k, v); applyContent(); adminForm = null; unlockUI(); toast(changes.length ? "Copy saved" : "No changes"); render(); }
    catch(err){ toast("Couldn't save: " + err.message); } });
    return;
  }
  if (kind === "status"){
    const stVal = f.elements.status.value, reply = f.elements.reply.value.trim();
    if (stVal === ST.UPD && !reply){ toast("Add a short note so the client knows what changed"); f.elements.reply.focus(); return; }
    await guarded(f, async () => { try {
      const row = await adminStatus(f.dataset.id, stVal, reply, f.dataset.client);
      if (row && subs){ const i = subs.rows.findIndex(x => x.id === row.id); if (i > -1) subs.rows[i] = Object.assign(subs.rows[i], row);
        subs.log.push({timestamp:new Date().toISOString(), client:row.client, request_id:row.id, event:"status", status:stVal, note:reply, by:ME.first}); }
      unlockUI(); toast("Status saved"); render(); }
    catch(err){ toast("Couldn't save: " + err.message); } });
    return;
  }

});
let wasNarrow = matchMedia("(max-width:980px)").matches;
matchMedia("(max-width:980px)").addEventListener("change", (m) => { if (m.matches !== wasNarrow){ wasNarrow = m.matches; if (data) render(); } });

/* ---------- boot ---------- */
async function boot(){
  if (!SAVE_URL){ const b = $("#banner"); b.hidden = false; b.textContent = "Demo mode: responses are saved only in this browser until the Google Sheet connection is set up."; }
  const logo = document.querySelector(".logochip img"); if (logo) logo.src = BASE + "assets/lfmp-logo.png";
  if (!clientKey){ $("#app").innerHTML = '<div class="empty">Open the classic editor from the <a href="' + esc(REVIEW_ADMIN) + '">Review admin</a> (a client\'s Details → ⋯ → Classic editor (old)).</div>'; return; }
  // Google sign-in (Cloudflare Access) first: no sign-in → the sign-in page. Then the review backend, through the server.
  try { ME = await startSession(); } catch(e){ if (e.status !== 401) $("#app").innerHTML = '<div class="empty">' + esc(e.message) + '</div>'; return; }
  const j = await ping();
  if (j.ok){ isAdmin = true; adminClients = j.clients || []; Object.assign(clientNames, j.names || {}); }
  else signInError = j.error || "The review backend didn't answer.";
  const ok = await refresh(false);
  if (!ok) return;
  if (view === "subs"){ if (isAdmin) { await loadSubs(); return; } view = "review"; }
  if (!matchMedia("(max-width:980px)").matches) selected = (reviewable().find(s => stepState(s.id) === "pending") || auto.steps[0]).id;
  render();
}
// Reload the data file and everything saved in the Sheet. Used on load and by the Refresh button.
async function refresh(manual){
  const btn = $("#refreshBtn"); if (btn){ btn.disabled = true; btn.textContent = "↻ Refreshing…"; }
  try {
    try {
      const r = await fetch(BASE + "data/" +clientKey + ".json?t=" + Date.now(), {cache:"no-store"});
      if (!r.ok) throw new Error("not found");
      baseData = await r.json();
      // A client with a custom review page (data file "customPage") is still edited here: no redirect on this team page.
    } catch(e){
      if (!baseData){ $("#app").innerHTML = '<div class="empty">We couldn\'t find this review. Please check the link LFMP sent you.</div>'; return false; }
    }
    // Show the automation straight away, then fill in saved responses when the Sheet answers.
    applyContent();
    if (!rendered){
      if (!matchMedia("(max-width:980px)").matches) selected = (reviewable()[0] || auto.steps[0]).id;
      render(); rendered = true;
      $("#updated").textContent = SAVE_URL ? "Loading saved responses…" : "";
    } else if (manual){ $("#updated").textContent = "Refreshing…"; }
    try { const all = await loadAll(); responses = normRows(all.rows); content = all.content; revlog = all.log || []; lastLoaded = new Date(); loaded = true; loadFailed = false; }
    catch(e){ loadFailed = !loaded; toast("Couldn't load saved responses. Try Refresh again in a moment."); }
    applyContent();
    if (selected && !auto.steps.some(x => x.id === selected)) selected = null;
    render(); if (manual) toast("Up to date");
    return true;
  } finally {
    if (btn){ btn.disabled = false; btn.textContent = "↻ Refresh"; }
  }
}
boot();
