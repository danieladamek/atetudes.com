/* isolation.test.mjs — THE SAFETY NET, used the way engine/README.md says.
 *
 * "The characterization tests are read-only. They load the shipped
 *  static/studies/triadetudes/study.html verbatim and pin its current
 *  behaviour... When Phase B extracts the hub, these tests are the safety net —
 *  the extracted engine must produce identical output before the study file is
 *  regenerated."
 *
 * This is that moment. engine/isolation.mjs must reproduce the shipped
 * optimizer EXACTLY, over a derived corpus rather than a few hand-picked
 * cases: every key × scale × string set × placement, with the study's own
 * default pivots and with deliberately uneven windows (where the zone's two
 * centres differ and a careless refactor would drift invisibly).
 *
 * The oracle is the shipped page. Nothing here modifies it.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { loadTriadetudesEngine, unwrap } from "./_load-triadetudes.mjs";
import { makeZone, chooseVoicings, lineVoicing, voiceLeadCost, placementCost,
  meanFret, movementTotal, PLACEMENTS } from "../isolation.mjs";

const eng = loadTriadetudesEngine();
const st = eng.st;

const SETS = [[1, 2, 3], [2, 3, 4], [3, 4, 5], [4, 5, 6]];
const KEYS = ["C", "F", "Bb", "E", "Ab", "D"];
const SCALES = Object.keys(unwrap(eng.SCALES));
const PROGS = ["cycle4", "cycle6", "cycle3", "diatonic"];

/** put the shipped engine into a state and harvest what it produces */
function shipped(cfg) {
  st.key = cfg.key;
  st.scaleType = cfg.scaleType;
  st.set = [...cfg.set];
  st.prog = cfg.prog ?? "cycle4";
  st.startDeg = 0;
  st.harmonyMode = "build";
  eng.defaultPivots();
  if (cfg.pivotFrets) { st.pivotString = cfg.pivotString; st.pivotFrets = [...cfg.pivotFrets]; }
  st.placement = cfg.placement;
  const seq = eng.buildSequence();
  return { seq, voic: eng.chooseVoicings(seq) };
}

/** the same problem posed to the extracted engine: the zone is a VALUE, the
 * candidate geometry is injected */
function extracted(cfg, seq) {
  const s = st.setLowHigh;
  const zone = makeZone({ string: st.pivotString, frets: st.pivotFrets });
  const OPEN = unwrap(eng.OPEN), NFRETS = eng.NFRETS;
  const zoneNotes = st.pivotFrets.map((f) => ({ string: st.pivotString, fret: f,
    midi: OPEN[st.pivotString] + f }));
  const positionsFor = (pc) => {
    const out = [];
    for (const sn of st.set)
      for (let f = 0; f <= NFRETS + 2; f++)
        if ((OPEN[sn] + f) % 12 === pc) out.push({ string: sn, fret: f, midi: OPEN[sn] + f });
    return out;
  };
  return chooseVoicings(seq, {
    zone, placement: cfg.placement, setLowHigh: unwrap(s), nfrets: NFRETS,
    candidatesFor: (ch) => unwrap(eng.voicingsFor(ch, s)),
    lineVoicingFor: (ch) => lineVoicing(unwrap(eng.triadPcs(ch.rootPc, ch.q)),
      { zone, zoneNotes, positionsFor, setLowHigh: unwrap(s) }),
  });
}

test("§5 stage 2: the extracted optimizer reproduces every shipped étude — grip and free", () => {
  let cases = 0;
  for (const key of KEYS)
    for (const scaleType of SCALES)
      for (const set of SETS)
        for (const prog of PROGS)
          for (const placement of ["grip", "free"]) {
            const cfg = { key, scaleType, set, prog, placement };
            const { seq, voic } = shipped(cfg);
            const mine = extracted(cfg, seq);
            assert.deepEqual(unwrap(mine), unwrap(voic),
              `drift in ${key} ${scaleType} set ${set.join("-")} ${prog} ${placement} — ` +
              `the shipped étude is the specification, not a starting point`);
            cases++;
          }
  assert.ok(cases >= 500, `corpus too small to mean anything (${cases} cases)`);
});

test("§5 stage 2: line placement reproduces the shipped rule §6.1.2", () => {
  let cases = 0;
  for (const key of KEYS)
    for (const set of SETS) {
      const cfg = { key, scaleType: "major", set, prog: "cycle4", placement: "line" };
      const { seq, voic } = shipped(cfg);
      assert.deepEqual(unwrap(extracted(cfg, seq)), unwrap(voic),
        `line drift in ${key} set ${set.join("-")}`);
      cases++;
    }
  assert.ok(cases >= 20);
});

test("§5 stage 2: UNEVEN windows — where the zone's two centres part company", () => {
  // mean is (min+max)/2 and centre is the average; they differ the moment the
  // window is not evenly spaced. A refactor that collapsed them would pass a
  // default-pivot corpus and change every hand-set étude.
  const WINDOWS = [[1, 3, 8], [0, 2, 9], [2, 7, 13], [5, 6, 13]];
  for (const frets of WINDOWS) {
    const z = makeZone({ string: 2, frets });
    assert.notEqual(z.mean, z.centre, `window ${frets.join("·")} must exercise the distinction`);
    for (const placement of ["grip", "free", "line"]) {
      const cfg = { key: "C", scaleType: "major", set: [1, 2, 3], prog: "cycle4",
        placement, pivotString: 2, pivotFrets: frets };
      const { seq, voic } = shipped(cfg);
      assert.deepEqual(unwrap(extracted(cfg, seq)), unwrap(voic),
        `drift on the uneven window ${frets.join("·")} under ${placement}`);
    }
  }
});

test("§5 stage 2: the cost terms themselves are identical, not just their winner", () => {
  const cfg = { key: "C", scaleType: "major", set: [1, 2, 3], prog: "cycle4", placement: "grip" };
  const { seq } = shipped(cfg);
  const s = st.setLowHigh, pi = unwrap(s).indexOf(st.pivotString);
  const zone = makeZone({ string: st.pivotString, frets: st.pivotFrets });
  const pmin = Math.min(...st.pivotFrets), pmax = Math.max(...st.pivotFrets);
  let prev = null, compared = 0;
  for (const ch of seq) {
    for (const v of unwrap(eng.voicingsFor(ch, s))) {
      assert.equal(voiceLeadCost(v, prev), eng.voiceLeadCost(v, prev), "voiceLeadCost drift");
      assert.equal(
        placementCost(v, prev, pi, zone, 4, 0.5),
        eng.placementCost(v, prev, pi, pmin, pmax, (pmin + pmax) / 2, 4, 0.5),
        "placementCost drift");
      assert.equal(meanFret(v), eng.meanFret(v), "meanFret drift");
      compared++;
    }
    prev = unwrap(eng.chooseVoicings([ch]))[0];
  }
  assert.ok(compared > 20);
  const voic = unwrap(eng.chooseVoicings(seq));
  assert.equal(movementTotal(voic), eng.movementTotal(voic), "movementTotal drift");
});

test("§5 stage 2: the zone is a VALUE — the constraint poses without the app", () => {
  // the point of the extraction: a caller with no Triadetudes state, no
  // globals and its own candidate geometry can still ask for the isolation
  // box. Two voicings, one inside the window and one outside it, and the
  // constraint must prefer the one inside.
  const zone = makeZone({ string: 2, frets: [1, 3, 5] });
  const inside = { notes: [{ string: 3, fret: 2, midi: 57, slot: 0 },
    { string: 2, fret: 3, midi: 62, slot: 1 }, { string: 1, fret: 5, midi: 69, slot: 2 }] };
  const far = { notes: [{ string: 3, fret: 14, midi: 69, slot: 0 },
    { string: 2, fret: 13, midi: 72, slot: 1 }, { string: 1, fret: 17, midi: 81, slot: 2 }] };
  const chosen = chooseVoicings([{}], { zone, placement: "grip", setLowHigh: [3, 2, 1],
    candidatesFor: () => [far, inside], nfrets: 15 });
  assert.deepEqual(chosen[0], inside, "grip must pull the voicing into the zone");
  const free = chooseVoicings([{}], { zone, placement: "free", setLowHigh: [3, 2, 1],
    candidatesFor: () => [far, inside], nfrets: 15 });
  assert.deepEqual(free[0], inside,
    "free drops the pivot term but keeps the seed anchor — the étude BEGINS in the zone");
  assert.equal(zone.cost(3), 0, "a window fret is free");
  assert.equal(zone.cost(4), 1.5, "inside the window is cheap");
  assert.equal(zone.cost(9), 4, "outside it costs the distance to the nearer edge");
});

test("§5 stage 2: an unknown placement fails by name, and the named rules are the shipped three", () => {
  assert.deepEqual(Object.keys(PLACEMENTS), ["grip", "free", "line"]);
  assert.throws(() => chooseVoicings([], { zone: makeZone({ string: 2, frets: [1] }),
    placement: "box", setLowHigh: [3, 2, 1], candidatesFor: () => [] }),
    /unknown placement "box" — the named ones are grip, free, line/);
  assert.throws(() => makeZone({ string: 9, frets: [1] }), /must be a real string/);
  assert.throws(() => makeZone({ string: 2, frets: [] }), /one or more frets/);
});
