import { BrainCircuit, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { type DisciplineScoreResult } from "@/lib/disciplineScore";

interface DisciplineScoreCardProps {
  result: DisciplineScoreResult;
}

const gradeStyles: Record<DisciplineScoreResult["grade"], string> = {
  Elite: "bg-green-500/10 text-green-400 border-green-500/30",
  Strong: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  Developing: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
  "At Risk": "bg-red-500/10 text-red-400 border-red-500/30",
};

export default function DisciplineScoreCard({ result }: DisciplineScoreCardProps) {
  return (
    <Card className="glow-card border-primary/20">
      <CardHeader className="py-3 px-3 sm:px-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
              <BrainCircuit className="h-4 w-4 text-primary" />
              Discipline Score
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {result.periodLabel} • {result.tradesAnalyzed} trades analyzed
            </p>
          </div>
          <Badge variant="outline" className={gradeStyles[result.grade]}>
            {result.grade}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="px-3 sm:px-4 pb-4 space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-3xl sm:text-4xl font-bold text-primary">{result.score}</p>
            <p className="text-xs text-muted-foreground">out of 100</p>
          </div>
          <div className="max-w-sm text-right">
            <p className="text-sm font-medium">{result.summary}</p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {result.metrics.map((metric) => (
            <div key={metric.key} className="rounded-xl border border-border/50 bg-muted/20 p-3 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium">{metric.label}</p>
                <span className="text-sm font-bold">{metric.score}</span>
              </div>
              <Progress value={metric.score} className="h-2" />
              <p className="text-xs text-muted-foreground">{metric.description}</p>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-primary/10 bg-primary/5 p-3">
          <p className="text-sm font-medium flex items-center gap-2 mb-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Coach Notes
          </p>
          <div className="space-y-1.5">
            {result.insights.map((insight) => (
              <p key={insight} className="text-sm text-muted-foreground">
                • {insight}
              </p>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
