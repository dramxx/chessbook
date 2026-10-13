import { Chess } from "chess.js";
import { epd } from "@/lib/openings";
import { caroKann } from "@/lib/courses/caro-kann";
import { queensGambit } from "@/lib/courses/queens-gambit";
import { indianMain, indianSolid } from "@/lib/courses/indian";
import { slav } from "@/lib/courses/slav";

// Opening courses: chapters of variations, each one line from the start position (`moves`, SAN).
// Explanations live in `notes`, keyed by the moves up to and including the one explained, and apply
// wherever that move is played in that position, whatever the move order.
// `reach`: share of the course's games that reach the line's branch; `games`: strong games that follow it,
// `ply` being where they leave it.
export type ModelGame = { id: number; ply: number; white: string; black: string; year: number | null; result: string };
export type Variation = {
  id: string;
  title: string;
  name?: string | null;
  moves: string;
  reach?: number;
  transposesTo?: string; // id of the variation the line runs into
  games?: ModelGame[];
};
// Strategy for a chapter: structures, plans and typical ideas, each optionally shown on a board
// after `moves` (SAN from the start position).
export type Idea = { title: string; text: string; moves?: string };
export type Chapter = { id: string; title: string; intro: string; ideas?: Idea[]; variations: Variation[] };
export type Course = {
  id: string;
  title: string;
  side: "white" | "black";
  intro: string;
  chapters: Chapter[];
  notes: Record<string, string>;
};

export const COURSES: Course[] = [caroKann, slav, queensGambit, indianSolid, indianMain];

export const findCourse = (id: string) => COURSES.find((c) => c.id === id);

// Variations in course order, each with its chapter.
export function variationsOf(course: Course) {
  return course.chapters.flatMap((chapter) => chapter.variations.map((variation) => ({ chapter, variation })));
}

// `fen` is the position before the move.
export type Step = { san: string; from: string; to: string; fen: string; note?: string };

// Notes by "position|move", built once per course.
const noteIndex = new Map<Course, Map<string, string>>();
function notesOf(course: Course) {
  let index = noteIndex.get(course);
  if (!index) {
    index = new Map();
    for (const [key, note] of Object.entries(course.notes)) {
      const chess = new Chess();
      const moves = key.split(" ");
      for (const san of moves.slice(0, -1)) chess.move(san);
      index.set(`${epd(chess.fen())}|${chess.move(moves.at(-1)!).san}`, note);
    }
    noteIndex.set(course, index);
  }
  return index;
}

export function lineOf(course: Course, variation: Variation): Step[] {
  const notes = notesOf(course);
  const chess = new Chess();
  return variation.moves.split(" ").map((token) => {
    const fen = chess.fen();
    const m = chess.move(token);
    return { san: m.san, from: m.from, to: m.to, fen, note: notes.get(`${epd(fen)}|${m.san}`) };
  });
}

// --- Progress (this browser only) ------------------------------------------------------------

// Spaced repetition: each of the player's moves is a card keyed by the course and the position it is
// played in, so a position shared by several variations is learned once (two courses can answer the
// same position differently). A correct review moves the card up one interval, a wrong one sends it
// back to the first.
export const INTERVALS_H = [4, 24, 72, 168, 336, 720, 2160, 4320]; // 4 hours ... 6 months
const HOUR = 3600_000;
export type Card = { san: string; level: number; due: number }; // level: index into INTERVALS_H
// learned: "course/variation" -> time; cards: "course|position" -> card
export type Progress = { learned: Record<string, number>; cards: Record<string, Card> };

const KEY = "learn:v1";

const cardKey = (course: Course, fen: string) => `${course.id}|${epd(fen)}`;
const learnedKey = (course: Course, variation: Variation) => `${course.id}/${variation.id}`;
export const isLearned = (p: Progress, course: Course, variation: Variation) => !!p.learned[learnedKey(course, variation)];

// Progress saved before keys included the course: give each entry to the course it belongs to.
function migrate(p: Progress) {
  const legacyCards = Object.keys(p.cards).filter((k) => !k.includes("|"));
  const legacyLearned = Object.keys(p.learned).filter((k) => !k.includes("/"));
  if (!legacyCards.length && !legacyLearned.length) return false;
  for (const course of COURSES) {
    for (const { variation } of variationsOf(course)) {
      if (legacyLearned.includes(variation.id)) p.learned[learnedKey(course, variation)] ??= p.learned[variation.id];
      for (const step of lineOf(course, variation)) {
        const card = isMine(step, course.side) ? p.cards[epd(step.fen)] : undefined;
        if (card && card.san === step.san) p.cards[cardKey(course, step.fen)] ??= card;
      }
    }
  }
  for (const k of legacyCards) delete p.cards[k];
  for (const k of legacyLearned) delete p.learned[k];
  return true;
}

export function loadProgress(): Progress {
  let p: Progress;
  try {
    p = JSON.parse(localStorage.getItem(KEY) ?? "null") ?? { learned: {}, cards: {} };
  } catch {
    return { learned: {}, cards: {} };
  }
  if (migrate(p)) saveProgress(p);
  return p;
}

function saveProgress(p: Progress) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {}
}

export const isMine = (step: Step, side: Course["side"]) => step.fen.split(" ")[1] === side[0];

// Marks a variation learned and schedules its moves that aren't scheduled yet.
export function markLearned(course: Course, variation: Variation) {
  const p = loadProgress();
  const now = Date.now();
  p.learned[learnedKey(course, variation)] = now;
  for (const step of lineOf(course, variation)) {
    if (!isMine(step, course.side)) continue;
    p.cards[cardKey(course, step.fen)] ??= { san: step.san, level: 0, due: now + INTERVALS_H[0] * HOUR };
  }
  saveProgress(p);
}

// A correct first try moves the card up one interval; a miss sends it back to the first.
export function recordReview(course: Course, fen: string, correct: boolean) {
  const p = loadProgress();
  const card = p.cards[cardKey(course, fen)];
  if (!card) return;
  card.level = correct ? Math.min(card.level + 1, INTERVALS_H.length - 1) : 0;
  card.due = Date.now() + INTERVALS_H[card.level] * HOUR;
  saveProgress(p);
}

// A learned variation with due moves to quiz (indices into its steps), each due position asked once
// per session: in the first variation that reaches it.
export type ReviewLine = { chapter: Chapter; variation: Variation; steps: Step[]; quiz: number[] };

export function reviewQueue(course: Course, p: Progress, now: number): ReviewLine[] {
  const asked = new Set<string>();
  const queue: ReviewLine[] = [];
  for (const { chapter, variation } of variationsOf(course)) {
    if (!isLearned(p, course, variation)) continue;
    const steps = lineOf(course, variation);
    const quiz: number[] = [];
    steps.forEach((step, i) => {
      const key = cardKey(course, step.fen);
      const card = p.cards[key];
      if (!isMine(step, course.side) || !card || card.due > now || asked.has(key)) return;
      asked.add(key);
      quiz.push(i);
    });
    if (quiz.length) queue.push({ chapter, variation, steps, quiz });
  }
  return queue;
}

// Earliest due time among the course's scheduled moves, or null if none are scheduled.
export function nextDue(course: Course, p: Progress): number | null {
  let next: number | null = null;
  for (const { variation } of variationsOf(course)) {
    if (!isLearned(p, course, variation)) continue;
    for (const step of lineOf(course, variation)) {
      const card = isMine(step, course.side) ? p.cards[cardKey(course, step.fen)] : undefined;
      if (card && (next === null || card.due < next)) next = card.due;
    }
  }
  return next;
}

// "5." before White's move, "5..." before Black's, from the position the move is played in.
export function moveLabel(fen: string) {
  const [, turn, , , , n] = fen.split(" ");
  return turn === "w" ? `${n}.` : `${n}...`;
}

// "3 hours", "2 days": how long until `time`.
export function formatWait(time: number, now: number) {
  const hours = Math.max(1, Math.round((time - now) / HOUR));
  if (hours < 48) return `${hours} hour${hours === 1 ? "" : "s"}`;
  return `${Math.round(hours / 24)} days`;
}
