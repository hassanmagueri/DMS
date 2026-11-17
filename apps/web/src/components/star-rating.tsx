"use client";

import { useState } from "react";
import { Star } from "lucide-react";

export function StarRating({
  value,
  count,
}: {
  value: number | null;
  count?: number;
}) {
  const score = value ?? 0;
  return (
    <span className="inline-flex items-center gap-1.5" aria-label={count ? `${score} from ${count} ratings` : "No ratings yet"}>
      <span className="inline-flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`size-3.5 ${star <= Math.round(score) && score > 0 ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`}
          />
        ))}
      </span>
      <span className="text-xs text-muted-foreground">{count ? score.toFixed(1) : "No ratings"}</span>
    </span>
  );
}

export function StarPicker({
  disabled,
  onChange,
}: {
  disabled?: boolean;
  onChange: (score: number) => void;
}) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={disabled}
          aria-label={`Rate ${star} out of 5`}
          onMouseEnter={() => setHover(star)}
          onClick={() => onChange(star)}
          className="rounded-md p-1 transition-colors hover:bg-amber-50 disabled:opacity-50"
        >
          <Star className={`size-7 ${star <= hover ? "fill-amber-400 text-amber-400" : "text-muted-foreground/35"}`} />
        </button>
      ))}
    </div>
  );
}
