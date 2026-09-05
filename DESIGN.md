# DESIGN.md — Sakīna

Relevé du monde visuel tel qu'il est construit, pas tel qu'il était rêvé.
Toute modification d'interface doit rester dans ce système ou le modifier ici d'abord.

## Le monde

Une veille de nuit. La scène filmée est réelle mais voilée ; le verset est la seule
chose pleinement éclairée. Le bleu n'est pas un accent néon posé sur du noir : c'est
de la lumière de lune sur de l'eau. Rien ne brille sauf le mot en cours de récitation.

Deux voix typographiques ne se mélangent jamais : l'arabe est argent, la traduction
est sable. On sait toujours laquelle on lit.

**Une seule ligne est à l'écran.** Pas de liste de versets, pas de défilement : le
verset récité occupe le centre, et rien d'autre ne lui dispute l'attention. La ligne
qui vient se lève pendant que la précédente s'efface — deux couches superposées qui se
croisent, jamais un remplacement sec.

## Jetons (`assets/css/style.css`, `:root`)

| Rôle | Valeur | Emploi |
|---|---|---|
| `--ink` | `#04060b` | fond, sous la vidéo |
| `--ink-2` | `#070c15` | haut du tiroir |
| `--moon` | `#7fb4ff` | accent unique : icônes, jauge, anneau de lecture, focus |
| `--moon-soft` | `#a8ccff` | mots déjà récités, nom arabe de la sourate |
| `--moon-deep` | `#6a90c4` | numéros de verset, numéros de sourate |
| `--silver` | `#eaf1fb` | texte coranique |
| `--silver-2` | `alpha .58` | métadonnées, libellés de commande |
| `--silver-3` | `alpha .52` | libellés secondaires (plancher de contraste) |
| `--sand` | `#dfcfab` | traduction du verset actif |
| `--sand-2` | `alpha .76` | traduction au repos |
| `--line` / `--line-2` | bleu `.14` / `.30` | filets d'un pixel — le seul trait de l'interface |

Stratégie de couleur : **restreinte**. Un bleu, une lumière, un sable. Rien d'autre
ne doit entrer dans la palette sans remplacer quelque chose.

## Caractères

- **Amiri Quran** — le texte coranique. Choisi parce qu'il porte les signes du mushaf,
  pas parce qu'il « fait arabe ». Interligne 2,15 : le tashkīl a besoin d'air.
- **Familjen Grotesk** — instruments : bandeau, rail de transport, tiroir.
- **Petrona** — la traduction. Un serif tenu à l'écart de l'arabe par la couleur
  autant que par la forme.

Échelle du verset : `clamp(1.42rem, 2.4vw, 2.05rem)` au repos,
`clamp(1.72rem, 3.15vw, 2.75rem)` à l'état actif. La hiérarchie se joue sur la
**taille**, pas sur l'effacement des voisins — d'où le plancher d'opacité ci-dessous.

## Contraste (plancher tenu, mesuré)

Tout texte courant reste au-dessus de 4,5:1, sur l'encre comme sur le point le plus
clair que la scène voilée peut atteindre.

| Rôle | sur encre | sur scène |
|---|---|---|
| mot allumé | 20,3:1 | 17,9:1 |
| verset à l'écran | 17,8:1 | 15,7:1 |
| traduction | 13,2:1 | 11,6:1 |
| mot déjà lu | 12,3:1 | 10,9:1 |
| numéro de verset | 6,2:1 | 5,5:1 |
| libellé secondaire | 5,1:1 | 5,1:1 |

Plancher constaté : **5,05:1**.

Comme un seul verset est affiché, aucun texte n'est plus atténué pour créer de la
hiérarchie : ce que l'on montre, on le montre lisible. Le recul se joue entre la ligne
qui part et celle qui vient, pendant le fondu.

Le voile (`.stage__veil`) est un dispositif optique, pas une décoration : il tient
ces ratios au-dessus d'une vidéo dont on ne contrôle pas la luminosité.

## Mouvement

Un seul moment orchestré : **la ligne se lève**. Au changement de verset, la ligne
entrante monte de 18 px, passe de flou 6 px à net et de 0 à 1 d'opacité sur
`cubic-bezier(.16, 1, .3, 1)` en 620 ms, pendant que la sortante fait le chemin
inverse. Les deux se croisent : il n'y a jamais d'écran vide entre deux versets.

Le mot en cours s'allume en **110 ms** — pas plus. Une transition plus longue fait
paraître la lumière en retard sur la voix, même quand le calcul est juste. Pour la
même raison le moteur éclaire 110 ms avant l'attaque du mot.

Le fond suit la même règle : deux plans jouent ensemble pendant deux secondes de fondu.
La durée du fondu CSS et celle du croisement dans `scene.js` sont le même nombre ;
si l'une change, l'autre doit suivre, sinon un noir apparaît entre les plans.

`prefers-reduced-motion` coupe tout.

## Règles tenues

- Aucune carte. La structure est faite de filets d'un pixel et de vide.
- Aucun surtitre au-dessus d'un titre.
- Aucun dégradé sur du texte ; l'emphase vient du poids et de la taille.
- Icônes dessinées en SVG, trait 1,5 uniforme — jamais d'emoji.
- Le flou n'apparaît que là où il fait un travail précis : lisibilité des barres
  fixes au-dessus d'une vidéo.
- Les surfaces du navigateur sont habillées : sélection, curseur de saisie,
  barres de défilement, anneau de focus, chiffres tabulaires.

## Plein écran

Le plein écran n'est pas seulement une fenêtre plus grande : après 2,8 secondes
d'immobilité, le bandeau glisse vers le haut, le rail vers le bas, l'identité de la
sourate s'efface et le curseur disparaît. Il ne reste que la ligne sur la scène.
Le moindre mouvement rappelle tout en un demi-fondu.

## Ce qui reste ouvert

Pas de mode clair, et il n'en faut pas : la scène d'usage est la nuit.
Pas de thème alternatif prévu — une seconde palette diluerait celle-ci.
