import { useState } from "react";
import type { Best } from "@/lib/best";

export function BestLine({ best }: { best: Best | null }) {
  if (!best) return <p className="text-sm text-neutral-400">No high score yet.</p>;
  return (
    <p className="text-sm">
      High score: <b>{best.score}</b> by <b>{best.name}</b>
    </p>
  );
}

export function GameOver(props: {
  score: number;
  label: string; // what the score counts, e.g. "solved"
  best: Best | null;
  newBest: boolean;
  onSave: (name: string) => void;
  onRestart: () => void;
}) {
  const [name, setName] = useState("");
  return (
    <div className="flex flex-col gap-3 rounded bg-[#1f1e1b] p-3">
      <div className="text-lg font-bold">
        Game over: {props.score} {props.label}
      </div>
      {props.newBest ? (
        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) props.onSave(name.trim());
          }}
        >
          <label className="text-sm text-[#81b64c]">New high score! Your name:</label>
          <div className="flex gap-2">
            <input
              autoFocus
              maxLength={20}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="min-w-0 flex-1 rounded bg-[#3c3a37] px-2 py-1 outline-none focus:ring-2 focus:ring-[#81b64c]"
            />
            <button className="btn-primary px-3 py-1" type="submit">
              Save
            </button>
          </div>
        </form>
      ) : (
        <>
          <BestLine best={props.best} />
          <button className="btn-primary" onClick={props.onRestart}>
            Play again
          </button>
        </>
      )}
    </div>
  );
}
