# Les APIs de Sakīna

Tout ce que le site affiche vient de sources externes : il n'embarque aucun texte
coranique, aucun audio, aucune vidéo. Ce document dit **lesquelles**, **comment** elles
sont appelées, **ce qu'elles renvoient exactement**, et **les pièges** rencontrés en les
branchant.

Tous les exemples de réponse ci-dessous sont de vraies réponses, relevées le 5 septembre 2026.

## Vue d'ensemble

| Source | Rôle | Clé requise | Où dans le code |
|---|---|---|---|
| [api.quran.com v4](#1-apiqurancom--lapi-de-donn%C3%A9es) | sourates, récitateurs, texte, traductions, minutage | non | `assets/js/api.js` |
| [verses.quran.com](#2-versesqurancom--le-cdn-audio) | fichiers audio, un par verset | non | `assets/js/api.js` (`AUDIO`) |
| [assets.mixkit.co](#3-assetsmixkitco--les-plans-vid%C3%A9o) | plans vidéo de fond | non | `assets/js/app.js` (`CLIPS`) |
| [fonts.googleapis.com](#4-google-fonts--les-caract%C3%A8res) | trois familles de caractères | non | `index.html` |

Aucune inscription, aucun jeton, aucune variable d'environnement. C'est ce qui permet au
site d'être un dossier de fichiers statiques.

---

## 1. api.quran.com — l'API de données

**Base :** `https://api.quran.com/api/v4`

Projet [Quran.com](https://quran.com) (Quran Foundation). API publique, en lecture seule.

### En-têtes observés

```
Content-Type: application/json; charset=utf-8
access-control-allow-origin: *
Cache-Control: public, max-age=691200        (8 jours)
Server: cloudflare
```

`access-control-allow-origin: *` est la raison pour laquelle le site fonctionne aussi
en `file://` : l'origine `null` est acceptée. Aucun en-tête de quota (`X-RateLimit-*`)
n'est renvoyé ; il n'y a pas de limite documentée, et le site fait **deux requêtes par
sourate**, mises en cache côté client.

### Erreurs

Les erreurs arrivent en JSON avec un `status`, pas seulement en code HTTP :

```json
{ "status": 404, "error": "Recitation not found" }
```

`GET /chapters/115` renvoie un vrai `404`. Le client (`api.js`) lève sur tout statut
non-2xx et **retire l'entrée du cache**, pour qu'un « Réessayer » reparte proprement :

```js
.catch(function (err) { delete cache[path]; throw err; });
```

---

### 1.1 Les 114 sourates

```http
GET /chapters?language=fr
```

`language` traduit le champ `translated_name`. Le reste est indépendant de la langue.

```json
{
  "id": 2,
  "revelation_place": "madinah",
  "revelation_order": 87,
  "bismillah_pre": true,
  "name_simple": "Al-Baqarah",
  "name_complex": "Al-Baqarah",
  "name_arabic": "البقرة",
  "verses_count": 286,
  "pages": [2, 49],
  "translated_name": { "language_name": "french", "name": "La vache" }
}
```

Champs utilisés :

| Champ | Emploi dans le site |
|---|---|
| `id` | numéro de sourate, clé de toutes les autres requêtes |
| `name_simple` | ce qu'affiche le sélecteur du bandeau |
| `name_arabic` | le titre en haut du lecteur |
| `translated_name.name` | le sous-titre français |
| `verses_count` | la ligne de métadonnées |
| `revelation_place` | « Mecquoise » / « Médinoise » |
| `bismillah_pre` | affiche ou non la basmala sous le titre |

**Le piège `bismillah_pre`.** Il vaut `false` pour deux sourates seulement : Al-Fātiḥah
(sa basmala **est** le verset 1) et At-Tawbah (qui n'en a pas). Afficher la basmala
sans tester ce champ la ferait apparaître deux fois sur Al-Fātiḥah.

---

### 1.2 Les récitateurs

```http
GET /resources/recitations
```

Renvoie exactement **12 voix**, toutes disposant d'un minutage mot à mot :

| id | Récitateur | Style |
|---:|---|---|
| 1 | AbdulBaset AbdulSamad | Mujawwad |
| 2 | AbdulBaset AbdulSamad | Murattal |
| 3 | Abdur-Rahman as-Sudais | — |
| 4 | Abu Bakr al-Shatri | — |
| 5 | Hani ar-Rifai | — |
| 6 | Mahmoud Khalil Al-Husary | — |
| 7 | Mishari Rashid al-\`Afasy | — |
| 8 | Mohamed Siddiq al-Minshawi | Mujawwad |
| 9 | Mohamed Siddiq al-Minshawi | Murattal |
| 10 | Sa\`ud ash-Shuraym | — |
| 11 | Mohamed al-Tablawi | — |
| 12 | Mahmoud Khalil Al-Husary | Muallim |

`style` est `null` pour la moitié d'entre eux ; le site ne l'affiche que s'il existe,
sinon on lirait « Hani ar-Rifai · null ».

Les noms translittérés portent une **apostrophe inverse** (`` ` ``) là où la
translittération académique met un ʿayn. Le site la remplace :

```js
String(r.reciter_name).replace(/`/g, 'ʿ')   // Mishari Rashid al-ʿAfasy
```

`?language=fr` ne traduit rien ici : ce sont des noms propres, et la réponse reste
identique. Le site n'envoie donc pas le paramètre.

---

### 1.3 Le texte, mot par mot, avec traduction

```http
GET /verses/by_chapter/{sourate}
      ?words=true
      &word_fields=text_uthmani
      &fields=text_uthmani
      &translations={id}
      &per_page=300
```

C'est la requête la plus lourde du site : elle rapporte une sourate entière en une fois.

```json
{
  "verses": [{
    "id": 6222,
    "verse_number": 1,
    "verse_key": "112:1",
    "text_uthmani": " قُلْ هُوَ ٱللَّهُ أَحَدٌ",
    "juz_number": 30,
    "page_number": 604,
    "words": [
      { "position": 1, "char_type_name": "word", "text_uthmani": "قُلْ",
        "translation": { "text": "Say", "language_name": "english" },
        "transliteration": { "text": "qul", "language_name": "english" } },
      { "position": 4, "char_type_name": "word", "text_uthmani": "أَحَدٌ", "…": "…" },
      { "position": 5, "char_type_name": "end",  "text_uthmani": "١" }
    ],
    "translations": [
      { "id": 169146, "resource_id": 31, "text": "Dis : \"Il est Allah, Unique." }
    ]
  }],
  "pagination": { "per_page": 300, "current_page": 1, "next_page": null,
                  "total_pages": 1, "total_records": 4 }
}
```

**Trois choses à savoir.**

**a) Le dernier « mot » n'en est pas un.** Chaque verset finit par une entrée
`char_type_name: "end"` qui porte le chiffre arabo-indien du verset (`١`, `٢`, `٣`…),
pas un mot récité. Le client la sépare : elle devient le numéro affiché en fin de ligne,
et elle est exclue du surlignage — sinon la dernière position resterait allumée à jamais.

```js
if (w.char_type_name === 'end') { mark = w.text_uthmani; continue; }
```

**b) `position` commence à 1**, et c'est cette valeur — pas l'indice du tableau — qui
relie un mot à son segment de minutage.

**c) Les traductions contiennent du HTML.** Ce n'est pas marginal : sur les 60 premiers
versets d'Al-Baqarah, **18 à 22 versets selon la traduction** portent un appel de note
`<sup foot_note=211622>1</sup>` — soit environ un tiers, et cela vaut pour les quatre
traductions proposées. Affiché tel quel avec `textContent`, on lirait le balisage au
milieu de la phrase. Le client le retire :

```js
tr.replace(/<sup[^>]*>[\s\S]*?<\/sup>/gi, '').replace(/<[^>]+>/g, '').trim();
```

**Pagination.** `per_page` accepte au moins 500 : Al-Baqarah (286 versets) revient en
**une seule requête**, `next_page: null`. Le site demande 300, ce qui couvre la plus
longue sourate avec de la marge. Mesuré : 286 versets rendus en 2,2 s.

#### Les traductions disponibles

```http
GET /resources/translations
```

Renvoie plus de cent traductions ; il faut filtrer sur `language_name`. Celles retenues :

| id | Traduction | Langue |
|---:|---|---|
| 31 | Muhammad Hamidullah | français *(défaut)* |
| 136 | Fondation islamique Montada | français |
| 779 | Rashid Maash | français |
| 20 | Saheeh International | anglais |

Passer `translations=0` — ou omettre le paramètre — renvoie le texte arabe seul ; c'est
l'option « Aucune traduction ».

---

### 1.4 L'audio et le minutage des mots — le cœur du site

```http
GET /recitations/{voix}/by_chapter/{sourate}?fields=segments&per_page=300
```

```json
{
  "audio_files": [
    { "verse_key": "112:1",
      "segments": [[0,1,30,390],[1,2,400,790],[2,3,800,1640],[3,4,1650,2300]],
      "url": "Alafasy/mp3/112001.mp3" },
    { "verse_key": "112:2",
      "segments": [[0,1,40,980],[1,2,990,1850]],
      "url": "Alafasy/mp3/112002.mp3" }
  ],
  "pagination": { "per_page": 2, "current_page": 1, "next_page": 2,
                  "total_pages": 2, "total_records": 4 }
}
```

#### Le format d'un segment

Un segment est un tableau de quatre nombres :

```
[ index, position du mot, début en ms, fin en ms ]
    0          1              30          390
```

Le `début` et la `fin` sont relatifs **au fichier de ce verset**, pas à la sourate.
C'est toute la raison pour laquelle le site lit un mp3 par verset plutôt que le fichier
unique de la sourate : le minutage n'existe qu'à cette échelle.

#### Piège : les types ne sont pas homogènes

Relevé sur les 12 voix, sourate 36 (≈341 segments chacune) :

| Voix | Type des valeurs |
|---|---|
| 2, 4, 5, 6, 7, 8, 9, 10, 11, 12 | nombres |
| 3 (as-Sudais) | **chaînes** — `["0","1","100","500"]` |
| 1 (AbdulBaset Mujawwad) | **mélange des deux dans la même sourate** |

`t >= s.start` sur une chaîne compare des caractères, pas des durées : `"1000" < "900"`.
Le surlignage part alors en vrille sur ces deux voix seulement. Le client convertit
systématiquement, et lit les bornes **par la queue du tableau** pour survivre à un
format à trois éléments :

```js
out.push({
  pos:   Number(s.length >= 4 ? s[1] : s[0]),
  start: Number(s[s.length - 2]),
  end:   Number(s[s.length - 1])
});
out.sort(function (a, b) { return a.start - b.start; });
```

*(À ce jour les 12 voix renvoient bien 4 éléments ; la lecture par la queue est une
précaution, pas un contournement d'un cas observé.)*

#### Le minutage est-il fiable ?

Vérifié en comparant la fin du dernier segment à la durée réelle du mp3, sur les
premiers versets d'Al-Fātiḥah :

| Voix | Écart fin de segment ↔ fin du fichier |
|---|---|
| al-ʿAfasy | 61 → 412 ms |
| AbdulBaset | −22 → 638 ms |
| as-Sudais | 0 → 537 ms |

Aucun décalage systématique : ce qui reste est la traîne naturelle (réverbération,
silence de fin). **Le minutage est juste.** Une désynchronisation perçue vient donc du
rendu, pas des données — voir [le rendu du surlignage](#le-rendu-du-surlignage).

#### Couverture

Tous les récitateurs couvrent toutes les sourates : vérifié sur la sourate 36
(83 versets) pour les voix 1, 2, 8 et 9 — 83 fichiers chacune. Le site croise malgré
tout les versets et les fichiers par `verse_key` et n'affiche que ce qui est réellement
récitable, plutôt que de supposer :

```js
verses.forEach(function (v) {
  var f = byKey[v.key];
  if (!f) return;               // pas d'audio -> le verset n'entre pas dans la file
  kept.push(v); tracks.push(f);
});
```

Si une voix ne rendait rien pour une sourate, l'interface le dirait au lieu de rester
muette : « Cette voix ne propose pas cette sourate. Choisissez un autre récitateur. »

---

## 2. verses.quran.com — le CDN audio

Le champ `url` des `audio_files` est **relatif**. Il faut le préfixer :

```
https://verses.quran.com/ + "Alafasy/mp3/112001.mp3"
```

Le nom de fichier encode la référence : `112001` = sourate 112, verset 1, sur 3 chiffres
chacun.

```
HTTP/1.1 200 OK
Content-Type: audio/mpeg
Content-Length: 48192
Accept-Ranges: bytes
Access-Control-Allow-Origin: *
Cache-Control: max-age=25600000        (~296 jours)
Server: BunnyCDN
```

`Accept-Ranges: bytes` permet au navigateur de chercher dans le fichier ; `max-age`
quasi éternel signifie qu'une seconde écoute de la même sourate ne retélécharge rien.

**À ne pas faire :** mettre `crossOrigin = "anonymous"` sur les `<audio>`. C'est inutile
ici (le site ne passe pas par la Web Audio API) et cela ajoute un mode d'échec si le CDN
cessait un jour d'envoyer l'en-tête CORS. L'attribut a été retiré.

### L'alternative écartée

```http
GET /chapter_recitations/{voix}/{sourate}
→ { "audio_file": { "audio_url": "https://download.quranicaudio.com/qdc/mishari_al_afasy/murattal/112.mp3" } }
```

Un seul fichier pour toute la sourate. Plus simple à lire, mais **sans minutage** :
impossible de savoir quel mot est en cours. Écarté pour cette raison.

---

## 3. assets.mixkit.co — les plans vidéo

Cinq plans, en lien direct, licence [Mixkit](https://mixkit.co/license/) (libre, sans
attribution obligatoire). Rien n'est copié dans le dépôt.

| Plan | URL | Poids |
|---|---|---|
| Lac étoilé | `assets.mixkit.co/videos/1704/1704-720.mp4` | 3,7 Mo |
| Pleine lune | `assets.mixkit.co/videos/4433/4433-720.mp4` | 13,4 Mo |
| Forêt de brume | `assets.mixkit.co/videos/28342/28342-720.mp4` | 5,2 Mo |
| Brouillard | `assets.mixkit.co/videos/34789/34789-720.mp4` | 4,5 Mo |
| Vagues | `assets.mixkit.co/videos/1164/1164-720.mp4` | 7,6 Mo |

Les quatre URL sont regroupées dans `CLIPS`, en tête de `assets/js/app.js`.

**Pourquoi le 720p et pas le 1080p.** Les mêmes plans existent en `-1080.mp4`, mais
pèsent 35 à 165 Mo — pour une image volontairement assombrie et floutée par le voile,
c'est du téléchargement pur. Certains id n'ont d'ailleurs **pas** de version 1080
(`34789-1080.mp4` renvoie `403`).

Un plan injoignable ne casse pas la récitation : `scene.js` remonte l'erreur, le site
affiche un message passager et garde le fond d'encre.

---

## 4. Google Fonts — les caractères

```http
GET https://fonts.googleapis.com/css2
      ?family=Amiri+Quran
      &family=Familjen+Grotesk:wght@400;500;600;700
      &family=Petrona:ital,wght@0,300;0,400;0,500;1,400
      &display=swap
```

| Famille | Rôle |
|---|---|
| **Amiri Quran** | le texte coranique — choisi parce qu'il porte les signes du mushaf |
| **Familjen Grotesk** | l'interface |
| **Petrona** | la traduction |

`display=swap` évite le texte invisible pendant le chargement. Chaque famille a une pile
de repli système (`Scheherazade New`, `Segoe UI`, `Georgia`).

---

## Comment le site enchaîne tout ça

### Au démarrage — 2 requêtes

```
GET /chapters?language=fr          →  les 114 sourates du sélecteur
GET /resources/recitations         →  les 12 voix
```

Lancées en parallèle (`Promise.all`). Si l'une échoue, le site le dit et propose de
réessayer, plutôt que d'afficher une page vide.

### À chaque sourate — 2 requêtes

```
GET /verses/by_chapter/{n}?words=true&translations={t}&per_page=300
GET /recitations/{r}/by_chapter/{n}?fields=segments&per_page=300
```

Également en parallèle, puis croisées par `verse_key`. Chaque requête est mémorisée
dans `api.js`, donc revenir à une sourate déjà lue ne coûte rien.

Un compteur (`S.token`) invalide les réponses d'une sourate qu'on a quittée entre-temps :
sans lui, changer vite de sourate deux fois pourrait afficher le texte de la première.

### Pendant la lecture — 0 requête API

Seuls les mp3 se chargent, un verset à l'avance. Deux éléments `<audio>` alternent :
pendant que l'un récite, l'autre a déjà le suivant en tampon.

### Le rendu du surlignage

Le moteur compare la position de lecture aux segments, image par image
(`requestAnimationFrame`), avec `timeupdate` en filet quand le navigateur met les
animations en veille (onglet caché, vue intégrée).

Deux corrections rendent la synchronisation juste **à l'œil** et pas seulement en
théorie :

- le mot s'allume **110 ms avant** son attaque — le temps que l'œil le trouve, la
  syllabe est déjà passée ;
- la transition de couleur dure **110 ms** et non 280 : une transition longue fait
  paraître la lumière en retard même quand le calcul est juste.

Mesuré en lecture réelle, 40 échantillons : **un seul écart, de 78 ms**, du côté de
l'avance.

Entre deux mots, le précédent reste allumé plutôt que de s'éteindre — sinon la ligne
clignoterait à chaque silence :

```js
if (t < segs[i].start) { pos = i > 0 ? segs[i - 1].pos : null; break; }
```

---

## Récapitulatif du trafic

Écouter une sourate de bout en bout, depuis une page fraîche :

| | Requêtes | Poids |
|---|---:|---|
| Démarrage (sourates + voix) | 2 | ~90 Ko |
| La sourate (texte + minutage) | 2 | 40 Ko – 1,2 Mo selon la longueur |
| Audio | 1 par verset | ~50 à 300 Ko par verset |
| Vidéo de fond | 1 par plan | 3,7 à 13,4 Mo |
| Caractères | 3 | ~200 Ko |

La scène « Fond d'encre » supprime entièrement le poste vidéo.

## Crédits

Le texte, les traductions, l'audio et le minutage viennent de **Quran.com**
(Quran Foundation). Ce site n'est qu'une façon de les écouter ; tout le travail
d'établissement du texte et de découpage des récitations est le leur.

Les plans de fond viennent de **[Mixkit](https://mixkit.co)**, licence libre.

Sakīna est conçu et réalisé par **Maher Bouchrara** — [maherbouchrara.me](https://maherbouchrara.me).
