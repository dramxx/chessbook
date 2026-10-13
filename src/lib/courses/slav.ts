import type { Course, Variation } from "@/lib/learn";
import lines from "./slav-lines.json";
import { IDEAS } from "./slav-ideas";
import { NOTES } from "./slav-notes";

// Lines are built by scripts/build-course.mjs; explanations are in slav-notes.ts and strategy in
// slav-ideas.ts.

const CHAPTERS = [
  {
    id: "main",
    title: "Main Line: 4...dxc4",
    intro:
      "3.Nf3 Nf6 4.Nc3 dxc4: Black takes c4, and after 5.a4 the bishop comes out to f5 and Black's pieces use the b4 square. Also 5.e4 b5, 5.e3 b5, and the Krause with 6.Ne5.",
  },
  {
    id: "exchange",
    title: "Exchange Slav",
    intro: "3.cxd5 cxd5: a symmetrical structure. Black copies White's development and is never worse.",
  },
  {
    id: "e3",
    title: "Quiet e3 Lines",
    intro: "3.Nf3 Nf6 4.e3 (or 3.e3): White shuts in the c1 bishop, so Black develops the c8 bishop to f5 at once.",
  },
  {
    id: "nc3",
    title: "3.Nc3 Lines",
    intro: "3.Nc3 Nf6 with 4.Bg5, 4.e3, 4.Bf4 or the Exchange: ...dxc4 with ...b5, or ...a6 and ...b5 against the quiet lines.",
  },
  {
    id: "slav-other",
    title: "Other 4th Moves",
    intro: "4.g3, 4.Qc2, 4.Bg5, 4.Bf4 and other tries after 3.Nf3 Nf6.",
  },
  {
    id: "london",
    title: "London System",
    intro:
      "2.Bf4 or 2.Nf3 and 3.Bf4: ...Nf6, ...c5, ...Nc6 and ...Qb6 hit d4 and b2. After a queen trade on b3, ...c4 and the queenside minority attack give Black easy play.",
  },
  {
    id: "nf3",
    title: "Colle, Zukertort and 2.Nf3",
    intro:
      "Quiet systems with e3, Bd3 and Nbd2, the Torre with Bg5, fianchettoes and Stonewalls: ...c5 and ...Nc6 against the center, and the bishop to f5 or g4 when it can come out.",
  },
  {
    id: "gambits",
    title: "Gambits and 2.Nc3",
    intro: "The Blackmar-Diemer (2.e4), the Veresov (2.Nc3 and Bg5) and the Jobava setups: take what's offered and develop safely.",
  },
];

export const slav: Course = {
  id: "slav",
  title: "Slav Defense",
  side: "black",
  intro:
    "1.d4 d5 2.c4 c6: the Caro-Kann's sibling against 1.d4. d5 is held by the c-pawn, the light-squared bishop comes out before ...e6, and the course also covers the London, Colle and other systems.",
  notes: NOTES,
  chapters: CHAPTERS.map((c) => ({
    ...c,
    ideas: IDEAS[c.id],
    variations: (lines as Record<string, Variation[]>)[c.id] ?? [],
  })).filter((c) => c.variations.length),
};
