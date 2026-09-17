export type TaskStatus = "created" | "running" | "progress" | "completed" | "failed" | "cancelled";
export interface TaskState { taskId: string; status: TaskStatus; createdAt: string; updatedAt: string; progress: number; resultAvailable: boolean; failureReason?: string; }
export function transitionTask(task: TaskState, status: TaskStatus, patch: Partial<Pick<TaskState, "progress" | "resultAvailable" | "failureReason">> = {}): TaskState {
  if ((status === "completed" || status === "failed" || status === "cancelled") && task.status === status) return { ...task, ...patch, updatedAt: new Date().toISOString() };
  const terminal = new Set<TaskStatus>(["completed", "failed", "cancelled"]);
  if (terminal.has(task.status)) throw new Error("terminal task cannot transition");
  return { ...task, status, ...patch, progress: Math.max(0, Math.min(1, patch.progress ?? task.progress)), updatedAt: new Date().toISOString() };
}
