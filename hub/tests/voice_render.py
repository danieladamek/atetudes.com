"""voice_render.py — the voices, heard by an offline render (261121b; *Pad - rootless and rounder, held through the
barline* and *Voices - tone, pluck, sustain and bass, as picked by ear*).

Sound cannot be looked at, so this renders it. The built Multetudes door is loaded with its AudioContext swapped for an
OfflineAudioContext (the card's own `new AudioContext()` gets it; nothing in the door is changed), the card is armed by
a real pointerdown, and notes reach it the way every note does — as NOTE messages on the bus, the voice chosen on the
Mixer's own select (#fdVoice). The render is then read where the effect is (rule 3):

  1. THE PAD HOLDS THE BARLINE — two consecutive pad chords (Bbmaj7 then Ebmaj7 by the fourths, their rootless seats
     D F A and D G Bb, in the walk's own NOTE shape: `role: "pad"`, `dur` = the bar), at 60 and 160 bpm: the rendered
     level in 5 ms windows across the chord change never falls below 10 % of the held level. MEASURED 261121b: v1.1.20
     (released to zero AT the change, swelled back from zero) dips to 0.8 % at 60 bpm and 0.3 % at 160 — silence; the
     held barline's lowest is 31.8 % and 29.9 %. The floor sits between, not at the new reading, because ±2 ¢ BEATS:
     a pair 4 ¢ apart at D5 swells and fades about 1.4 times a second, so the held pad breathes too, by design (Daniel's
     pick). Run with `--build <old door>` to see the red.
  2. NO VOICE CLICKS — each voice (tone, pluck, sustain, bass, pad) renders ONE note alone at the lengths the clock gives
     a beat at 60 and at 160 bpm (1 s, 0.375 s) and the walk's own 0.7 s: the rendered signal takes ≥ 0.5 ms to reach
     half its peak after the source starts and ≥ 1 ms to fall from half its peak to the source's stop, and sits under
     1 % of its peak over the last millisecond before the stop. A note that starts at full level (the v1.1.20 pluck)
     reaches half its peak in the first samples.
  3. THE SOURCE COUNT — per NOTE, the oscillators and buffers started: tone 2, sustain 2, pad 2 (a detuned pair), pluck
     one buffer, bass one oscillator; each pair at −d and +d cents as the voice describes.
  4. THE CEILING — the densest corpus étude (most sounded notes per beat, derived from engine/etude-timeline.mjs, never
     named here) at the clock's fastest tempo (300), in the sustain voice with the pad on, played in real time: the peak
     count of live sources, against the audio card's `live > 240` ceiling. Printed; asserted under it.

Zero page errors and console errors throughout. Prints its assertion count and the measured numbers; exits 1 on any
failure. `--build PATH` renders another built door (the old one, for the red).
"""
import json, subprocess, sys
from pathlib import Path
from playwright.sync_api import sync_playwright

REPO = Path(__file__).resolve().parent.parent.parent
BUILD = Path(sys.argv[sys.argv.index("--build") + 1]).resolve() if "--build" in sys.argv else REPO / "hub" / "build" / "multetudes.html"
SR = 48000
fails, n = [], 0


def check(ok, msg):
    global n
    n += 1
    if not ok:
        fails.append(msg)
    return ok


# the offline swap: the card's `new Ctor()` receives an OfflineAudioContext; its resume() is a no-op until rendering
# (an offline context refuses resume before it renders), and every source's start/stop and pitch is recorded
OFFLINE = """(() => {
  const Off = window.OfflineAudioContext;
  window.__ctx = null; window.__srcs = [];
  window.AudioContext = function () {
    const c = new Off(1, %d * window.__secs, %d);
    c.__resume = c.resume.bind(c); c.resume = () => Promise.resolve();
    window.__ctx = c; return c;
  };
  for (const C of [OscillatorNode, AudioBufferSourceNode]) {
    const s0 = C.prototype.start, p0 = C.prototype.stop;
    C.prototype.start = function (when = 0, ...a) {
      const rec = { kind: this instanceof OscillatorNode ? 'osc' : 'buf', start: when, stop: null,
        hz: this instanceof OscillatorNode ? this.frequency.value : null, cents: this instanceof OscillatorNode ? this.detune.value : null };
      this.__rec = rec; window.__srcs.push(rec); return s0.call(this, when, ...a);
    };
    C.prototype.stop = function (when = 0, ...a) { if (this.__rec) this.__rec.stop = when; return p0.call(this, when, ...a); };
  }
})();""" % (SR, SR)

# the render: NOTE messages grouped by time; time 0 now, later ones at an offline suspend (the card schedules each at
# currentTime + 0.02, so a group's onset is its suspend time + 0.02); returns the samples' analysis, not the samples
RENDER = """async ({ groups }) => {
  const c = window.__ctx;
  const say = (m) => document.dispatchEvent(new CustomEvent('atetudes:note', { detail: m }));
  for (const [at, notes] of groups) {
    if (at === 0) { notes.forEach(say); continue; }
    c.suspend(at).then(() => { notes.forEach(say); c.__resume(); });
  }
  const buf = await c.startRendering();
  const x = buf.getChannelData(0);
  window.__x = x;
  return { len: x.length, srcs: window.__srcs };
}"""

# the edges of ONE note rendered alone: rise to half peak, fall from half peak to the stop, the last millisecond
EDGES = """({ s, e }) => {
  const x = window.__x, sr = %d, a = Math.round(s * sr), b = Math.min(x.length, Math.round(e * sr));
  let P = 0; for (let i = a; i < b; i++) P = Math.max(P, Math.abs(x[i]));
  let up = a; while (up < b && Math.abs(x[up]) < P / 2) up++;
  let dn = b - 1; while (dn > a && Math.abs(x[dn]) < P / 2) dn--;
  let tail = 0; for (let i = Math.max(a, b - Math.round(sr / 1000)); i < b; i++) tail = Math.max(tail, Math.abs(x[i]));
  return { peak: P, rise_ms: (up - a) / sr * 1000, fall_ms: (b - dn) / sr * 1000, tail_rel: P ? tail / P : 1 };
}""" % SR

# the level across a chord change: RMS in 5 ms windows over [t-0.3, t+0.3], against the held level before it
CHANGE = """({ t }) => {
  const x = window.__x, sr = %d, w = Math.round(sr * 0.005);
  const rms = (a) => { let q = 0; for (let i = a; i < a + w; i++) q += x[i] * x[i]; return Math.sqrt(q / w); };
  const held = []; for (let a = Math.round((t - 0.6) * sr); a < Math.round((t - 0.35) * sr); a += w) held.push(rms(a));
  held.sort((p, q) => p - q); const ref = held[held.length >> 1];
  let lo = Infinity, at = null; for (let a = Math.round((t - 0.3) * sr); a < Math.round((t + 0.3) * sr); a += w) { const r = rms(a); if (r < lo) { lo = r; at = a / sr; } }
  return { held: ref, low: lo, low_at: at, rel: ref ? lo / ref : 0 };
}""" % SR


def booted(browser, secs, voice=None):
    """a fresh page of the built door, offline, armed, the note voice chosen on the Mixer's select"""
    pg = browser.new_page(viewport={"width": 1280, "height": 900})
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
    pg.add_init_script(f"window.__secs = {secs};" + OFFLINE)
    pg.goto(BUILD.as_uri()); pg.wait_for_selector("#fdVoice", state="attached"); pg.wait_for_timeout(300)
    if voice:
        pg.select_option("#fdVoice", voice); pg.wait_for_timeout(50)
    pg.evaluate("() => document.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))")
    pg.wait_for_timeout(50)
    pg.evaluate("() => { window.__srcs.length = 0; }")
    return pg, errs


def main():
    hz = lambda m: 440 * 2 ** ((m - 69) / 12)
    with sync_playwright() as p:
        b = p.chromium.launch()
        # ---- 1. the pad across a chord change, at 60 and 160 bpm ----
        for bpm in (60, 160):
            bar = 4 * 60 / bpm
            pg, errs = booted(b, round(bar * 2 + 1.5))
            first = [{"midi": m, "role": "pad", "dur": bar} for m in (74, 77, 81)]    # Bbmaj7's pad: D F A
            second = [{"midi": m, "role": "pad", "dur": bar} for m in (74, 79, 82)]   # Ebmaj7's: D G Bb
            out = pg.evaluate(RENDER, {"groups": [[0, first], [bar, second]]})
            change = round(bar * SR / 128) * 128 / SR + 0.02   # the suspend lands on a render quantum
            ch = pg.evaluate(CHANGE, {"t": change})
            print(f"  pad @{bpm} bpm: held RMS {ch['held']:.5f}, lowest 5 ms RMS across the change {ch['low']:.5f} "
                  f"at {ch['low_at']:.3f} s ({ch['rel'] * 100:.1f} % of held)")
            check(ch["held"] > 0, f"pad @{bpm}: the render is silent — nothing sounded ({out['srcs'][:2]})")
            check(ch["rel"] >= 0.10, f"pad @{bpm}: the pad falls to {ch['rel'] * 100:.1f} % of its held level at the chord change "
                  f"(t = {ch['low_at']:.3f} s) — it must hold through the barline")
            check(not errs, f"pad @{bpm}: errors {errs[:2]}")
            pg.close()
        # ---- 2 + 3. each voice, one note alone, at the beat's length at 60 and 160 bpm and the walk's 0.7 s ----
        WANT = {"tone": ("osc", 2), "sustain": ("osc", 2), "pluck": ("buf", 1), "bass": ("osc", 1), "pad": ("osc", 2)}
        for voice in ("tone", "pluck", "sustain", "bass", "pad"):
            for dur in (1.0, 0.375, 0.7):
                midi = 43 if voice == "bass" else 79 if voice == "pad" else 62
                pg, errs = booted(b, dur + 1.2, None if voice in ("bass", "pad") else voice)
                msg = {"midi": midi, "dur": dur}
                if voice in ("bass", "pad"):
                    msg["role"] = voice
                out = pg.evaluate(RENDER, {"groups": [[0, [msg]]]})
                srcs = out["srcs"]
                kinds = sorted({s["kind"] for s in srcs})
                kind, count = WANT[voice]
                check(kinds == [kind] and len(srcs) == count,
                      f"{voice} {dur}s: one NOTE started {len(srcs)} {kinds} sources — expected {count} {kind}")
                if kind == "osc":
                    check(all(abs(s["hz"] / hz(midi) - 1) < 1e-6 for s in srcs), f"{voice}: an oscillator at the wrong pitch {srcs}")
                    cents = sorted(s["cents"] for s in srcs)
                    check(len(cents) == count and (cents == [0] if count == 1 else (cents[0] == -cents[1] and cents[1] > 0)),
                          f"{voice}: the pair is not ±d cents: {cents}")
                if dur == 1.0:
                    print(f"  {voice}: {len(srcs)} {kind} source(s) per note, cents {[s['cents'] for s in srcs]}")
                s0, e0 = srcs[0]["start"], srcs[0]["stop"]
                ed = pg.evaluate(EDGES, {"s": s0, "e": e0})
                print(f"  {voice} {dur:5.3f} s: rise to half peak {ed['rise_ms']:.2f} ms, fall from half peak to stop "
                      f"{ed['fall_ms']:.2f} ms, last ms {ed['tail_rel'] * 100:.3f} % of peak")
                check(ed["peak"] > 0, f"{voice} {dur}s: silent")
                check(ed["rise_ms"] >= 0.5, f"{voice} {dur}s: CLICKS at the start — half its peak {ed['rise_ms']:.2f} ms after the source starts")
                check(ed["fall_ms"] >= 1.0 and ed["tail_rel"] <= 0.01,
                      f"{voice} {dur}s: CLICKS at the end — falls from half peak in {ed['fall_ms']:.2f} ms, "
                      f"{ed['tail_rel'] * 100:.2f} % of peak in the last millisecond before the stop")
                check(not errs, f"{voice} {dur}s: errors {errs[:2]}")
                pg.close()
        # ---- 4. the ceiling: the densest corpus étude at 300 bpm, sustain, pad on, in real time ----
        js = """import { toFragment, linkable } from './engine/etude-link.mjs'; import { ETUDE_V } from './engine/etude-block.mjs';
          import { etudeTimeline } from './engine/etude-timeline.mjs'; import { readFileSync } from 'node:fs';
          const c = JSON.parse(readFileSync('hub/tests/fixtures/etude-corpus.json', 'utf8'));
          const rows = c.filter((x) => linkable(x.saved) === true).map((x) => {
            const saved = { ...x.saved, pad: true, bpm: 300, mixer: { ...(x.saved.mixer || {}), voice: 'sustain' } };
            const t = etudeTimeline(saved);
            const perBeat = Math.max(...t.bars.map((b) => b.events.length / b.beats));
            return { name: x.name, perBeat, link: toFragment(saved, { app: 'multetudes', v: ETUDE_V }) };
          }).sort((a, b) => b.perBeat - a.perBeat);
          process.stdout.write(JSON.stringify(rows[0]));"""
        dense = json.loads(subprocess.run(["node", "--input-type=module", "-e", js], cwd=REPO, capture_output=True, text=True, check=True).stdout)
        rt = p.chromium.launch(args=["--autoplay-policy=no-user-gesture-required"])
        pg = rt.new_page(viewport={"width": 1280, "height": 900}); errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
        pg.add_init_script("""(() => { window.__live = 0; window.__peak = 0; window.__started = 0;
          for (const C of [OscillatorNode, AudioBufferSourceNode]) { const s0 = C.prototype.start;
            C.prototype.start = function (...a) { window.__live++; window.__started++; window.__peak = Math.max(window.__peak, window.__live);
              this.addEventListener('ended', () => { window.__live--; }); return s0.apply(this, a); }; } })();""")
        pg.goto(BUILD.as_uri() + dense["link"]); pg.wait_for_selector("#fdVoice", state="attached"); pg.wait_for_timeout(600)
        state = pg.evaluate("() => ({ voice: document.getElementById('fdVoice').value, pad: document.getElementById('fdPad').checked, bpm: +document.getElementById('fdBpm').value })")
        check(state == {"voice": "sustain", "pad": True, "bpm": 300}, f"ceiling: the link did not open the bench it names: {state}")
        pg.click('#fdMini button[data-role="play"]'); pg.wait_for_timeout(8000)
        live = pg.evaluate("() => ({ peak: window.__peak, started: window.__started })")
        pg.click('#fdMini button[data-role="stop"]'); pg.wait_for_timeout(300)
        print(f"  ceiling: densest étude {dense['name']!r} ({dense['perBeat']:.2f} sounded notes per beat) at 300 bpm, sustain, "
              f"pad on — {live['started']} sources in 8 s, peak live {live['peak']} (the card refuses a note past 240)")
        check(live["started"] > 100, f"ceiling: the étude barely sounded ({live})")
        check(live["peak"] <= 240, f"ceiling: the peak live count {live['peak']} reaches the card's ceiling — notes would be dropped")
        check(not errs, f"ceiling: errors {errs[:2]}")
        rt.close(); b.close()
    print(f"voice_render: {n} assertions, {len(fails)} failed  ({BUILD.name})")
    for f in fails:
        print("FAIL " + f)
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())
