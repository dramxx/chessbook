"use client";

import { use } from "react";
import Link from "next/link";
import { Chess } from "chess.js";
import { Board } from "@/components/Board";
import { findCourse } from "@/lib/learn";

const LAST_MOVE = "rgba(255,255,51,.45)";

// The position after `moves`, with its last move highlighted.
function diagram(moves: string) {
  const chess = new Chess();
  let last: { from: string; to: string } | null = null;
  for (const san of moves.split(" ")) last = chess.move(san);
  return { fen: chess.fen(), highlights: last ? { [last.from]: LAST_MOVE, [last.to]: LAST_MOVE } : {} };
}

export default function IdeasPage({ params }: { params: Promise<{ course: string; chapter: string }> }) {
  const ids = use(params);
  const course = findCourse(ids.course);
  const index = course?.chapters.findIndex((c) => c.id === ids.chapter) ?? -1;
  const chapter = course?.chapters[index];
  if (!course || !chapter) return <p className="p-8">Chapter not found.</p>;
  const first = chapter.variations[0];

  return (
    <main className="mx-auto grid w-full max-w-3xl flex-1 content-start gap-4 p-4">
      <div className="rounded-lg bg-panel p-6">
        <p className="text-xs text-foreground/50">
          <Link href={`/learn/${course.id}`} className="hover:underline">
            {course.title}
          </Link>{" "}
          › Ideas
        </p>
        <h1 className="text-2xl font-bold">{chapter.title}</h1>
        <p className="mt-2 text-sm text-foreground/70">{chapter.intro}</p>
      </div>

      {(chapter.ideas ?? []).map((idea) => {
        const board = idea.moves ? diagram(idea.moves) : null;
        return (
          <section key={idea.title} className="flex flex-col gap-4 rounded-lg bg-panel p-6 sm:flex-row">
            {board && (
              <div className="w-full max-w-64 shrink-0 self-center sm:self-start">
                <Board
                  fen={board.fen}
                  orientation={course.side}
                  canMove={false}
                  onMove={() => {}}
                  highlights={board.highlights}
                />
              </div>
            )}
            <div>
              <h2 className="text-lg font-bold">{idea.title}</h2>
              <p className="mt-2 text-sm whitespace-pre-line text-foreground/80">{idea.text}</p>
            </div>
          </section>
        );
      })}

      <div className="flex flex-wrap gap-2">
        {first && (
          <Link href={`/learn/${course.id}/${first.id}`} className="btn-primary">
            Start the lines
          </Link>
        )}
        {course.chapters[index + 1] && (
          <Link href={`/learn/${course.id}/ideas/${course.chapters[index + 1].id}`} className="btn-secondary">
            Next: {course.chapters[index + 1].title} ideas
          </Link>
        )}
      </div>
    </main>
  );
}
