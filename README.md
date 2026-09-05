# Sakīna

Un site d'écoute du Coran. On choisit une voix et une sourate, on appuie sur Écouter,
et **un seul verset reste à l'écran**, au centre, le mot en cours de récitation éclairé —
au-dessus d'une scène de nature filmée qui se renouvelle en fondu.

Site statique. Aucune installation, aucune clé d'API, aucune dépendance à installer.

## Depot

<https://github.com/Maher-bouchrara/sakina-quran> — branche `main`.

## En ligne

<https://sakina-quran-weld.vercel.app>

Projet Vercel **sakina-quran**, relie au depot : chaque push sur `main` declenche
un deploiement de production.

## Lancer en local

```bash
python -m http.server 8123
```

Puis ouvrir <http://localhost:8123>.

Ouvrir `index.html` directement depuis le disque fonctionne aussi : les deux API
renvoient `Access-Control-Allow-Origin: *`, donc l'origine `file://` est acceptée.
Un petit serveur reste plus sûr (certains navigateurs durcissent `file://`).

## Ce que fait le site

- **Une ligne à la fois.** Le verset récité occupe le centre de la page. Quand la
  récitation avance, la ligne suivante se lève pendant que la précédente s'efface.
- **Les longs versets tiennent quand même.** Le corps se resserre par paliers selon
  la longueur ; au-delà, la zone défile et son bas s'estompe pour signaler la suite.
- **Le mot en cours s'allume**, et les mots déjà lus restent bleutés : on suit sans
  chercher où l'on en est.
- **Choix du récitateur** — les 12 voix de quran.com qui disposent d'un minutage
  mot à mot (ʿAfasy, as-Sudais, al-Husary, al-Minshawi, AbdulBaset…).
- **Traduction en regard** — Hamidullah par défaut, plus Montada, Rashid Maash,
  Saheeh International, ou aucune.
- **Fond filmé sans raccord.** Cinq plans, plus un mode automatique et un fond
  d'encre sans vidéo du tout.
- **Plein écran** : les barres s'effacent d'elles-mêmes après 2,8 s d'immobilité,
  la ligne reste seule ; le moindre mouvement les rappelle.
- Curseur pour aller à n'importe quel verset ; répétition d'un verset ; vitesse
  0,75× / 1× / 1,25× ; volume ; clavier (`Espace`, `←`, `→`, `R`, `M`, `F`, `Échap`) ;
  touches média du système.
- Les préférences (voix, sourate, traduction, scène, vitesse, volume) sont conservées
  d'une visite à l'autre.

## Structure

```
index.html              structure et jeu d'icônes SVG
assets/css/style.css    le monde visuel : encre, bleu de lune, sable
assets/js/api.js        client api.quran.com v4
assets/js/player.js     moteur audio et suivi mot à mot
assets/js/scene.js      le fond filmé et ses fondus
assets/js/app.js        assemblage : la ligne, le tiroir, le clavier, les préférences
```

### Le moteur audio

Deux éléments `<audio>` alternent : pendant que l'un récite le verset courant, l'autre
a déjà mis le suivant en mémoire tampon. C'est ce qui rend l'enchaînement net plutôt
que haché — et c'est pourquoi le site lit un fichier **par verset** plutôt que le
fichier unique de la sourate entière : le minutage des mots est fourni par verset.

`requestAnimationFrame` mène le suivi mot à mot ; un écouteur `timeupdate` prend le
relais quand le navigateur met les animations en veille (onglet caché, vue intégrée,
économie d'énergie).

Le mot s'allume **110 ms avant** son attaque, et la transition de couleur dure 110 ms.
Sans cette avance, le temps que l'œil trouve le mot, la syllabe est déjà passée : la
lumière paraît en retard alors que le calcul est juste. Mesuré en lecture réelle sur
40 échantillons : un seul écart, de 78 ms.

### Le fond filmé

Deux éléments `<video>` alternent eux aussi. Le plan suivant est mis en tampon dix
secondes avant la fin du plan courant, puis les deux jouent ensemble pendant deux
secondes de fondu croisé. Une boucle est un fondu du plan **sur lui-même** : c'est ce
qui efface le raccord que l'attribut `loop` laisse voir.

En mode automatique, le numéro de la sourate décide du plan d'ouverture, puis les plans
s'enchaînent en fondu sans fin. En scène fixe, le plan choisi boucle sur lui-même.

## Sources

**[API.md](API.md) documente tout en détail** : chaque point d'entrée, les réponses
réelles, les pièges rencontrés et le trafic engendré. Résumé :

| Ce qui est appelé | Point d'entrée |
|---|---|
| Les 114 sourates, noms français | `GET /chapters?language=fr` |
| Les récitateurs | `GET /resources/recitations` |
| Texte uthmani + mots + traduction | `GET /verses/by_chapter/{n}?words=true&translations={id}` |
| Fichiers audio + minutage des mots | `GET /recitations/{r}/by_chapter/{n}?fields=segments` |

Base : `https://api.quran.com/api/v4` — audio servi depuis `https://verses.quran.com`.
Un segment vaut `[index, position du mot, début ms, fin ms]` ; certaines voix renvoient
ces nombres sous forme de chaînes, le client les convertit.

Fonds vidéo : [Mixkit](https://mixkit.co), licence libre. Ce sont des liens externes,
rien n'est copié dans le dépôt ; les URL sont regroupées dans `CLIPS`, en tête de
`assets/js/app.js`, si vous voulez changer de scène.

Caractères : Amiri Quran (texte coranique), Familjen Grotesk (interface),
Petrona (traduction), via Google Fonts.

## Notes de conception

Les décisions visuelles durables sont consignées dans [DESIGN.md](DESIGN.md) et
[`.impeccable/surfaces/index.md`](.impeccable/surfaces/index.md) — fichiers de travail,
jamais servis au navigateur.

Le skill de design [impeccable](https://github.com/pbakaus/impeccable) est installé
dans `.claude/skills/impeccable`. Son binaire ne s'exécute pas sur cette machine
(la sécurité Windows refuse le lancement) ; les références du skill ont donc été
suivies à la lecture.

## Crédits

Texte, traductions, récitations et minutage mot à mot : **[Quran.com](https://quran.com)**
(Quran Foundation). Plans de fond : **[Mixkit](https://mixkit.co)**.

Conçu et réalisé par **Maher Bouchrara** — [maherbouchrara.me](https://maherbouchrara.me).

Dans le site, la signature est affichée à deux endroits, toutes deux cliquables
vers le portfolio :

- **en bas de chaque page**, sur sa propre bande sous les commandes :
  « © Maher Bouchrara ». Elle ne dépend d'aucune rangée qui se réorganise selon la
  largeur, donc elle est là à toutes les tailles, du téléphone au grand écran ;
- **Scène → Crédits**, avec les sources du texte et des vidéos.

## Limites connues

- Pas de mode hors-ligne : il faut une connexion pour l'audio comme pour le texte.
- La position de lecture n'est pas mémorisée d'une sourate à l'autre.
- Il n'y a plus de liste des versets à l'écran : la navigation passe par le curseur
  du rail de transport et par le sélecteur de sourate.
- La traduction mot à mot fournie par l'API n'existe qu'en anglais ; le site n'affiche
  donc que la traduction du verset entier.
