import type { Course, Variation } from "@/lib/learn";
import solidLines from "./indian-solid-lines.json";
import mainLines from "./indian-main-lines.json";
import { IDEAS } from "./indian-ideas";
import { NOTES } from "./indian-notes";

// Two White repertoires against 1.d4 Nf6, sharing explanations and the chapters both contain.
// Lines are built by scripts/build-course.mjs; explanations are in indian-notes.ts and strategy in
// indian-ideas.ts.

const SHARED = {
  benoni: {
    title: "Benoni",
    intro:
      "...c5 against d4: White takes space with d5. In the Modern Benoni Black gets a queenside majority and White a central one; White's break is e5, and a4 stops ...b5.",
  },
  benko: {
    title: "Benko Gambit",
    intro:
      "...b5 and ...a6: a pawn for pressure on the a- and b-files. White accepts, castles safely (with the fianchetto or the Kg2 walk) and neutralizes the files.",
  },
  budapest: {
    title: "Budapest Gambit",
    intro:
      "2...e5 3.dxe5: Black wins the pawn back with pieces. White defends e5 sensibly with Bf4 and Nf3, gives it back on good terms, and punishes the loose tricks.",
  },
  sidelines: {
    title: "Sidelines",
    intro:
      "Other second moves: the Marshall (2...d5), the Old Indian (2...d6) and rarer setups. Most of them allow White a big center.",
  },
};

function course(
  id: string,
  title: string,
  intro: string,
  chapters: Record<string, { title: string; intro: string }>,
  lines: Record<string, Variation[]>,
): Course {
  return {
    id,
    title,
    side: "white",
    intro,
    notes: NOTES,
    chapters: Object.entries({ ...chapters, ...SHARED })
      .map(([chapterId, c]) => ({ id: chapterId, ...c, ideas: IDEAS[chapterId], variations: lines[chapterId] ?? [] }))
      .filter((c) => c.variations.length),
  };
}

export const indianSolid = course(
  "indian-solid",
  "Indian Defenses: Solid",
  "1.d4 Nf6 2.c4 with 3.Nf3 against ...e6 (no Nimzo-Indian) and a g3 fianchetto against the King's Indian and the Grünfeld. One setup, less theory, safe positional pressure.",
  {
    catalan: {
      title: "Catalan",
      intro:
        "3.Nf3 d5 4.g3: the Catalan. The g2 bishop presses on d5 and the long diagonal; Black either takes on c4 (the Open Catalan) or keeps the center (the Closed Catalan).",
    },
    qid: {
      title: "Queen's Indian",
      intro:
        "3...b6: Black controls e4 with the b7 bishop. White's g2 bishop opposes it, and the fight is about e4 and the d5 advance.",
    },
    bogo: {
      title: "Bogo-Indian",
      intro: "3...Bb4+: Black trades dark-squared bishops. Bd2 and a queen recapture keep White's development smooth.",
    },
    "kid-g3": {
      title: "King's Indian: Fianchetto",
      intro:
        "Nf3, g3, Bg2 and O-O against the King's Indian. White's king is safe, Black's kingside attack is blunted, and the play is in the center and on the queenside.",
    },
    "grunfeld-g3": {
      title: "Grünfeld: Fianchetto",
      intro: "The same fianchetto setup against the Grünfeld: White keeps d4 solid and prepares e4 and d5.",
    },
  },
  solidLines as Record<string, Variation[]>,
);

export const indianMain = course(
  "indian-main",
  "Indian Defenses: Main Lines",
  "1.d4 Nf6 2.c4 with 3.Nc3: the Rubinstein against the Nimzo-Indian, the Exchange against the QGD, the Classical King's Indian and the Exchange Grünfeld. The most ambitious lines, with the most theory.",
  {
    nimzo: {
      title: "Nimzo-Indian",
      intro:
        "3...Bb4 pins the knight. White answers with 4.e3 (the Rubinstein): Bd3, Nf3 or Ne2, and castling. If Black takes on c3, White gets the bishop pair.",
    },
    qgd: {
      title: "Queen's Gambit Declined",
      intro: "3...d5: the Exchange Variation with Bg5, e3, Bd3 and Nge2, as in the Queen's Gambit course.",
    },
    kid: {
      title: "King's Indian: Classical",
      intro:
        "Nc3, e4, Nf3, Be2 and O-O. After ...e5 and d5, Black attacks on the kingside and White on the queenside with b4 (the Bayonet): a race.",
    },
    grunfeld: {
      title: "Grünfeld: Exchange",
      intro:
        "cxd5, e4 and bxc3 give White a big center; Bc4 and Ne2 support it. Black attacks d4 with ...c5, ...Nc6 and ...Bg4.",
    },
  },
  mainLines as Record<string, Variation[]>,
);
