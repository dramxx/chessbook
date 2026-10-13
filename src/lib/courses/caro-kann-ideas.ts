import type { Idea } from "@/lib/learn";

// Strategy per chapter of the Caro-Kann course. Diagrams are positions from the course's lines.
export const IDEAS: Record<string, Idea[]> = {
  advance: [
    {
      title: "The structure",
      moves: "e4 c6 d4 d5 e5 Bf5 Nf3 e6",
      text: "A French chain with one big difference: Black's light-squared bishop is outside it, on f5. White has kingside space and the e5 pawn takes f6 from Black's knight, so Black's knights develop to d7 and e7.\n\nThe chain's base is d4. Almost every Black plan aims at it.",
    },
    {
      title: "Break 1: ...c5 against d4",
      moves: "e4 c6 d4 d5 e5 Bf5 Nf3 e6 Bd3 Bxd3 Qxd3 c5",
      text: "...c5, then ...Nc6, ...Qb6 and a knight to f5 pile up on d4. If White keeps the pawn with c3, Black often plays ...cxd4: the c-file opens for a rook, and ...Nb4 or ...Qb6 against b2 come into play. If White takes on c5, the f8 bishop recaptures actively.",
    },
    {
      title: "Break 2: ...f6 against e5",
      moves: "e4 c6 d4 d5 e5 Bf5 Nf3 e6 Be2 Nd7 O-O h6 Nbd2 Ne7 Nb3 g5 a4 Bg7 a5 Qc7",
      text: "The second break hits the head of the chain. Prepare it: a bishop on g7, the queen on c7 or a knight on d7 all add pressure to e5. After exf6, Black gets the f-file and an open long diagonal. The cost is a backward e6 pawn, so only open the position when your pieces are ready to use it.",
    },
    {
      title: "The f5 square",
      moves: "e4 c6 d4 d5 e5 Bf5 h4 h5 Bd3 Bxd3 Qxd3 Qa5+ Nd2 e6 Nf3 Nh6 O-O Nf5",
      text: "Once the light-squared bishops are traded, f5 is the best square for a black knight: it hits d4, e3 and h4. After ...h5, White can never kick it with g4. Routes: ...Ng8-h6-f5 or ...Ng8-e7-f5.",
    },
    {
      title: "When White throws the pawns forward",
      moves: "e4 c6 d4 d5 e5 Bf5 g4 Be4 f3 Bg6 h4 h5",
      text: "g4 and h4 aim to trap or chase the bishop. Answer with ...h5 (or ...h6 to give the bishop h7) so the bishop always has a square, then hit the center with ...c5. Every pawn White pushes leaves holes behind it: f4, g3 and the light squares around White's king.",
    },
    {
      title: "Typical mistakes",
      text: "...Nf6 is never possible: the e5 pawn covers f6, so the knight goes to e7 or via d7. ...e6 before ...Bf5 locks the bishop in for good. Grabbing b2 with the queen is often fine, but check Nb5 and Rb1 tricks first. And always give the f5 bishop a retreat (h7 or g6) before White's g4 and h4 arrive.",
    },
  ],
  classical: [
    {
      title: "The structure",
      moves: "e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5 Ng3 Bg6 Nf3 Nd7 h4 h6 h5 Bh7 Bd3 Bxd3 Qxd3 e6",
      text: "Black gave up the center but has no pawn weaknesses at all: c6 and e6 hold d5, and the queenside pawns are intact. White has more space and the h5 pawn cramps Black's kingside. The game is about whether White's space and initiative are worth more than Black's healthy structure.",
    },
    {
      title: "Black's setup and breaks",
      moves: "e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5 Ng3 Bg6 Nf3 Nd7 h4 h6 h5 Bh7 Bd3 Bxd3 Qxd3 e6 Bd2 Ngf6 O-O-O Be7 Kb1 O-O",
      text: "...Nd7 (stops Ne5), ...Ngf6, ...Be7 or ...Bd6, ...Qc7 and castling. The freeing breaks are ...c5 (opening lines toward a king on c1 or b1) and, less often, ...e5. A knight on d5 or e4 is a good outpost and a way to trade pieces.",
    },
    {
      title: "The h5 pawn",
      text: "White's h4-h5 gains space but fixes a pawn on a light square that is hard to defend in an endgame. Every trade brings Black closer to an ending where h5 (and the g5 square) are weaknesses. Trading queens is usually good news for Black.",
    },
    {
      title: "Trade when White offers",
      moves: "e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5 Ng3 Bg6 Nf3 Nd7 h4 h6 h5 Bh7 Bd3 Bxd3 Qxd3 e6 Bd2 Ngf6 O-O-O Be7 Kb1 O-O Ne4 Nxe4",
      text: "Black has less space, so trades help: Ne4 offers are usually accepted. With fewer pieces, the lack of space stops mattering and White's extended pawns become targets.",
    },
    {
      title: "Sharp tries: take the material",
      moves: "e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5 Bd3 Qxd4",
      text: "Against 5.Bd3 and 5.Ng5 (with the Nxf7 sacrifice), Black can take the material and consolidate. Know these lines: they are rare, but club players who play them know their tricks.",
    },
  ],
  exchange: [
    {
      title: "The structure: a Carlsbad in reverse",
      moves: "e4 c6 d4 d5 exd5 cxd5 Bd3 Nc6 c3 Nf6 Bf4 Bg4",
      text: "White has no e-pawn and Black no c-pawn. White has the half-open e-file and a kingside attack in mind; Black has the half-open c-file and the queenside. It's the Queen's Gambit Exchange with colors reversed, so Black is the side playing the minority attack.",
    },
    {
      title: "Trade the light-squared bishops",
      text: "White's Bd3 is the attacker, aimed at h7. Black wants to trade it with ...Bg4 (pinning and keeping an eye on f3) or ...g6 and ...Bf5. If White prevents ...Bg4 with h3, ...g6 and ...Bf5 is the answer.",
    },
    {
      title: "Meeting Qb3",
      moves: "e4 c6 d4 d5 exd5 cxd5 Bd3 Nc6 c3 Nf6 Bf4 Bg4 Qb3",
      text: "Qb3 hits b7 and d5. ...Qd7 or ...Qc8 covers b7 and keeps the queens on. Once the bishops on f4 and d6 are traded, Black is comfortable.",
    },
    {
      title: "The minority attack",
      moves: "e4 c6 d4 d5 exd5 cxd5 Bd3 Nc6 c3 Nf6 Bf4 Bg4 Qb3 Qd7 Nd2 e6 Ngf3 Bxf3 Nxf3 Bd6 Bxd6 Qxd6 O-O O-O Rae1 Qc7",
      text: "...Rab8, ...b5 and ...b4: Black's two queenside pawns attack White's three to create a weak pawn on c3 or an isolated pawn after bxc3. Meanwhile White aims for Ne5 and a kingside attack. Keep a knight on f6 to cover h7.",
    },
  ],
  panov: [
    {
      title: "The isolated queen's pawn",
      moves: "e4 c6 d4 d5 exd5 cxd5 c4 Nf6 Nc3 e6 Nf3 Bb4 cxd5 Nxd5",
      text: "White's d4 pawn has no neighbors: it can't be defended by another pawn. In return White gets free piece play, outposts on e5 and c5, and a kingside attack. Black's plan is simple: blockade d5, trade pieces, and win the d4 pawn in the endgame.",
    },
    {
      title: "Black's setup",
      moves: "e4 c6 d4 d5 exd5 cxd5 c4 Nf6 Nc3 e6 Nf3 Bb4 cxd5 Nxd5 Bd2 Nc6 Bd3 O-O O-O Be7",
      text: "A knight on d5 (the blockade square), ...Be7 and ...Nf6 to cover the king, ...b6 and ...Bb7 to hit d5 and the long diagonal, and the rooks to c8 and d8. Every trade helps Black: the fewer pieces, the weaker the isolated pawn.",
    },
    {
      title: "White's attacking ideas",
      text: "Watch for Bd3 with Qc2 or Qe2 against h7, a knight on e5, Bg5 to remove the f6 defender, a rook lift via e3, and the d4-d5 break to open lines. Keep a knight on f6 and don't leave h7 short of defenders.",
    },
    {
      title: "Other structures",
      moves: "e4 c6 d4 d5 exd5 cxd5 c4 Nf6 Nc3 e6 c5",
      text: "With 6.c5 White avoids the isolated pawn and grabs queenside space. Black undermines with ...b6 and sometimes ...e5. After a3 Bxc3 bxc3 dxc4, White gets hanging pawns on c3 and d4: hit them with ...Qc7, ...b6 and the rooks.",
    },
  ],
  "two-knights": [
    {
      title: "The structure",
      moves: "e4 c6 Nf3 d5 Nc3 Bg4 h3 Bxf3 Qxf3 e6",
      text: "Black gives White the bishop pair but gets a rock-solid light-square structure (c6, d5, e6) and a lead in development. White's queen on f3 is a little exposed.",
    },
    {
      title: "Plans for Black",
      text: "Against d4: ...dxe4 and develop with tempo on the queen (...Nf6, ...Nbd7). Against d3: ...Nd7, ...g6 and ...Bg7, often with ...d4 to gain space. ...Bb4 pins the c3 knight when e4 needs defending. The light squares (d5, e4, f5) are Black's.",
    },
  ],
  fantasy: [
    {
      title: "Use the dark squares",
      moves: "e4 c6 d4 d5 f3 e6 Nc3 Bb4",
      text: "3.f3 props up e4 but weakens e3 and the g1-a7 diagonal, and takes f3 from White's knight. ...e6 with ...Bb4, ...c5 and ...Qb6 targets exactly those squares. The b4 bishop often drops back to a5 and b6 to keep hitting d4.",
    },
  ],
  sidelines: [
    {
      title: "The general recipe",
      text: "Against almost anything, ...d5 claims the center, and the light-squared bishop comes out before ...e6. That's the whole Caro-Kann idea, and it works against odd setups too.",
    },
    {
      title: "2.Nf3 with 3.e5",
      moves: "e4 c6 Nf3 d5 e5 Bg4",
      text: "Without d4, the bishop goes to g4 to pin the knight that supports e5. Then ...e6 and ...c5, as in the Advance.",
    },
    {
      title: "Exchange setups",
      moves: "e4 c6 Bc4 d5 exd5 cxd5",
      text: "After an early exd5 (2.Nf3, 2.Bc4, 2.f4, 2.d3), Black gets an easy game: ...Nc6 or ...Nf6, the bishop to f5 or g4, then ...e6. The c-file is Black's.",
    },
    {
      title: "2.c4",
      moves: "e4 c6 c4 d5 cxd5 cxd5 exd5 Nf6",
      text: "The center opens. Win the pawn back with ...Nf6 and ...Nxd5, then hit the c4 bishop with ...Nb6. Often you reach a Panov-type isolated pawn position, with White as the side holding the isolated pawn.",
    },
    {
      title: "King's Indian Attack",
      moves: "e4 c6 d3 d5 Nd2 e5",
      text: "Against 2.d3 and a slow setup, take the whole center with ...d5 and ...e5. Black gets a comfortable position with more space.",
    },
    {
      title: "Gambits",
      text: "Against the Blackmar-Diemer style gambits and tricks like 2.Nf3 d5 3.d3 dxe4 4.Ng5, take the material, develop quickly, and give back a pawn only if it kills White's initiative.",
    },
  ],
};
