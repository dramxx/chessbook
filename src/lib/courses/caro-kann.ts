import type { Course, Variation } from "@/lib/learn";
import lines from "./caro-kann-lines.json";
import { IDEAS } from "./caro-kann-ideas";
import { NOTES } from "./caro-kann-notes";

// Lines are built by scripts/build-course.mjs; explanations are in caro-kann-notes.ts and
// strategy in caro-kann-ideas.ts.

const CHAPTERS = [
  {
    id: "advance",
    title: "Advance Variation",
    intro:
      "3.e5 grabs space and blocks the center. Black's bishop goes to f5 first, then ...e6 builds a French-like chain with the good bishop outside it. The breaks are ...c5 (hitting d4, the base of the chain) and sometimes ...f6. White usually plays on the kingside with space, and in many lines chases the f5 bishop with g4 or h4.",
  },
  {
    id: "classical",
    title: "Classical Variation",
    intro:
      "3.Nc3 (or 3.Nd2) dxe4 4.Nxe4 Bf5: Black gives up the center but develops the bishop with tempo on the e4 knight. White usually gains space with h4-h5 to push the bishop to h7; Black answers ...h6, ...Nd7, ...e6 and ...Ngf6. The c6/e6 structure has no weaknesses, so Black aims for a sound middlegame and a pleasant endgame, with ...c5 or ...e5 as the freeing breaks.",
  },
  {
    id: "exchange",
    title: "Exchange Variation",
    intro:
      "3.exd5 cxd5 with 4.Bd3 gives a symmetrical structure: White builds a Carlsbad setup with c3, aiming at the kingside. Black develops ...Nc6, ...Nf6 and tries to trade the light-squared bishops with ...Bg4 or ...Bf5. The typical plan is the minority attack with ...b5-b4 against White's c3 pawn, the Queen's Gambit Exchange with colors reversed.",
  },
  {
    id: "panov",
    title: "Panov-Botvinnik Attack",
    intro:
      "4.c4 leads to isolated queen's pawn positions after ...e6 and cxd5 Nxd5. White gets active pieces, outposts on e5 and c5, and attacking chances. Black blockades on d5, trades pieces and aims for an endgame where the isolated d4 pawn is a target.",
  },
  {
    id: "two-knights",
    title: "Two Knights Variation",
    intro:
      "2.Nc3 d5 3.Nf3: White develops knights first and keeps the d-pawn flexible. Black's main answer 3...Bg4 pins the f3 knight; after h3 Bxf3 Qxf3 White has the bishop pair, but Black gets a solid ...e6 and ...Nf6 setup and plays on the light squares.",
  },
  {
    id: "fantasy",
    title: "Fantasy Variation",
    intro:
      "3.f3 supports e4 with a pawn, so ...dxe4 can be met by fxe4 with a big center. The cost is the weakened kingside dark squares and the g1-knight's best square.",
  },
  {
    id: "sidelines",
    title: "Sidelines",
    intro:
      "Everything else club players try against 1...c6: 2.c4, 2.d3 and King's Indian Attack setups, 2.Nf3, early Bc4 and other move orders. The aim is a simple, reliable answer to each.",
  },
];

export const caroKann: Course = {
  id: "caro-kann",
  title: "Caro-Kann Defense",
  side: "black",
  intro:
    "1.e4 c6 prepares ...d5 with a pawn instead of a piece, so Black challenges the center without the French's problem bishop: the light-squared bishop gets out before ...e6 closes it in.",
  notes: NOTES,
  chapters: CHAPTERS.map((c) => ({ ...c, ideas: IDEAS[c.id], variations: (lines as Record<string, Variation[]>)[c.id] ?? [] })).filter(
    (c) => c.variations.length,
  ),
};
