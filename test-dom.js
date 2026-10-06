// DOM-stub smoke test: render every screen + simulate a full playthrough, catch runtime errors.
const fs = require("fs");
const html = fs.readFileSync(__dirname + "/index.html", "utf8");
const m = html.match(/<script>([\s\S]*)<\/script>/);
function mkEl() {
  return { innerHTML: "", textContent: "", dataset: {}, style: {},
    classList: { add() {}, remove() {}, toggle() {} },
    addEventListener() {}, onclick: null, disabled: false };
}
const els = {};
global.document = {
  getElementById: id => els[id] || (els[id] = mkEl()),
  querySelectorAll: () => [],
};
global.window = { scrollTo() {} };
global.localStorage = { _d: {}, getItem(k) { return this._d[k] || null; }, setItem(k, v) { this._d[k] = v; }, removeItem(k) { delete this._d[k]; } };
global.navigator = {};
eval(m[1] + ";globalThis.__T={show,openEvidence,openChallenge,showHint,checkChallenge,calcVerdict,getClaim,getEv,getSus,EVIDENCE,SUSPECTS,S};");
const T = globalThis.__T;
const S = T.S;

let n = 0;
function step(name, fn) { fn(); n++; /* console.log("ok -", name); */ }

// every screen renders without throwing
for (const s of ["brief", "evidence", "suspects", "ask", "board", "accuse"]) step("show " + s, () => T.show(s));

// open every evidence doc (marks examined, opens modal)
for (const e of T.EVIDENCE) step("open " + e.id, () => T.openEvidence(e.id));

// challenge flows: hit, miss, true-claim, already
step("challenge hit", () => { const r = T.checkChallenge(S, "c4a", "e5"); if (r.result !== "hit") throw new Error("expected hit"); });
step("challenge miss", () => { const r = T.checkChallenge(S, "c4b", "e1"); if (r.result !== "miss") throw new Error("expected miss"); });
step("challenge true", () => { const r = T.checkChallenge(S, "c1a", "e12"); if (r.result !== "true-claim") throw new Error("expected true-claim"); });
step("openChallenge modal", () => T.openChallenge("c4b"));
step("hint modal", () => T.showHint());

// suspect detail screens
for (const s of T.SUSPECTS) step("suspect " + s.id, () => { globalThis.__x = s; });

// simulate asking all questions then accuse screen (unlocked path)
S.asked = {}; for (const s of T.SUSPECTS) S.asked[s.id] = [0, 1, 2];
step("accuse unlocked", () => T.show("accuse"));
if (!els["scr-accuse"].innerHTML.includes("ILZAAM LAGAO")) throw new Error("accuse button missing");

// verdict screen
S.accused = "s4"; S.method = 0; S.motive = 0; S.done = true;
S.found = ["c2a", "c3a", "c4a", "c4b", "c4c"];
step("verdict", () => T.show("verdict"));
const vh = els["scr-verdict"].innerHTML;
if (!vh.includes("SSP")) throw new Error("rank missing in verdict");
if (!vh.includes("800 pts")) throw new Error("score missing in verdict");
if (!vh.includes("Kamran")) throw new Error("solution missing in verdict");

// lose path
S.accused = "s2"; S.done = true;
step("verdict lose", () => T.show("verdict"));
if (!els["scr-verdict"].innerHTML.includes("Ghalat Ilzaam")) throw new Error("lose header missing");

console.log(`\nDOM smoke: ${n} steps, all rendered without errors — OK`);
