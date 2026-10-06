// Node smoke test for Khooni Mehndi game logic.
// Extracts the <script> from index.html, evals it with no DOM, tests pure logic.
const fs = require("fs");
const html = fs.readFileSync(__dirname + "/index.html", "utf8");
const m = html.match(/<script>([\s\S]*)<\/script>/);
if (!m) { console.error("FAIL: no script found"); process.exit(1); }
eval(m[1] + "\n;globalThis.__T={EVIDENCE,SUSPECTS,FOLDERS,HINTS,METHODS,MOTIVES,KILLER,TRUE_METHOD,TRUE_MOTIVE,RANKS,getEv,getSus,getClaim,totalQuestions,askedCount,canAccuse,checkChallenge,calcVerdict,progressInfo,freshState};");
const {EVIDENCE,SUSPECTS,FOLDERS,HINTS,METHODS,MOTIVES,KILLER,TRUE_METHOD,TRUE_MOTIVE,RANKS,getEv,getSus,getClaim,totalQuestions,askedCount,canAccuse,checkChallenge,calcVerdict,progressInfo,freshState} = globalThis.__T;

let pass = 0, fail = 0;
function ok(cond, name) {
  if (cond) { pass++; /* console.log("ok -", name); */ }
  else { fail++; console.error("FAIL -", name); }
}

// ---- data integrity ----
ok(EVIDENCE.length === 16, "16 evidence items, got " + EVIDENCE.length);
ok(new Set(EVIDENCE.map(e => e.id)).size === EVIDENCE.length, "evidence ids unique");
ok(EVIDENCE.every(e => FOLDERS.includes(e.folder)), "every evidence folder valid");
ok(SUSPECTS.length === 5, "5 suspects");
ok(SUSPECTS.every(s => s.questions.length === 3), "3 questions per suspect");
ok(getSus(KILLER).name === "Kamran Shah", "killer is Kamran Shah");
ok(METHODS[TRUE_METHOD].includes("Zolpidem"), "true method = zolpidem");
ok(MOTIVES[TRUE_MOTIVE].includes("chori"), "true motive = embezzlement");
let lieCount = 0;
for (const s of SUSPECTS) for (const c of s.claims) {
  const g = getClaim(c.id);
  ok(!!g, "claim lookup " + c.id);
  if (c.lie) { lieCount++; ok(!!getEv(c.contra), "contra evidence exists for " + c.id); }
}
ok(lieCount === 5, "5 lies planted, got " + lieCount);
ok(HINTS.length === 3, "3 hints");

// ---- challenge logic ----
let st = freshState();
let r = checkChallenge(st, "c4a", "e5");
ok(r.result === "hit" && r.points === 100, "correct challenge = hit +100");
ok(st.found.includes("c4a"), "found recorded");
r = checkChallenge(st, "c4a", "e5");
ok(r.result === "already", "repeat challenge = already (no double points)");
r = checkChallenge(st, "c4b", "e1");
ok(r.result === "miss", "wrong evidence = miss");
ok(!st.found.includes("c4b"), "miss not recorded");
r = checkChallenge(st, "c1a", "e12");
ok(r.result === "true-claim", "true claim verifies, no points");
ok(st.verified.includes("c1a"), "verified recorded");

// ---- gating ----
ok(canAccuse(st) === false, "cannot accuse at start");
st.examined = EVIDENCE.map(e => e.id);
ok(canAccuse(st) === false, "cannot accuse with evidence but no questions");
for (const s of SUSPECTS) st.asked[s.id] = [0, 1, 2];
ok(canAccuse(st) === true, "can accuse when all examined + asked");
ok(askedCount(st) === 15 && totalQuestions() === 15, "15 questions total");

// ---- verdict: perfect game ----
st.accused = KILLER; st.method = TRUE_METHOD; st.motive = TRUE_MOTIVE;
st.found = ["c2a", "c3a", "c4a", "c4b", "c4c"];
let v = calcVerdict(st);
ok(v.score === 800, "perfect score 800, got " + v.score);
ok(v.rank === "SSP — Super Sleuth", "rank SSP, got " + v.rank);
ok(v.killerOk && v.methodOk && v.motiveOk, "all correct flags");

// ---- verdict: wrong killer, partial ----
let st2 = freshState();
st2.found = ["c2a"]; st2.accused = "s2"; st2.method = 1; st2.motive = 2;
let v2 = calcVerdict(st2);
ok(v2.score === 100 && !v2.killerOk, "wrong killer keeps lie points only, got " + v2.score);
ok(v2.rank === "Chowkidar", "low score rank Chowkidar, got " + v2.rank);

// ---- verdict: hints penalty ----
let st3 = freshState();
st3.found = ["c4a", "c4b"]; st3.hints = [0, 1];
st3.accused = KILLER; st3.method = TRUE_METHOD; st3.motive = TRUE_MOTIVE;
let v3 = calcVerdict(st3);
ok(v3.score === 200 + 50 + 50 + 200 - 50, "hints -25 each, got " + v3.score); // 450

// ---- rank thresholds ----
const rankFor = s => { const t = freshState(); t.accused = KILLER; return calcVerdict(t).rank; };
ok(calcVerdict(Object.assign(freshState(), {found: ["c2a","c3a","c4a","c4b","c4c"], accused: KILLER, method: 1, motive: 1})).score === 700, "5 lies + killer = 700");
ok(calcVerdict(Object.assign(freshState(), {found: ["c2a","c3a","c4a","c4b","c4c"], accused: KILLER, method: 1, motive: 1})).rank === "Inspector", "700 = Inspector");

// ---- progress ----
const p = progressInfo(st);
ok(p.ev === "16/16" && p.q === "15/15" && p.lies === "5/5", "progress string ok: " + JSON.stringify(p));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
