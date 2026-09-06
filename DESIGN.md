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

## Les versets longs

Un verset de deux mots et un verset de mille ne peuvent pas tenir au même corps.
Trois dispositifs, dans cet ordre :

1. **Le corps se resserre par paliers**, selon la longueur du texte arabe : 1 jusqu'à
   70 caractères, puis 0,88 · 0,80 · 0,73 · 0,68. Le plancher n'est pas arbitraire —
   en dessous, le tashkīl se referme sur la lettre et le mot cesse d'être lisible.
2. **La zone du verset défile** quand même le dernier palier ne suffit pas
   (Al-Baqarah 2:282, 1 220 caractères, ne tiendra sur aucun téléphone).
3. **Le bas s'estompe** tant qu'il reste quelque chose dessous, et le fondu s'éteint
   une fois le verset lu jusqu'au bout : la coupure devient une invitation plutôt
   qu'un texte tronqué.

Le lecteur est **deux vraies rangées de grille** — l'identité, puis le verset. Elle
flottait auparavant en position absolue, ce qui laissait un long verset lui passer
dessous ; et `place-items: center` rognait le haut du texte dès qu'il débordait.
`margin: auto 0` sur la pile fait les deux : centrage tant qu'il reste de la place,
aucun rognage une fois le contenu plus haut que le cadre.

La mesure du débordement lit `scrollHeight`, ce qui force le calcul de mise en page :
juste tout de suite, sans dépendre de `requestAnimationFrame` — qui se met en veille
dans un onglet caché ou une vue intégrée, et laisserait le fondu éteint.

## Le tajwīd

Les couleurs du tajwīd contredisent la règle « rien ne brille sauf le mot en cours » —
et c'est assumé : ici la couleur **porte une règle**, elle ne décore pas. Les teintes
suivent la convention des mushafs colorés (bleus pour les allongements, orange pour la
ghunna, violet pour l'ikhfā', turquoise pour l'iqlāb, rouge pour la qalqala, gris pour
ce qui ne se prononce pas), éclaircies pour tenir sur l'encre où les teintes
d'imprimerie disparaîtraient. Plancher mesuré sur les 13 teintes : **5,78:1**.

Une couleur sans nom n'apprend rien : la légende fait partie de la fonction, pas de
l'ornement. Le mode se coupe en un clic, et le mushaf redevient argent.

Le mot récité s'éclaircit par `filter: brightness()` et non en passant au blanc :
l'écraser effacerait la règle au moment précis où elle se prononce.

## Un souffle par écran

L'unité affichée n'est plus le verset mais **le souffle** : le fragment compris entre
deux marques de pause du texte uthmani (`ۖ`–`ۜ`). Ce n'est pas un découpage
inventé, c'est celui que le texte porte déjà, et c'est celui que la voix suit.

Un seul souffle occupe l'écran. Il tourne quand le mot récité passe au suivant, par le
même fondu croisé que les versets. Conséquence mesurée : Al-Baqarah 2:282, 1 220
caractères, tenait en 17 lignes qu'il fallait faire défiler ; elle tient désormais en
17 écrans dont **aucun ne défile**.

Le corps du texte se calcule sur la longueur du souffle, pas du verset : un souffle de
cinq mots s'affiche donc plus grand qu'avant (palier 1,18), et le plancher remonte à
0,70 puisqu'il n'a plus à absorber un verset entier.

Le numéro du verset et la traduction française ne se posent qu'au **dernier** souffle :
l'un clôt le verset dans le mushaf, l'autre porte sur le verset entier et n'aurait aucun
sens répété sous chaque fragment.

Sous le souffle viennent son mot à mot — bâti sur les mots exactement qu'il contient,
donc aligné et jamais deviné — puis **les règles de tajwīd qu'il contient, nommées et
de leur couleur**. Une couleur qu'il faut aller chercher dans un panneau n'apprend
rien ; ici la légende est là où la règle se lit.

Trois voix, distinguées par la couleur : l'arabe en argent, le mot à mot en argent
italique, le sable **réservé** à la traduction du verset entier — laquelle est masquée
par défaut : n'apparaissant qu'au dernier souffle, elle donnait l'impression de surgir
au hasard.

En arabe, les consignes demandent de la **hauteur** : l'interligne de 1,45 rognait
shadda, kasra et damma de sept pixels, parce que `overflow: hidden` — posé pour couper
les noms trop longs — coupait en fait les signes. Les noms tiennent tous dans la
gouttière (79 px mesurés pour le plus large, contre 94 disponibles) : le rognage
n'avait aucune raison d'être, et les signes font partie du mot — les couper, c'est le
changer.

Les consignes se rangent en **colonnes égales, le nom dans une gouttière de largeur
fixe**, pour que les descriptions s'alignent les unes sous les autres. Sous 560 px le
nom passe au-dessus de sa description : deux colonnes courtes tiennent là où une seule
colonne large débordait. Un enroulement
centré les laissait en escalier, ce qui se lit comme du désordre plutôt que comme une
liste. `minmax(232px, …)` imposait un minimum de piste que `auto-fit` ne peut pas
réduire : à 449 px la grille réclamait deux colonnes et débordait de 67 px, emportant
les noms arabes hors de l'écran. `min(232px, 100%)` laisse la piste retomber.

## La signature

« © Maher Bouchrara » occupe **sa propre bande**, sous les commandes, séparée par le
même filet d'un pixel que le reste. Ce choix vient d'un échec : placée d'abord dans le
bandeau, puis glissée dans la rangée des commandes, elle disparaissait à certaines
largeurs parce que ces deux zones se réorganisent selon la place disponible. Une bande
à elle seule ne se réorganise pas : elle est là partout, ou nulle part.

`--row-h` mesure la rangée des commandes, `--rail-bot` le rail entier, signature
comprise. C'est `--rail-bot` qui tient le bas du lecteur à distance ; confondre les
deux ferait passer la ligne récitée sous le rail.

## Plein écran

Le plein écran n'est pas seulement une fenêtre plus grande : après 2,8 secondes
d'immobilité, le bandeau glisse vers le haut, le rail vers le bas, l'identité de la
sourate s'efface et le curseur disparaît. Il ne reste que la ligne sur la scène.
Le moindre mouvement rappelle tout en un demi-fondu.

## Ce qui reste ouvert

Pas de mode clair, et il n'en faut pas : la scène d'usage est la nuit.
Pas de thème alternatif prévu — une seconde palette diluerait celle-ci.
