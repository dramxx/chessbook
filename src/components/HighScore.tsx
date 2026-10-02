import { useState } from "react";
import { MAX_NAME, type Score } from "@/lib/best";

export function Leaderboard({ top }: { top: Score[] | null }) {
  if (!top) return null;
  if (!top.length) return <p className="text-sm text-neutral-400">No high scores yet.</p>;
  return (
    <div>
      <div className="mb-1 text-xs uppercase text-neutral-400">High scores</div>
      <ol className="text-sm">
        {top.map((s, i) => (
          <li key={i} className="flex gap-2">
            <span className="w-5 text-right text-neutral-400">{i + 1}.</span>
            <span className="min-w-0 flex-1 truncate">{s.name}</span>
            <b>{s.score}</b>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function GameOver(props: {
  score: number;
  label: string; // what the score counts, e.g. "solved"
  top: Score[] | null;
  newBest: boolean; // makes the top list and isn't saved yet
  onSave: (name: string) => Promise<void>;
  onRestart: () => void;
}) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
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
            if (!name.trim() || saving) return;
            setSaving(true);
            setError(false);
            props
              .onSave(name.trim())
              .catch(() => setError(true))
              .finally(() => setSaving(false));
          }}
        >
          <label className="text-sm text-[#81b64c]">New high score! Your name:</label>
          <div className="flex gap-2">
            <input
              autoFocus
              maxLength={MAX_NAME}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="min-w-0 flex-1 rounded bg-[#3c3a37] px-2 py-1 outline-none focus:ring-2 focus:ring-[#81b64c]"
            />
            <button className="btn-primary px-3 py-1" type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
          {error && <p className="text-sm text-red-400">Couldn&apos;t save the score. Try again.</p>}
        </form>
      ) : (
        <>
          <Leaderboard top={props.top} />
          <button className="btn-primary" onClick={props.onRestart}>
            Play again
          </button>
        </>
      )}
    </div>
  );
}
