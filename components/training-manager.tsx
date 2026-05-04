"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Plus, X, GraduationCap, Pencil, Trash2, Loader2, ChevronDown, AlertTriangle, ExternalLink } from "lucide-react";

interface Staff  { id: string; name: string; club: { name: string } | null }
interface TrainingRecord {
  id: string; staff_id: string; training_name: string;
  completed_date: string | null; expiry_date: string | null;
  certification_url: string | null; notes: string | null;
  staff: { name: string; club: { name: string } | null } | null;
}

interface Props { records: TrainingRecord[]; staff: Staff[] }

type Filter = "all" | "expired" | "expiring" | "valid";

type FormState = {
  staff_id: string; training_name: string; completed_date: string;
  expiry_date: string; certification_url: string; notes: string;
};
const EMPTY: FormState = { staff_id: "", training_name: "", completed_date: "", expiry_date: "", certification_url: "", notes: "" };

function expiryStatus(expiry: string | null): "expired" | "expiring" | "valid" | "none" {
  if (!expiry) return "none";
  const today = new Date(); today.setHours(0,0,0,0);
  const in30 = new Date(today); in30.setDate(in30.getDate() + 30);
  const d = new Date(expiry);
  if (d < today) return "expired";
  if (d <= in30) return "expiring";
  return "valid";
}

const STATUS_STYLES = {
  expired:  { badge: "bg-[#FEE2E2] text-[#EF4444]", text: "text-[#EF4444]", label: "Expired" },
  expiring: { badge: "bg-[#FEF3C7] text-[#D97706]", text: "text-[#D97706]", label: "Expiring Soon" },
  valid:    { badge: "bg-[#D1FAE5]/40 text-[#059669]", text: "text-[#059669]", label: "Valid" },
  none:     { badge: "bg-[#1E2640] text-[#94A3B8]", text: "text-[#94A3B8]", label: "No Expiry" },
};

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

export default function TrainingManager({ records: initial, staff }: Props) {
  const router = useRouter();
  const [records, setRecords] = useState(initial);
  useEffect(() => { setRecords(initial); }, [initial]);
  const [filter, setFilter]   = useState<Filter>("all");
  const [modal, setModal]     = useState<"create" | "edit" | null>(null);
  const [editId, setEditId]   = useState<string | null>(null);
  const [form, setForm]       = useState<FormState>(EMPTY);
  const [saving, setSaving]   = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const today = new Date(); today.setHours(0,0,0,0);
  const in30 = new Date(today); in30.setDate(in30.getDate() + 30);

  const expired  = records.filter((r) => expiryStatus(r.expiry_date) === "expired");
  const expiring = records.filter((r) => expiryStatus(r.expiry_date) === "expiring");

  const filtered = filter === "all" ? records
    : records.filter((r) => expiryStatus(r.expiry_date) === filter);

  const f = (k: keyof FormState, v: string) => setForm((p) => ({ ...p, [k]: v }));

  function openCreate() { setForm({ ...EMPTY, staff_id: staff[0]?.id ?? "" }); setEditId(null); setModal("create"); }
  function openEdit(r: TrainingRecord) {
    setForm({ staff_id: r.staff_id, training_name: r.training_name,
      completed_date: r.completed_date ?? "", expiry_date: r.expiry_date ?? "",
      certification_url: r.certification_url ?? "", notes: r.notes ?? "" });
    setEditId(r.id); setModal("edit");
  }
  function close() { setModal(null); setEditId(null); }

  async function save() {
    if (!form.staff_id || !form.training_name.trim()) return;
    setSaving(true);
    const supabase = createClient();
    const payload = {
      staff_id: form.staff_id, training_name: form.training_name.trim(),
      completed_date: form.completed_date || null, expiry_date: form.expiry_date || null,
      certification_url: form.certification_url || null, notes: form.notes || null,
    };
    try {
      if (modal === "create") {
        const { error } = await supabase.from("training_records").insert(payload);
        if (error) throw error;
      } else if (editId) {
        const { error } = await supabase.from("training_records").update(payload).eq("id", editId);
        if (error) throw error;
      }
      setSaving(false); close(); router.refresh();
    } catch (err: any) {
      console.error(err);
      setSaving(false);
    }
  }

  async function del(id: string) {
    setDeleting(id);
    await createClient().from("training_records").delete().eq("id", id);
    setRecords((p) => p.filter((r) => r.id !== id));
    setDeleting(null);
  }

  return (
    <>
      {/* Alerts */}
      {expired.length > 0 && (
        <div className="bg-[#FEE2E2]/30 border border-[#EF4444]/30 rounded-xl p-4 mb-3 flex items-center gap-3">
          <AlertTriangle size={16} className="text-[#EF4444] flex-shrink-0" />
          <span className="text-sm text-[#EF4444] font-semibold">{expired.length} certification{expired.length !== 1 ? "s" : ""} have expired — action required.</span>
        </div>
      )}
      {expiring.length > 0 && (
        <div className="bg-[#FEF3C7]/30 border border-[#D97706]/30 rounded-xl p-4 mb-4 flex items-center gap-3">
          <AlertTriangle size={16} className="text-[#D97706] flex-shrink-0" />
          <span className="text-sm text-[#D97706] font-semibold">{expiring.length} certification{expiring.length !== 1 ? "s" : ""} expiring within 30 days.</span>
        </div>
      )}

      {/* Filters + add */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex gap-2 flex-wrap">
          {(["all", "expired", "expiring", "valid"] as Filter[]).map((s) => {
            const counts: Record<Filter, number> = {
              all: records.length,
              expired: expired.length,
              expiring: expiring.length,
              valid: records.filter((r) => expiryStatus(r.expiry_date) === "valid").length,
            };
            return (
              <button key={s} onClick={() => setFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${filter === s ? "bg-[#EDE9FE] text-[#6D28D9]" : "bg-[#FFFFFF] border border-[#E2E8F0] text-[#94A3B8] hover:text-[#64748B]"}`}>
                {s === "expiring" ? "Expiring Soon" : s.charAt(0).toUpperCase() + s.slice(1)}
                <span className="ml-1.5 text-[10px] opacity-60">{counts[s]}</span>
              </button>
            );
          })}
        </div>
        <button onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-sm font-semibold rounded-lg transition-colors">
          <Plus size={16} /> Add Record
        </button>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-16 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-center mb-4">
            <GraduationCap size={28} className="text-[#94A3B8]" />
          </div>
          <h2 className="text-lg font-bold text-[#0F172A] mb-2">{filter === "all" ? "No training records yet" : `No ${filter === "expiring" ? "expiring" : filter} records`}</h2>
          {filter === "all" && (
            <>
              <p className="text-[#94A3B8] text-sm mb-6 max-w-sm">Track certifications and training completions. Get alerts when records are expiring.</p>
              <button onClick={openCreate} className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-sm font-semibold rounded-lg transition-colors">
                <Plus size={16} /> Add Training Record
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#F8FAFC] text-[#64748B] text-[11px] uppercase tracking-wide border-b border-[#E2E8F0]">
                  <th className="text-left px-4 py-3 font-semibold">Staff Member</th>
                  <th className="text-left px-4 py-3 font-semibold">Club</th>
                  <th className="text-left px-4 py-3 font-semibold">Training / Certification</th>
                  <th className="text-left px-4 py-3 font-semibold">Completed</th>
                  <th className="text-left px-4 py-3 font-semibold">Expires</th>
                  <th className="text-left px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 w-20" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const st = expiryStatus(r.expiry_date);
                  const s = STATUS_STYLES[st];
                  return (
                    <tr key={r.id} className="border-t border-[#E2E8F0]/60 hover:bg-[#F8FAFC]/50 transition-colors">
                      <td className="px-4 py-3 font-semibold text-[#0F172A]">{r.staff?.name ?? "—"}</td>
                      <td className="px-4 py-3 text-[#64748B]">{r.staff?.club?.name ?? "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-[#0F172A]">{r.training_name}</span>
                          {r.certification_url && (
                            <a href={r.certification_url} target="_blank" rel="noopener noreferrer" className="text-[#7C3AED] hover:text-[#6D28D9]"><ExternalLink size={12} /></a>
                          )}
                        </div>
                        {r.notes && <p className="text-[#94A3B8] text-xs mt-0.5 line-clamp-1">{r.notes}</p>}
                      </td>
                      <td className="px-4 py-3 text-[#64748B]">{fmtDate(r.completed_date)}</td>
                      <td className={`px-4 py-3 font-semibold ${s.text}`}>{r.expiry_date ? fmtDate(r.expiry_date) : "No expiry"}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${s.badge}`}>{s.label}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button onClick={() => openEdit(r)} className="p-1.5 rounded text-[#94A3B8] hover:text-[#6D28D9] hover:bg-[#F8FAFC] transition-colors"><Pencil size={13} /></button>
                          <button onClick={() => del(r.id)} disabled={deleting === r.id} className="p-1.5 rounded text-[#94A3B8] hover:text-[#EF4444] hover:bg-[#FEE2E2]/20 transition-colors disabled:opacity-40">
                            {deleting === r.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={close} />
          <div className="relative bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0]">
              <h2 className="text-lg font-bold text-[#0F172A]">{modal === "create" ? "Add Training Record" : "Edit Training Record"}</h2>
              <button onClick={close} className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#0F172A] hover:bg-[#F8FAFC] transition-colors"><X size={18} /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-1.5">Staff Member <span className="text-[#EF4444]">*</span></label>
                <div className="relative">
                  <select value={form.staff_id} onChange={(e) => f("staff_id", e.target.value)}
                    className="w-full px-3 py-2 bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg text-[#0F172A] text-sm focus:outline-none focus:border-[#7C3AED] transition-colors appearance-none pr-8">
                    <option value="">Select staff member...</option>
                    {staff.map((m) => <option key={m.id} value={m.id}>{m.name}{m.club ? ` — ${m.club.name}` : ""}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-1.5">Training / Certification Name <span className="text-[#EF4444]">*</span></label>
                <input value={form.training_name} onChange={(e) => f("training_name", e.target.value)} placeholder="e.g. First Aid Certificate, RSA, WHS Induction"
                  className="w-full px-3 py-2 bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg text-[#0F172A] text-sm placeholder-[#475569] focus:outline-none focus:border-[#7C3AED] transition-colors" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-1.5">Completed Date</label>
                  <input type="date" value={form.completed_date} onChange={(e) => f("completed_date", e.target.value)}
                    className="w-full px-3 py-2 bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg text-[#0F172A] text-sm focus:outline-none focus:border-[#7C3AED] transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-1.5">Expiry Date</label>
                  <input type="date" value={form.expiry_date} onChange={(e) => f("expiry_date", e.target.value)}
                    className="w-full px-3 py-2 bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg text-[#0F172A] text-sm focus:outline-none focus:border-[#7C3AED] transition-colors" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-1.5">Certificate URL</label>
                <input type="url" value={form.certification_url} onChange={(e) => f("certification_url", e.target.value)} placeholder="https://..."
                  className="w-full px-3 py-2 bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg text-[#0F172A] text-sm placeholder-[#475569] focus:outline-none focus:border-[#7C3AED] transition-colors" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-1.5">Notes</label>
                <textarea value={form.notes} onChange={(e) => f("notes", e.target.value)} rows={2} placeholder="Any additional notes..."
                  className="w-full px-3 py-2 bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg text-[#0F172A] text-sm placeholder-[#475569] focus:outline-none focus:border-[#7C3AED] transition-colors resize-none" />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#E2E8F0]">
              <button onClick={close} className="px-4 py-2 rounded-lg text-sm font-medium text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC] transition-colors">Cancel</button>
              <button onClick={save} disabled={saving || !form.staff_id || !form.training_name.trim()}
                className="inline-flex items-center gap-2 px-5 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors">
                {saving && <Loader2 size={14} className="animate-spin" />}
                {modal === "create" ? "Add Record" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
