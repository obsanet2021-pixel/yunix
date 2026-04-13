import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Clock, ListTodo } from "lucide-react";

interface KanbanSummaryProps {
  todo: number;
  inProgress: number;
  done: number;
}

export function KanbanSummary({ todo, inProgress, done }: KanbanSummaryProps) {
  const total = todo + inProgress + done;
  const getPercentage = (value: number) =>
    total > 0 ? Math.round((value / total) * 100) : 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Task Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4">
          <div className="flex-1 text-center p-3 rounded-lg bg-muted/50">
            <ListTodo className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
            <p className="text-2xl font-bold">{todo}</p>
            <p className="text-xs text-muted-foreground">To Do</p>
            <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-slate-400"
                style={{ width: `${getPercentage(todo)}%` }}
              />
            </div>
          </div>
          <div className="flex-1 text-center p-3 rounded-lg bg-yellow-500/10">
            <Clock className="w-5 h-5 mx-auto mb-1 text-yellow-500" />
            <p className="text-2xl font-bold">{inProgress}</p>
            <p className="text-xs text-muted-foreground">In Progress</p>
            <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-yellow-500"
                style={{ width: `${getPercentage(inProgress)}%` }}
              />
            </div>
          </div>
          <div className="flex-1 text-center p-3 rounded-lg bg-green-500/10">
            <CheckCircle2 className="w-5 h-5 mx-auto mb-1 text-green-500" />
            <p className="text-2xl font-bold">{done}</p>
            <p className="text-xs text-muted-foreground">Done</p>
            <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500"
                style={{ width: `${getPercentage(done)}%` }}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
