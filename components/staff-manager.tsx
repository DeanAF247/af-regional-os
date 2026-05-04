"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Plus, X, Users, Pencil, Trash2, Loader2, ChevronDown, Phone, Mail } from "lucide-react";

interface Club   { id: string; name: string }
interface Staff  {
  id: string; name: string; position: string | null;
  email: string | null; phone: string | null;
  start_date: string | null; status: string;
  club_id: string; club: { name: string } | null;
}

interface Props { staff: Staff[]; clubs: Club[] }

const STATUS_STYLES: Record<string, string> = {
  active:   "bg-[#D1FAE5]/40 text-[#059669] border-[#065F46]",
  inactive: "bg-[#1E2640] text-[#94A3B8] border-[#E2E8F0]",
  on_leave: "bg-[#FEF3C7]/30 text-[#D97706] border-[#92400E]",
};

const STATUS_LABELS: Record<string, string> = {
  active: "Active", inactive: "Inactive", on_leave: "On Leave",
};

type FormState = {
  name: string; position: string; email: string; phone: string;
  start_date: string; status: string; club_id: string;
};

const EMPTY: FormState = {
  name: "", position: "", email: "", phone: "",
  start_date: "", status: "active", club_id: "",
};

export default function StaffManager({ staff: initial, clubs }: Props) {
  const router = useRouter();
  const [staff, setStaff]       = useState(initial);
  useEffect(() => { setStaff(initial); }, [initial]);
  const [clubFilter, setFilter] = useState<string>("all");
  const [modal, setModal]       = useState<"create" | "edit" | null>(null);
  const [editId, setEditId]     = useState<string | null>(null);
  const [form, setForm]         = useState<FormState>(EMPTY);
  const [saving, setSaving]     = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const filtered = clubFilter === "all"
    ? staff
    : staff.filter((m) => m.club_id === clubFilter);

  const f = (k: keyof FormState, v: string) => setForm((p) => ({ ...p, [k]: v }));

  function openCreate() { setForm({ ...EMPTY, club_id: clubs[0]?.id ?? "" }); setEditId(null); setSaveError(null); setModal("create"); }
  function openEdit(m: Staff) {
    setForm({ name: m.name, position: m.position ?? "", email: m.email ?? "",
      phone: m.phone ?? "", start_date: m.start_date ?? "", status: m.status, club_id: m.club_id });
    setEditId(m.id); setSaveError(null); setModal("edit");
  }
  function close() { setModal(null); setEditId(null); setSaveError(null); }

  async function save() {
    if (!form.name.trim() || !form.club_id) return;
    setSaving(true);
    setSaveError(null);
    const supabase = createClient();
    const payload = {
      name: form.name.trim(), position: form.position || null,
      email: form.email || null, phone: form.phone || null,
      start_date: form.start_date || null, status: form.status, club_id: form.club_id,
    };
    try {
      if (modal === "create") {
        const { error } = await supabase.from("staff").insert(payload);
        if (error) throw error;
      } else if (editId) {
        const { error } = await supabase.from("staff").update(payload).eq("id", editId);
        if (error) throw error;
      }
      setSaving(false);
      close();
      router.refresh();
    } catch (err: any) {
      setSaveError(err?.message ?? "Save failed — check console.");
      setSaving(false);
    }
  }

  async function del(id: string) {
    setDeleting(id);
    const supabase = createClient();
    await supabase.from("staff").delete().eq("id", id);
    setStaff((p) => p.filter((m) => m.id !== id));
    setDeleting(null);
  }

  const activeCount = staff.filter((m) => m.status === "active").length;

  return (
    <>
      {/* Club filter + add */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${clubFilter === "all" ? "bg-[#EDE9FE] text-[#6D28D9]" : "bg-[#FFFFFF] border border-[#E2E8F0] text-[#94A3B8] hover:text-[#64748B]"}`}>
            All Clubs <span className="ml-1 text-[10px] opacity-60">{staff.length}</span>
          </button>
          {clubs.map((c) => {
            const count = staff.filter((m) => m.club_id === c.id).length;
            return (
              <button key={c.id} onClick={() => setFilter(c.id)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${clubFilter === c.id ? "bg-[#EDE9FE] text-[#6D28D9]" : "bg-[#FFFFFF] border border-[#E2E8F0] text-[#94A3B8] hover:text-[#64748B]"}`}>
                {c.name} <span className="ml-1 text-[10px] opacity-60">{count}</span>
              </button>
            );
          })}
        </div>
        <button onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-sm font-semibold rounded-lg transition-colors">
          <Plus size={16} /> Add Staff Member
        </button>
      </div>

      {/* Table or empty */}
      {filtered.length === 0 ? (
        <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-16 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-center mb-4">
            <Users size={28} className="text-[#94A3B8]" />
          </div>
          <h2 className="text-lg font-bold text-[#0F172A] mb-2">No staff yet</h2>
          <p className="text-[#94A3B8] text-sm mb-6 max-w-sm">Add staff members to track positions, contact details, and status.</p>
          <button onClick={openCreate}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-sm font-semibold rounded-lg transition-colors">
            <Plus size={16} /> Add First Staff Member
          </button>
        </div>
      ) : (
        <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#F8FAFC] text-[#64748B] text-[11px] uppercase tracking-wide border-b border-[#E2E8F0]">
                  <th className="text-left px-4 py-3 font-semibold">Name</th>
                  <th className="text-left px-4 py-3 font-semibold">Position</th>
                  <th className="text-left px-4 py-3 font-semibold">Club</th>
                  <th className="text-left px-4 py-3 font-semibold">Contact</th>
                  <th className="text-left px-4 py-3 font-semibold">Start Date</th>
                  <th className="text-left px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 w-20" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((m) => (
                  <tr key={m.id} className="border-t border-[#E2E8F0]/60 hover:bg-[#F8FAFC]/50 transition-colors">
                    <td className="px-4 py-3 font-semibold text-[#0F172A]">{m.name}</td>
                    <td className="px-4 py-3 text-[#64748B]">{m.position ?? "—"}</td>
                    <td className="px-4 py-3 text-[#64748B]">{m.club?.name ?? "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-0.5">
                        {m.email && <span className="flex items-center gap-1 text-[#94A3B8] text-xs"><Mail size={10} />{m.email}</span>}
                        {m.phone && <span className="flex items-center gap-1 text-[#94A3B8] text-xs"><Phone size={10} />{m.phone}</span>}
                        {!m.email && !m.phone && <span className="text-[#475569]">—</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[#64748B]">
                      {m.start_date ? new Date(m.start_date).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${STATUS_STYLES[m.status]}`}>
                        {STATUS_LABELS[m.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(m)} className="p-1.5 rounded text-[#94A3B8] hover:text-[#6D28D9] hover:bg-[#F8FAFC] transition-colors"><Pencil size={13} /></button>
                        <button onClick={() => del(m.id)} disabled={deleting === m.id} className="p-1.5 rounded text-[#94A3B8] hover:text-[#EF4444] hover:bg-[#FEE2E2]/20 transition-colors disabled:opacity-40">
                          {deleting === m.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
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
              <h2 className="text-lg font-bold text-[#0F172A]">{modal === "create" ? "Add Staff Member" : "Edit Staff Member"}</h2>
              <button onClick={close} className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#0F172A] hover:bg-[#F8FAFC] transition-colors"><X size={18} /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-1.5">Full Name <span className="text-[#EF4444]">*</span></label>
                  <input value={form.name} onChange={(e) => f("name", e.target.value)} placeholder="Jane Smith"
                    className="w-full px-3 py-2 bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg text-[#0F172A] text-sm placeholder-[#475569] focus:outline-none focus:border-[#7C3AED] transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-1.5">Position</label>
                  <input value={form.position} onChange={(e) => f("position", e.target.value)} placeholder="Club Manager"
                    className="w-full px-3 py-2 bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg text-[#0F172A] text-sm placeholder-[#475569] focus:outline-none focus:border-[#7C3AED] transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-1.5">Club <span className="text-[#EF4444]">*</span></label>
                  <div className="relative">
                    <select value={form.club_id} onChange={(e) => f("club_id", e.target.value)}
                      className="w-full px-3 py-2 bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg text-[#0F172A] text-sm focus:outline-none focus:border-[#7C3AED] transition-colors appearance-none pr-8">
                      <option value="">Select club...</option>
                      {clubs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-1.5">Email</label>
                  <input type="email" value={form.email} onChange={(e) => f("email", e.target.value)} placeholder="jane@example.com"
                    className="w-full px-3 py-2 bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg text-[#0F172A] text-sm placeholder-[#475569] focus:outline-none focus:border-[#7C3AED] transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-1.5">Phone</label>
                  <input value={form.phone} onChange={(e) => f("phone", e.target.value)} placeholder="0400 000 000"
                    className="w-full px-3 py-2 bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg text-[#0F172A] text-sm placeholder-[#475569] focus:outline-none focus:border-[#7C3AED] transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-1.5">Start Date</label>
                  <input type="date" value={form.start_date} onChange={(e) => f("start_date", e.target.value)}
                    className="w-full px-3 py-2 bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg text-[#0F172A] text-sm focus:outline-none focus:border-[#7C3AED] transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-1.5">Status</label>
                  <div className="relative">
                    <select value={form.status} onChange={(e) => f("status", e.target.value)}
                      className="w-full px-3 py-2 bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg text-[#0F172A] text-sm focus:outline-none focus:border-[#7C3AED] transition-colors appearance-none pr-8">
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="on_leave">On Leave</option>
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>
            <div className="border-t border-[#E2E8F0]">
              {saveError && (
                <div className="px-6 py-3 bg-[#FEE2E2]/30 border-b border-[#EF4444]/30 text-xs text-[#EF4444]">
                  <strong>Error:</strong> {saveError}
                </div>
              )}
              <div className="flex items-center justify-end gap-3 px-6 py-4">
                <button onClick={close} className="px-4 py-2 rounded-lg text-sm font-medium text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC] transition-colors">Cancel</button>
                <button onClick={save} disabled={saving || !form.name.trim() || !form.club_id}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors">
                  {saving && <Loader2 size={14} className="animate-spin" />}
                  {modal === "create" ? "Add Member" : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
