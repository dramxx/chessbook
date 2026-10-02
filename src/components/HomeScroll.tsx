"use client";

import { useEffect, useRef } from "react";

// The home page never scrolls as a whole: the wheel scrolls a hovered strip
// ([data-hscroll]) sideways, and the news list ([data-vscroll]) everywhere else.
export function HomeScroll({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const main = ref.current!;
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey) return; // pinch-zoom
      const strip = (e.target as Element).closest<HTMLElement>("[data-hscroll]");
      const target = strip ?? main.querySelector<HTMLElement>("[data-vscroll]");
      if (!target) return;
      e.preventDefault();
      if (strip) strip.scrollLeft += e.deltaY + e.deltaX;
      else target.scrollTop += e.deltaY;
    };
    window.addEventListener("wheel", onWheel, { passive: false });
    return () => window.removeEventListener("wheel", onWheel);
  }, []);

  return (
    <main
      ref={ref}
      className="mx-auto flex h-[calc(100dvh-var(--header-h))] w-full max-w-5xl flex-col gap-6 overflow-hidden p-4"
    >
      {children}
    </main>
  );
}
