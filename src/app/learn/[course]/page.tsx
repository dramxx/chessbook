"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import {
  findCourse,
  formatWait,
  isLearned,
  loadProgress,
  nextDue,
  reviewQueue,
  variationsOf,
  type Progress,
  type Variation,
} from "@/lib/learn";

export default function CoursePage({ params }: { params: Promise<{ course: string }> }) {
  const course = findCourse(use(params).course);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [now, setNow] = useState(0);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- reading browser storage after hydration */
    setProgress(loadProgress());
    setNow(Date.now());
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  if (!course) return <p className="p-8">Course not found.</p>;
  const learned = (v: Variation) => !!progress && isLearned(progress, course, v);
  const next = variationsOf(course).find(({ variation }) => !learned(variation));
  const due = progress ? reviewQueue(course, progress, now).reduce((n, l) => n + l.quiz.length, 0) : 0;
  const upcoming = progress && !due ? nextDue(course, progress) : null;

  return (
    <main className="mx-auto grid w-full max-w-3xl flex-1 content-start gap-4 p-4">
      <div className="rounded-lg bg-panel p-6">
        <h1 className="text-2xl font-bold">{course.title}</h1>
        <p className="mt-2 text-sm text-foreground/70">{course.intro}</p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {due > 0 && (
            <Link href={`/learn/${course.id}/review`} className="btn-primary">
              Review: {due} move{due === 1 ? "" : "s"} due
            </Link>
          )}
          {next && (
            <Link
              href={`/learn/${course.id}/${next.variation.id}`}
              className={due > 0 ? "btn-secondary" : "btn-primary"}
            >
              Learn next: {next.variation.title}
            </Link>
          )}
          {upcoming !== null && (
            <span className="text-sm text-foreground/60">Next review in {formatWait(upcoming, now)}</span>
          )}
        </div>
      </div>
      {course.chapters.map((chapter) => {
        const done = chapter.variations.filter((v) => learned(v)).length;
        // Straight into this chapter: its first variation not learned yet, or its first one again.
        const start = chapter.variations.find((v) => !learned(v)) ?? chapter.variations[0];
        return (
          <details key={chapter.id} className="group rounded-lg bg-panel p-6">
            <summary className="cursor-pointer list-none">
              <div className="flex items-center gap-4">
                <h2 className="text-xl font-bold">
                  <span className="mr-2 inline-block text-foreground/50 transition-transform group-open:rotate-90">›</span>
                  {chapter.title}
                </h2>
                <span className="ml-auto text-sm text-foreground/60">
                  {done}/{chapter.variations.length} learned
                </span>
                <Link href={`/learn/${course.id}/${start.id}`} className="btn-secondary shrink-0 text-sm">
                  {done < chapter.variations.length ? "Learn" : "Again"}
                </Link>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded bg-surface">
                <div className="h-full bg-accent" style={{ width: `${(100 * done) / chapter.variations.length}%` }} />
              </div>
            </summary>
            <p className="mt-3 text-sm text-foreground/70">{chapter.intro}</p>
            {!!chapter.ideas?.length && (
              <Link href={`/learn/${course.id}/ideas/${chapter.id}`} className="mt-2 inline-block text-sm text-accent hover:underline">
                Key ideas and plans →
              </Link>
            )}
            <ol className="mt-3 grid gap-1">
              {chapter.variations.map((v, i) => (
                <li key={v.id}>
                  <Link
                    href={`/learn/${course.id}/${v.id}`}
                    className="flex items-center gap-3 rounded px-2 py-1.5 hover:bg-surface"
                  >
                    <span className="w-6 text-right text-sm text-foreground/50">{i + 1}.</span>
                    <span className="flex-1">{v.title}</span>
                    {v.reach !== undefined && (
                      <span className="text-xs text-foreground/50" title={`Comes up in this share of club games in the ${course.title}`}>
                        {(100 * v.reach).toFixed(1)}%
                      </span>
                    )}
                    <span className="w-4 text-accent">{learned(v) && "✓"}</span>
                  </Link>
                </li>
              ))}
            </ol>
          </details>
        );
      })}
    </main>
  );
}
