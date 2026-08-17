# hub/ — the door build

Phase B's one new build (family spec §5). A **door is a build target**: its locked config
determines which modules are reachable, and therefore which script, markup and styles get inlined
into its published single file.

Stage 1 proved the mechanism on throwaway modules (§4.2.1). Stage 2 — this directory — proved it on
**real modules that contribute CSS and markup**, which is where the kill condition could still have
fired. It did not.

```bash
node hub/tools/resolve.mjs plain      # what the lock reaches, and what it does not
node hub/tools/build.mjs              # hub/build/{plain,scribe}.html
python3 hub/tests/door_locks.py --shots   # the lock assertions + file:// offline check
python3 hub/tests/bite.py             # proves every assertion fails when it should
```

## Layout

```
hub/
├── shell.mjs           page grammar + the layout CONTAINERS + boot(). Mounts a list
│                       it does not write; never names a module; renders no control.
├── modules/            contributions: { id, requires, controls, markup, styles, mount }
│   ├── metronome-card.mjs   the family constant — requires {}, every door reaches it
│   └── notepad-card.mjs     the gate case — wraps engine/notepad-surface.mjs and owns
│                            the markup and styles the shipped study holds page-level
├── doors/*.door.mjs    THE DOOR DECLARATION — { id, lock, present }. Nothing else.
├── tools/resolve.mjs   lock → reach-set → control partition → style ownership
├── tools/build.mjs     reach-set → one self-contained HTML file
├── tests/door_locks.py the CI lock assertions (mirror of engine/tests/host-conformance)
├── tests/bite.py       seven mutations, each of which must turn the suite red
└── build/              artifacts + screenshots — gitignored, regenerable by definition
```

`engine/` stays DOM-free. A module that owns markup or styles lives here and wraps an engine
module; that split is what makes CSS prunable from a lock.

## What the doors demonstrate

| door | lock | ships | size |
|---|---|---|---|
| `scribe` | `{notepad: true}` | metronome + notepad, 12 files | 148 kB |
| `plain` | `{notepad: false}` | metronome only, 3 files | 21 kB |

The plain door drops six engine modules (notepad, markdown, palette, structures, atchart, chord)
along with the card, plus 39 markup/style tokens. Its built file contains no trace of any of it —
greped on the artifact, in all three forms a module can survive as: script, element, selector.

## The CSS rule, and why there is no style manifest

A stylesheet is one flat namespace, so a pruned module's rules can be left behind and a kept
module's rules can be taken away. A per-door style manifest would "solve" that, and would be the
hand-maintained list this project has now found nine times. Instead:

1. **A module rule must name at least one token only that module ships** — so it ships exactly when
   something it can match does.
2. **No rule may name a token only another module ships** — the shell's rules included. This is what
   catches `#journalIn` styled by the page, which is the shape of CSS the shipped study has today.
3. **Grammar is promoted, not declared**: a token is page grammar when the shell mentions it or when
   two or more modules do. `.row2`, `.chk` and `.bpmrow` live in the metronome card today because
   exactly one module uses them; the second user moves them up, with the evidence.
4. **Containers are the shell's**, and their styles ship only for mount points a door fills —
   otherwise `.board` outlives the last module that asked for a board.

The authoritative check is none of the above. It is in `tests/door_locks.py` and needs no static
analysis at all: **every CSS selector in a built file must match something in that door's DOM**
once the door has been exercised. It found real dead CSS in the shipped study on its first run
(`.hist .sum`, which `notepad-surface.mjs` never creates).
