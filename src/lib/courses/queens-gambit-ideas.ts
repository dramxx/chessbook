import type { Idea } from "@/lib/learn";

// Strategy per chapter of the Queen's Gambit course. Diagrams are positions from the course's lines.
export const IDEAS: Record<string, Idea[]> = {
  qgd: [
    {
      title: "The Carlsbad structure",
      moves: "d4 d5 c4 e6 Nc3 Nf6 cxd5 exd5 Bg5 Be7 e3 O-O Bd3 c6 Qc2",
      text: "After cxd5 exd5, White has pawns on d4 and e3 against Black's d5 and c6. White has the half-open c-file, Black the half-open e-file. The c8 bishop is free, but Black's position has no active pawn break. Both of White's main plans start from this structure.",
    },
    {
      title: "Plan 1: the minority attack",
      moves: "d4 d5 c4 e6 Nc3 Nf6 cxd5 exd5 Bg5 Be7 e3 O-O Bd3 c6 Qc2 Nbd7 Nf3",
      text: "With the knight on f3: Rb1, b4 and b5. White's two queenside pawns attack Black's three. After b5xc6, Black is left with a weak pawn on c6 or d5 to attack with the pieces. It's slow, safe and very hard for club players to meet.",
    },
    {
      title: "Plan 2: Nge2, f3 and e4",
      moves: "d4 d5 c4 e6 Nc3 Nf6 cxd5 exd5 Bg5 Be7 e3 O-O Bd3 c6 Qc2 h6 Bh4 Nbd7 Nge2 Re8 O-O Nf8 f3",
      text: "The knight goes to e2 so the f-pawn can advance: f3 and e4 build a big center and challenge d5. White's pieces then aim at the kingside. This is this course's main line, and it suits players who like dynamic positions.",
    },
    {
      title: "Black's defensive ideas",
      text: "Black wants to trade the light-squared bishops (...Bf5 or ...Bg4, often with ...Nh5 to trade the dark ones too), and to plant a knight on e4. Keep Bd3 and Qc2 controlling f5 and e4, and answer ...Bg4 with f3 when the e4 plan is on.",
    },
    {
      title: "Tactics to know",
      moves: "d4 d5 c4 e6 Nc3 Nf6 cxd5 exd5 Bg5 Nbd7",
      text: "Don't take on d5 here: Nxd5? Nxd5! Bxd8 Bb4+ and Black wins a piece (the Elephant Trap). In the 4...Nxd5 lines, watch the Greek Gift (Bxh7+, Ng5+, Qh5) once Black's knight leaves f6.",
    },
  ],
  tarrasch: [
    {
      title: "Play against the isolated pawn",
      moves: "d4 d5 c4 e6 Nc3 c5 cxd5 exd5 Nf3 Nc6 g3",
      text: "After cxd5 exd5, Black gets an isolated d5 pawn and free piece play. The classic answer is g3 and Bg2, where the bishop hits d5 from the long diagonal. Then blockade d4 with a knight, trade pieces, and win the pawn in the endgame.",
    },
  ],
  slav: [
    {
      title: "The structure",
      moves: "d4 d5 c4 c6 Nf3 Nf6 Nc3",
      text: "The Slav holds d5 with the c-pawn, so the c8 bishop stays free. White develops naturally and decides where the fight goes depending on Black's next move.",
    },
    {
      title: "Punish an early ...Bf5: cxd5 and Qb3",
      moves: "d4 d5 c4 c6 Nf3 Nf6 Nc3 Bf5 cxd5 cxd5 Qb3",
      text: "When Black's bishop leaves c8 before ...e6, b7 has no defender. cxd5 opens the c-file, and Qb3 hits b7 and d5 together. Black has to make a concession: a pawn after ...Qb6 Nxd5, or a weak c6 square after ...b6.",
    },
    {
      title: "The main line: 4...dxc4 5.a4",
      moves: "d4 d5 c4 c6 Nf3 Nf6 Nc3 dxc4 a4 Bf5 Ne5",
      text: "a4 stops ...b5, which would keep the pawn. Then Ne5 (the Krause) attacks c4 again and prepares f3 and e4 for a big center. White regains the pawn and keeps a lasting space edge.",
    },
    {
      title: "Answer ...Bg4 with Ne5",
      moves: "d4 d5 c4 c6 Nf3 Nf6 Nc3 Bg4 Ne5",
      text: "When the bishop goes to g4, Ne5 hits it at once. Follow up with g4 and h4 to chase it, or Qb3 against b7, and grab the bishop pair.",
    },
  ],
  "semi-slav": [
    {
      title: "The Semi-Slav triangle",
      moves: "d4 d5 c4 c6 Nf3 Nf6 Nc3 e6",
      text: "Black supports d5 with both c6 and e6. It's very solid, and Black threatens ...dxc4 with ...b5 to keep the pawn. The c8 bishop is shut in, so Black's play is about ...dxc4, ...b5, and ...c5 or ...e5 breaks.",
    },
    {
      title: "5.Bg5: the sharp main line",
      moves: "d4 d5 c4 c6 Nf3 Nf6 Nc3 e6 Bg5",
      text: "After 5...dxc4 (the Botvinnik) or 5...h6 6.Bh4 dxc4 (the Anti-Moscow), White gives a pawn for a big center and a lead in development. These lines are deeply analyzed: learn them move by move. If Black plays calmly with ...Be7 or ...Nbd7, White gets a pleasant QGD with an extra tempo.",
    },
    {
      title: "Against the ...e6 and ...c6 move order: e3 and e4",
      moves: "d4 d5 c4 e6 Nc3 c6 e3 Nf6 Nf3 Nbd7 Qc2",
      text: "With e3 and Qc2 (the anti-Meran), White prepares Bd3 and e4. The central break e4 is the plan in almost every line: once it happens, White has more space and the c8 bishop is still stuck.",
    },
    {
      title: "Against the Stonewall",
      moves: "d4 d5 c4 c6 Nf3 e6 e3 f5 Bd3 Nf6 O-O Bd6 b3",
      text: "When Black plays ...f5, the e5 square is a hole. Trade Black's good dark-squared bishop with b3 and Ba3, put a knight on e5, and prepare f3 and e4 to break up the Stonewall.",
    },
  ],
  qga: [
    {
      title: "Regain the pawn, keep the center",
      moves: "d4 d5 c4 dxc4 Nf3 Nf6 e3 e6 Bxc4",
      text: "The c4 pawn can't be held: e3 and Bxc4 win it back with a lead in development. White then plans e4 (often with Qe2 and Rd1) for a strong center.",
    },
    {
      title: "When Black hits d4 with ...c5",
      moves: "d4 d5 c4 dxc4 Nf3 Nf6 e3 c5 Bxc4 cxd4 exd4",
      text: "After ...cxd4 exd4, White has an isolated d-pawn: active pieces, the e5 outpost and attacking chances. Keep pieces on and look for d4-d5 or a kingside attack. If Black plays ...c5 without ...cxd4, dxc5 and a queen trade often leave White a small, safe edge.",
    },
    {
      title: "When Black tries to keep the pawn",
      moves: "d4 d5 c4 dxc4 Nf3 b5 a4",
      text: "...b5 is answered by a4. After ...c6 axb5 cxb5, b3 breaks open Black's pawns. The extra pawn doesn't last, and Black's queenside is left full of holes.",
    },
  ],
  albin: [
    {
      title: "The d4 wedge",
      moves: "d4 d5 c4 e5 dxe5 d4 Nf3 Nc6 a3",
      text: "Black's pawn on d4 cramps White and takes c3 and e3. Don't play an early e3: ...Bb4+ and the Lasker Trap are waiting. Instead play Nf3, a3 and b4, with Nbd2 and g3 and Bg2, keep the extra e5 pawn as long as it's safe, and win the d4 pawn later with Bb2 or e3 at the right moment.",
    },
    {
      title: "Giving the pawn back",
      moves: "d4 d5 c4 e5 dxe5 d4 Nf3 Nc6 a3 Bg4 Nbd2 Nge7 h3 Bxf3 Nxf3 Ng6 e6",
      text: "When Black is about to win e5 back, e6 often gives it back on White's terms: fxe6 leaves Black with weak e-pawns and opens lines for White's bishops.",
    },
  ],
  chigorin: [
    {
      title: "Center against pieces",
      moves: "d4 d5 c4 Nc6 Nc3 Nf6 Nf3 Bg4 cxd5 Nxd5 e4 Nxc3 bxc3",
      text: "Black develops pieces actively and often gives up the bishop pair (...Bg4xf3). White builds a big pawn center with e4 and keeps the bishops. Open the position for them over time, and use the half-open b-file against b7.",
    },
  ],
  sidelines: [
    {
      title: "The Marshall and other ...Nf6 lines",
      moves: "d4 d5 c4 Nf6 cxd5 Nxd5 Nf3 e6 e4",
      text: "2...Nf6 lets White take on d5 and then gain time with e4. Take the center with tempo and develop: White gets a classical big center for free.",
    },
    {
      title: "The Baltic: 2...Bf5",
      moves: "d4 d5 c4 Bf5 cxd5 Bxb1 Qa4+",
      text: "The bishop comes out early, leaving b7 weak. cxd5 and Qb3 hit b7; if ...Bxb1, Qa4+ first keeps the d5 pawn, and White gets the bishop pair.",
    },
  ],
};
