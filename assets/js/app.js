/* ============================================================
   app.js — assemblage de la surface
   ============================================================ */

(function () {
  'use strict';

  /* --- plans de fond (vérifiés sur assets.mixkit.co) -------------- */

  var CLIPS = [
    { id: 'lake',  name: 'Lac étoilé',     sub: 'Ciel de nuit sur une eau immobile', src: 'https://assets.mixkit.co/videos/1704/1704-720.mp4' },
    { id: 'moon',  name: 'Pleine lune',    sub: 'La lune dans une brume douce',      src: 'https://assets.mixkit.co/videos/4433/4433-720.mp4' },
    { id: 'mist',  name: 'Forêt de brume', sub: 'Survol lent au-dessus des arbres',  src: 'https://assets.mixkit.co/videos/28342/28342-720.mp4' },
    { id: 'fog',   name: 'Brouillard',     sub: 'La brume traverse un lac boisé',    src: 'https://assets.mixkit.co/videos/34789/34789-720.mp4' },
    { id: 'waves', name: 'Vagues',         sub: 'Le ressac au bord de l’eau',        src: 'https://assets.mixkit.co/videos/1164/1164-720.mp4' }
  ];

  var SCENE_AUTO = { id: 'auto', name: 'Automatique', sub: 'Un plan par sourate, puis fondu vers le suivant' };
  var SCENE_NONE = { id: 'none', name: 'Fond d’encre', sub: 'Aucune vidéo, aucun téléchargement' };

  var TRANSLATIONS = [
    { id: 31,  name: 'Muhammad Hamidullah',         sub: 'Français' },
    { id: 136, name: 'Fondation islamique Montada', sub: 'Français' },
    { id: 779, name: 'Rashid Maash',                sub: 'Français' },
    { id: 20,  name: 'Saheeh International',        sub: 'English' },
    { id: 0,   name: 'Aucune traduction',           sub: 'Texte arabe seul' }
  ];

  /* Les 17 regles que l'API annote reellement, relevees sur onze sourates.
     Les teintes suivent la convention des mushafs colores — bleus pour les
     allongements, orange pour la ghunna, violet pour l'ikhfa, rouge pour la
     qalqala, gris pour ce qui ne se prononce pas — mais eclaircies pour tenir
     sur l'encre. */
  var RULES = [
    { c: 'madda_normal',        n: 'Madd naturel',            d: '2 temps' },
    { c: 'madda_permissible',   n: 'Madd permis',             d: '4 ou 5 temps' },
    { c: 'madda_obligatory',    n: 'Madd obligatoire',        d: '4 ou 5 temps' },
    { c: 'madda_necessary',     n: 'Madd necessaire',         d: '6 temps' },
    { c: 'ghunnah',             n: 'Ghunna',                  d: '2 temps dans le nez' },
    { c: 'idgham_ghunnah',      n: 'Idgham avec ghunna',      d: 'fusion nasalisee' },
    { c: 'idgham_wo_ghunnah',   n: 'Idgham sans ghunna',      d: 'fusion seche' },
    { c: 'idgham_shafawi',      n: 'Idgham labial',           d: 'mim sur mim' },
    { c: 'idgham_mutajanisayn', n: 'Idgham homogene',         d: 'lettres voisines' },
    { c: 'idgham_mutaqaribayn', n: 'Idgham proche',           d: 'lettres proches' },
    { c: 'ikhafa',              n: 'Ikhfa',                   d: 'nasalisation legere' },
    { c: 'ikhafa_shafawi',      n: 'Ikhfa labial',            d: 'mim avant ba' },
    { c: 'iqlab',               n: 'Iqlab',                   d: 'noun devient mim' },
    { c: 'qalaqah',             n: 'Qalqala',                 d: 'rebond de la lettre' },
    { c: 'ham_wasl',            n: 'Hamzat wasl',             d: 'ne se prononce pas' },
    { c: 'laam_shamsiyah',      n: 'Lam solaire',             d: 'ne se prononce pas' },
    { c: 'slnt',                n: 'Lettre muette',           d: 'ne se prononce pas' }
  ];

  /* Marques de pause : c'est la que le recitant reprend son souffle, donc la
     que la ligne se coupe. */
  var WAQF = /[\u06D6-\u06DC]/;
  /* Un jeton fait uniquement de marques (rub el hizb, sajda) n'est pas un mot ;
     sans ce filtre le decoupage du texte tajwid se decale d'un cran. */
  var MARK_ONLY = /^[\u06D6-\u06ED\s]+$/;

  var BISMILLAH = 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ';
  var IDLE_MS   = 2800;   /* inactivité avant que les barres s'effacent en plein écran */

  /* --- état ------------------------------------------------------- */

  var S = {
    chapters: [], reciters: [], verses: [], tajweedText: {},
    surah:   read('surah', 1),
    reciter: read('reciter', 7),
    trans:   read('trans', 31),
    scene:   read('scene', 'auto'),
    rate:    read('rate', 1),
    volume:  read('volume', 0.9),
    muted:   read('muted', false),
    tajweed: read('tajweed', true),
    active:  0,
    token:   0,
    seeking: false
  };

  function read(k, dflt) {
    try {
      var v = localStorage.getItem('sakina.' + k);
      return v === null ? dflt : JSON.parse(v);
    } catch (e) { return dflt; }
  }
  function save(k, v) {
    try { localStorage.setItem('sakina.' + k, JSON.stringify(v)); } catch (e) { /* mode privé */ }
  }

  /* --- raccourcis DOM --------------------------------------------- */

  var $ = function (id) { return document.getElementById(id); };

  var el = {
    reader: $('reader'), lyric: $('lyric'),
    layers: [$('layer-0'), $('layer-1')],
    shAr: $('sh-ar'), shMeta: $('sh-meta'), shBism: $('sh-bism'),
    hint: $('hint'), hintText: $('hint-text'), retry: $('hint-retry'),
    fill: $('ayah-fill'), cNow: $('c-now'), cAll: $('c-all'), seek: $('seek'),
    play: $('play'), prev: $('prev'), next: $('next'), loop: $('loop'),
    mute: $('mute'), vol: $('vol'), full: $('full'),
    vSurah: $('v-surah'), vReciter: $('v-reciter'), vScene: $('v-scene'),
    drawer: $('drawer'), scrim: $('scrim'), drawerTitle: $('drawer-title'),
    surahList: $('surah-list'), reciterList: $('reciter-list'),
    sceneList: $('scene-list'), transList: $('trans-list'),
    search: $('surah-search'),
    masthead: $('masthead'), transport: $('transport')
  };

  var player = new window.Recitation();
  var scene  = new window.Scene($('scene-a'), $('scene-b'));

  var layer   = 0;    /* couche vive du fondu de versets */
  var words   = [];   /* spans de la couche vive, dans l'ordre */
  var lastFocus = null;

  /* --- utilitaires ------------------------------------------------- */

  function fold(s) {
    return String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]/g, '');
  }

  function reciterName(r) {
    var n = String(r.reciter_name || '').replace(/`/g, 'ʿ');
    return r.style ? n + ' · ' + r.style : n;
  }

  function chapterOf(n) {
    for (var i = 0; i < S.chapters.length; i++) if (S.chapters[i].id === n) return S.chapters[i];
    return null;
  }

  function icon(href, cls) {
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', cls || 'ico');
    svg.setAttribute('viewBox', '0 0 20 20');
    svg.setAttribute('aria-hidden', 'true');
    var use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', href);
    svg.appendChild(use);
    return svg;
  }

  function setHint(msg, kind) {
    if (!msg) { el.hint.hidden = true; return; }
    el.hint.hidden = false;
    el.hint.className = 'hint' + (kind === 'error' ? ' hint--error' : '');
    el.hintText.textContent = msg;
    el.retry.hidden = kind !== 'error';
  }

  /* --- scène -------------------------------------------------------- */

  function sceneChoice() {
    if (S.scene === 'none') return null;
    if (S.scene === 'auto') return CLIPS.map(function (c) { return c.src; });
    for (var i = 0; i < CLIPS.length; i++) if (CLIPS[i].id === S.scene) return [CLIPS[i].src];
    return CLIPS.map(function (c) { return c.src; });
  }

  function sceneLabel() {
    if (S.scene === 'none') return SCENE_NONE.name;
    if (S.scene === 'auto') return SCENE_AUTO.name;
    for (var i = 0; i < CLIPS.length; i++) if (CLIPS[i].id === S.scene) return CLIPS[i].name;
    return SCENE_AUTO.name;
  }

  /* En mode automatique, la sourate décide du plan de départ : deux
     sourates voisines n'ouvrent pas sur la même image, et une même
     sourate retrouve la sienne. */
  function applyScene() {
    el.vScene.textContent = sceneLabel();
    var srcs = sceneChoice();
    if (!srcs) { scene.stop(); return; }
    scene.play(srcs, S.scene === 'auto' ? (S.surah * 7) % CLIPS.length : 0);
  }

  scene.on.error = function () {
    /* Un plan injoignable ne doit pas emporter la récitation avec lui. */
    setHint('Une scène n’a pas pu être chargée. Le fond passe à l’encre.', null);
    setTimeout(function () { setHint(''); }, 4000);
  };

  /* --- en-tête de sourate -------------------------------------------- */

  function renderHead(ch) {
    if (!ch) return;
    el.shAr.textContent = ch.name_arabic;
    el.shMeta.textContent =
      'Sourate ' + ch.id + ' · ' + (ch.translated_name ? ch.translated_name.name : ch.name_simple) +
      ' · ' + ch.verses_count + ' versets · ' +
      (ch.revelation_place === 'makkah' ? 'Mecquoise' : 'Médinoise');

    el.shBism.hidden = !ch.bismillah_pre;
    el.shBism.textContent = BISMILLAH;
    el.vSurah.textContent = ch.name_simple;
    document.title = 'Sakīna — ' + ch.name_simple;
  }

  /* --- la ligne ------------------------------------------------------- */

  /* Le texte tajwid arrive en une seule chaine balisee. On l'aplatit en
     fragments {texte, regle}, puis on regroupe par mot. Une balise peut
     enjamber une espace — « دًى ل » couvre la fin d'un mot et le debut du
     suivant — donc on ne peut pas decouper la chaine betement : il faut
     traverser l'arbre et recoller. */
  function tajweedWords(htmlStr, expected) {
    if (!htmlStr) return null;

    var host = document.createElement('div');
    host.innerHTML = htmlStr;

    var runs = [];
    (function walk(node, rule) {
      for (var n = node.firstChild; n; n = n.nextSibling) {
        if (n.nodeType === 3) { runs.push({ t: n.nodeValue, r: rule }); continue; }
        if (n.nodeName === 'SPAN' && n.className === 'end') continue;  /* numero du verset */
        walk(n, n.nodeName === 'TAJWEED' ? (n.getAttribute('class') || null) : rule);
      }
    })(host, null);

    var out = [], cur = [];
    function close() {
      if (!cur.length) return;
      var txt = cur.map(function (f) { return f.t; }).join('');
      if (!MARK_ONLY.test(txt)) out.push(cur);
      cur = [];
    }
    runs.forEach(function (run) {
      var parts = run.t.split(/(\s+)/);
      parts.forEach(function (p) {
        if (!p) return;
        if (/^\s+$/.test(p)) { close(); return; }
        cur.push({ t: p, r: run.r });
      });
    });
    close();

    /* Un desaccord de comptage ferait glisser les couleurs d'un mot : on
       prefere rendre le verset sans tajwid plutot que faux. */
    return out.length === expected ? out : null;
  }

  /* Un verset de deux mots et un verset de mille ne peuvent pas tenir au même
     corps. On resserre par paliers plutôt que de laisser le texte sortir du
     cadre ; au-delà du dernier palier, la zone défile. Le plancher garde le
     tashkīl lisible : en dessous, les signes se referment sur la lettre. */
  function fitFor(text) {
    var n = (text || '').length;
    if (n <=  70) return [1,    1   ];
    if (n <= 140) return [0.88, 0.97];
    if (n <= 260) return [0.80, 0.94];
    if (n <= 450) return [0.73, 0.91];
    return             [0.68, 0.88];
  }

  /* Une seule ligne est à l'écran. Deux couches se croisent en fondu :
     celle qui part s'efface pendant que celle qui vient se lève. */
  function showVerse(i) {
    var v = S.verses[i];
    if (!v) return;

    var next = 1 - layer;
    var box  = el.layers[next];
    box.textContent = '';

    var fit = fitFor(v.arabic);
    box.style.setProperty('--fit', fit[0]);
    box.style.setProperty('--fit-tr', fit[1]);

    var ar = document.createElement('p');
    ar.className = 'lyric__ar';
    ar.lang = 'ar';
    ar.dir  = 'rtl';

    var runs = S.tajweed ? tajweedWords(S.tajweedText[v.key], v.words.length) : null;

    var slots = [];
    var line = document.createElement('span');
    line.className = 'ln';
    ar.appendChild(line);

    v.words.forEach(function (w, k) {
      var span = document.createElement('span');
      span.className = 'w';
      span.dataset.pos = w.pos;

      if (runs) {
        runs[k].forEach(function (f) {
          if (!f.r) { span.appendChild(document.createTextNode(f.t)); return; }
          var g = document.createElement('span');
          g.className = 'tj tj--' + f.r;
          g.textContent = f.t;
          span.appendChild(g);
        });
      } else {
        span.textContent = w.text;
      }

      line.appendChild(span);
      slots.push(span);

      /* Le verset se coupe la ou le recitant reprend son souffle : chaque
         marque de pause ferme la ligne. Un verset sans marque reste d'un seul
         tenant, comme avant. */
      if (k < v.words.length - 1) {
        if (WAQF.test(w.text)) {
          line = document.createElement('span');
          line.className = 'ln';
          ar.appendChild(line);
        } else {
          line.appendChild(document.createTextNode(' '));
        }
      }
    });

    if (v.mark) {
      var num = document.createElement('span');
      num.className = 'lyric__num';
      num.textContent = v.mark;
      line.appendChild(document.createTextNode(' '));
      line.appendChild(num);
    }
    box.appendChild(ar);

    if (v.trans) {
      var tr = document.createElement('p');
      tr.className = 'lyric__tr';
      tr.lang = S.trans === 20 ? 'en' : 'fr';
      tr.textContent = v.trans;
      box.appendChild(tr);
    }

    el.layers[layer].classList.remove('is-live');
    box.classList.add('is-live');

    /* Un verset qui déborde commence par son début, pas là où le précédent
       s'était arrêté. */
    curLine = null;
    el.lyric.scrollTop = 0;
    /* Lire scrollHeight force le calcul de mise en page : la mesure est juste
       tout de suite, sans dependre de requestAnimationFrame, qui se met en
       veille dans un onglet cache ou une vue integree. Le second passage
       rattrape le decalage laisse par le chargement des caracteres. */
    markOverflow();
    setTimeout(markOverflow, 80);

    layer = next;
    words = slots;
  }

  /* Le fondu du bas ne s'allume que s'il reste vraiment quelque chose dessous,
     et s'éteint une fois le verset lu jusqu'au bout. */
  function markOverflow() {
    var L = el.lyric;
    var over = L.scrollHeight - L.clientHeight > 4;
    L.classList.toggle('is-over', over);
    L.classList.toggle('is-end', over && L.scrollTop + L.clientHeight >= L.scrollHeight - 4);
  }
  el.lyric.addEventListener('scroll', markOverflow, { passive: true });
  window.addEventListener('resize', markOverflow);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(markOverflow);

  function setActive(i) {
    S.active = i;
    showVerse(i);

    el.cNow.textContent = i + 1;
    el.seek.value = i;
    el.prev.disabled = i === 0 && !player.playing;
    el.next.disabled = i >= S.verses.length - 1;

    var v = S.verses[i];
    if (v && 'mediaSession' in navigator) {
      try {
        navigator.mediaSession.metadata = new window.MediaMetadata({
          title:  'Verset ' + v.key,
          artist: el.vReciter.textContent,
          album:  el.vSurah.textContent
        });
      } catch (e) { /* MediaMetadata absent */ }
    }
  }

  function setWord(pos) {
    if (S.seeking) return;
    var lit = null;
    for (var i = 0; i < words.length; i++) {
      var p = Number(words[i].dataset.pos);
      var on = pos !== null && p === pos;
      words[i].classList.toggle('is-lit', on);
      words[i].classList.toggle('is-read', pos !== null && p < pos);
      if (on) lit = words[i];
    }
    focusLine(lit ? lit.parentNode : null);
  }

  /* La ligne recitee se detache des autres, et vient a l'ecran d'elle-meme
     quand le verset deborde : sans cela on perd sa place des qu'il faut
     defiler. */
  var curLine = null;
  function focusLine(ln) {
    if (ln === curLine) return;
    if (curLine) curLine.classList.remove('is-now');
    curLine = ln;
    if (!ln) return;
    ln.classList.add('is-now');

    var L = el.lyric;
    if (L.scrollHeight - L.clientHeight <= 4) return;
    var target = ln.offsetTop - L.clientHeight * 0.34;
    L.scrollTo({ top: Math.max(0, target), behavior: 'smooth' });
  }

  /* --- chargement ------------------------------------------------------ */

  function loadSurah(n, autoplay) {
    var mine = ++S.token;

    S.surah = n;
    save('surah', n);
    player.stop();
    document.body.classList.remove('is-playing');

    renderHead(chapterOf(n));
    setHint('Chargement de la sourate…');
    el.layers.forEach(function (l) { l.classList.remove('is-live'); l.textContent = ''; });
    words = [];
    el.fill.style.width = '0%';
    el.play.classList.add('is-busy');
    el.seek.disabled = true;

    Promise.all([
      window.API.verses(n, S.trans || null),
      window.API.recitation(S.reciter, n),
      /* Le tajwid est un ornement : s'il manque, la recitation continue. */
      window.API.tajweed(n).catch(function () { return {}; })
    ]).then(function (res) {
      if (mine !== S.token) return;

      var verses = res[0], files = res[1];
      S.tajweedText = res[2] || {};
      var byKey = {};
      files.forEach(function (f) { byKey[f.key] = f; });

      var kept = [], tracks = [];
      verses.forEach(function (v) {
        var f = byKey[v.key];
        if (!f) return;
        kept.push(v);
        tracks.push(f);
      });

      el.play.classList.remove('is-busy');

      if (!kept.length) {
        setHint('Cette voix ne propose pas cette sourate. Choisissez un autre récitateur.', 'error');
        return;
      }

      setHint('');
      S.verses = kept;
      el.cAll.textContent = kept.length;
      el.seek.max = kept.length - 1;
      el.seek.disabled = false;

      player.load(tracks);
      setActive(0);
      applyScene();
      if (autoplay) player.play();
    }).catch(function (err) {
      if (mine !== S.token) return;
      el.play.classList.remove('is-busy');
      setHint('Le texte n’a pas pu être chargé (' + err.message + ').', 'error');
    });
  }

  el.retry.addEventListener('click', function () { loadSurah(S.surah, false); });

  /* --- écoute du moteur -------------------------------------------------- */

  player.on.verse    = function (i) { setActive(i); };
  player.on.word     = function (p) { setWord(p); };
  player.on.progress = function (r) { el.fill.style.width = (Math.min(1, Math.max(0, r)) * 100).toFixed(2) + '%'; };
  player.on.error    = function (m) { setHint(m, 'error'); };

  player.on.state = function (st) {
    document.body.classList.toggle('is-playing', st === 'playing');
    el.play.setAttribute('aria-label', st === 'playing' ? 'Suspendre' : 'Écouter');
    el.play.classList.toggle('is-busy', st === 'buffering');
    if (st === 'playing') setHint('');
  };

  player.on.end = function () { setHint('Sourate achevée.'); };

  /* --- transport ---------------------------------------------------------- */

  el.play.addEventListener('click', function () { player.toggle(); });
  el.prev.addEventListener('click', function () { player.prev(); });
  el.next.addEventListener('click', function () { player.next(); });

  el.loop.addEventListener('click', function () {
    var on = el.loop.getAttribute('aria-pressed') !== 'true';
    el.loop.setAttribute('aria-pressed', String(on));
    player.setLoop(on);
  });

  el.mute.addEventListener('click', function () {
    var on = el.mute.getAttribute('aria-pressed') !== 'true';
    el.mute.setAttribute('aria-pressed', String(on));
    el.mute.setAttribute('aria-label', on ? 'Rétablir le son' : 'Couper le son');
    player.setMuted(on);
    save('muted', on);
  });

  el.vol.addEventListener('input', function () {
    var v = Number(el.vol.value) / 100;
    player.setVolume(v);
    save('volume', v);
    if (v > 0 && el.mute.getAttribute('aria-pressed') === 'true') el.mute.click();
  });

  /* Pendant qu'on tire le curseur, la ligne suit sans que l'audio saute. */
  el.seek.addEventListener('input', function () {
    S.seeking = true;
    var i = Number(el.seek.value);
    if (S.verses[i]) { showVerse(i); el.cNow.textContent = i + 1; }
  });
  el.seek.addEventListener('change', function () {
    S.seeking = false;
    player.goto(Number(el.seek.value), player.playing);
  });

  Array.prototype.forEach.call(document.querySelectorAll('.speed__step'), function (b) {
    b.addEventListener('click', function () {
      Array.prototype.forEach.call(document.querySelectorAll('.speed__step'), function (o) {
        o.classList.toggle('is-on', o === b);
      });
      var r = Number(b.dataset.rate);
      player.setRate(r);
      save('rate', r);
    });
  });

  /* --- plein écran ---------------------------------------------------------- */

  function fullscreenOn() {
    return !!(document.fullscreenElement || document.webkitFullscreenElement);
  }

  function toggleFullscreen() {
    var d = document.documentElement;
    if (fullscreenOn()) {
      (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    } else {
      var req = d.requestFullscreen || d.webkitRequestFullscreen;
      if (!req) { setHint('Ce navigateur ne permet pas le plein écran.', 'error'); return; }
      var p = req.call(d);
      if (p && p.catch) p.catch(function () {
        setHint('Le navigateur a refusé le plein écran.', 'error');
      });
    }
  }

  function syncFullscreen() {
    var on = fullscreenOn();
    el.full.setAttribute('aria-pressed', String(on));
    el.full.setAttribute('aria-label', on ? 'Quitter le plein écran' : 'Plein écran');
    document.body.classList.toggle('is-full', on);
    if (!on) wake();
  }

  el.full.addEventListener('click', toggleFullscreen);
  document.addEventListener('fullscreenchange', syncFullscreen);
  document.addEventListener('webkitfullscreenchange', syncFullscreen);

  /* En plein écran les barres s'effacent d'elles-mêmes, et le moindre
     mouvement les rappelle. */
  var idleT;
  function wake() {
    document.body.classList.remove('is-idle');
    clearTimeout(idleT);
    if (!fullscreenOn()) return;
    idleT = setTimeout(function () {
      if (el.drawer.hidden) document.body.classList.add('is-idle');
    }, IDLE_MS);
  }
  ['pointermove', 'pointerdown', 'keydown', 'wheel'].forEach(function (ev) {
    document.addEventListener(ev, wake, { passive: true });
  });

  /* --- tiroir ------------------------------------------------------------- */

  var PANES = ['surahs', 'reciters', 'settings'];
  var TITLES = { surahs: 'Sourate', reciters: 'Récitateur', settings: 'Scène et traduction' };

  /* Un seul point de vérité : l'attribut sur <body>. Le tiroir, le voile et
     les boutons en découlent, donc ils ne peuvent pas se désaccorder. */
  function setDrawer(name) {
    if (name && PANES.indexOf(name) < 0) name = PANES[0];

    document.body.classList.toggle('is-drawer', !!name);
    el.drawer.hidden = !name;
    el.scrim.hidden  = !name;

    Array.prototype.forEach.call(document.querySelectorAll('.pane'), function (p) {
      p.hidden = !name || p.dataset.pane !== name;
    });
    Array.prototype.forEach.call(document.querySelectorAll('.picker'), function (b) {
      b.setAttribute('aria-expanded', String(!!name && b.dataset.pane === name));
    });

    if (!name) {
      if (lastFocus && lastFocus.focus && document.contains(lastFocus)) lastFocus.focus();
      lastFocus = null;
      wake();
      return;
    }

    el.drawerTitle.textContent = TITLES[name];
    var first = el.drawer.querySelector('.pane:not([hidden]) .field__input') ||
                el.drawer.querySelector('.pane:not([hidden]) .opt');
    if (first) first.focus();
  }

  function openPane(name) {
    lastFocus = document.activeElement;
    document.body.classList.remove('is-idle');
    setDrawer(name);
  }
  function closeDrawer() { setDrawer(null); }

  Array.prototype.forEach.call(document.querySelectorAll('.picker'), function (b) {
    b.addEventListener('click', function () {
      if (b.getAttribute('aria-expanded') === 'true') closeDrawer();
      else openPane(b.dataset.pane);
    });
  });

  $('drawer-close').addEventListener('click', closeDrawer);
  el.scrim.addEventListener('click', closeDrawer);
  el.drawer.addEventListener('click', function (e) {
    /* Tout choix ferme : on ne laisse jamais le panneau ouvert sur un état fait. */
    if (e.target.closest && e.target.closest('.opt[data-close="1"]')) closeDrawer();
  });

  /* --- listes -------------------------------------------------------------- */

  function option(parts) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'opt' + (parts.on ? ' is-on' : '');
    if (parts.close) b.dataset.close = '1';

    if (parts.no) {
      var no = document.createElement('span');
      no.className = 'opt__no';
      no.textContent = parts.no;
      b.appendChild(no);
    }

    var body = document.createElement('span');
    body.className = 'opt__body';
    var nm = document.createElement('span');
    nm.className = 'opt__name';
    nm.textContent = parts.name;
    body.appendChild(nm);
    if (parts.sub) {
      var sb = document.createElement('span');
      sb.className = 'opt__sub';
      sb.textContent = parts.sub;
      body.appendChild(sb);
    }
    b.appendChild(body);

    if (parts.ar) {
      var ar = document.createElement('span');
      ar.className = 'opt__ar';
      ar.lang = 'ar'; ar.dir = 'rtl';
      ar.textContent = parts.ar;
      b.appendChild(ar);
    }

    b.appendChild(icon('#i-check', 'ico opt__check'));

    var li = document.createElement('li');
    li.appendChild(b);
    return { li: li, btn: b };
  }

  function buildSurahs(filter) {
    el.surahList.textContent = '';
    var q = fold(filter || '');

    S.chapters.forEach(function (c) {
      var fr = c.translated_name ? c.translated_name.name : '';
      if (q && fold(c.name_simple).indexOf(q) < 0 && fold(fr).indexOf(q) < 0 && String(c.id).indexOf(q) !== 0) return;

      var o = option({
        no: c.id, name: c.name_simple,
        sub: fr + ' · ' + c.verses_count + ' versets',
        ar: c.name_arabic, on: c.id === S.surah, close: true
      });
      o.btn.addEventListener('click', function () { loadSurah(c.id, player.playing); });
      el.surahList.appendChild(o.li);
    });

    if (!el.surahList.children.length) {
      var li = document.createElement('li');
      li.className = 'pane__note';
      li.textContent = 'Aucune sourate ne correspond à « ' + filter + ' ».';
      el.surahList.appendChild(li);
    }
  }

  function buildReciters() {
    el.reciterList.textContent = '';
    S.reciters.forEach(function (r) {
      var o = option({
        name: reciterName(r),
        sub: 'Découpage mot à mot disponible',
        on: r.id === S.reciter, close: true
      });
      o.btn.addEventListener('click', function () {
        S.reciter = r.id;
        save('reciter', r.id);
        el.vReciter.textContent = reciterName(r);
        buildReciters();
        loadSurah(S.surah, player.playing);
      });
      el.reciterList.appendChild(o.li);
    });
  }

  function buildScenes() {
    el.sceneList.textContent = '';
    [SCENE_AUTO].concat(CLIPS, [SCENE_NONE]).forEach(function (sc) {
      var o = option({ name: sc.name, sub: sc.sub, on: sc.id === S.scene });
      o.btn.addEventListener('click', function () {
        S.scene = sc.id;
        save('scene', sc.id);
        applyScene();
        buildScenes();
      });
      el.sceneList.appendChild(o.li);
    });
  }

  function buildTajweed() {
    var list = $('tajweed-list'), leg = $('tajweed-legend');
    list.textContent = '';
    [
      { on: true,  name: 'Regles colorees', sub: 'Chaque regle prend sa teinte dans le texte' },
      { on: false, name: 'Texte nu',        sub: 'Le mushaf en argent, sans annotation' }
    ].forEach(function (opt) {
      var o = option({ name: opt.name, sub: opt.sub, on: S.tajweed === opt.on });
      o.btn.addEventListener('click', function () {
        if (S.tajweed === opt.on) return;
        S.tajweed = opt.on;
        save('tajweed', opt.on);
        document.body.classList.toggle('is-tajweed', opt.on);
        buildTajweed();
        showVerse(S.active);
      });
      list.appendChild(o.li);
    });

    /* Une couleur sans nom n'apprend rien : la legende est ce qui rend
       l'annotation utilisable. */
    leg.textContent = '';
    leg.hidden = !S.tajweed;
    if (!S.tajweed) return;
    RULES.forEach(function (r) {
      var row = document.createElement('div');
      var dt = document.createElement('dt');
      dt.className = 'legend__key tj tj--' + r.c;
      dt.textContent = r.n;
      var dd = document.createElement('dd');
      dd.textContent = r.d;
      row.appendChild(dt); row.appendChild(dd);
      leg.appendChild(row);
    });
  }

  function buildTranslations() {
    el.transList.textContent = '';
    TRANSLATIONS.forEach(function (t) {
      var o = option({ name: t.name, sub: t.sub, on: t.id === S.trans });
      o.btn.addEventListener('click', function () {
        S.trans = t.id;
        save('trans', t.id);
        buildTranslations();
        loadSurah(S.surah, player.playing);
      });
      el.transList.appendChild(o.li);
    });
  }

  el.search.addEventListener('input', function () { buildSurahs(el.search.value); });

  /* --- clavier ---------------------------------------------------------------- */

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { closeDrawer(); return; }

    var t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
    if (!el.drawer.hidden) return;

    switch (e.key) {
      case ' ':          e.preventDefault(); player.toggle(); break;
      case 'ArrowRight': e.preventDefault(); player.next();   break;
      case 'ArrowLeft':  e.preventDefault(); player.prev();   break;
      case 'r': case 'R': el.loop.click(); break;
      case 'm': case 'M': el.mute.click(); break;
      case 'f': case 'F': toggleFullscreen(); break;
    }
  });

  if ('mediaSession' in navigator) {
    try {
      navigator.mediaSession.setActionHandler('play',          function () { player.play(); });
      navigator.mediaSession.setActionHandler('pause',         function () { player.pause(); });
      navigator.mediaSession.setActionHandler('nexttrack',     function () { player.next(); });
      navigator.mediaSession.setActionHandler('previoustrack', function () { player.prev(); });
    } catch (e) { /* pas de gestionnaire média */ }
  }

  /* Certains navigateurs retiennent la vidéo tant qu'aucun geste n'a eu lieu. */
  document.addEventListener('pointerdown', function once () {
    document.removeEventListener('pointerdown', once);
    [$('scene-a'), $('scene-b')].forEach(function (v) {
      if (v.paused && v.getAttribute('src') && v.classList.contains('is-lit')) {
        var p = v.play();
        if (p && p.catch) p.catch(function () {});
      }
    });
  });

  /* --- démarrage ---------------------------------------------------------------- */

  function boot() {
    player.setRate(S.rate);
    player.setVolume(S.volume);
    player.setMuted(S.muted);

    el.vol.value = Math.round(S.volume * 100);
    el.mute.setAttribute('aria-pressed', String(!!S.muted));
    Array.prototype.forEach.call(document.querySelectorAll('.speed__step'), function (b) {
      b.classList.toggle('is-on', Number(b.dataset.rate) === S.rate);
    });

    document.body.classList.toggle('is-tajweed', !!S.tajweed);
    buildScenes();
    buildTranslations();
    buildTajweed();
    applyScene();
    setHint('Chargement…');

    Promise.all([window.API.chapters(), window.API.reciters()]).then(function (res) {
      S.chapters = res[0];
      S.reciters = res[1];

      var known = false;
      S.reciters.forEach(function (r) {
        if (r.id === S.reciter) { known = true; el.vReciter.textContent = reciterName(r); }
      });
      if (!known && S.reciters.length) {
        S.reciter = S.reciters[0].id;
        el.vReciter.textContent = reciterName(S.reciters[0]);
      }

      buildSurahs('');
      buildReciters();
      loadSurah(S.surah, false);
    }).catch(function (err) {
      setHint('Impossible de joindre api.quran.com (' + err.message + '). Vérifiez la connexion, puis réessayez.', 'error');
    });
  }

  boot();
})();
