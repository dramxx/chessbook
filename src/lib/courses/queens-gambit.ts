import type { Course, Variation } from "@/lib/learn";
import lines from "./queens-gambit-lines.json";
import { IDEAS } from "./queens-gambit-ideas";
import { NOTES } from "./queens-gambit-notes";

// Lines are built by scripts/build-course.mjs; explanations are in queens-gambit-notes.ts and
// strategy in queens-gambit-ideas.ts.

const CHAPTERS = [
  {
    id: "qgd",
    title: "Queen's Gambit Declined",
    intro:
      "2...e6 holds d5 with a pawn and shuts in the c8 bishop. This course meets it with the Exchange Variation (cxd5 exd5) and Bg5, e3, Bd3 and Qc2: a fixed structure with clear plans, either the minority attack or Nge2, f3 and e4.",
  },
  {
    id: "tarrasch",
    title: "Tarrasch Defense",
    intro:
      "3...c5: Black accepts an isolated d-pawn for free piece play. White fianchettoes the f1 bishop to hit d5 and plays against the isolated pawn.",
  },
  {
    id: "slav",
    title: "Slav Defense",
    intro:
      "2...c6 holds d5 without blocking the c8 bishop. White develops with Nf3 and Nc3, punishes an early ...Bf5 with cxd5 and Qb3, and meets the main line 4...dxc4 with 5.a4 and the Krause (Ne5).",
  },
  {
    id: "semi-slav",
    title: "Semi-Slav and Triangle",
    intro:
      "...c6 and ...e6 together: very solid, with ...dxc4 and ...b5 always in the air. White plays 5.Bg5 in the Slav move order (sharp, theory-heavy lines) and e3 with Qc2 and e4 in the ...e6 move order.",
  },
  {
    id: "qga",
    title: "Queen's Gambit Accepted",
    intro:
      "2...dxc4 gives up the center for free development. White plays Nf3, e3 and Bxc4 to regain the pawn, then aims for e4. When Black hits d4 with ...c5, White often gets an active isolated-pawn position.",
  },
  {
    id: "albin",
    title: "Albin Countergambit",
    intro:
      "2...e5 3.dxe5 d4: a pawn sacrifice for a cramping wedge on d4. White develops with Nf3, a3 and b4 (never an early e3, because of the Lasker Trap) and returns material only on good terms.",
  },
  {
    id: "chigorin",
    title: "Chigorin Defense",
    intro:
      "2...Nc6: Black fights the center with pieces and often gives up the bishop pair. White builds a pawn center and plays for the bishops.",
  },
  {
    id: "sidelines",
    title: "Sidelines",
    intro:
      "The Marshall (2...Nf6), the Baltic (2...Bf5) and other second moves. Most of them allow White to take on d5 and build a big center with tempo.",
  },
];

export const queensGambit: Course = {
  id: "queens-gambit",
  title: "Queen's Gambit",
  side: "white",
  intro:
    "1.d4 d5 2.c4: White offers a wing pawn to pull Black's d-pawn away from the center. Against every reply, the course follows the masters' main lines and covers what club players actually play.",
  notes: NOTES,
  chapters: CHAPTERS.map((c) => ({
    ...c,
    ideas: IDEAS[c.id],
    variations: (lines as Record<string, Variation[]>)[c.id] ?? [],
  })).filter((c) => c.variations.length),
};
