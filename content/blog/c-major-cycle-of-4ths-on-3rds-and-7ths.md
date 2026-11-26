---
title: "C Major — Cycle of 4ths on 3rds and 7ths"
date: 2026-11-25
summary: An open practice journal entry — the 3rd and 7th of every chord through the C major cycle of fourths, on the top three strings, and a little background on how this site came to be.
---

## A Little Background

I started building this site back in August 2026. I was playing around with Claude, taking
old ideas from my digital and paper journals, that I had captured over the last couple
decades, and converting them into editable and in some cases interactive documents.

One of the first documents I decided to try to clean up and convert was a chart I had built
for a friend laying out the relationships of the major scale derived modes to the standard
major and minor pentatonic scales. I had originally built it in PowerPoint but could only
find a PDF copy of it. So I asked Claude to convert it back into an editable document for me
and while it was at it to fix a couple typos and any errors I might have made. That took just
a couple minutes and generated a much cleaner document than the original. So I decided to see
if Claude could convert that into an interactive HTML file and that too just took a couple
minutes!!! The output of that, literally within 30 minutes of starting, well within the
Dominos free pizza promise time, produced the following app:
[Modes from Pentatonic Boxes](/studies/modes-from-pentatonic-boxes/).

![Modes from Pentatonic Boxes showing Box 2, frets 4 to 7, as A Ionian: the major pentatonic's five tones as squares, with the two added mode tones, the 4th and the 7th, as circles.](/assets/blog/c-major-cycle-of-4ths-on-3rds-and-7ths/modes-from-pentatonic-boxes-box-2.png)

I then followed that with [an app based on some simple voice leading
concepts](/studies/tetrad-voice-leading/) scattered about in my old paper journals. Later
that afternoon I decided I might as well stand up a simple site — this site — to share these
apps. That established a venue for some more intense and obsessive ideating and building.
The most attention now on this site has been given to the
[Multetudes](/studies/multetudes/) application.

Multetudes is a relatively lightweight single page web application that can be run offline
and provides a journaling/logging feature that stores everything in your local cache in
markdown format. This feature was inspired by Adam Levy and Ethan Sherman's book
[*String Theories*](https://stringtheoriesbook.com/), specifically the brief section on
keeping a practice journal. Those files can be saved and shared. Rather than trying to
describe anything more about the features or capabilities of Multetudes, I'm just going to
jump right in to a current study I've configured in the app and am working through in my own
practice.

## My At-Etude Today

The following is a deceptively simple exercise moving through the tetrads (7th chords) of the
C major scale in fourths. The objective here is to work within the area of the fretboard
between the 5th and 9th frets on the top three strings, i.e., G, B and E, and play the 3rd to
the 7th of each passing chord. For me this is a very useful exercise to help my ear and my
fingers become accustomed to the bass movement through the cycle of fourths and the movement
and relationship of the 3rd to the 7th in each passing chord and the relationship of the 7th
of the passing chord to the 3rd of the coming chord.

```etude
app: multetudes
v: 2
split: [4]
strings: [3, 2, 1]
startDeg: 0
nearFret: 5
notesPer: 3
address: tones
figure: "37"
movement: arpeggiate
take: one
repeat: false
tuning: null
key: C
scale: major
ref: 0
bass: root
centreSrc: fixed
gamut: null
sounded: none
pad: false
tones: [1, 3, 5, 7]
source: cycle
cycle: fourths
form: ii-V-I
custom:
start: 0
bpm: 120
meter: 4
sub: 1
click: false
accents: true
clickLevel: 0
clickVoice: beep
mixer: {voice: tone, chord: 1, bass: 0.23, pad: 1}
```

Worth noting is that the relationship of every 3rd to the 7th is a 5th up (or 4th down). And
that is a perfect 5th in all but the movement from the 3rd to the 7th of G. In that case
there is a flat 5 (tritone) relationship. Also the movement from the 7th of the passing chord
to the 3rd of the next is a single scale degree down. An interesting observation here is that
the two of these that are half steps down are from the 7th of the Dm7 — the 2 minor (ii7) —
to the 3rd of the G7 — the 5 dominant (V7) — and from the 7th of that G7 to the 3rd of the
CM7 — the one chord (Imaj7). This in combination with the tritone in the G7 describes the voice
movement that provides the strong tension and resolution of the ii-V-I cadence.

![The étude on the staff, eight bars: Cmaj7, Fmaj7, Bm7b5, Em7, Am7, Dm7, G7, Cmaj7. Each bar's 3rd and 7th sit in the treble staff over the chord's root in the bass, every note coloured by its function against the key.](/assets/blog/c-major-cycle-of-4ths-on-3rds-and-7ths/cycle-of-4ths-3rds-and-7ths-on-the-staff.png)

The point of this to me is not to memorize these relationships, not in the analytical sense
anyway, but rather to engrain the voices moving in relationship to the changes and how those
voices fall under my fingers. For me the analysis is crucial to maintain my attention to
ensure I'm practicing with intention. I suppose the labels and the maths provide a basis for
metrics and accountability.

## Coda

This has been the first blog post at AtEtudes.com. My intention here is to use this more as
an open practice journal than as an informational blog. My focus is on capturing my
intentions, observations, challenges and discoveries in support of my own musical growth. As
such the actual prose is not meant to be pedagogical in nature and may even be poorly
structured and at times grammatically broken and stylistically bereft. With that said, I do
hope those who find this content interesting enough to sit with it for a bit take something
away that contributes to their musical growth.
