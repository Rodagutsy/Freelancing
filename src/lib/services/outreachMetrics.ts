import type { DatabaseClient } from "@/lib/types";

export interface OutreachDashboardMetrics {
  total: number;
  inProgress: number; // approved + sending
  awaitingFollowUp: number; // sent + replied + follow_up_1 + follow_up_2
  replied: number;
  completed: number; // done + do_not_contact + failed
  suppressed: number;
  sentCount: number; // campaigns that reached at least one sent email
  replyRate: number; // 0-100, replied / sent
}

const SENT_STATES = ["sent", "replied", "follow_up_1", "follow_up_2", "done"];

export async function getOutreachDashboardMetrics(
  client: DatabaseClient,
): Promise<OutreachDashboardMetrics> {
  const [outbounds, suppressed] = await Promise.all([
    client.from("outbounds").select("status"),
    client.from("suppressed_contacts").select("id", { count: "exact", head: true }),
  ]);

  if (outbounds.error) throw new Error(outbounds.error.message);
  if (suppressed.error) throw new Error(suppressed.error.message);

  const byStatus = new Map<string, number>();
  for (const row of (outbounds.data ?? []) as { status: string }[]) {
    byStatus.set(row.status, (byStatus.get(row.status) ?? 0) + 1);
  }
  const c = (status: string) => byStatus.get(status) ?? 0;

  const replied = c("replied");
  const sentCount = SENT_STATES.reduce((sum, s) => sum + c(s), 0);

  return {
    total: outbounds.data?.length ?? 0,
    inProgress: c("approved") + c("sending"),
    awaitingFollowUp: sentCount - c("done"),
    replied,
    completed: c("done") + c("do_not_contact") + c("failed"),
    suppressed: suppressed.count ?? 0,
    sentCount,
    replyRate: sentCount > 0 ? Math.round((replied / sentCount) * 100) : 0,
  };
}