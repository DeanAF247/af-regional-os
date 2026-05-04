"use client";

import { useState, useEffect, useCallback, Fragment } from "react";
import PageHeader from "@/components/page-header";
import {
  Plus, X, ChevronDown, Calendar, Circle, CheckCircle2, Clock,
  AlertCircle, Pencil, Trash2, ListChecks, ChevronRight, Link2,
  ExternalLink, Save,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Priority = "Critical" | "High" | "Medium" | "Low";
type Status   = "Not Started" | "In Progress" | "Review" | "Blocked" | "Done";

interface TaskLink { id: string; label: string; url: string; }
interface Task { id: string; text: string; done: boolean; dueDate: string; links: TaskLink[]; }
interface Project { id: string; name: string; owner: string; status: Status; priority: Priority; dueDate: string; club: string; notes: string; tasks: Task[]; }

const STATUS_CONFIG: Record<Status, { color: string; bg: string; icon: React.ReactNode }> = {
  "Not Started": { color: "text-[#64748B]", bg: "bg-[#F8FAFC] border border-[#E2E8F0]",       icon: <Circle size={13} /> },
  "In Progress": { color: "text-[#2563EB]", bg: "bg-[#DBEAFE] border border-[#3B82F6]/40",    icon: <Clock size={13} /> },
  "Review":      { color: "text-[#D97706]", bg: "bg-[#FFFBEB] border border-[#D97706]/40",    icon: <AlertCircle size={13} /> },
  "Blocked":     { color: "text-[#DC2626]", bg: "bg-[#FEF2F2] border border-[#EF4444]/40",    icon: <AlertCircle size={13} /> },
  "Done":        { color: "text-[#059669]", bg: "bg-[#F0FDF4] border border-[#059669]/40",    icon: <CheckCircle2 size={13} /> },
};
const PRIORITY_CONFIG: Record<Priority, { color: string; dot: string }> = {
  "Critical": { color: "text-[#DC2626]", dot: "bg-[#EF4444]" },
  "High":     { color: "text-[#EA580C]", dot: "bg-[#EA580C]" },
  "Medium":   { color: "text-[#D97706]", dot: "bg-[#D97706]" },
  "Low":      { color: "text-[#64748B]", dot: "bg-[#94A3B8]" },
};
const CLUBS      = ["All Clubs","Greenhills","Thornton","Newcastle West","Kotara","Edgeworth","Lake Haven","Toukley","Group"];
const STATUSES: Status[]    = ["Not Started","In Progress","Review","Blocked","Done"];
const PRIORITIES: Priority[] = ["Critical","High","Medium","Low"];

const INITIAL_PROJECTS: Project[] = [
  { id:"1", name:"Q2 Marketing Campaign Launch", owner:"Dean", status:"In Progress", priority:"High", dueDate:"2026-05-31", club:"Group", notes:"Coordinating across all clubs",
    tasks:[{id:"t1",text:"Brief all club managers",done:true,dueDate:"",links:[]},{id:"t2",text:"Design social assets",done:true,dueDate:"",links:[]},{id:"t3",text:"Schedule paid ads",done:false,dueDate:"2026-05-10",links:[]},{id:"t4",text:"Review week 1 results",done:false,dueDate:"2026-05-15",links:[]}]},
  { id:"2", name:"Lakehaven Presale Setup", owner:"Dean", status:"In Progress", priority:"Critical", dueDate:"2026-05-15", club:"Lake Haven", notes:"Presale leads pipeline and CRM setup",
    tasks:[{id:"t5",text:"Set up CRM pipeline",done:true,dueDate:"",links:[]},{id:"t6",text:"Build lead capture page",done:false,dueDate:"2026-05-08",links:[]},{id:"t7",text:"Train front desk staff",done:false,dueDate:"2026-05-12",links:[]}]},
  { id:"3", name:"SOP Review — Membership", owner:"Dean", status:"Not Started", priority:"Medium", dueDate:"2026-06-30", club:"Group", notes:"", tasks:[] },
  { id:"4", name:"Staff Onboarding — Kotara", owner:"Dean", status:"Review", priority:"Medium", dueDate:"2026-05-20", club:"Kotara", notes:"2 new PTs starting",
    tasks:[{id:"t8",text:"Send welcome pack",done:true,dueDate:"",links:[]},{id:"t9",text:"Schedule inductions",done:true,dueDate:"",links:[]},{id:"t10",text:"Complete HR forms",done:false,dueDate:"2026-05-18",links:[]}]},
  { id:"5", name:"Vendor Contract Renewal", owner:"Dean", status:"Not Started", priority:"Low", dueDate:"2026-07-01", club:"Group", notes:"Review all vendor agreements", tasks:[] },
];

function formatDate(d: string) {
  if (!d) return "—";
  return new Date(d+"T00:00:00").toLocaleDateString("en-AU",{day:"numeric",month:"short",year:"numeric"});
}
function isOverdue(p: Project) { return p.dueDate && new Date(p.dueDate) < new Date() && p.status !== "Done"; }
function taskProgress(tasks: Task[]) {
  if (!tasks.length) return null;
  const done = tasks.filter(t => t.done).length;
  return { done, total: tasks.length, pct: Math.round((done / tasks.length) * 100) };
}
function getLinkIcon(url: string) {
  if (url.includes("docs.google.com/spreadsheets") || url.includes("sheets.google.com")) return "📊";
  if (url.includes("figma.com")) return "🎨";
  if (url.includes("docs.google.com")) return "📄";
  if (url.includes("drive.google.com")) return "📁";
  if (url.includes("notion.so") || url.includes("notion.com")) return "📝";
  if (url.includes("slack.com")) return "💬";
  if (url.includes("github.com")) return "💻";
  return "🔗";
}

function StatusBadge({ status }: { status: Status }) {
  const cfg = STATUS_CONFIG[status];
  return <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] font-semibold", cfg.bg, cfg.color)}>{cfg.icon}{status}</span>;
}
function PriorityBadge({ priority }: { priority: Priority }) {
  const cfg = PRIORITY_CONFIG[priority];
  return <span className={cn("inline-flex items-center gap-1.5 text-[12px] font-semibold", cfg.color)}><span className={cn("w-2 h-2 rounded-full flex-shrink-0", cfg.dot)}/>{priority}</span>;
}
function SelectField<T extends string>({ value, onChange, options, className }: { value: T; onChange: (v: T) => void; options: T[]; className?: string }) {
  return (
    <div className="relative">
      <select value={value} onChange={e => onChange(e.target.value as T)}
        className={cn("appearance-none bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A] text-sm rounded-lg px-3 py-2 pr-8 focus:outline-none focus:border-[#7C3AED] cursor-pointer", className)}>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none"/>
    </div>
  );
}

// ─── Project modal ────────────────────────────────────────────────────────────
type ModalMode = { type: "add" } | { type: "edit"; project: Project };

function ProjectModal({ mode, onSave, onClose }: { mode: ModalMode; onSave: (p: Project) => void; onClose: () => void }) {
  const initial: Project = mode.type === "edit" ? mode.project : { id: crypto.randomUUID(), name: "", owner: "", status: "Not Started", priority: "Medium", dueDate: "", club: "Group", notes: "", tasks: [] };
  const [form, setForm] = useState<Project>(initial);
  const field = (key: keyof Project) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm(f => ({ ...f, [key]: e.target.value }));
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl w-full max-w-lg shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0]">
          <h2 className="text-[#0F172A] font-bold text-[15px]">{mode.type === "add" ? "New Project" : "Edit Project"}</h2>
          <button onClick={onClose} className="text-[#94A3B8] hover:text-[#0F172A]"><X size={18}/></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-[#64748B] text-[11px] font-semibold uppercase tracking-wide mb-1.5">Project Name *</label>
            <input value={form.name} onChange={field("name")} placeholder="e.g. Q2 Campaign Launch"
              className="w-full bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A] text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#7C3AED] placeholder:text-[#94A3B8]"/>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[#64748B] text-[11px] font-semibold uppercase tracking-wide mb-1.5">Owner</label>
              <input value={form.owner} onChange={field("owner")} placeholder="e.g. Dean"
                className="w-full bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A] text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#7C3AED] placeholder:text-[#94A3B8]"/>
            </div>
            <div>
              <label className="block text-[#64748B] text-[11px] font-semibold uppercase tracking-wide mb-1.5">Due Date</label>
              <input type="date" value={form.dueDate} onChange={field("dueDate")}
                className="w-full bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A] text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#7C3AED]"/>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-[#64748B] text-[11px] font-semibold uppercase tracking-wide mb-1.5">Status</label>
              <SelectField value={form.status} onChange={v => setForm(f => ({ ...f, status: v }))} options={STATUSES} className="w-full"/>
            </div>
            <div>
              <label className="block text-[#64748B] text-[11px] font-semibold uppercase tracking-wide mb-1.5">Priority</label>
              <SelectField value={form.priority} onChange={v => setForm(f => ({ ...f, priority: v }))} options={PRIORITIES} className="w-full"/>
            </div>
            <div>
              <label className="block text-[#64748B] text-[11px] font-semibold uppercase tracking-wide mb-1.5">Club</label>
              <SelectField value={form.club as any} onChange={v => setForm(f => ({ ...f, club: v }))} options={CLUBS.filter(c => c !== "All Clubs") as any} className="w-full"/>
            </div>
          </div>
          <div>
            <label className="block text-[#64748B] text-[11px] font-semibold uppercase tracking-wide mb-1.5">Notes</label>
            <textarea value={form.notes} onChange={field("notes")} rows={2} placeholder="Optional notes..."
              className="w-full bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A] text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#7C3AED] placeholder:text-[#94A3B8] resize-none"/>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-[#E2E8F0] flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-[#64748B] hover:text-[#0F172A]">Cancel</button>
          <button onClick={() => { if (form.name.trim()) { onSave(form); onClose(); } }} disabled={!form.name.trim()}
            className="px-5 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-40 text-white text-sm font-semibold rounded-lg transition-colors">
            {mode.type === "add" ? "Add Project" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Task edit modal ──────────────────────────────────────────────────────────
function TaskDetailModal({ task, onSave, onClose }: { task: Task; onSave: (t: Task) => void; onClose: () => void }) {
  const [form, setForm]         = useState<Task>(task);
  const [newLabel, setNewLabel] = useState("");
  const [newUrl,   setNewUrl]   = useState("");

  function addLink() {
    if (!newUrl.trim()) return;
    setForm(f => ({ ...f, links: [...f.links, { id: crypto.randomUUID(), label: newLabel.trim() || newUrl.trim(), url: newUrl.trim() }] }));
    setNewLabel(""); setNewUrl("");
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4">
      <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl w-full max-w-lg shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0]">
          <h2 className="text-[#0F172A] font-bold text-[15px]">Edit Task</h2>
          <button onClick={onClose} className="text-[#94A3B8] hover:text-[#0F172A]"><X size={18}/></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-[#64748B] text-[11px] font-semibold uppercase tracking-wide mb-1.5">Task</label>
            <input value={form.text} onChange={e => setForm(f => ({ ...f, text: e.target.value }))} placeholder="Describe this task…"
              className="w-full bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A] text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#7C3AED] placeholder:text-[#94A3B8]"/>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[#64748B] text-[11px] font-semibold uppercase tracking-wide mb-1.5">Due Date</label>
              <input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
                className="w-full bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A] text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#7C3AED]"/>
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 cursor-pointer select-none" onClick={() => setForm(f => ({ ...f, done: !f.done }))}>
                <div className={cn("w-5 h-5 rounded flex items-center justify-center border-2 transition-all", form.done ? "bg-[#059669] border-[#059669]" : "border-[#E2E8F0] bg-[#F8FAFC]")}>
                  {form.done && <CheckCircle2 size={12} className="text-white"/>}
                </div>
                <span className="text-sm text-[#0F172A] font-medium">Mark done</span>
              </label>
            </div>
          </div>
          <div>
            <label className="block text-[#64748B] text-[11px] font-semibold uppercase tracking-wide mb-2">Linked Resources</label>
            {form.links.length > 0 && (
              <div className="space-y-1.5 mb-3">
                {form.links.map(link => (
                  <div key={link.id} className="flex items-center gap-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2 group">
                    <span className="text-sm">{getLinkIcon(link.url)}</span>
                    <a href={link.url} target="_blank" rel="noopener noreferrer"
                      className="flex-1 text-[13px] text-[#7C3AED] hover:text-[#6D28D9] truncate font-medium">{link.label}</a>
                    <ExternalLink size={11} className="text-[#94A3B8] flex-shrink-0"/>
                    <button onClick={() => setForm(f => ({ ...f, links: f.links.filter(l => l.id !== link.id) }))}
                      className="text-[#94A3B8] hover:text-[#DC2626] flex-shrink-0 opacity-0 group-hover:opacity-100"><X size={13}/></button>
                  </div>
                ))}
              </div>
            )}
            <div className="space-y-2">
              <input value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="Label (e.g. Campaign Tracker Sheet)"
                className="w-full bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A] text-[12px] rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#7C3AED] placeholder:text-[#94A3B8]"/>
              <div className="flex gap-2">
                <input value={newUrl} onChange={e => setNewUrl(e.target.value)} onKeyDown={e => e.key === "Enter" && addLink()}
                  placeholder="https://… (Google Sheet, Figma, Doc…)"
                  className="flex-1 bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A] text-[12px] rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#7C3AED] placeholder:text-[#94A3B8]"/>
                <button onClick={addLink} disabled={!newUrl.trim()}
                  className="flex items-center gap-1 px-3 py-1.5 bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-40 text-white text-[12px] font-semibold rounded-lg flex-shrink-0">
                  <Link2 size={12}/> Add
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-[#E2E8F0] flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-[#64748B] hover:text-[#0F172A]">Cancel</button>
          <button onClick={() => { if (form.text.trim()) { onSave(form); onClose(); } }} disabled={!form.text.trim()}
            className="inline-flex items-center gap-2 px-5 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-40 text-white text-sm font-semibold rounded-lg">
            <Save size={14}/> Save Task
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Task row ─────────────────────────────────────────────────────────────────
function TaskRow({ task, onToggle, onEdit, onDelete }: { task: Task; onToggle: (id: string) => void; onEdit: (t: Task) => void; onDelete: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const taskOverdue = task.dueDate && !task.done && new Date(task.dueDate) < new Date();
  return (
    <div className={cn("rounded-xl border transition-all duration-150", task.done ? "bg-[#F8FAFC] border-[#E2E8F0]" : "bg-[#FFFFFF] border-[#E2E8F0] hover:border-[#7C3AED]/30")}>
      <div className="flex items-start gap-3 px-3 py-2.5 group">
        <button onClick={() => onToggle(task.id)} className="flex-shrink-0 mt-0.5">
          {task.done ? <CheckCircle2 size={16} className="text-[#059669]"/> : <Circle size={16} className="text-[#E2E8F0] hover:text-[#7C3AED] transition-colors"/>}
        </button>
        <div className="flex-1 min-w-0">
          <p className={cn("text-[13px] leading-snug", task.done ? "line-through text-[#94A3B8]" : "text-[#0F172A]")}>{task.text}</p>
          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
            {task.dueDate && <p className={cn("text-[11px]", taskOverdue ? "text-[#DC2626]" : "text-[#94A3B8]")}><Calendar size={10} className="inline mr-1"/>{formatDate(task.dueDate)}{taskOverdue && " · Overdue"}</p>}
            {task.links.length > 0 && (
              <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-1 text-[11px] text-[#7C3AED] hover:text-[#6D28D9] font-medium">
                <Link2 size={10}/>{task.links.length} link{task.links.length !== 1 ? "s" : ""}
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onEdit(task)} className="p-1 text-[#94A3B8] hover:text-[#7C3AED]"><Pencil size={12}/></button>
          <button onClick={() => onDelete(task.id)} className="p-1 text-[#94A3B8] hover:text-[#EF4444]"><Trash2 size={12}/></button>
        </div>
      </div>
      {expanded && task.links.length > 0 && (
        <div className="px-3 pb-2.5 ml-7 space-y-1 border-t border-[#E2E8F0] pt-2">
          {task.links.map(link => (
            <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 text-[12px] text-[#7C3AED] hover:text-[#6D28D9] group/link py-0.5">
              <span className="text-[11px]">{getLinkIcon(link.url)}</span>
              <span className="truncate font-medium">{link.label}</span>
              <ExternalLink size={10} className="flex-shrink-0 opacity-0 group-hover/link:opacity-100"/>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Inline tasks panel ───────────────────────────────────────────────────────
function InlineTasks({ project, onUpdateTasks }: { project: Project; onUpdateTasks: (projectId: string, tasks: Task[]) => void }) {
  const [newTaskText, setNewTaskText] = useState("");
  const [newTaskDue,  setNewTaskDue]  = useState("");
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  function addTask() {
    if (!newTaskText.trim()) return;
    onUpdateTasks(project.id, [...project.tasks, { id: crypto.randomUUID(), text: newTaskText.trim(), done: false, dueDate: newTaskDue, links: [] }]);
    setNewTaskText(""); setNewTaskDue("");
  }

  const prog      = taskProgress(project.tasks);
  const pending   = project.tasks.filter(t => !t.done);
  const completed = project.tasks.filter(t => t.done);

  return (
    <>
      <div className="space-y-3">
        {prog && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5 text-[#64748B] text-[11px] font-semibold"><ListChecks size={13}/> Tasks</div>
              <span className="text-[11px] font-semibold text-[#94A3B8]"><span className="text-[#059669]">{prog.done}</span> / {prog.total} done</span>
            </div>
            <div className="h-1.5 bg-[#E2E8F0] rounded-full overflow-hidden">
              <div className={cn("h-full rounded-full transition-all duration-500", prog.pct === 100 ? "bg-[#059669]" : "bg-[#7C3AED]")} style={{ width: `${prog.pct}%` }}/>
            </div>
          </div>
        )}
        <div className="flex items-center gap-2">
          <input value={newTaskText} onChange={e => setNewTaskText(e.target.value)} onKeyDown={e => e.key === "Enter" && addTask()}
            placeholder="Add a task… (press Enter)"
            className="flex-1 bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A] text-[12px] rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#7C3AED] placeholder:text-[#94A3B8]"/>
          <input type="date" value={newTaskDue} onChange={e => setNewTaskDue(e.target.value)}
            className="bg-[#F8FAFC] border border-[#E2E8F0] text-[#64748B] text-[12px] rounded-lg px-2 py-1.5 focus:outline-none focus:border-[#7C3AED] w-36"/>
          <button onClick={addTask} disabled={!newTaskText.trim()}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-40 text-white text-[12px] font-semibold rounded-lg flex-shrink-0">
            <Plus size={12}/> Add
          </button>
        </div>
        {pending.length > 0 && (
          <div className="space-y-1.5">
            {pending.map(task => (
              <TaskRow key={task.id} task={task}
                onToggle={id => onUpdateTasks(project.id, project.tasks.map(t => t.id === id ? { ...t, done: !t.done } : t))}
                onEdit={setEditingTask}
                onDelete={id => onUpdateTasks(project.id, project.tasks.filter(t => t.id !== id))}/>
            ))}
          </div>
        )}
        {completed.length > 0 && (
          <div>
            <div className="text-[#94A3B8] text-[10px] font-semibold uppercase tracking-widest mb-1.5">Completed · {completed.length}</div>
            <div className="space-y-1.5">
              {completed.map(task => (
                <TaskRow key={task.id} task={task}
                  onToggle={id => onUpdateTasks(project.id, project.tasks.map(t => t.id === id ? { ...t, done: !t.done } : t))}
                  onEdit={setEditingTask}
                  onDelete={id => onUpdateTasks(project.id, project.tasks.filter(t => t.id !== id))}/>
              ))}
            </div>
          </div>
        )}
        {project.tasks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-4 text-center text-[#94A3B8]">
            <ListChecks size={22} className="mb-1.5 opacity-40"/><p className="text-[12px]">No tasks yet — add one above</p>
          </div>
        )}
      </div>
      {editingTask && (
        <TaskDetailModal task={editingTask}
          onSave={updated => onUpdateTasks(project.id, project.tasks.map(t => t.id === updated.id ? updated : t))}
          onClose={() => setEditingTask(null)}/>
      )}
    </>
  );
}

function TaskPill({ tasks }: { tasks: Task[] }) {
  if (!tasks.length) return null;
  const done = tasks.filter(t => t.done).length;
  const pct  = Math.round((done / tasks.length) * 100);
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex-1 h-1 bg-[#E2E8F0] rounded-full overflow-hidden w-12">
        <div className={cn("h-full rounded-full", pct === 100 ? "bg-[#059669]" : "bg-[#7C3AED]")} style={{ width: `${pct}%` }}/>
      </div>
      <span className={cn("text-[10px] font-semibold tabular-nums", pct === 100 ? "text-[#059669]" : "text-[#94A3B8]")}>{done}/{tasks.length}</span>
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

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: Project[] = JSON.parse(stored);
        setProjects(parsed.map(p => ({ ...p, tasks: p.tasks.map(t => ({ ...t, links: t.links ?? [] })) })));
      }
    } catch {}
  }, []);

  const persist = useCallback((updated: Project[]) => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch {}
  }, []);

  function saveProject(p: Project) {
    setProjects(prev => {
      const idx = prev.findIndex(x => x.id === p.id);
      const updated = idx >= 0 ? prev.map((x, i) => i === idx ? p : x) : [...prev, p];
      persist(updated); return updated;
    });
  }
  function deleteProject(id: string) {
    if (expandedId === id) setExpandedId(null);
    setProjects(prev => { const updated = prev.filter(p => p.id !== id); persist(updated); return updated; });
  }
  function updateTasks(projectId: string, tasks: Task[]) {
    setProjects(prev => { const updated = prev.map(p => p.id === projectId ? { ...p, tasks } : p); persist(updated); return updated; });
  }

  const filtered = projects.filter(p => {
    if (filterStatus   !== "All"       && p.status   !== filterStatus)   return false;
    if (filterClub     !== "All Clubs" && p.club     !== filterClub)     return false;
    if (filterPriority !== "All"       && p.priority !== filterPriority) return false;
    return true;
  });

  const statusGroups = STATUSES.map(s => ({ status: s, items: filtered.filter(p => p.status === s) }));
  const counts = {
    total:   projects.length,
    done:    projects.filter(p => p.status === "Done").length,
    blocked: projects.filter(p => p.status === "Blocked").length,
    overdue: projects.filter(p => p.dueDate && new Date(p.dueDate) < new Date() && p.status !== "Done").length,
  };

  return (
    <div>
      <PageHeader title="Projects" subtitle="Track active projects and initiatives across the region"
        action={
          <button onClick={() => setModal({ type: "add" })}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-sm font-semibold rounded-lg transition-colors">
            <Plus size={16}/> New Project
          </button>
        }/>

      <div className="flex flex-wrap gap-3 mb-6">
        {[
          { label: "Total",   value: counts.total,   color: "text-[#6D28D9]", bg: "bg-[#EDE9FE] border border-[#7C3AED]/30" },
          { label: "Done",    value: counts.done,    color: "text-[#059669]", bg: "bg-[#F0FDF4] border border-[#059669]/30" },
          { label: "Blocked", value: counts.blocked, color: "text-[#DC2626]", bg: "bg-[#FEF2F2] border border-[#EF4444]/30" },
          { label: "Overdue", value: counts.overdue, color: "text-[#D97706]", bg: "bg-[#FFFBEB] border border-[#D97706]/30" },
        ].map(chip => (
          <div key={chip.label} className={cn("flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold", chip.bg)}>
            <span className={chip.color}>{chip.value}</span><span className="text-[#94A3B8]">{chip.label}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <SelectField value={filterStatus}   onChange={setFilterStatus}   options={["All", ...STATUSES] as any}   className="text-[13px]"/>
        <SelectField value={filterPriority} onChange={setFilterPriority} options={["All", ...PRIORITIES] as any} className="text-[13px]"/>
        <SelectField value={filterClub}     onChange={setFilterClub}     options={CLUBS as any}                  className="text-[13px]"/>
      </div>

      {/* Kanban */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {statusGroups.map(({ status, items }) => {
          const cfg = STATUS_CONFIG[status];
          return (
            <div key={status} className="flex flex-col min-h-[200px]">
              <div className={cn("flex items-center gap-2 px-3 py-2 rounded-t-xl border-b border-[#E2E8F0]", cfg.bg)}>
                <span className={cn("flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wider", cfg.color)}>{cfg.icon}{status}</span>
                <span className="ml-auto text-[11px] font-semibold text-[#94A3B8] bg-[#E2E8F0] rounded-full px-2 py-0.5">{items.length}</span>
              </div>
              <div className="flex-1 bg-[#F8FAFC] rounded-b-xl border border-t-0 border-[#E2E8F0] p-2 space-y-2 min-h-[120px]">
                {items.length === 0 && <div className="flex items-center justify-center h-16 text-[#94A3B8] text-[12px]">No projects</div>}
                {items.map(p => (
                  <div key={p.id} className="bg-[#FFFFFF] border border-[#E2E8F0] hover:border-[#7C3AED]/40 rounded-xl p-3 group transition-all duration-150 shadow-sm">
                    <div className="flex items-start justify-between gap-1 mb-2">
                      <p className="text-[#0F172A] text-[13px] font-semibold leading-tight">{p.name}</p>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button onClick={() => setModal({ type: "edit", project: p })} className="p-1 text-[#94A3B8] hover:text-[#7C3AED] opacity-0 group-hover:opacity-100"><Pencil size={12}/></button>
                        <button onClick={() => deleteProject(p.id)} className="p-1 text-[#94A3B8] hover:text-[#EF4444] opacity-0 group-hover:opacity-100"><Trash2 size={12}/></button>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <PriorityBadge priority={p.priority}/>
                        <span className={cn("text-[11px] rounded px-1.5 py-0.5", p.club === "Group" ? "text-[#6D28D9] bg-[#EDE9FE]" : "text-[#64748B] bg-[#F8FAFC]")}>{p.club}</span>
                      </div>
                      {p.dueDate && <div className={cn("flex items-center gap-1.5 text-[11px]", isOverdue(p) ? "text-[#DC2626]" : "text-[#94A3B8]")}><Calendar size={11}/>{formatDate(p.dueDate)}{isOverdue(p) && <span className="font-semibold">· Overdue</span>}</div>}
                      {p.owner && <div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded-full bg-[#7C3AED]/20 border border-[#7C3AED]/40 flex items-center justify-center"><span className="text-[#7C3AED] text-[8px] font-bold">{p.owner[0].toUpperCase()}</span></div><span className="text-[11px] text-[#94A3B8]">{p.owner}</span></div>}
                      <TaskPill tasks={p.tasks}/>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Table view */}
      <div className="mt-8">
        <div className="text-[#64748B] text-[11px] font-semibold uppercase tracking-widest mb-3">All Projects · Table View</div>
        <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#F8FAFC] text-[#64748B] text-[11px] uppercase tracking-wide border-b border-[#E2E8F0]">
                  <th className="text-left px-4 py-3 font-semibold">Project</th>
                  <th className="text-left px-4 py-3 font-semibold">Status</th>
                  <th className="text-left px-4 py-3 font-semibold">Priority</th>
                  <th className="text-left px-4 py-3 font-semibold">Club</th>
                  <th className="text-left px-4 py-3 font-semibold">Due Date</th>
                  <th className="text-left px-4 py-3 font-semibold">Tasks</th>
                  <th className="text-left px-4 py-3 font-semibold">Owner</th>
                  <th className="px-4 py-3"/>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => {
                  const prog       = taskProgress(p.tasks);
                  const isExpanded = expandedId === p.id;
                  return (
                    <Fragment key={p.id}>
                      <tr onClick={() => setExpandedId(prev => prev === p.id ? null : p.id)}
                        className={cn("border-t border-[#E2E8F0] transition-colors cursor-pointer group", isExpanded ? "bg-[#F8FAFC]" : "hover:bg-[#F8FAFC]/70")}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <ChevronRight size={13} className={cn("text-[#94A3B8] transition-transform flex-shrink-0", isExpanded && "rotate-90 text-[#7C3AED]")}/>
                            <div>
                              <div className="text-[#0F172A] font-semibold">{p.name}</div>
                              {p.notes && <div className="text-[#94A3B8] text-[11px] mt-0.5 truncate max-w-xs">{p.notes}</div>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3"><StatusBadge status={p.status}/></td>
                        <td className="px-4 py-3"><PriorityBadge priority={p.priority}/></td>
                        <td className="px-4 py-3 text-[#64748B] text-[13px]">{p.club}</td>
                        <td className={cn("px-4 py-3 text-[13px]", isOverdue(p) ? "text-[#DC2626] font-semibold" : "text-[#64748B]")}>{formatDate(p.dueDate)}{isOverdue(p) && <span className="ml-1 text-[10px]">⚠</span>}</td>
                        <td className="px-4 py-3">
                          {prog ? (
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-1.5 bg-[#E2E8F0] rounded-full overflow-hidden">
                                <div className={cn("h-full rounded-full", prog.pct === 100 ? "bg-[#059669]" : "bg-[#7C3AED]")} style={{ width: `${prog.pct}%` }}/>
                              </div>
                              <span className={cn("text-[12px] font-semibold tabular-nums", prog.pct === 100 ? "text-[#059669]" : "text-[#94A3B8]")}>{prog.done}/{prog.total}</span>
                            </div>
                          ) : <span className="text-[#94A3B8] text-[12px]">—</span>}
                        </td>
                        <td className="px-4 py-3 text-[#64748B] text-[13px]">{p.owner || "—"}</td>
                        <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => setModal({ type: "edit", project: p })} className="p-1.5 text-[#94A3B8] hover:text-[#7C3AED] hover:bg-[#F8FAFC] rounded-lg"><Pencil size={13}/></button>
                            <button onClick={() => deleteProject(p.id)} className="p-1.5 text-[#94A3B8] hover:text-[#EF4444] hover:bg-[#FEF2F2] rounded-lg"><Trash2 size={13}/></button>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="border-t border-[#7C3AED]/20 bg-[#FAFBFF]">
                          <td colSpan={8} className="px-6 py-4">
                            <InlineTasks project={p} onUpdateTasks={updateTasks}/>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-12 text-center text-[#94A3B8] text-sm">No projects match the current filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {modal && <ProjectModal mode={modal} onSave={saveProject} onClose={() => setModal(null)}/>}
    </div>
  );
}
