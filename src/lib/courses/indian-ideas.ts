import type { Idea } from "@/lib/learn";

// Strategy per chapter of the two Indian Defenses courses (chapter ids are unique across both).
// Diagrams are positions from the courses' lines.
export const IDEAS: Record<string, Idea[]> = {
  catalan: [
    {
      title: "The Catalan bishop",
      moves: "d4 Nf6 c4 e6 Nf3 d5 g3 Be7 Bg2 O-O O-O",
      text: "The bishop on g2 presses on d5 and the whole long diagonal down to b7 and a8. Black's light-squared bishop has trouble getting out, and that is White's long-term edge.",
    },
    {
      title: "The Open Catalan: getting c4 back",
      moves: "d4 Nf6 c4 e6 Nf3 d5 g3 Be7 Bg2 O-O O-O dxc4 Qc2 a6 a4",
      text: "Black takes on c4 and tries to keep the pawn with ...a6 and ...b5. Qc2 (or Qa4+) and a4 win it back. Then Bg5, Nbd2 or Nc3 and pressure on the queenside, where the g2 bishop helps.",
    },
    {
      title: "The Closed Catalan: e4",
      moves: "d4 Nf6 c4 e6 Nf3 d5 g3 Be7 Bg2 O-O O-O c6 Qc2 Nbd7 Nbd2 b6 e4",
      text: "If Black keeps the center with ...c6 and ...Nbd7, White prepares e4 with Qc2 and Nbd2 (or Rd1 and Nc3). After e4, White has more space and the g2 bishop's diagonal opens.",
    },
    {
      title: "Ne5",
      moves: "d4 Nf6 c4 e6 Nf3 d5 g3 Bb4+ Bd2 Bxd2+ Nbxd2 O-O Bg2 c6 Qc2 Nbd7 O-O Re8 Ne5",
      text: "A knight on e5 opens the g2 bishop's diagonal and eyes c6 and d7. It's a recurring move in the Catalan: often it trades itself for a defender and leaves the long diagonal open.",
    },
  ],
  qid: [
    {
      title: "Fight for e4",
      moves: "d4 Nf6 c4 e6 Nf3 b6 g3 Bb7 Bg2 Be7 O-O O-O Nc3",
      text: "In the Queen's Indian, Black controls e4 with the b7 bishop and a knight. White's g2 bishop blunts the b7 bishop, and Nc3 with Qc2 and d5 or e4 fights for the center.",
    },
    {
      title: "d5: blocking the b7 bishop",
      moves: "d4 Nf6 c4 e6 Nf3 b6 g3 Bb7 Bg2 Be7 O-O O-O Nc3 Ne4 Bd2 f5 Qc2 Nxc3 Bxc3 Be4 Qd2 Bf6 d5",
      text: "When the moment is right, d5 shuts the b7 bishop out and gains space. Black's e6 pawn and the light squares then become targets.",
    },
    {
      title: "The 4...Ba6 line",
      moves: "d4 Nf6 c4 e6 Nf3 b6 g3 Ba6 b3",
      text: "...Ba6 attacks c4; b3 defends it. After ...Bb4+ Bd2 Be7, the bishop on d2 goes to c3, and White plays Nbd2 and e4 for the center.",
    },
  ],
  bogo: [
    {
      title: "Answer the check with Bd2",
      moves: "d4 Nf6 c4 e6 Nf3 Bb4+ Bd2",
      text: "The Bogo-Indian check aims to trade White's good dark-squared bishop. Bd2 offers that trade on White's terms. Recapture with the queen (Qxd2) so the knight can still go to c3.",
    },
    {
      title: "Center and queenside",
      moves: "d4 Nf6 c4 e6 Nf3 Bb4+ Bd2 Qe7 g3 O-O Bg2 Bxd2+ Qxd2 d6 Nc3 e5 O-O",
      text: "With the bishops traded, Black's dark squares are thin. White keeps the space with Nc3, g3 and Bg2, plays e4 or d5 at the right moment, and in the ...d5 lines uses the minority attack with b4 and b5.",
    },
  ],
  "kid-g3": [
    {
      title: "Why the fianchetto",
      moves: "d4 Nf6 c4 g6 Nf3 Bg7 g3 O-O Bg2 d6 O-O",
      text: "With the bishop on g2, White's king is very safe and Black's usual King's Indian kingside attack (...f5-f4, ...g5) has nothing to bite on. The fight moves to the center and the queenside, where White has more space.",
    },
    {
      title: "Against ...e5: exd4 lines",
      moves: "d4 Nf6 c4 g6 Nf3 Bg7 g3 O-O Bg2 d6 O-O Nbd7 Nc3 e5 e4 exd4 Nxd4 Re8 h3 Nc5 Re1",
      text: "When Black takes on d4, White's knight on d4 and pawns on c4 and e4 cramp Black. h3 stops ...Ng4 and ...Bg4. Black's d6 pawn is a long-term target: Ndb5 and Bf4 hit it.",
    },
    {
      title: "Against ...Nc6 and ...e5: d5",
      moves: "d4 Nf6 c4 g6 Nf3 Bg7 g3 O-O Bg2 d6 O-O Nc6 Nc3 e5 d5 Ne7 e4",
      text: "If Black keeps the center closed, d5 gains space with tempo. White's play is on the queenside (b4, c5) and with Ne1-d3 against ...f5. The g2 bishop protects the king.",
    },
    {
      title: "Against ...c6 and ...d5",
      moves: "d4 Nf6 c4 g6 Nf3 Bg7 g3 O-O Bg2 c6 O-O d5 cxd5 cxd5 Nc3 Nc6 Ne5",
      text: "In the Slav-style lines the structure is symmetrical. Ne5 and Nxc6 leave Black with a weak c6 pawn; Na4, Bf4 and Rc1 then press on the c-file and the dark squares.",
    },
  ],
  "grunfeld-g3": [
    {
      title: "The fianchetto against the Grünfeld",
      moves: "d4 Nf6 c4 g6 Nf3 Bg7 g3 O-O Bg2 d5 cxd5 Nxd5 O-O",
      text: "Black aims all the pieces at d4. White keeps d4 solid (e3, Nc3, Re1) and gets ready for e4 and d5. When the center advances, Black's pieces lose their targets.",
    },
  ],
  nimzo: [
    {
      title: "The Rubinstein setup",
      moves: "d4 Nf6 c4 e6 Nc3 Bb4 e3 O-O Bd3 d5 Nf3",
      text: "4.e3 is the most solid answer to the Nimzo: Bd3, Nf3 or Ne2, and castling. If Black takes on c3, White gets the bishop pair in return for doubled c-pawns.",
    },
    {
      title: "Bishops against the structure",
      moves: "d4 Nf6 c4 e6 Nc3 Bb4 e3 O-O Bd3 d5 Nf3 c5 O-O Nc6 a3 Bxc3 bxc3 dxc4 Bxc4 Qc7 Bb2 e5 h3",
      text: "After a3 Bxc3 bxc3, the c-pawns are doubled, but White has the two bishops and a strong center. Plan: keep the center mobile, open the position with e4 at the right time, and let the bishops work.",
    },
    {
      title: "Ne2: avoiding the doubled pawns",
      moves: "d4 Nf6 c4 e6 Nc3 Bb4 e3 b6 Ne2",
      text: "Against ...b6 (and ...d6) setups, Ne2 lets White recapture on c3 with a piece. a3 then forces Black to decide about the bishop, and White keeps the pair without structural cost.",
    },
    {
      title: "Isolated pawn positions",
      moves: "d4 Nf6 c4 e6 Nc3 Bb4 e3 O-O Bd3 d5 Nf3 c5 O-O cxd4 exd4",
      text: "Many lines end with an isolated d-pawn for White. Keep pieces on, put a knight on e5, aim the bishops at the kingside and look for d4-d5. Avoid trades that lead into a passive endgame.",
    },
  ],
  qgd: [
    {
      title: "The Exchange Variation, again",
      moves: "d4 Nf6 c4 e6 Nc3 d5 cxd5 exd5 Bg5 Be7 e3 O-O Bd3 c6 Nge2 Nbd7 f3",
      text: "This is the same structure as in the Queen's Gambit course: the Carlsbad, with Nge2 and f3 preparing e4. If Black recaptures with the knight (4...Nxd5), take the center with e4.",
    },
  ],
  kid: [
    {
      title: "The classical setup",
      moves: "d4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5 O-O",
      text: "White builds the full center with c4, d4 and e4, develops naturally and castles. Black challenges the center with ...e5 or ...c5.",
    },
    {
      title: "The race",
      moves: "d4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5 O-O Nc6 d5 Ne7 b4",
      text: "After ...Nc6 d5 Ne7, the center is closed. Black attacks on the kingside with ...Ne8 or ...Nh5, ...f5-f4 and ...g5; White attacks on the queenside with b4 (the Bayonet), c5 and a4-a5. Speed matters: every tempo on the queenside counts.",
    },
    {
      title: "Defending the king",
      moves: "d4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5 O-O Nc6 d5 Ne7 b4 Nh5 Re1 f5 Ng5",
      text: "Against Black's kingside push, White frees f1 for the bishop (Re1 and Bf1), puts a knight on d2 or e6, and trades Black's attacking knights when they land on f4. Don't hurry with f3 or g3, which weaken the king.",
    },
    {
      title: "When Black takes on d4",
      moves: "d4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5 O-O exd4 Nxd4 Re8 f3",
      text: "...exd4 gives White a central knight and a space advantage. f3 holds e4, Kh1 avoids checks on the a7-g1 diagonal, and the d6 pawn is a target.",
    },
  ],
  grunfeld: [
    {
      title: "The Exchange Variation",
      moves: "d4 Nf6 c4 g6 Nc3 d5 cxd5 Nxd5 e4 Nxc3 bxc3 Bg7 Bc4 c5 Ne2",
      text: "White takes the big center (c3, d4, e4); Black attacks it with ...c5, ...Bg7, ...Nc6 and ...Bg4. Bc4 aims at f7, and Ne2 supports d4 while avoiding the pin ...Bg4 on f3.",
    },
    {
      title: "The d5 exchange sacrifice",
      moves: "d4 Nf6 c4 g6 Nc3 d5 cxd5 Nxd5 e4 Nxc3 bxc3 Bg7 Bc4 c5 Ne2 O-O O-O Nc6 Be3 Bg4 f3 Na5 Bd3 cxd4 cxd4 Be6 d5 Bxa1 Qxa1",
      text: "A famous idea: White gives up the a1 rook for Black's dark-squared bishop. The queen on a1 then rules the long diagonal toward g7, the center rolls forward, and Black's king is short of defenders.",
    },
  ],
  benoni: [
    {
      title: "Center versus queenside",
      moves: "d4 Nf6 c4 c5 d5 e6 Nc3 exd5 cxd5 d6 e4",
      text: "In the Modern Benoni, White has a central majority (e4, d5) and Black a queenside majority (...b5). White's main break is e5; Black's is ...b5 and ...c4. Control the e5 square and stop ...b5 with a4.",
    },
    {
      title: "The Taimanov attack",
      moves: "d4 Nf6 c4 c5 d5 e6 Nc3 exd5 cxd5 d6 e4 g6 f4 Bg7 Bb5+",
      text: "f4 prepares e5 while Black's king is still in the center. Bb5+ disrupts Black's development: ...Nfd7 blocks the f6 knight, and ...Bd7 allows e5.",
    },
    {
      title: "Quiet setups: pressure on d6",
      moves: "d4 Nf6 c4 e6 Nf3 c5 d5 exd5 cxd5 d6 Nc3 g6 Bf4",
      text: "With Nf3 and Bf4, White targets d6. Qa4+ is a useful check, and Nd2-c4 adds pressure. a4 stops ...b5.",
    },
  ],
  benko: [
    {
      title: "Take the pawn, castle, consolidate",
      moves: "d4 Nf6 c4 c5 d5 b5 cxb5 a6 bxa6 Bxa6 Nc3 d6 Nf3 g6 g3 Bg7 Bg2 O-O O-O",
      text: "Accept the gambit and keep the extra pawn. The fianchetto gets White's king safe. Then Qc2, Rd1 or Rb1, Bd2 and b3 cover the queenside files, and e4 gains central space.",
    },
    {
      title: "With e4: the king walk",
      moves: "d4 Nf6 c4 c5 d5 b5 cxb5 a6 bxa6 Bxa6 Nc3 d6 Nf3 Nbd7 e4 Bxf1 Kxf1 g6 g3 Bg7 Kg2",
      text: "If White plays e4 early, ...Bxf1 Kxf1 costs castling, but g3 and Kg2 put the king safely on g2. Then Re1, e5 or f4 give White the initiative in the center.",
    },
  ],
  budapest: [
    {
      title: "Hold e5 with pieces, then give it back on good terms",
      moves: "d4 Nf6 c4 e5 dxe5 Ng4 Bf4 Nc6 Nf3 Bb4+ Nbd2 Qe7 e3",
      text: "Black regains the e5 pawn with pieces. White defends it with Bf4 and Nf3, blocks the check with Nbd2, and after e3 lets it go: White gets the bishop pair or queenside space with b4 and c5.",
    },
    {
      title: "Punish the loose ideas",
      moves: "d4 Nf6 c4 e5 dxe5 Ng4 Bf4 Bc5 e3 Nc6 Qxg4",
      text: "Many Budapest lines leave a knight or the f7 square loose. Here ...Nc6? drops the g4 knight. Against ...g5, attack the loosened kingside with h4.",
    },
  ],
  sidelines: [
    {
      title: "2...d5: take on d5 and play e4",
      moves: "d4 Nf6 c4 d5 cxd5 Nxd5 Nf3 e6 e4",
      text: "The Marshall Defense lets White take on d5 and then gain time with e4. Take the center with tempo and develop: White gets a classical big center for free.",
    },
    {
      title: "2...d6: the Old Indian",
      moves: "d4 Nf6 c4 d6 Nc3 Nbd7 e4 e5 Nf3",
      text: "Black's setup is solid but passive. Take the full center with e4 and Nf3, develop with Be2 and castle, and use the extra space.",
    },
  ],
};
