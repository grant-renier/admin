import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MetricCard } from "@/components/metric-card";
import {
  ClockIcon,
  MessageSquareIcon,
  HashIcon,
  AudioWaveformIcon,
} from "lucide-react";
import type { SessionDetail } from "../types";
import { TranscriptViewer } from "./transcript-viewer";

export function SessionDetailView({ session }: { session: SessionDetail }) {
  const mins = Math.floor(session.duration / 60);
  const secs = session.duration % 60;

  return (
    <div className="space-y-6 px-4 lg:px-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{session.name}</h2>
          <p className="text-muted-foreground">
            {session.user_display_name} ({session.user_email})
          </p>
        </div>
        <Badge
          variant="outline"
          className={
            session.status === "completed"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600"
              : ""
          }
        >
          {session.status}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-3 @xl/main:grid-cols-4">
        <MetricCard
          title="Duration"
          value={`${mins}:${String(secs).padStart(2, "0")}`}
          icon={ClockIcon}
          accent="primary"
          compact
        />
        <MetricCard
          title="Words"
          value={session.word_count}
          icon={HashIcon}
          accent="blue"
          compact
        />
        <MetricCard
          title="Chunks"
          value={session.chunk_count}
          icon={AudioWaveformIcon}
          accent="emerald"
          compact
        />
        <MetricCard
          title="Messages"
          value={session.message_count}
          subtitle={`${session.total_tokens.toLocaleString()} tokens`}
          icon={MessageSquareIcon}
          accent="amber"
          compact
        />
      </div>

      {session.summary && (
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed">{session.summary}</p>
          </CardContent>
        </Card>
      )}

      {session.notes && (
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed">{session.notes}</p>
          </CardContent>
        </Card>
      )}

      {Object.keys(session.metric_scores).length > 0 && (
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>Metric Scores</CardTitle>
            <CardDescription>AI-generated dimension scores</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 @lg:grid-cols-3">
              {Object.entries(session.metric_scores).map(([key, value]) => (
                <div
                  key={key}
                  className="flex items-center justify-between rounded-lg border border-border/50 p-3"
                >
                  <span className="text-sm font-medium capitalize">
                    {key.replace(/_/g, " ")}
                  </span>
                  <span className="text-lg font-bold tabular-nums">
                    {typeof value === "number" ? value.toFixed(1) : value}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <TranscriptViewer segments={session.segments} />
    </div>
  );
}
