import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import type { TranscriptSegmentRow } from "../types";

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

const SPEAKER_COLORS = [
  "bg-primary/10 text-primary",
  "bg-emerald-500/10 text-emerald-600",
  "bg-amber-500/10 text-amber-600",
  "bg-rose-500/10 text-rose-600",
];

export function TranscriptViewer({
  segments,
}: {
  segments: TranscriptSegmentRow[];
}) {
  if (segments.length === 0) {
    return (
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle>Transcript</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            title="No transcript"
            description="No transcript segments recorded for this session."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle>Transcript</CardTitle>
        <CardDescription>
          {segments.length} segments recorded
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
          {segments.map((seg) => (
            <div key={seg.id} className="flex gap-3 text-sm">
              <span className="text-xs text-muted-foreground tabular-nums shrink-0 pt-1 w-10">
                {formatTime(seg.start_time)}
              </span>
              <span
                className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-medium ${SPEAKER_COLORS[seg.speaker % SPEAKER_COLORS.length]}`}
              >
                S{seg.speaker}
              </span>
              <p className="flex-1 leading-relaxed">{seg.text}</p>
              <span className="text-xs text-muted-foreground tabular-nums shrink-0 pt-1">
                {(seg.confidence * 100).toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
