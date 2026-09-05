/* ============================================================
   api.js — client api.quran.com v4 (aucune clé requise)
   ============================================================ */

window.API = (function () {
  'use strict';

  var BASE  = 'https://api.quran.com/api/v4';
  var AUDIO = 'https://verses.quran.com/';
  var cache = {};

  function get(path) {
    if (cache[path]) return cache[path];

    var p = fetch(BASE + path, { headers: { Accept: 'application/json' } })
      .then(function (r) {
        if (!r.ok) throw new Error('Réponse ' + r.status + ' de api.quran.com');
        return r.json();
      })
      .catch(function (err) {
        delete cache[path];
        throw err;
      });

    cache[path] = p;
    return p;
  }

  /* Un segment vaut [index, position, débutMs, finMs] ; certaines voix
     n'envoient que [position, débutMs, finMs]. On lit par la queue. */
  function readSegments(raw) {
    var out = [];
    if (!raw || !raw.length) return out;

    for (var i = 0; i < raw.length; i++) {
      var s = raw[i];
      if (!s || s.length < 3) continue;
      out.push({
        pos:   Number(s.length >= 4 ? s[1] : s[0]),
        start: Number(s[s.length - 2]),
        end:   Number(s[s.length - 1])
      });
    }
    out.sort(function (a, b) { return a.start - b.start; });
    return out;
  }

  return {
    audioBase: AUDIO,

    /* Les 114 sourates, nom français inclus. */
    chapters: function () {
      return get('/chapters?language=fr').then(function (d) { return d.chapters; });
    },

    /* Les récitateurs disposant d'un découpage verset par verset. */
    reciters: function () {
      return get('/resources/recitations').then(function (d) { return d.recitations; });
    },

    /* Le texte d'une sourate : mot à mot + traduction du verset. */
    verses: function (chapter, translationId) {
      var q = '/verses/by_chapter/' + chapter +
              '?words=true&word_fields=text_uthmani&fields=text_uthmani&per_page=300';
      if (translationId) q += '&translations=' + translationId;

      return get(q).then(function (d) {
        return d.verses.map(function (v) {
          var words = [];
          var mark  = '';

          for (var i = 0; i < v.words.length; i++) {
            var w = v.words[i];
            if (w.char_type_name === 'end') { mark = w.text_uthmani || w.text || ''; continue; }
            words.push({ pos: w.position, text: w.text_uthmani || w.text || '' });
          }

          var tr = (v.translations && v.translations[0] && v.translations[0].text) || '';
          /* Les traductions portent parfois des appels de note en HTML. */
          tr = tr.replace(/<sup[^>]*>[\s\S]*?<\/sup>/gi, '').replace(/<[^>]+>/g, '').trim();

          return {
            key:    v.verse_key,
            number: v.verse_number,
            arabic: v.text_uthmani,
            words:  words,
            mark:   mark,
            trans:  tr
          };
        });
      });
    },

    /* Les fichiers audio d'une sourate pour une voix, avec minutage des mots. */
    recitation: function (reciterId, chapter) {
      var q = '/recitations/' + reciterId + '/by_chapter/' + chapter +
              '?fields=segments&per_page=300';

      return get(q).then(function (d) {
        return d.audio_files.map(function (f) {
          return {
            key:      f.verse_key,
            url:      AUDIO + f.url,
            segments: readSegments(f.segments)
          };
        });
      });
    }
  };
})();
