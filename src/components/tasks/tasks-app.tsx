"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BackButton } from "@/components/ui/back-button";
import { useToast } from "@/components/ui/toast";
import { initials } from "@/lib/colors";
import type { TaskRow } from "@/lib/data";
import {
  TASK_BOARD_COLUMNS,
  STAGE_LABELS,
  TASK_WORK_LABELS,
  TASK_REVIEW_LABELS,
  TASK_PUBLISH_LABELS,
  type TaskWorkStatus,
} from "@/lib/enums";
import { TASK_CONTENT_TYPES, stagesForType, summarizeTasks } from "@/lib/tasks";

type Member = { id: string; name: string; avatarColor: string };
type Opt = { id: string; name: string; icon: string };
export type TasksMode = "overview" | "board" | "mywork" | "review" | "analytics";

type Props = {
  mode: TasksMode;
  tasks: TaskRow[];
  members: Member[];
  channels: Opt[];
  accounts: Opt[];
  isAdmin: boolean;
  canEdit: boolean;
  meId: string;
  initialTaskId?: string | null;
};

const STAGE_ICON: Record<string, string> = {
  CONTENT: "✍️", VIDEO: "🎬", GRAPHICS: "🎨", PUBLISHING: "🚀", ANALYTICS: "📊", DONE: "✓",
};
const workCls = (w: string) =>
  w === "YTI" ? "bg-wash/[0.07] text-slate"
  : w === "WIP_ON_TRACK" ? "bg-[#fbeecb] text-[#c98a12]"
  : w === "WIP_DELAY" ? "bg-[#fbe2dd] text-[#c23b2a]"
  : w === "COMPLETED_ON_TIME" ? "bg-[#d7f2e5] text-[#2e9e6b]"
  : "bg-[#fbe2dd] text-[#c23b2a]";
const revCls = (r: string) =>
  r === "PENDING" ? "bg-[#fbeecb] text-[#c98a12]"
  : r === "APPROVED" ? "bg-[#d7f2e5] text-[#2e9e6b]"
  : r === "REWORK" ? "bg-[#fbe2dd] text-[#c23b2a]"
  : "bg-wash/[0.07] text-slate";

const chip = "rounded-full px-2 py-0.5 text-[10.5px] font-semibold";
const badge = "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.04em]";

export function TasksApp(props: Props) {
  const { mode, tasks, isAdmin } = props;
  const router = useRouter();
  const { toast } = useToast();
  const [openId, setOpenId] = useState<string | null>(props.initialTaskId ?? null);
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const openTask = tasks.find((t) => t.id === openId) || null;

  async function api(url: string, method: string, body?: unknown) {
    const r = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!r.ok) {
      toast("Something went wrong. Try again.");
      return false;
    }
    return true;
  }
  const refresh = () => router.refresh();

  const title =
    mode === "overview" ? "Content Overview"
    : mode === "board" ? "Tasks board"
    : mode === "mywork" ? "My Work"
    : mode === "review" ? "To review"
    : "Analytics";

  return (
    <div className="flex-1 overflow-y-auto px-7 py-6">
      <div className="mb-1.5 flex items-center gap-3.5">
        <BackButton />
        <h2 className="font-display text-[19px]">{title}</h2>
        {mode === "overview" && props.canEdit && (
          <button
            onClick={() => { setEditId(null); setFormOpen(true); }}
            className="btn-premium ml-auto rounded-[11px] px-4 py-2 text-[12.5px] font-semibold"
          >
            ＋ Plan content
          </button>
        )}
      </div>
      <p className="mb-4 max-w-[74ch] text-[13px] text-slate">{subtitle(mode, isAdmin)}</p>

      {mode === "overview" && <Overview {...props} onOpen={setOpenId} onEdit={(id) => { setEditId(id); setFormOpen(true); }} onDelete={delTask} />}
      {mode === "board" && <Board tasks={tasks} onOpen={setOpenId} />}
      {mode === "mywork" && <MyWork tasks={tasks} meId={props.meId} onOpen={setOpenId} />}
      {mode === "review" && <ReviewInbox tasks={tasks} onOpen={setOpenId} onReview={reviewStage} />}
      {mode === "analytics" && <Analytics tasks={tasks} />}

      {openTask && (
        <TaskDrawer
          task={openTask}
          {...props}
          onClose={() => setOpenId(null)}
          onEdit={() => { setEditId(openTask.id); setFormOpen(true); }}
          api={api}
          refresh={refresh}
          toast={toast}
        />
      )}
      {formOpen && (
        <TaskForm
          task={editId ? tasks.find((t) => t.id === editId) ?? null : null}
          channels={props.channels}
          accounts={props.accounts}
          onClose={() => setFormOpen(false)}
          onSaved={() => { setFormOpen(false); refresh(); }}
          api={api}
          toast={toast}
        />
      )}
    </div>
  );

  async function delTask(id: string) {
    if (!confirm("Delete this task? It moves to Trash (30-day restore).")) return;
    if (await api(`/api/tasks/${id}`, "DELETE")) { toast("Task deleted → Trash"); setOpenId(null); refresh(); }
  }
  async function reviewStage(taskId: string, stageId: string, outcome: "APPROVED" | "REWORK") {
    const note = outcome === "REWORK" ? prompt("Rework note (what needs fixing)?") ?? "" : "";
    if (await api(`/api/tasks/${taskId}/stages/${stageId}`, "PATCH", { action: "review", outcome, note }))
      { toast(outcome === "APPROVED" ? "Approved ✓" : "Sent back for rework"); refresh(); }
  }
}

function subtitle(mode: TasksMode, isAdmin: boolean) {
  switch (mode) {
    case "overview": return "The weekly plan — theme, brief, content and publish status. Add a piece, then assign its stages.";
    case "board": return isAdmin ? "Every task and the stage it's in. Open a card to assign owners, review, and advance it." : "Where everything sits. Your own work is in My Work.";
    case "mywork": return "Everything assigned to you. Update your status, then submit for review.";
    case "review": return "Work submitted for review. Approve to advance it, or send it back for rework.";
    case "analytics": return "How the month is tracking — planned vs published, and metrics by platform.";
  }
}

// ── Overview (planning table) ────────────────────────────────────────────────
function Overview({ tasks, canEdit, onOpen, onEdit, onDelete }: Props & { onOpen: (id: string) => void; onEdit: (id: string) => void; onDelete: (id: string) => void }) {
  if (!tasks.length) return <Empty text="No tasks yet — plan your first piece." />;
  const weeks = new Map<string, TaskRow[]>();
  for (const t of tasks) { const k = t.weekLabel || "Unscheduled"; (weeks.get(k) || weeks.set(k, []).get(k)!).push(t); }
  return (
    <div className="overflow-x-auto rounded-card border border-line bg-card shadow-soft">
      <table className="w-full border-collapse text-[12.5px]">
        <thead>
          <tr className="border-b border-line text-left text-[11px] uppercase tracking-[0.04em] text-slate">
            <th className="px-3 py-2.5">Theme</th><th className="px-3 py-2.5">Type</th><th className="px-3 py-2.5">Platform / Account</th>
            <th className="px-3 py-2.5">Brief</th><th className="px-3 py-2.5">Content</th><th className="px-3 py-2.5">Publish</th><th className="px-3 py-2.5">Stage · Owner</th><th></th>
          </tr>
        </thead>
        <tbody>
          {[...weeks.entries()].map(([w, arr]) => (
            <>
              <tr key={w} className="bg-wash/[0.04]"><td colSpan={8} className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.04em] text-slate">{w}</td></tr>
              {arr.map((t) => {
                const st = t.stages.find((s) => s.stage === t.currentStage);
                return (
                  <tr key={t.id} onClick={() => onOpen(t.id)} className="cursor-pointer border-b border-line hover:bg-wash/[0.03]">
                    <td className="px-3 py-2.5 font-semibold">{t.title}</td>
                    <td className="px-3 py-2.5">{t.contentTypeLabel}</td>
                    <td className="px-3 py-2.5">{t.channel?.name ?? "—"} · {t.account?.name ?? "—"}</td>
                    <td className="max-w-[160px] truncate px-3 py-2.5 text-slate">{t.brief || "—"}</td>
                    <td className="px-3 py-2.5">{t.content ? "📄 drafted" : <span className="text-slate">—</span>}</td>
                    <td className="px-3 py-2.5"><span className={`${badge} ${t.publishStatus.startsWith("PUBLISHED") ? "bg-[#d7f2e5] text-[#2e9e6b]" : "bg-wash/[0.07] text-slate"}`}>{TASK_PUBLISH_LABELS[t.publishStatus as keyof typeof TASK_PUBLISH_LABELS] ?? t.publishStatus}</span></td>
                    <td className="px-3 py-2.5">{t.currentStage === "DONE" ? "✓ Done" : <span>{STAGE_ICON[t.currentStage]} {STAGE_LABELS[t.currentStage]} {st?.assigneeName ? `· ${st.assigneeName}` : <span className="text-[#e0912b]">· unassigned</span>}</span>}</td>
                    <td className="whitespace-nowrap px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                      {canEdit && <button onClick={() => onEdit(t.id)} className="rounded-[8px] border border-line px-2.5 py-1 text-[11.5px] font-semibold text-teal-dark hover:border-teal">Edit</button>}
                      {canEdit && <button onClick={() => onDelete(t.id)} className="ml-1.5 rounded-[8px] border border-line px-2.5 py-1 text-[11.5px] font-semibold text-[#c23b2a] hover:border-[#c23b2a]">Delete</button>}
                    </td>
                  </tr>
                );
              })}
            </>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Board (kanban) ───────────────────────────────────────────────────────────
function Board({ tasks, onOpen }: { tasks: TaskRow[]; onOpen: (id: string) => void }) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-6">
      {TASK_BOARD_COLUMNS.map((col) => {
        const items = tasks.filter((t) => t.currentStage === col);
        return (
          <div key={col} className="w-[240px] flex-shrink-0 rounded-card border border-line bg-wash/[0.03] p-2.5">
            <div className="mb-2.5 flex items-center gap-2 px-1 text-[12.5px] font-bold">
              {STAGE_ICON[col]} {STAGE_LABELS[col]}
              <span className="ml-auto rounded-full bg-card px-1.5 text-[11px] text-slate">{items.length}</span>
            </div>
            {items.map((t) => {
              const st = t.stages.find((s) => s.stage === t.currentStage);
              return (
                <button key={t.id} onClick={() => onOpen(t.id)} className="mb-2 block w-full rounded-[11px] border border-line bg-card p-2.5 text-left shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift">
                  <div className="mb-1.5 text-[13px] font-semibold">{t.title}</div>
                  <div className="mb-1.5 flex flex-wrap gap-1">
                    <span className={`${chip} bg-violet-soft text-violet`}>{t.contentTypeLabel}</span>
                    {t.channel && <span className={`${chip} bg-wash/[0.06]`}>{t.channel.name}</span>}
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate">
                    {t.currentStage === "DONE" ? "✓ Published" : st?.assigneeName ? <>{av(st.assigneeName, st.assigneeColor)} {st.assigneeName}</> : <span className="font-semibold text-[#e0912b]">● Unassigned</span>}
                    {st?.reviewStatus === "PENDING" && <span className={`${badge} ml-auto bg-[#fbeecb] text-[#c98a12]`}>review</span>}
                    {st?.reviewStatus === "REWORK" && <span className={`${badge} ml-auto bg-[#fbe2dd] text-[#c23b2a]`}>rework</span>}
                  </div>
                </button>
              );
            })}
            {!items.length && <div className="px-1 py-1 text-[11px] text-slate">—</div>}
          </div>
        );
      })}
    </div>
  );
}

// ── My Work ──────────────────────────────────────────────────────────────────
function MyWork({ tasks, meId, onOpen }: { tasks: TaskRow[]; meId: string; onOpen: (id: string) => void }) {
  const mine: { t: TaskRow; s: TaskRow["stages"][number] }[] = [];
  for (const t of tasks) for (const s of t.stages) if (s.assigneeId === meId) mine.push({ t, s });
  const groups: Record<string, typeof mine> = { "To do": [], "In review": [], "Needs rework": [], Done: [] };
  for (const x of mine) {
    const r = x.s.reviewStatus;
    groups[r === "APPROVED" ? "Done" : r === "PENDING" ? "In review" : r === "REWORK" ? "Needs rework" : "To do"].push(x);
  }
  if (!mine.length) return <Empty text="Nothing assigned to you yet." />;
  return (
    <div>
      {Object.entries(groups).map(([g, arr]) => (
        <div key={g}>
          <div className="mb-2 mt-4 text-[11px] font-extrabold uppercase tracking-[0.06em] text-ink">{g} <span className="text-slate">({arr.length})</span></div>
          {arr.map(({ t, s }) => (
            <button key={s.id} onClick={() => onOpen(t.id)} className="mb-2 flex w-full items-center gap-3 rounded-[12px] border border-line bg-card px-4 py-3 text-left shadow-soft hover:border-teal">
              <span className={`${badge} bg-violet-soft text-violet`}>{STAGE_ICON[s.stage]} {STAGE_LABELS[s.stage]}</span>
              <span className="min-w-0 flex-1">
                <b className="text-[13.5px]">{t.title}</b>
                <span className="block text-[11.5px] text-slate">{t.contentTypeLabel} · {t.channel?.name ?? "—"} {s.targetDate ? `· due ${fmt(s.targetDate)}` : ""}</span>
                {s.reviewNote && s.reviewStatus === "REWORK" && <span className="mt-0.5 block text-[11.5px] text-[#c23b2a]">↩ {s.reviewNote}</span>}
              </span>
              <span className={`${badge} ${workCls(s.workStatus)}`}>{TASK_WORK_LABELS[s.workStatus as TaskWorkStatus] ?? s.workStatus}</span>
            </button>
          ))}
          {!arr.length && <div className="mb-1 text-[12.5px] text-slate">—</div>}
        </div>
      ))}
    </div>
  );
}

// ── Review inbox ─────────────────────────────────────────────────────────────
function ReviewInbox({ tasks, onOpen, onReview }: { tasks: TaskRow[]; onOpen: (id: string) => void; onReview: (t: string, s: string, o: "APPROVED" | "REWORK") => void }) {
  const rows: { t: TaskRow; s: TaskRow["stages"][number] }[] = [];
  for (const t of tasks) for (const s of t.stages) if (s.reviewStatus === "PENDING") rows.push({ t, s });
  if (!rows.length) return <Empty text="Nothing waiting for review." />;
  return (
    <div>
      {rows.map(({ t, s }) => (
        <div key={s.id} className="mb-2 flex items-center gap-3 rounded-[12px] border border-line bg-card px-4 py-3 shadow-soft">
          <button onClick={() => onOpen(t.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
            <span className={`${badge} bg-violet-soft text-violet`}>{STAGE_ICON[s.stage]} {STAGE_LABELS[s.stage]}</span>
            <span className="min-w-0"><b className="text-[13.5px]">{t.title}</b><span className="block text-[11.5px] text-slate">by {s.assigneeName ?? "—"} · {t.contentTypeLabel}</span></span>
          </button>
          <button onClick={() => onReview(t.id, s.id, "APPROVED")} className="btn-premium rounded-[9px] px-3.5 py-1.5 text-[12px] font-semibold">Approve</button>
          <button onClick={() => onReview(t.id, s.id, "REWORK")} className="rounded-[9px] border border-line px-3.5 py-1.5 text-[12px] font-semibold text-ink hover:border-teal">Rework</button>
        </div>
      ))}
    </div>
  );
}

// ── Analytics ────────────────────────────────────────────────────────────────
function Analytics({ tasks }: { tasks: TaskRow[] }) {
  const sum = summarizeTasks(tasks.map((t) => ({ platform: t.channel?.name ?? null, publishStatus: t.publishStatus, clicks: t.metricClicks, leads: t.metricLeads, eng: t.metricEng })));
  const pub = tasks.filter((t) => t.publishStatus.startsWith("PUBLISHED"));
  return (
    <div>
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi v={sum.planned} l="Planned" /><Kpi v={sum.published} l="Published" /><Kpi v={sum.clicks} l="Total clicks" /><Kpi v={`${sum.leads} / ${sum.eng}`} l="Leads / engagements" />
      </div>
      <div className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.06em] text-ink">Summary by platform</div>
      <div className="mb-6 overflow-x-auto rounded-card border border-line bg-card shadow-soft">
        <table className="w-full border-collapse text-[12.5px]"><thead><tr className="border-b border-line text-left text-[11px] uppercase tracking-[0.04em] text-slate"><th className="px-3 py-2.5">Platform</th><th className="px-3 py-2.5">Planned</th><th className="px-3 py-2.5">Published</th><th className="px-3 py-2.5">Clicks</th><th className="px-3 py-2.5">Leads</th><th className="px-3 py-2.5">Eng.</th></tr></thead>
        <tbody>{sum.byPlatform.map((p) => <tr key={p.platform} className="border-b border-line"><td className="px-3 py-2.5 font-semibold">{p.platform}</td><td className="px-3 py-2.5">{p.planned}</td><td className="px-3 py-2.5">{p.published}</td><td className="px-3 py-2.5">{p.clicks}</td><td className="px-3 py-2.5">{p.leads}</td><td className="px-3 py-2.5">{p.eng}</td></tr>)}</tbody></table>
      </div>
      <div className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.06em] text-ink">Published pieces</div>
      <div className="overflow-x-auto rounded-card border border-line bg-card shadow-soft">
        <table className="w-full border-collapse text-[12.5px]"><thead><tr className="border-b border-line text-left text-[11px] uppercase tracking-[0.04em] text-slate"><th className="px-3 py-2.5">Content</th><th className="px-3 py-2.5">Platform</th><th className="px-3 py-2.5">Clicks</th><th className="px-3 py-2.5">Leads</th><th className="px-3 py-2.5">Eng.</th></tr></thead>
        <tbody>{pub.length ? pub.map((t) => <tr key={t.id} className="border-b border-line"><td className="px-3 py-2.5 font-semibold">{t.title}</td><td className="px-3 py-2.5">{t.channel?.name ?? "—"}</td><td className="px-3 py-2.5">{t.metricClicks ?? "—"}</td><td className="px-3 py-2.5">{t.metricLeads ?? "—"}</td><td className="px-3 py-2.5">{t.metricEng ?? "—"}</td></tr>) : <tr><td colSpan={5} className="px-3 py-6 text-center text-slate">Nothing published yet.</td></tr>}</tbody></table>
      </div>
    </div>
  );
}

// ── Task drawer ──────────────────────────────────────────────────────────────
function TaskDrawer({ task, members, isAdmin, canEdit, meId, onClose, onEdit, api, refresh, toast }: Props & { task: TaskRow; onClose: () => void; onEdit: () => void; api: (u: string, m: string, b?: unknown) => Promise<boolean>; refresh: () => void; toast: (m: string) => void }) {
  const [assignStage, setAssignStage] = useState<string | null>(null);
  const t = task;

  async function assign(stageId: string, assigneeId: string, targetDate: string) {
    if (await api(`/api/tasks/${t.id}/stages/${stageId}`, "PATCH", { action: "assign", assigneeId: assigneeId || null, targetDate: targetDate ? new Date(targetDate).toISOString() : null }))
      { setAssignStage(null); toast("Assigned — notified 🔔"); refresh(); }
  }
  async function work(stageId: string, workStatus: string) {
    if (await api(`/api/tasks/${t.id}/stages/${stageId}`, "PATCH", { action: "work", workStatus })) { toast("Status updated"); refresh(); }
  }
  async function submit(stageId: string) {
    if (await api(`/api/tasks/${t.id}/stages/${stageId}`, "PATCH", { action: "submit" })) { toast("Submitted for review 🔔"); refresh(); }
  }
  async function review(stageId: string, outcome: "APPROVED" | "REWORK") {
    const note = outcome === "REWORK" ? prompt("Rework note?") ?? "" : "";
    if (await api(`/api/tasks/${t.id}/stages/${stageId}`, "PATCH", { action: "review", outcome, note })) { toast(outcome === "APPROVED" ? "Approved ✓" : "Rework sent"); refresh(); }
  }
  async function publish() {
    if (await api(`/api/tasks/${t.id}`, "PATCH", { publishStatus: "PUBLISHED_ON_TIME", publishedDate: new Date().toISOString() })) { toast("Published 🚀"); refresh(); }
  }
  async function recordMetrics() {
    const c = Number(prompt("Clicks?") ?? "");
    const l = Number(prompt("Leads?") ?? "");
    const e = Number(prompt("Engagements?") ?? "");
    if (await api(`/api/tasks/${t.id}`, "PATCH", { metricClicks: c || 0, metricLeads: l || 0, metricEng: e || 0 })) { toast("Metrics recorded 📊"); refresh(); }
  }

  return (
    <div onClick={onClose} className="fixed inset-0 z-[70] flex justify-end bg-black/50 backdrop-blur-[3px]">
      <div onClick={(e) => e.stopPropagation()} className="h-full w-[min(560px,100%)] overflow-y-auto border-l border-line bg-card p-6 shadow-card">
        <div className="mb-2 flex items-start gap-3">
          <h2 className="flex-1 font-display text-[18px]">{t.title}</h2>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full text-slate hover:bg-wash/[0.06]">✕</button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <span className={`${chip} bg-violet-soft text-violet`}>{t.contentTypeLabel}</span>
          {t.channel && <span className={`${chip} bg-wash/[0.06]`}>{t.channel.name}</span>}
          {t.account && <span className={`${chip} bg-teal-soft text-teal-dark`}>✨ {t.account.name}</span>}
          {t.weekLabel && <span className={`${chip} bg-wash/[0.06]`}>{t.weekLabel}</span>}
        </div>

        <div className="mb-2 mt-4 flex items-center gap-2">
          <span className="text-[11px] font-extrabold uppercase tracking-[0.06em] text-ink">Content overview</span>
          {canEdit && <button onClick={onEdit} className="ml-auto rounded-[8px] border border-line px-2.5 py-1 text-[11.5px] font-semibold text-teal-dark hover:border-teal">Edit</button>}
        </div>
        <div className="rounded-[12px] border border-line bg-wash/[0.02] p-3">
          <div className="text-[12px] text-slate">Brief <b className="text-ink">{t.brief || "—"}</b></div>
          <div className="mt-1.5 whitespace-pre-wrap text-[12.5px] text-slate">{t.content || <i>No content drafted yet.</i>}</div>
          {t.remarks && <div className="mt-2 text-[12px]"><b>Remarks:</b> <span className="text-slate">{t.remarks}</span></div>}
        </div>

        <div className="mb-2 mt-4 text-[11px] font-extrabold uppercase tracking-[0.06em] text-ink">Production stages</div>
        {t.stages.map((s) => (
          <div key={s.id} className={`mb-2 rounded-[12px] border p-3 ${t.currentStage === s.stage ? "border-teal shadow-[inset_0_0_0_1px_rgba(14,159,143,0.2)]" : "border-line"}`}>
            <div className="mb-1.5 flex items-center gap-2">
              <span className="text-[13px] font-bold">{STAGE_ICON[s.stage]} {STAGE_LABELS[s.stage]}</span>
              <span className={`${badge} ${workCls(s.workStatus)}`}>{TASK_WORK_LABELS[s.workStatus as TaskWorkStatus] ?? s.workStatus}</span>
              <span className={`${badge} ${revCls(s.reviewStatus)}`}>{TASK_REVIEW_LABELS[s.reviewStatus as keyof typeof TASK_REVIEW_LABELS] ?? s.reviewStatus}</span>
            </div>
            <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-slate">
              <span>Owner <b className="text-ink">{s.assigneeName ?? "Unassigned"}</b></span>
              {s.targetDate && <span>Deadline <b className="text-ink">{fmt(s.targetDate)}</b></span>}
            </div>
            {s.remarks && <div className="mb-2 text-[12px] text-slate">📝 {s.remarks}</div>}
            {s.reviewNote && <div className="mb-2 text-[12px] text-[#c23b2a]">↩ {s.reviewNote}</div>}

            {assignStage === s.id ? (
              <AssignForm members={members} current={s.assigneeId} onCancel={() => setAssignStage(null)} onSave={(a, d) => assign(s.id, a, d)} />
            ) : (
              <div className="flex flex-wrap gap-2">
                {isAdmin && <button onClick={() => setAssignStage(s.id)} className="rounded-[8px] border border-line px-2.5 py-1 text-[11.5px] font-semibold text-teal-dark hover:border-teal">{s.assigneeId ? "Reassign" : "Assign owner + deadline"}</button>}
                {isAdmin && s.reviewStatus === "PENDING" && <>
                  <button onClick={() => review(s.id, "APPROVED")} className="btn-premium rounded-[8px] px-2.5 py-1 text-[11.5px] font-semibold">Approve</button>
                  <button onClick={() => review(s.id, "REWORK")} className="rounded-[8px] border border-line px-2.5 py-1 text-[11.5px] font-semibold hover:border-teal">Rework</button>
                </>}
                {s.assigneeId === meId && s.reviewStatus !== "APPROVED" && s.reviewStatus !== "PENDING" && <>
                  <button onClick={() => work(s.id, nextWork(s.workStatus))} className="rounded-[8px] border border-line px-2.5 py-1 text-[11.5px] font-semibold hover:border-teal">Update status</button>
                  <button onClick={() => submit(s.id)} className="btn-premium rounded-[8px] px-2.5 py-1 text-[11.5px] font-semibold">Submit →</button>
                </>}
              </div>
            )}
          </div>
        ))}

        <div className="mb-2 mt-4 text-[11px] font-extrabold uppercase tracking-[0.06em] text-ink">Publishing</div>
        <div className="text-[12px] text-slate">Status <b className="text-ink">{TASK_PUBLISH_LABELS[t.publishStatus as keyof typeof TASK_PUBLISH_LABELS] ?? t.publishStatus}</b>{t.contentLink ? <> · <a href={t.contentLink} target="_blank" rel="noreferrer" className="text-teal-dark underline">link</a></> : ""}</div>
        {t.currentStage === "PUBLISHING" && canEdit && <button onClick={publish} className="btn-premium mt-2 rounded-[9px] px-3.5 py-1.5 text-[12px] font-semibold">Mark published →</button>}

        <div className="mb-2 mt-4 text-[11px] font-extrabold uppercase tracking-[0.06em] text-ink">Analytics</div>
        {t.metricClicks != null ? (
          <div className="flex gap-4 text-[12px] text-slate"><span>Clicks <b className="text-ink">{t.metricClicks}</b></span><span>Leads <b className="text-ink">{t.metricLeads}</b></span><span>Eng. <b className="text-ink">{t.metricEng}</b></span></div>
        ) : <div className="text-[12px] text-slate">Recorded after publishing.</div>}
        {t.currentStage === "ANALYTICS" && canEdit && <button onClick={recordMetrics} className="btn-premium mt-2 rounded-[9px] px-3.5 py-1.5 text-[12px] font-semibold">Record metrics →</button>}

        {isAdmin && <div className="mt-6 border-t border-line pt-4"><button onClick={() => { if (confirm("Delete this task? Moves to Trash.")) api(`/api/tasks/${t.id}`, "DELETE").then((ok) => ok && (toast("Deleted → Trash"), onClose(), refresh())); }} className="rounded-[9px] border border-line px-3.5 py-1.5 text-[12px] font-semibold text-[#c23b2a] hover:border-[#c23b2a]">🗑 Delete task</button></div>}
      </div>
    </div>
  );
}

function AssignForm({ members, current, onCancel, onSave }: { members: Member[]; current: string | null; onCancel: () => void; onSave: (assigneeId: string, date: string) => void }) {
  const [who, setWho] = useState(current ?? members[0]?.id ?? "");
  const [date, setDate] = useState("");
  return (
    <div className="flex flex-wrap items-center gap-2">
      <select value={who} onChange={(e) => setWho(e.target.value)} className="rounded-[8px] border border-line bg-card px-2 py-1.5 text-[12px] text-ink outline-none focus:border-teal">
        {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
      </select>
      <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-[8px] border border-line bg-card px-2 py-1.5 text-[12px] text-ink outline-none focus:border-teal" />
      <button onClick={() => onSave(who, date)} className="btn-premium rounded-[8px] px-3 py-1.5 text-[11.5px] font-semibold">Save</button>
      <button onClick={onCancel} className="px-2 py-1.5 text-[11.5px] font-semibold text-slate">Cancel</button>
    </div>
  );
}

// ── Create / edit form ───────────────────────────────────────────────────────
function TaskForm({ task, channels, accounts, onClose, onSaved, api, toast }: { task: TaskRow | null; channels: Opt[]; accounts: Opt[]; onClose: () => void; onSaved: () => void; api: (u: string, m: string, b?: unknown) => Promise<boolean>; toast: (m: string) => void }) {
  const [type, setType] = useState(task?.contentType ?? TASK_CONTENT_TYPES[0].key);
  const [title, setTitle] = useState(task?.title ?? "");
  const [brief, setBrief] = useState(task?.brief ?? "");
  const [content, setContent] = useState(task?.content ?? "");
  const [remarks, setRemarks] = useState(task?.remarks ?? "");
  const [week, setWeek] = useState(task?.weekLabel ?? "");
  const [channelId, setChannelId] = useState(task?.channel?.id ?? "");
  const [accountId, setAccountId] = useState(task?.account?.id ?? "");
  const [saving, setSaving] = useState(false);
  const cls = "w-full rounded-[9px] border border-line bg-card px-3 py-2.5 text-[13px] text-ink outline-none focus:border-teal";
  const lab = "text-[11.5px] font-semibold text-slate";

  async function save() {
    if (!title.trim() || saving) return;
    setSaving(true);
    const body = { title: title.trim(), brief: brief.trim(), content: content.trim(), remarks: remarks.trim(), contentType: type, channelId: channelId || null, accountId: accountId || null, weekLabel: week.trim() };
    const ok = await api(task ? `/api/tasks/${task.id}` : "/api/tasks", task ? "PATCH" : "POST", body);
    setSaving(false);
    if (ok) { toast(task ? "Changes saved" : "Task created — now assign each stage"); onSaved(); }
  }
  const stages = stagesForType(type);

  return (
    <div onClick={onClose} className="fixed inset-0 z-[80] grid place-items-center bg-black/50 p-5 backdrop-blur-[3px]">
      <div onClick={(e) => e.stopPropagation()} className="max-h-[90vh] w-[min(520px,96vw)] overflow-y-auto rounded-xl2 border border-line bg-card p-6 shadow-card">
        <div className="mb-1 flex items-center justify-between"><h2 className="font-display text-[18px]">{task ? "Edit content" : "Plan content"}</h2><button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full text-slate hover:bg-wash/[0.06]">✕</button></div>
        <p className="mb-4 text-[12px] text-slate">Classify the piece — its production stages are set from the content type — then write the theme, brief and content.</p>
        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <label className={lab}>Content type<select value={type} onChange={(e) => setType(e.target.value)} className={cls + " mt-1"}>{TASK_CONTENT_TYPES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}</select></label>
            <label className={lab}>Week<input value={week} onChange={(e) => setWeek(e.target.value)} placeholder="e.g. July W2" className={cls + " mt-1 font-normal"} /></label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className={lab}>Platform<select value={channelId} onChange={(e) => setChannelId(e.target.value)} className={cls + " mt-1"}><option value="">—</option>{channels.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
            <label className={lab}>Account<select value={accountId} onChange={(e) => setAccountId(e.target.value)} className={cls + " mt-1"}><option value="">—</option>{accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
          </div>
          <div className="text-[12px] text-slate">Stages: <b className="text-teal-dark">{stages.map((s) => STAGE_LABELS[s]).join(" → ")} → Publishing → Analytics</b></div>
          <label className={lab}>Content theme<input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} className={cls + " mt-1 font-normal"} /></label>
          <label className={lab}>Content brief<input value={brief} onChange={(e) => setBrief(e.target.value)} className={cls + " mt-1 font-normal"} /></label>
          <label className={lab}>Content (draft)<textarea value={content} onChange={(e) => setContent(e.target.value)} className={cls + " mt-1 min-h-[80px] resize-y font-normal"} /></label>
          <label className={lab}>Remarks<input value={remarks} onChange={(e) => setRemarks(e.target.value)} className={cls + " mt-1 font-normal"} /></label>
          <div className="flex justify-end gap-2"><button onClick={onClose} className="px-3 py-2 text-[12.5px] font-semibold text-slate">Cancel</button><button onClick={save} disabled={!title.trim() || saving} className="btn-premium rounded-[10px] px-4 py-2 text-[12.5px] font-semibold disabled:opacity-50">{saving ? "Saving…" : task ? "Save changes" : "Create task"}</button></div>
        </div>
      </div>
    </div>
  );
}

function Kpi({ v, l }: { v: number | string; l: string }) {
  return (
    <div className="rounded-card border border-line bg-card p-4 shadow-soft">
      <div className="font-display text-[24px] font-bold">{v}</div>
      <div className="text-[11.5px] text-slate">{l}</div>
    </div>
  );
}
function Empty({ text }: { text: string }) {
  return <div className="grid place-items-center py-20 text-center text-[13px] text-slate">{text}</div>;
}
function av(name: string, color: string | null) {
  return <span className="grid h-[18px] w-[18px] place-items-center rounded-full text-[9px] font-bold text-white" style={{ background: color ?? "#889" }}>{initials(name)}</span>;
}
function fmt(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
function nextWork(w: string): TaskWorkStatus {
  const cyc: TaskWorkStatus[] = ["WIP_ON_TRACK", "WIP_DELAY", "COMPLETED_ON_TIME", "COMPLETED_DELAY"];
  const i = cyc.indexOf(w as TaskWorkStatus);
  return cyc[(i + 1) % cyc.length];
}
