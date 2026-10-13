import { Chess } from "chess.js";
import { epd } from "@/lib/openings";
import { variationsOf, type Course } from "@/lib/learn";
import { TRAPS, type Trap } from "@/lib/traps-data";

// Opening traps: the data is in traps-data.ts, checked by scripts/check-traps.mjs (legal lines that
// end with the trapper winning).
export { TRAPS, type Trap };

export const findTrap = (id: string) => TRAPS.find((t) => t.id === id);

// Every position of a course's lines, built once per course.
const positions = new Map<Course, Set<string>>();
function positionsOf(course: Course) {
  let set = positions.get(course);
  if (!set) {
    set = new Set();
    for (const { variation } of variationsOf(course)) {
      const chess = new Chess();
      set.add(epd(chess.fen()));
      for (const san of variation.moves.split(" ")) {
        chess.move(san);
        set.add(epd(chess.fen()));
      }
    }
    positions.set(course, set);
  }
  return set;
}

// How a trap relates to the courses: a course line reaches the trap's position, or the one or two
// before it (where the victim's mistake is often made). "set" when the course plays the trapper's
// side, "avoid" when it plays the other side.
export function trapTags(trap: Trap, courses: Course[]) {
  const chess = new Chess();
  const keys: string[] = [];
  trap.moves
    .split(" ")
    .slice(0, trap.start)
    .forEach((san, i) => {
      chess.move(san);
      if (i >= trap.start - 3) keys.push(epd(chess.fen()));
    });
  return courses
    .filter((course) => keys.some((key) => positionsOf(course).has(key)))
    .map((course) => ({ course, kind: course.side === trap.side ? ("set" as const) : ("avoid" as const) }));
}

// --- Progress (this browser only): trap id -> sprung without a miss ---------------------------

const KEY = "traps:v1";

export function loadTrapResults(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}");
  } catch {
    return {};
  }
}

export function recordTrap(id: string, clean: boolean) {
  const results = loadTrapResults();
  results[id] = clean || !!results[id];
  try {
    localStorage.setItem(KEY, JSON.stringify(results));
  } catch {}
}
