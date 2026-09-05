/* ============================================================
   scene.js — le fond filmé

   Deux éléments <video> alternent. Le suivant est mis en tampon
   plusieurs secondes à l'avance, puis les deux se croisent en fondu :
   ni coupure au bout de la boucle, ni saut d'un plan à l'autre.

   Une boucle est un fondu du plan sur lui-même — c'est ce qui efface
   le raccord que `loop` laisse voir.
   ============================================================ */

window.Scene = (function () {
  'use strict';

  var FADE_MS  = 2000;   /* durée du croisement */
  var PREP_S   = 10;     /* on met le suivant en tampon si tôt avant la fin */
  var SWAP_S   = 2.2;    /* et on lance le croisement si tard avant la fin */
  var MIN_LEN  = 6;      /* en deçà, le plan est trop court pour un fondu propre */

  function Scene(elA, elB) {
    this.els   = [elA, elB];
    this.slot  = 0;
    this.queue = [];
    this.qi    = 0;
    this.prep  = null;    /* source mise en tampon dans l'élément au repos */
    this.ready = false;
    this.busy  = false;
    this.on    = { error: null };

    var self = this;
    this.els.forEach(function (el, i) {
      el.loop = false;
      el.muted = true;
      el.playsInline = true;

      el.addEventListener('timeupdate', function () { if (i === self.slot) self._tick(); });

      /* Filet : si le fondu n'a pas pu partir, on reboucle sans transition
         plutôt que de laisser l'image figée sur la dernière trame. */
      el.addEventListener('ended', function () {
        if (i !== self.slot) return;
        if (self.busy) return;
        el.currentTime = 0;
        var p = el.play();
        if (p && p.catch) p.catch(function () {});
      });
    });
  }

  var S = Scene.prototype;

  S._live = function () { return this.els[this.slot]; };
  S._idle = function () { return this.els[1 - this.slot]; };

  S._nextSrc = function () {
    if (!this.queue.length) return null;
    this.qi = (this.qi + 1) % this.queue.length;
    return this.queue[this.qi];
  };

  /* --- programme -------------------------------------------------- */

  /* srcs : la file à parcourir. Une seule source = boucle en fondu sur
     elle-même. Plusieurs = enchaînement en fondu, sans fin. */
  S.play = function (srcs, startAt) {
    this.queue = (srcs || []).slice();
    this.qi    = this.queue.length ? (startAt || 0) % this.queue.length : 0;
    this.prep  = null;
    this.ready = false;

    if (!this.queue.length) { this.stop(); return; }
    this._enter(this.queue[this.qi], true);
  };

  S.stop = function () {
    this.queue = [];
    this.prep  = null;
    this.busy  = false;
    this.els.forEach(function (el) {
      el.classList.remove('is-lit');
      el.pause();
      el.removeAttribute('src');
      el.load();
    });
  };

  /* Premier plan : on le charge dans l'élément courant et on l'allume. */
  S._enter = function (src, immediate) {
    var el = this._live();
    var self = this;

    if (el.getAttribute('src') === src && !el.paused) { el.classList.add('is-lit'); return; }

    el.classList.remove('is-lit');
    el.src = src;
    el.load();

    var lit = function () {
      el.removeEventListener('canplay', lit);
      var p = el.play();
      if (p && p.catch) p.catch(function () { /* attend un geste */ });
      el.classList.add('is-lit');
    };
    el.addEventListener('canplay', lit);

    el.addEventListener('error', function once () {
      el.removeEventListener('error', once);
      if (self.on.error) self.on.error(src);
    });

    if (immediate && el.readyState >= 3) lit();
  };

  /* --- croisement -------------------------------------------------- */

  S._tick = function () {
    if (this.busy || !this.queue.length) return;

    var el = this._live();
    var d  = el.duration;
    if (!d || !isFinite(d) || d < MIN_LEN) return;

    var left = d - el.currentTime;

    if (!this.prep && left < PREP_S) this._stage();
    if (this.prep && this.ready && left < SWAP_S) this._swap();
  };

  /* Met le plan suivant en tampon dans l'élément au repos. */
  S._stage = function () {
    var src = this._nextSrc();
    if (!src) return;

    var idle = this._idle();
    var self = this;

    this.prep  = src;
    this.ready = false;

    var arm = function () {
      idle.removeEventListener('canplaythrough', arm);
      idle.removeEventListener('canplay', arm);
      self.ready = true;
    };

    if (idle.getAttribute('src') === src && idle.readyState >= 3) { this.ready = true; return; }

    idle.classList.remove('is-lit');
    idle.src = src;
    idle.load();
    idle.addEventListener('canplaythrough', arm);
    idle.addEventListener('canplay', arm);
  };

  S._swap = function () {
    var live = this._live();
    var idle = this._idle();
    var self = this;

    this.busy = true;

    try { idle.currentTime = 0; } catch (e) { /* métadonnées absentes */ }
    var p = idle.play();
    if (p && p.catch) p.catch(function () {});

    /* Les deux jouent pendant le fondu : c'est ce qui rend le raccord invisible. */
    idle.classList.add('is-lit');
    live.classList.remove('is-lit');

    this.slot  = 1 - this.slot;
    this.prep  = null;
    this.ready = false;

    setTimeout(function () {
      live.pause();
      self.busy = false;
    }, FADE_MS);
  };

  Scene.FADE_MS = FADE_MS;
  return Scene;
})();
