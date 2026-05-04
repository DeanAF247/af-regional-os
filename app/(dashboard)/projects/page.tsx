"use client";

import { useState, useEffect, useCallback, Fragment } from "react";
import PageHeader from "@/components/page-header";
import {
  Plus, X, ChevronDown, Calendar, Circle, CheckCircle2, Clock,
  AlertCircle, Pencil, Trash2, ListChecks, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

type Priority = "Critical" | "High" | "Medium" | "Low";
type Status   = "Not Started" | "In Progress" | "Review" | "Blocked" | "Done";

interface Task {
  id:      string;
  text:    string;
  done:    boolean;
  dueDate: string;
}

interface Project {
  id:       string;
  name:     string;
  owner:    string;
  status:   Status;
  priority: Priority;
  dueDate:  string;
  club:     string;
  notes:    string;
  tasks:    Task[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<Status, { color: string; bg: string; icon: React.ReactNode }> = {
  "Not Started": { color: "text-[#64748B]", bg: "bg-[#1A1F35] border border-[#252B45]",          icon: <Circle size={13} /> },
  "In Progress": { color: "text-[#60A5FA]", bg: "bg-[#1E3A5F] border border-[#3B82F6]/40",       icon: <Clock size={13} /> },
  "Review":      { color: "text-[#FBBF24]", bg: "bg-[#3B2A0A] border border-[#F59E0B]/40",       icon: <AlertCircle size={13} /> },
  "Blocked":     { color: "text-[#F87171]", bg: "bg-[#3B0A0A] border border-[#EF4444]/40",        icon: <AlertCircle size={13} /> },
  "Done":        { color: "text-[#34D399]", bg: "bg-[#0A3B2A] border border-[#10B981]/40",        icon: <CheckCircle2 size={13} /> },
};

const PRIORITY_CONFIG: Record<Priority, { color: string; dot: string }> = {
  "Critical": { color: "text-[#F87171]", dot: "bg-[#EF4444]" },
  "High":     { color: "text-[#FB923C]", dot: "bg-[#F97316]" },
  "Medium":   { color: "text-[#FBBF24]", dot: "bg-[#F59E0B]" },
  "Low":      { color: "text-[#94A3B8]", dot: "bg-[#64748B]" },
};

const CLUBS      = ["All Clubs","Greenhills","Thornton","Newcastle West","Kotara","Edgeworth","Lake Haven","Group"];
const STATUSES: Status[]   = ["Not Started","In Progress","Review","Blocked","Done"];
const PRIORITIES: Priority[] = ["Critical","High","Medium","Low"];

const INITIAL_PROJECTS: Project[] = [
  {
    id: "1", name: "Q2 Marketing Campaign Launch", owner: "Dean",
    status: "In Progress", priority: "High", dueDate: "2026-05-31",
    club: "Group", notes: "Coordinating across all 6 clubs",
    tasks: [
      { id: "t1", text: "Brief all club managers", done: true,  dueDate: "" },
      { id: "t2", text: "Design social assets",    done: true,  dueDate: "" },
      { id: "t3", text: "Schedule paid ads",       done: false, dueDate: "2026-05-10" },
      { id: "t4", text: "Review week 1 results",   done: false, dueDate: "2026-05-15" },
    ],
  },
  {
    id: "2", name: "Lakehaven Presale Setup", owner: "Dean",
    status: "In Progress", priority: "Critical", dueDate: "2026-05-15",
    club: "Lake Haven", notes: "Presale leads pipeline and CRM setup",
    tasks: [
      { id: "t5", text: "Set up CRM pipeline",    done: true,  dueDate: "" },
      { id: "t6", text: "Build lead capture page", done: false, dueDate: "2026-05-08" },
      { id: "t7", text: "Train front desk staff",  done: false, dueDate: "2026-05-12" },
    ],
  },
  {
    id: "3", name: "SOP Review — Membership", owner: "Dean",
    status: "Not Started", priority: "Medium", dueDate: "2026-06-30",
    club: "Group", notes: "",
    tasks: [],
  },
  {
    id: "4", name: "Staff Onboarding — Kotara", owner: "Dean",
    status: "Review", priority: "Medium", dueDate: "2026-05-20",
    club: "Kotara", notes: "2 new PTs starting",
    tasks: [
      { id: "t8", text: "Send welcome pack",   done: true,  dueDate: "" },
      { id: "t9", text: "Schedule inductions", done: true,  dueDate: "" },
      { id: "t10", text: "Complete HR forms",  done: false, dueDate: "2026-05-18" },
    ],
  },
  {
    id: "5", name: "Vendor Contract Renewal", owner: "Dean",
    status: "Not Started", priority: "Low", dueDate: "2026-07-01",
    club: "Group", notes: "Review all vendor agreements",
    tasks: [],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(d: string) {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

function isOverdue(p: Project) {
  return p.dueDate && new Date(p.dueDate) < new Date() && p.status !== "Done";
}

function taskProgress(tasks: Task[]) {
  if (!tasks.length) return null;
  const done = tasks.filter((t) => t.done).length;
  return { done, total: tasks.length, pct: Math.round((done / tasks.length) * 100) };
}

// ─── Small shared components ──────────────────────────────────────────────────

function StatusBadge({ status }: { status: Status }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] font-semibold", cfg.bg, cfg.color)}>
      {cfg.icon}{status}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: Priority }) {
  const cfg = PRIORITY_CONFIG[priority];
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[12px] font-semibold", cfg.color)}>
      <span className={cn("w-2 h-2 rounded-full flex-shrink-0", cfg.dot)} />{priority}
    </span>
  );
}

function SelectField<T extends string>({
  value, onChange, options, className,
}: { value: T; onChange: (v: T) => void; options: T[]; className?: string }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className={cn(
          "appearance-none bg-[#1A1F35] border border-[#252B45] text-[#F1F5F9] text-sm rounded-lg px-3 py-2 pr-8 focus:outline-none focus:border-[#7C3AED] cursor-pointer",
          className,
        )}
      >
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
      <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#64748B] pointer-events-none" />
    </div>
  );
}

// ─── Project add/edit modal ───────────────────────────────────────────────────

type ModalMode = { type: "add" } | { type: "edit"; project: Project };

function ProjectModal({ mode, onSave, onClose }: {
  mode: ModalMode; onSave: (p: Project) => void; onClose: () => void;
}) {
  const initial: Project = mode.type === "edit" ? mode.project : {
    id: crypto.randomUUID(), name: "", owner: "", status: "Not Started",
    priority: "Medium", dueDate: "", club: "Group", notes: "", tasks: [],
  };
  const [form, setForm] = useState<Project>(initial);

  const field = (key: keyof Project) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-[#131729] border border-[#252B45] rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#252B45]">
          <h2 className="text-[#F1F5F9] font-bold text-[15px]">
            {mode.type === "add" ? "New Project" : "Edit Project"}
          </h2>
          <button onClick={onClose} className="text-[#64748B] hover:text-[#F1F5F9] transition-colors"><X size={18} /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-[#94A3B8] text-[11px] font-semibold uppercase tracking-wide mb-1.5">Project Name *</label>
            <input value={form.name} onChange={field("name")} placeholder="e.g. Q2 Campaign Launch"
              className="w-full bg-[#1A1F35] border border-[#252B45] text-[#F1F5F9] text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#7C3AED] placeholder:text-[#334155]" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[#94A3B8] text-[11px] font-semibold uppercase tracking-wide mb-1.5">Owner</label>
              <input value={form.owner} onChange={field("owner")} placeholder="e.g. Dean"
                className="w-full bg-[#1A1F35] border border-[#252B45] text-[#F1F5F9] text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#7C3AED] placeholder:text-[#334155]" />
            </div>
            <div>
              <label className="block text-[#94A3B8] text-[11px] font-semibold uppercase tracking-wide mb-1.5">Due Date</label>
              <input type="date" value={form.dueDate} onChange={field("dueDate")}
                className="w-full bg-[#1A1F35] border border-[#252B45] text-[#F1F5F9] text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#7C3AED]" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-[#94A3B8] text-[11px] font-semibold uppercase tracking-wide mb-1.5">Status</label>
              <SelectField value={form.status} onChange={(v) => setForm((f) => ({ ...f, status: v }))} options={STATUSES} className="w-full" />
            </div>
            <div>
              <label className="block text-[#94A3B8] text-[11px] font-semibold uppercase tracking-wide mb-1.5">Priority</label>
              <SelectField value={form.priority} onChange={(v) => setForm((f) => ({ ...f, priority: v }))} options={PRIORITIES} className="w-full" />
            </div>
            <div>
              <label className="block text-[#94A3B8] text-[11px] font-semibold uppercase tracking-wide mb-1.5">Club</label>
              <SelectField value={form.club as any} onChange={(v) => setForm((f) => ({ ...f, club: v }))}
                options={CLUBS.filter((c) => c !== "All Clubs") as any} className="w-full" />
            </div>
          </div>
          <div>
            <label className="block text-[#94A3B8] text-[11px] font-semibold uppercase tracking-wide mb-1.5">Notes</label>
            <textarea value={form.notes} onChange={field("notes")} rows={2} placeholder="Optional notes..."
              className="w-full bg-[#1A1F35] border border-[#252B45] text-[#F1F5F9] text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#7C3AED] placeholder:text-[#334155] resize-none" />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-[#252B45] flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-[#94A3B8] hover:text-[#F1F5F9] transition-colors">Cancel</button>
          <button
            onClick={() => { if (form.name.trim()) { onSave(form); onClose(); } }}
            disabled={!form.name.trim()}
            className="px-5 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors"
          >
            {mode.type === "add" ? "Add Project" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Task row ─────────────────────────────────────────────────────────────────

function TaskRow({ task, onToggle, onDelete }: {
  task: Task;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const taskOverdue = task.dueDate && !task.done && new Date(task.dueDate) < new Date();

  return (
    <div className={cn(
      "flex items-start gap-3 px-3 py-2.5 rounded-xl border group transition-all duration-150",
      task.done
        ? "bg-[#0D1120] border-[#1A1F35]"
        : "bg-[#131729] border-[#252B45] hover:border-[#334155]",
    )}>
      <button onClick={() => onToggle(task.id)} className="flex-shrink-0 mt-0.5">
        {task.done
          ? <CheckCircle2 size={16} className="text-[#10B981]" />
          : <Circle size={16} className="text-[#334155] hover:text-[#7C3AED] transition-colors" />
        }
      </button>
      <div className="flex-1 min-w-0">
        <p className={cn("text-[13px] leading-snug", task.done ? "line-through text-[#475569]" : "text-[#F1F5F9]")}>
          {task.text}
        </p>
        {task.dueDate && (
          <p className={cn("text-[11px] mt-0.5", taskOverdue ? "text-[#F87171]" : "text-[#475569]")}>
            <Calendar size={10} className="inline mr-1" />
            {formatDate(task.dueDate)}
            {taskOverdue && " · Overdue"}
          </p>
        )}
      </div>
      <button
        onClick={() => onDelete(task.id)}
        className="flex-shrink-0 opacity-0 group-hover:opacity-100 p-1 text-[#475569] hover:text-[#EF4444] transition-all"
      >
        <Trash2 size={12} />
      </button>
    </div>
  );
}

// ─── Inline tasks panel ───────────────────────────────────────────────────────

function InlineTasks({ project, onUpdateTasks }: {
  project: Project;
  onUpdateTasks: (projectId: string, tasks: Task[]) => void;
}) {
  const [newTaskText, setNewTaskText] = useState("");
  const [newTaskDue,  setNewTaskDue]  = useState("");

  function addTask() {
    if (!newTaskText.trim()) return;
    const task: Task = { id: crypto.randomUUID(), text: newTaskText.trim(), done: false, dueDate: newTaskDue };
    onUpdateTasks(project.id, [...project.tasks, task]);
    setNewTaskText("");
    setNewTaskDue("");
  }

  function toggleTask(id: string) {
    onUpdateTasks(project.id, project.tasks.map((t) => t.id === id ? { ...t, done: !t.done } : t));
  }

  function deleteTask(id: string) {
    onUpdateTasks(project.id, project.tasks.filter((t) => t.id !== id));
  }

  const prog      = taskProgress(project.tasks);
  const pending   = project.tasks.filter((t) => !t.done);
  const completed = project.tasks.filter((t) => t.done);

  return (
    <div className="space-y-3">
      {/* Progress bar */}
      {prog && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5 text-[#94A3B8] text-[11px] font-semibold">
              <ListChecks size={13} /> Tasks
            </div>
            <span className="text-[11px] font-semibold text-[#64748B]">
              <span className="text-[#34D399]">{prog.done}</span> / {prog.total} done
            </span>
          </div>
          <div className="h-1.5 bg-[#252B45] rounded-full overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all duration-500", prog.pct === 100 ? "bg-[#10B981]" : "bg-[#7C3AED]")}
              style={{ width: `${prog.pct}%` }}
            />
          </div>
        </div>
      )}

      {/* Add task input */}
      <div className="flex items-center gap-2">
        <input
          value={newTaskText}
          onChange={(e) => setNewTaskText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addTask()}
          placeholder="Add a task… (press Enter)"
          className="flex-1 bg-[#1A1F35] border border-[#252B45] text-[#F1F5F9] text-[12px] rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#7C3AED] placeholder:text-[#334155]"
        />
        <input
          type="date"
          value={newTaskDue}
          onChange={(e) => setNewTaskDue(e.target.value)}
          className="bg-[#1A1F35] border border-[#252B45] text-[#94A3B8] text-[12px] rounded-lg px-2 py-1.5 focus:outline-none focus:border-[#7C3AED] w-36"
        />
        <button
          onClick={addTask}
          disabled={!newTaskText.trim()}
          className="flex items-center gap-1 px-2.5 py-1.5 bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-40 disabled:cursor-not-allowed text-white text-[12px] font-semibold rounded-lg transition-colors flex-shrink-0"
        >
          <Plus size={12} /> Add
        </button>
      </div>

      {/* Pending tasks */}
      {pending.length > 0 && (
        <div className="space-y-1.5">
          {pending.map((task) => <TaskRow key={task.id} task={task} onToggle={toggleTask} onDelete={deleteTask} />)}
        </div>
      )}

      {/* Completed tasks */}
      {completed.length > 0 && (
        <div>
          <div className="text-[#475569] text-[10px] font-semibold uppercase tracking-widest mb-1.5">
            Completed · {completed.length}
          </div>
          <div className="space-y-1.5">
            {completed.map((task) => <TaskRow key={task.id} task={task} onToggle={toggleTask} onDelete={deleteTask} />)}
          </div>
        </div>
      )}

      {project.tasks.length === 0 && (
        <div className="flex flex-col items-center justify-center py-4 text-center text-[#334155]">
          <ListChecks size={22} className="mb-1.5 opacity-40" />
          <p className="text-[12px]">No tasks yet — add one above</p>
        </div>
      )}
    </div>
  );
}

// ─── Task progress pill for cards/rows ───────────────────────────────────────

function TaskPill({ tasks }: { tasks: Task[] }) {
  if (!tasks.length) return null;
  const done  = tasks.filter((t) => t.done).length;
  const total = tasks.length;
  const pct   = Math.round((done / total) * 100);
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex-1 h-1 bg-[#252B45] rounded-full overflow-hidden w-12">
        <div
          className={cn("h-full rounded-full", pct === 100 ? "bg-[#10B981]" : "bg-[#7C3AED]")}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={cn("text-[10px] font-semibold tabular-nums", pct === 100 ? "text-[#34D399]" : "text-[#64748B]")}>
        {done}/{total}
      </span>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

const STORAGE_KEY = "af_projects_v1";

export default function ProjectsPage() {
  const [projects,       setProjects]       = useState<Project[]>(INITIAL_PROJECTS);
  const [modal,          setModal]          = useState<ModalMode | null>(null);
  const [expandedId,     setExpandedId]     = useState<string | null>(null);
  const [filterStatus,   setFilterStatus]   = useState<Status | "All">("All");
  const [filterClub,     setFilterClub]     = useState("All Clubs");
  const [filterPriority, setFilterPriority] = useState<Priority | "All">("All");

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setProjects(JSON.parse(stored));
    } catch {}
  }, []);

  // Persist to localStorage whenever projects change
  const persist = useCallback((updated: Project[]) => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch {}
  }, []);

  function saveProject(p: Project) {
    setProjects((prev) => {
      const idx = prev.findIndex((x) => x.id === p.id);
      const updated = idx >= 0
        ? prev.map((x, i) => i === idx ? p : x)
        : [...prev, p];
      persist(updated);
      return updated;
    });
  }

  function deleteProject(id: string) {
    if (expandedId === id) setExpandedId(null);
    setProjects((prev) => {
      const updated = prev.filter((p) => p.id !== id);
      persist(updated);
      return updated;
    });
  }

  function updateTasks(projectId: string, tasks: Task[]) {
    setProjects((prev) => {
      const updated = prev.map((p) => p.id === projectId ? { ...p, tasks } : p);
      persist(updated);
      return updated;
    });
  }

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  const filtered = projects.filter((p) => {
    if (filterStatus   !== "All"       && p.status   !== filterStatus)   return false;
    if (filterClub     !== "All Clubs" && p.club     !== filterClub)     return false;
    if (filterPriority !== "All"       && p.priority !== filterPriority) return false;
    return true;
  });

  const statusGroups = STATUSES.map((s) => ({ status: s, items: filtered.filter((p) => p.status === s) }));

  const counts = {
    total:   projects.length,
    done:    projects.filter((p) => p.status === "Done").length,
    blocked: projects.filter((p) => p.status === "Blocked").length,
    overdue: projects.filter((p) => p.dueDate && new Date(p.dueDate) < new Date() && p.status !== "Done").length,
  };

  return (
    <div>
      <PageHeader
        title="Projects"
        subtitle="Track active projects and initiatives across the region"
        action={
          <button
            onClick={() => setModal({ type: "add" })}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-sm font-semibold rounded-lg transition-colors"
          >
            <Plus size={16} />
            New Project
          </button>
        }
      />

      {/* Summary chips */}
      <div className="flex flex-wrap gap-3 mb-6">
        {[
          { label: "Total",   value: counts.total,   color: "text-[#A78BFA]", bg: "bg-[#3B1F7A]/30 border border-[#7C3AED]/30" },
          { label: "Done",    value: counts.done,    color: "text-[#34D399]", bg: "bg-[#0A3B2A]/40 border border-[#10B981]/30" },
          { label: "Blocked", value: counts.blocked, color: "text-[#F87171]", bg: "bg-[#3B0A0A]/40 border border-[#EF4444]/30" },
          { label: "Overdue", value: counts.overdue, color: "text-[#FBBF24]", bg: "bg-[#3B2A0A]/40 border border-[#F59E0B]/30" },
        ].map((chip) => (
          <div key={chip.label} className={cn("flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold", chip.bg)}>
            <span className={chip.color}>{chip.value}</span>
            <span className="text-[#64748B]">{chip.label}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <SelectField value={filterStatus}   onChange={setFilterStatus}   options={["All", ...STATUSES] as any}   className="text-[13px]" />
        <SelectField value={filterPriority} onChange={setFilterPriority} options={["All", ...PRIORITIES] as any} className="text-[13px]" />
        <SelectField value={filterClub}     onChange={setFilterClub}     options={CLUBS as any}                  className="text-[13px]" />
      </div>

      {/* Kanban board */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {statusGroups.map(({ status, items }) => {
          const cfg = STATUS_CONFIG[status];
          return (
            <div key={status} className="flex flex-col min-h-[200px]">
              <div className={cn("flex items-center gap-2 px-3 py-2 rounded-t-xl border-b border-[#252B45]", cfg.bg)}>
                <span className={cn("flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wider", cfg.color)}>
                  {cfg.icon}{status}
                </span>
                <span className="ml-auto text-[11px] font-semibold text-[#64748B] bg-[#252B45] rounded-full px-2 py-0.5">
                  {items.length}
                </span>
              </div>
              <div className="flex-1 bg-[#0D1120] rounded-b-xl border border-t-0 border-[#252B45] p-2 space-y-2 min-h-[120px]">
                {items.length === 0 && (
                  <div className="flex items-center justify-center h-16 text-[#334155] text-[12px]">No projects</div>
                )}
                {items.map((p) => {
                  const isExpanded = expandedId === p.id;
                  return (
                    <div
                      key={p.id}
                      className={cn(
                        "bg-[#131729] border rounded-xl p-3 group transition-all duration-150",
                        isExpanded ? "border-[#7C3AED]" : "border-[#252B45] hover:border-[#3B2D6A]",
                      )}
                    >
                      {/* Card header — click to expand */}
                      <div
                        className="cursor-pointer"
                        onClick={() => toggleExpand(p.id)}
                      >
                        <div className="flex items-start justify-between gap-1 mb-2">
                          <p className="text-[#F1F5F9] text-[13px] font-semibold leading-tight">{p.name}</p>
                          <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                            <button onClick={() => setModal({ type: "edit", project: p })} className="p-1 text-[#64748B] hover:text-[#A78BFA] transition-colors opacity-0 group-hover:opacity-100">
                              <Pencil size={12} />
                            </button>
                            <button onClick={() => deleteProject(p.id)} className="p-1 text-[#64748B] hover:text-[#EF4444] transition-colors opacity-0 group-hover:opacity-100">
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <PriorityBadge priority={p.priority} />
                            <span className={cn(
                              "text-[11px] rounded px-1.5 py-0.5",
                              p.club === "Group" ? "text-[#A78BFA] bg-[#3B1F7A]/30" : "text-[#64748B] bg-[#1A1F35]",
                            )}>
                              {p.club}
                            </span>
                          </div>
                          {p.dueDate && (
                            <div className={cn("flex items-center gap-1.5 text-[11px]", isOverdue(p) ? "text-[#F87171]" : "text-[#64748B]")}>
                              <Calendar size={11} />
                              {formatDate(p.dueDate)}
                              {isOverdue(p) && <span className="font-semibold">· Overdue</span>}
                            </div>
                          )}
                          {p.owner && (
                            <div className="flex items-center gap-1.5">
                              <div className="w-4 h-4 rounded-full bg-[#7C3AED]/40 border border-[#7C3AED]/60 flex items-center justify-center">
                                <span className="text-[#A78BFA] text-[8px] font-bold">{p.owner[0].toUpperCase()}</span>
                              </div>
                              <span className="text-[11px] text-[#64748B]">{p.owner}</span>
                            </div>
                          )}
                          <TaskPill tasks={p.tasks} />
                        </div>
                      </div>

                      {/* Inline tasks — shown when expanded */}
                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t border-[#252B45]">
                          <InlineTasks project={p} onUpdateTasks={updateTasks} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Table view */}
      <div className="mt-8">
        <div className="text-[#94A3B8] text-[11px] font-semibold uppercase tracking-widest mb-3">All Projects · Table View</div>
        <div className="bg-[#131729] border border-[#252B45] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#1A1F35] text-[#94A3B8] text-[11px] uppercase tracking-wide">
                  <th className="text-left px-4 py-3 font-semibold">Project</th>
                  <th className="text-left px-4 py-3 font-semibold">Status</th>
                  <th className="text-left px-4 py-3 font-semibold">Priority</th>
                  <th className="text-left px-4 py-3 font-semibold">Club</th>
                  <th className="text-left px-4 py-3 font-semibold">Due Date</th>
                  <th className="text-left px-4 py-3 font-semibold">Tasks</th>
                  <th className="text-left px-4 py-3 font-semibold">Owner</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const prog       = taskProgress(p.tasks);
                  const isExpanded = expandedId === p.id;
                  return (
                    <Fragment key={p.id}>
                      <tr
                        onClick={() => toggleExpand(p.id)}
                        className={cn(
                          "border-t border-[#252B45]/60 transition-colors cursor-pointer group",
                          isExpanded ? "bg-[#1A1F35]" : "hover:bg-[#1A1F35]/50",
                        )}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <ChevronRight size={13} className={cn("text-[#334155] transition-transform flex-shrink-0", isExpanded && "rotate-90 text-[#A78BFA]")} />
                            <div>
                              <div className="text-[#F1F5F9] font-semibold">{p.name}</div>
                              {p.notes && <div className="text-[#475569] text-[11px] mt-0.5 truncate max-w-xs">{p.notes}</div>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                        <td className="px-4 py-3"><PriorityBadge priority={p.priority} /></td>
                        <td className="px-4 py-3 text-[#94A3B8] text-[13px]">{p.club}</td>
                        <td className={cn("px-4 py-3 text-[13px]", isOverdue(p) ? "text-[#F87171] font-semibold" : "text-[#94A3B8]")}>
                          {formatDate(p.dueDate)}
                          {isOverdue(p) && <span className="ml-1 text-[10px]">⚠</span>}
                        </td>
                        <td className="px-4 py-3">
                          {prog ? (
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-1.5 bg-[#252B45] rounded-full overflow-hidden">
                                <div
                                  className={cn("h-full rounded-full", prog.pct === 100 ? "bg-[#10B981]" : "bg-[#7C3AED]")}
                                  style={{ width: `${prog.pct}%` }}
                                />
                              </div>
                              <span className={cn("text-[12px] font-semibold tabular-nums", prog.pct === 100 ? "text-[#34D399]" : "text-[#64748B]")}>
                                {prog.done}/{prog.total}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[#334155] text-[12px]">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-[#94A3B8] text-[13px]">{p.owner || "—"}</td>
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => setModal({ type: "edit", project: p })} className="p-1.5 text-[#64748B] hover:text-[#A78BFA] hover:bg-[#1A1F35] rounded-lg transition-colors">
                              <Pencil size={13} />
                            </button>
                            <button onClick={() => deleteProject(p.id)} className="p-1.5 text-[#64748B] hover:text-[#EF4444] hover:bg-[#1A1F35] rounded-lg transition-colors">
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Inline task expansion row */}
                      {isExpanded && (
                        <tr className="border-t border-[#7C3AED]/30 bg-[#0D1120]">
                          <td colSpan={8} className="px-6 py-4">
                            <InlineTasks project={p} onUpdateTasks={updateTasks} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-[#64748B] text-sm">
                      No projects match the current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Project add/edit modal */}
      {modal && (
        <ProjectModal
          mode={modal}
          onSave={saveProject}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
