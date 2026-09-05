# Surface: / (index) — Sakīna

Scope: single-page recitation surface. Visitor mode: **Experience** (with Operate discipline on the transport).
Audience: someone listening to Quran at night or in a quiet moment, who wants to follow the words, not manage a media library.
Constraints: static site, no build step, no API key. All content from api.quran.com v4. Background video hotlinked from Mixkit.

## Direction contract

THESIS: A night vigil, not a media player. One verse at a time holds the whole surface and the recitation reads itself
to the visitor. Refuses the category default: sidebar of surah links + scrolling mushaf column + bottom audio bar.

OWN-WORLD: Ink ground (#04060b) over a dimmed nature scene; one luminous blue (#7fb4ff) that behaves like moonlight on
water, never neon; silver (#eaf1fb) for the mushaf line, warm sand (#d8c7a4) for the translation so the two voices never
merge. Hairline rules only, no cards, no filled panels. Amiri Quran for the ayah; Familjen Grotesk for instruments;
Petrona for the translation.

STORY: The visitor picks a voice and a surah, presses play, and follows the recitation word by word. They can jump to any
verse by clicking it, loop a verse, and read the French beneath. They leave having actually followed a passage.

FIRST VIEWPORT: Full-bleed dimmed scene, itself crossfading between clips so no cut is ever visible. Surah identity
floats small at the top; the recited verse alone sits at the optical centre, its current word lit, its translation
beneath. Nothing else competes. Masthead hairline carries brand + the three pickers. Transport rail pinned at the
bottom: ayah progress, verse scrubber, prev / play / next, loop, speed, volume, fullscreen. Primary action is play.

FORM: night vigil / qiyām al-layl. Chosen over the two ruts of this category (mushaf-page skeuomorph; dark dashboard with
a neon accent). Seed: none — impeccable binary blocked by Windows execution policy, direction taken in-thread.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and
every shipping raster carrying its provenance.

## Notes

- Word-level sync comes from `/recitations/{id}/by_chapter/{n}?fields=segments`; segment tuple is
  [index, wordPosition, startMs, endMs]. Verified present on every reciter id 1-12.
- Per-ayah mp3 (not the whole-surah file) is what makes line-by-line sync exact. Two audio elements ping-pong so the
  next ayah is already buffered when the current one ends.
- The verse list was removed in favour of a single centred line; navigation moved to the transport's verse scrubber.
- Background: two <video> elements crossfade over 2s. A loop is a crossfade of a clip onto itself — that is what removes
  the seam `loop` leaves. The CSS transition duration and scene.js FADE_MS are the same number and must stay so.
- Measured end to end during playback: 1 disagreement with the segment timings over 40 samples, 78ms, on the early side.
- Unresolved: no offline/PWA cache; no bookmarking of a position across surahs.
