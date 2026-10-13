import type { Idea } from "@/lib/learn";

// Strategy per chapter of the Slav course (Black against 1.d4). Diagrams are positions from the
// course's lines.
export const IDEAS: Record<string, Idea[]> = {
  main: [
    {
      title: "The Slav idea",
      moves: "d4 d5 c4 c6",
      text: "...c6 supports d5 without blocking the c8 bishop. As in the Caro-Kann, that bishop comes out to f5 or g4 before ...e6 builds a solid chain behind it.",
    },
    {
      title: "4...dxc4 and the b4 square",
      moves: "d4 d5 c4 c6 Nc3 Nf6 Nf3 dxc4 a4 Bf5",
      text: "Black takes c4 and threatens to keep it with ...b5. White's a4 stops that but gives up the b4 square, where Black's bishop lands after ...e6. With the bishop on f5 controlling e4, White's central expansion is slow.",
    },
    {
      title: "The setup",
      moves: "d4 d5 c4 c6 Nc3 Nf6 Nf3 dxc4 a4 Bf5 e3 e6 Bxc4 Bb4 O-O Nbd7",
      text: "...Bf5, ...e6, ...Bb4, ...Nbd7 and ...O-O. Black's position has no weaknesses. If White plays e4, the bishop steps back to g6 and a knight lands on d5. The plans are ...c5 or ...e5 breaks, and trades.",
    },
    {
      title: "Sharp tries: 5.e4 and the Krause",
      moves: "d4 d5 c4 c6 Nc3 Nf6 Nf3 dxc4 e4 b5",
      text: "Against 5.e4, Black keeps the pawn with ...b5 and gets a big queenside majority for White's center and attack. Against 6.Ne5 (the Krause), ...Nbd7 and ...e5 strike back in the center. These are concrete lines: learn the moves.",
    },
  ],
  exchange: [
    {
      title: "The Exchange Slav",
      moves: "d4 d5 c4 c6 cxd5 cxd5 Nc3 Nf6",
      text: "A symmetrical structure where Black is very solid. Copy White's development with ...Nc6, ...Bf5 and ...e6, trade the dark-squared bishops, and use the c-file. It's equal, but Black is never worse.",
    },
  ],
  e3: [
    {
      title: "Against the quiet e3",
      moves: "d4 d5 c4 c6 Nf3 Nf6 e3 Bf5",
      text: "With the c1 bishop shut in by e3, Black develops the light-squared bishop outside the chain at once. Then ...e6, ...Nbd7 and ...Be7 or ...Bd6: a comfortable position with no bad bishop.",
    },
  ],
  nc3: [
    {
      title: "3.Nc3 lines",
      moves: "d4 d5 c4 c6 Nc3 Nf6",
      text: "After 3.Nc3 Nf6, White can transpose to the main line with Nf3, or try 4.Bg5, 4.e3 or 4.Bf4. Against the pins and bishop moves, ...dxc4 with ...b5 (or ...Qa5 pinning the c3 knight) grabs material or time. Against 4.e3, ...a6 and ...b5 gain queenside space.",
    },
  ],
  "slav-other": [
    {
      title: "Fianchetto and early queen moves",
      moves: "d4 d5 c4 c6 Nf3 Nf6 g3 Bf5",
      text: "Against g3, the bishop goes to f5 before ...e6 and Black meets Qb3 with ...Qb6. Against an early Qc2, a ...g6 setup puts pressure on the queen along the long diagonal.",
    },
  ],
  london: [
    {
      title: "Hit d4 and b2",
      moves: "d4 d5 Bf4 Nf6 e3 c5 c3 Nc6 Bd3 Qb6",
      text: "The London bishop leaves b2 undefended. ...c5, ...Nc6 and ...Qb6 hit d4 and b2 together. White must spend time on Qb3, Qc1 or b3.",
    },
    {
      title: "...c4 and the queenside minority attack",
      moves: "d4 d5 Bf4 Nf6 e3 c5 c3 Nc6 Bd3 Qb6 Qb3 c4 Qxb6 axb6 Bc2 b5",
      text: "When White offers the queen trade on b3, ...c4 gains space with tempo. After the trade, the a-file is Black's and ...b5-b4 is an easy, lasting plan. These endgames are pleasant for Black.",
    },
  ],
  nf3: [
    {
      title: "Colle and Zukertort",
      moves: "d4 d5 Nf3 Nf6 e3 e6 Bd3 c5 c3 Nc6 Nbd2 Bd6",
      text: "White aims for e4. Black meets it with ...c5, ...Nc6, ...Bd6 and ...Qc7, controlling e5. When White plays e4, ...cxd4 and ...dxe4 open lines while White's pieces are still on the back ranks.",
    },
    {
      title: "Stonewall setups",
      moves: "d4 d5 e3 Nf6 f4 Bf5",
      text: "Against a Stonewall (f4 with e3), the light-squared bishop goes outside the chain at once. White's light squares, especially e4, then belong to Black.",
    },
  ],
  gambits: [
    {
      title: "Take the pawn, develop, castle",
      moves: "d4 d5 e4 dxe4 Nc3 Nf6 f3 exf3 Nxf3 g6",
      text: "Against the Blackmar-Diemer, take the pawn and play a fianchetto with ...g6, ...Bg7 and ...O-O: the king is safe and Black stays a pawn up. Against the Veresov (Nc3, Bg5), ...Nbd7 keeps the structure intact.",
    },
  ],
};
