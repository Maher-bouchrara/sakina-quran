/* ============================================================
   player.js — moteur de récitation

   Deux éléments <audio> alternent : pendant que l'un récite le verset
   courant, l'autre a déjà mis le suivant en mémoire tampon. C'est ce
   qui rend l'enchaînement des versets net plutôt que haché.

   Le suivi mot à mot lit le minutage renvoyé par l'API et le compare,
   image par image, à la position de lecture.
   ============================================================ */

window.Recitation = (function () {
  'use strict';

  /* Un mot allumé pile sur son attaque paraît en retard : le temps que
     l'œil trouve le mot, la syllabe est déjà partie. On éclaire un souffle
     avant, comme un chef donne le départ avant la mesure. */
  var LEAD_MS = 110;

  function Recitation() {
    this.tracks  = [];
    this.index   = 0;
    this.slot    = 0;
    this.loop    = false;
    this.rate    = 1;
    this.volume  = 0.9;
    this.muted   = false;
    this.playing = false;
    this.raf     = null;
    this.word    = -1;

    this.on = { verse: null, word: null, progress: null, state: null, end: null, error: null };

    var self = this;
    this.els = [new Audio(), new Audio()];

    this.els.forEach(function (el, i) {
      el.preload = 'auto';
      el.addEventListener('ended', function () { if (i === self.slot) self._advance(); });
      el.addEventListener('error', function () {
        if (i === self.slot && el.getAttribute('src')) self._fail();
      });
      el.addEventListener('loadedmetadata', function () { if (i === self.slot) self._emit('progress', 0); });
      /* requestAnimationFrame se met en veille dans un onglet caché ou une vue
         intégrée ; timeupdate, lui, suit toujours l'audio. Filet de sécurité. */
      el.addEventListener('timeupdate', function () { if (i === self.slot && self.playing) self._frame(); });
      el.addEventListener('waiting', function () { if (i === self.slot) self._emit('state', 'buffering'); });
      el.addEventListener('playing', function () { if (i === self.slot) self._emit('state', 'playing'); });
    });
  }

  var P = Recitation.prototype;

  P._emit = function (name, arg) {
    var fn = this.on[name];
    if (fn) fn(arg);
  };

  P._el = function () { return this.els[this.slot]; };

  P._arm = function (slot, i) {
    var t = this.tracks[i];
    if (!t) return;
    var el = this.els[slot];
    if (el.dataset.key === t.key) return;
    el.dataset.key = t.key;
    el.src = t.url;
    el.load();
  };

  P._fail = function () {
    this.playing = false;
    this._stopLoop();
    this._emit('state', 'idle');
    this._emit('error', 'Ce verset n’a pas pu être chargé. Vérifiez la connexion, puis réessayez.');
  };

  /* --- chargement d'une sourate --------------------------------- */

  P.load = function (tracks) {
    this.stop();
    this.tracks = tracks || [];
    this.index  = 0;
    this.word   = -1;
    this.els.forEach(function (el) { el.removeAttribute('src'); delete el.dataset.key; });
    if (this.tracks.length) this._arm(this.slot, 0);
    this._emit('verse', 0);
    this._emit('progress', 0);
  };

  /* --- transport ------------------------------------------------ */

  P.goto = function (i, autoplay) {
    if (i < 0 || i >= this.tracks.length) return;

    var wasPlaying = this.playing;
    this.pause();

    /* Le verset visé est peut-être déjà en tampon dans l'autre élément. */
    var other = 1 - this.slot;
    if (this.els[other].dataset.key === this.tracks[i].key) this.slot = other;

    this.index = i;
    this.word  = -1;
    this._arm(this.slot, i);

    var el = this._el();
    try { el.currentTime = 0; } catch (e) { /* pas encore de métadonnées */ }

    this._emit('verse', i);
    this._emit('word', null);
    this._emit('progress', 0);
    this._prefetch();

    if (autoplay || wasPlaying) this.play();
  };

  P.play = function () {
    if (!this.tracks.length) return;
    var el = this._el();
    this._arm(this.slot, this.index);
    this._apply(el);

    var self = this;
    var p = el.play();
    if (p && p.catch) {
      p.catch(function (err) {
        if (err && err.name === 'NotAllowedError') {
          self.playing = false;
          self._emit('state', 'idle');
          self._emit('error', 'Le navigateur a bloqué la lecture. Touchez le bouton Écouter pour l’autoriser.');
        }
      });
    }

    this.playing = true;
    this._emit('state', 'playing');
    this._startLoop();
    this._prefetch();
  };

  P.pause = function () {
    this._el().pause();
    this.playing = false;
    this._stopLoop();
    this._emit('state', 'idle');
  };

  P.toggle = function () { this.playing ? this.pause() : this.play(); };

  P.stop = function () {
    this.els.forEach(function (el) { el.pause(); });
    this.playing = false;
    this._stopLoop();
    this._emit('state', 'idle');
  };

  P.next = function () { this.goto(this.index + 1, this.playing); };
  P.prev = function () {
    /* Comme sur une platine : on rembobine le verset avant de reculer. */
    if (this._el().currentTime > 2.2) { this._el().currentTime = 0; return; }
    this.goto(this.index - 1, this.playing);
  };

  P._advance = function () {
    if (this.loop) { this.word = -1; this._el().currentTime = 0; this._el().play(); return; }

    if (this.index + 1 >= this.tracks.length) {
      this.playing = false;
      this._stopLoop();
      this._emit('progress', 1);
      this._emit('state', 'idle');
      this._emit('end');
      return;
    }

    this.slot  = 1 - this.slot;
    this.index = this.index + 1;
    this.word  = -1;

    var el = this._el();
    this._arm(this.slot, this.index);
    this._apply(el);
    el.currentTime = 0;
    el.play();

    this._emit('verse', this.index);
    this._emit('word', null);
    this._prefetch();
  };

  P._prefetch = function () {
    this._arm(1 - this.slot, this.index + 1);
  };

  /* --- réglages -------------------------------------------------- */

  P._apply = function (el) {
    el.playbackRate = this.rate;
    el.volume = this.volume;
    el.muted  = this.muted;
  };

  P.setRate = function (r) {
    this.rate = r;
    this.els.forEach(function (el) { el.playbackRate = r; });
  };
  P.setVolume = function (v) {
    this.volume = v;
    this.els.forEach(function (el) { el.volume = v; });
  };
  P.setMuted = function (m) {
    this.muted = m;
    this.els.forEach(function (el) { el.muted = m; });
  };
  P.setLoop = function (l) { this.loop = l; };

  /* --- suivi mot à mot ------------------------------------------- */

  P._startLoop = function () {
    if (this.raf) return;
    var self = this;
    (function tick() {
      self.raf = requestAnimationFrame(tick);
      self._frame();
    })();
  };

  P._stopLoop = function () {
    if (!this.raf) return;
    cancelAnimationFrame(this.raf);
    this.raf = null;
  };

  P._frame = function () {
    var el = this._el();
    var track = this.tracks[this.index];
    if (!track) return;

    if (el.duration && isFinite(el.duration)) this._emit('progress', el.currentTime / el.duration);

    var segs = track.segments;
    if (!segs || !segs.length) return;

    var t = el.currentTime * 1000 + LEAD_MS;
    var pos = null;

    for (var i = 0; i < segs.length; i++) {
      if (t >= segs[i].start && t < segs[i].end) { pos = segs[i].pos; break; }
      /* Entre deux mots : on garde le précédent allumé plutôt que de clignoter. */
      if (t < segs[i].start) { pos = i > 0 ? segs[i - 1].pos : null; break; }
      if (i === segs.length - 1) pos = segs[i].pos;
    }

    if (pos !== this.word) {
      this.word = pos;
      this._emit('word', pos);
    }
  };

  return Recitation;
})();
