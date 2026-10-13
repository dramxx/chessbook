// Opening courses built by scripts/build-course.mjs.
// - root: the moves every line starts with; side: whose repertoire it is ("w" or "b")
// - eco: ranges of database games (db/games.db) indexed for the masters' moves and model games
// - chapters: lines go to the chapter whose prefix they start with; the longest matching prefix wins
// - choices: repertoire decisions, the move to play after these moves whatever the statistics say

// The two Indian courses share these chapters, and their explanations (indian-notes.ts).
const INDIAN_ECO = [
  ["A45", "A79"],
  ["D70", "D99"],
  ["E00", "E99"],
];
const INDIAN_SHARED = [
  { id: "benoni", prefixes: ["d4 Nf6 c4 c5", "d4 Nf6 c4 e6 Nf3 c5", "d4 Nf6 c4 e6 Nc3 c5"] },
  { id: "benko", prefixes: ["d4 Nf6 c4 c5 d5 b5"] },
  { id: "budapest", prefixes: ["d4 Nf6 c4 e5"] },
  { id: "sidelines", prefixes: [""] },
];

export const COURSES = {
  "caro-kann": {
    root: ["e4", "c6"],
    side: "b",
    eco: [["B10", "B19"]],
    chapters: [
      { id: "advance", prefixes: ["e4 c6 d4 d5 e5"] },
      { id: "classical", prefixes: ["e4 c6 d4 d5 Nc3 dxe4 Nxe4", "e4 c6 d4 d5 Nd2 dxe4 Nxe4"] },
      { id: "exchange", prefixes: ["e4 c6 d4 d5 exd5 cxd5"] },
      { id: "panov", prefixes: ["e4 c6 d4 d5 exd5 cxd5 c4"] },
      { id: "two-knights", prefixes: ["e4 c6 Nc3 d5 Nf3", "e4 c6 Nf3 d5 Nc3"] },
      { id: "fantasy", prefixes: ["e4 c6 d4 d5 f3"] },
      { id: "sidelines", prefixes: [""] },
    ],
    choices: {
      "e4 c6 d4 d5 Nc3 dxe4 Nxe4": "Bf5",
      "e4 c6 d4 d5 e5": "Bf5",
    },
  },
  "queens-gambit": {
    root: ["d4", "d5", "c4"],
    side: "w",
    eco: [["D06", "D69"]],
    chapters: [
      { id: "qgd", prefixes: ["d4 d5 c4 e6"] },
      { id: "tarrasch", prefixes: ["d4 d5 c4 e6 Nc3 c5", "d4 d5 c4 e6 Nf3 c5"] },
      { id: "slav", prefixes: ["d4 d5 c4 c6"] },
      {
        id: "semi-slav",
        prefixes: [
          "d4 d5 c4 c6 Nf3 Nf6 Nc3 e6",
          "d4 d5 c4 c6 Nc3 Nf6 Nf3 e6",
          "d4 d5 c4 e6 Nc3 Nf6 Nf3 c6",
          "d4 d5 c4 e6 Nf3 Nf6 Nc3 c6",
          "d4 d5 c4 e6 Nc3 c6",
          "d4 d5 c4 c6 Nc3 e6",
          "d4 d5 c4 c6 Nf3 e6",
          "d4 d5 c4 e6 Nf3 c6",
        ],
      },
      { id: "qga", prefixes: ["d4 d5 c4 dxc4"] },
      { id: "albin", prefixes: ["d4 d5 c4 e5"] },
      { id: "chigorin", prefixes: ["d4 d5 c4 Nc6"] },
      { id: "sidelines", prefixes: [""] },
    ],
    choices: {},
  },
  "indian-solid": {
    root: ["d4", "Nf6"],
    side: "w",
    eco: INDIAN_ECO,
    chapters: [
      { id: "catalan", prefixes: ["d4 Nf6 c4 e6 Nf3 d5"] },
      { id: "qid", prefixes: ["d4 Nf6 c4 e6 Nf3 b6"] },
      { id: "bogo", prefixes: ["d4 Nf6 c4 e6 Nf3 Bb4+"] },
      { id: "kid-g3", prefixes: ["d4 Nf6 c4 g6"] },
      {
        id: "grunfeld-g3",
        prefixes: ["d4 Nf6 c4 g6 Nf3 d5", "d4 Nf6 c4 g6 Nf3 Bg7 g3 d5", "d4 Nf6 c4 g6 Nf3 Bg7 g3 O-O Bg2 d5"],
      },
      ...INDIAN_SHARED,
    ],
    // 3.Nf3 against ...e6 (no Nimzo; the masters answer ...d5 with the Catalan), and a g3 fianchetto
    // against the King's Indian and Grünfeld in every move order.
    choices: {
      "d4 Nf6": "c4",
      "d4 Nf6 c4 e6": "Nf3",
      "d4 Nf6 c4 g6": "Nf3",
      "d4 Nf6 c4 g6 Nf3 Bg7": "g3",
      "d4 Nf6 c4 g6 Nf3 d5": "g3",
      "d4 Nf6 c4 g6 Nf3 d6": "g3",
    },
  },
  "indian-main": {
    root: ["d4", "Nf6"],
    side: "w",
    eco: INDIAN_ECO,
    chapters: [
      { id: "nimzo", prefixes: ["d4 Nf6 c4 e6 Nc3 Bb4"] },
      { id: "qgd", prefixes: ["d4 Nf6 c4 e6 Nc3 d5"] },
      { id: "kid", prefixes: ["d4 Nf6 c4 g6"] },
      { id: "grunfeld", prefixes: ["d4 Nf6 c4 g6 Nc3 d5"] },
      ...INDIAN_SHARED,
    ],
    // 3.Nc3 allowing the Nimzo, the classical King's Indian and the Exchange Grünfeld. Against
    // ...d5 lines it takes on d5 as the Queen's Gambit course does.
    choices: {
      "d4 Nf6": "c4",
      "d4 Nf6 c4 e6": "Nc3",
      "d4 Nf6 c4 e6 Nc3 d5": "cxd5",
      "d4 Nf6 c4 g6": "Nc3",
      "d4 Nf6 c4 g6 Nc3 Bg7": "e4",
      "d4 Nf6 c4 g6 Nc3 Bg7 e4 d6": "Nf3",
      "d4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O": "Be2",
      "d4 Nf6 c4 g6 Nc3 d5": "cxd5",
      "d4 Nf6 c4 g6 Nc3 d5 cxd5 Nxd5": "e4",
    },
  },
  slav: {
    root: ["d4", "d5"],
    side: "b",
    eco: [
      ["D00", "D05"],
      ["D10", "D19"],
    ],
    chapters: [
      { id: "main", prefixes: ["d4 d5 c4 c6 Nf3 Nf6 Nc3 dxc4", "d4 d5 c4 c6 Nc3 Nf6 Nf3 dxc4"] },
      { id: "exchange", prefixes: ["d4 d5 c4 c6 cxd5 cxd5"] },
      { id: "e3", prefixes: ["d4 d5 c4 c6 Nf3 Nf6 e3", "d4 d5 c4 c6 e3"] },
      { id: "nc3", prefixes: ["d4 d5 c4 c6 Nc3"] },
      { id: "slav-other", prefixes: ["d4 d5 c4 c6"] },
      { id: "london", prefixes: ["d4 d5 Bf4", "d4 d5 Nf3 Nf6 Bf4"] },
      { id: "nf3", prefixes: ["d4 d5 Nf3", "d4 d5 e3"] },
      { id: "gambits", prefixes: ["d4 d5 e4", "d4 d5 Nc3"] },
      { id: "sidelines", prefixes: [""] },
    ],
    // The Slav with ...dxc4 and ...Bf5 in the main line, and ...Bf5 against the quiet e3 lines.
    choices: {
      "d4 d5 c4": "c6",
      "d4 d5 c4 c6 Nf3": "Nf6",
      "d4 d5 c4 c6 Nf3 Nf6 Nc3": "dxc4",
      "d4 d5 c4 c6 Nf3 Nf6 Nc3 dxc4 a4": "Bf5",
      "d4 d5 c4 c6 Nf3 Nf6 e3": "Bf5",
      "d4 d5 c4 c6 Nc3": "Nf6",
      "d4 d5 c4 c6 Nc3 Nf6 Nf3": "dxc4",
      "d4 d5 Nf3": "Nf6",
      "d4 d5 Nf3 Nf6 c4": "c6",
    },
  },
};
