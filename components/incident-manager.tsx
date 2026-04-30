"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Plus,
  AlertTriangle,
  Edit2,
  Trash2,
  X,
  ChevronDown,
} from "lucide-react";

const INCIDENT_TYPES = [
  "Injury",
  "Equipment Failure",
  "Member Complaint",
  "Security",
  "Maintenance",
  "Other",
];

const STATUS_BADGE: Record<string, string> = {
  open:        "bg-[#7F1D1D] text-[#EF4444]",
  in_progress: "bg-[#78350F] text-[#F59E0B]",
  resolved:    "bg-[#064E3B] text-[#10B981]",
  closed:      "bg-[#252B45] text-[#64748B]",
};

const TYPE_BADGE: Record<string, string> = {
  "Injury":            "bg-[#7F1D1D]/50 text-[#EF4444]",
  "Equipment Failure": "bg-[#78350F]/50 text-[#F59E0B]",
  "Member Complaint":  "bg-[#1E3A5F]/50 text-[#3B82F6]",
  "Security":          "bg-[#3B1F7A]/50 text-[#A78BFA]",
  "Maintenance":       "bg-[#252B45] text-[#94A3B8]",
  "Other":             "bg-[#252B45] text-[#64748B]",
};

interface Club { id: string; name: string }

interface Incident {
  id: string;
  date: string;
  club_id: string;
  type: string;
  description: string;
  reported_by: string | null;
  status: string;
  resolution_notes: string | null;
  created_at: string;
  club: { name: string } | null;
}

interface FormState {
  date: string;
  club_id: string;
  type: string;
  description: string;
  reported_by: string;
  status: string;
  resolution_notes: string;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function IncidentManager({
  incidents,
  clubs,
}: {
  incidents: Incident[];
  clubs: Club[];
}) {
  const router = useRouter();
  const supabase = createClient();

  const [filterStatus, setFilterStatus] = useState("All");
  const [filterType, setFilterType] = useState("All");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Incident | null>(null);
  const [viewingIncident, setViewingIncident] = useState<Incident | null>(null);
  const [form, setForm] = useState<FormState>({
    date: todayStr(),
    club_id: clubs[0]?.id ?? "",
    type: "Other",
    description: "",
    reported_by: "",
    status: "open",
    resolution_notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  function openCreate() {
    setEditing(null);
    setForm({
      date: todayStr(),
      club_id: clubs[0]?.id ?? "",
      type: "Other",
      description: "",
      reported_by: "",
      status: "open",
      resolution_notes: "",
    });
    setModalOpen(true);
  }

  function openEdit(i: Incident) {
    setEditing(i);
    setForm({
      date: i.date,
      club_id: i.club_id,
      type: i.type,
      description: i.description,
      reported_by: i.reported_by ?? "",
      status: i.status,
      resolution_notes: i.resolution_notes ?? "",
    });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
    setViewingIncident(null);
  }

  async function handleSave() {
    if (!form.description.trim()) return;
    setSaving(true);
    try {
      const payload = {
        date: form.date,
        club_id: form.club_id || null,
        type: form.type,
        description: form.description.trim(),
        reported_by: form.reported_by.trim() || null,
        status: form.status,
        resolution_notes: form.resolution_notes.trim() || null,
      };

      if (editing) {
        await supabase.from("incidents").update(payload).eq("id", editing.id);
      } else {
        await supabase.from("incidents").insert(payload);
      }

      closeModal();
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this incident report? This cannot be undone.")) return;
    setDeleting(id);
    await supabase.from("incidents").delete().eq("id", id);
    setDeleting(null);
    closeModal();
    router.refresh();
  }

  async function quickStatusUpdate(id: string, status: string) {
    await supabase.from("incidents").update({ status }).eq("id", id);
    router.refresh();
  }

  const STATUSES = ["All", "Open", "In Progress", "Resolved", "Closed"];

  const filtered = incidents.filter((i) => {
    const matchStatus =
      filterStatus === "All" ||
      i.status === filterStatus.toLowerCase().replace(" ", "_");
    const matchType = filterType === "All" || i.type === filterType;
    return matchStatus && matchType;
  });

  const openCount = incidents.filter((i) => i.status === "open" || i.status === "in_progress").length;

  return (
    <>
      {/* Alert banner */}
      {openCount > 0 && (
        <div className="bg-[#7F1D1D]/20 border border-[#EF4444]/30 rounded-xl p-4 mb-4 flex items-center gap-3">
          <AlertTriangle size={18} className="text-[#EF4444] flex-shrink-0" />
          <span className="text-sm text-[#EF4444] font-semibold">
            {openCount} open incident{openCount !== 1 ? "s" : ""} require attention.
          </span>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
        <div className="flex gap-2 flex-wrap">
          {STATUSES.map((s) => {
            const key = s.toLowerCase().replace(" ", "_");
            const count =
              s === "All"
                ? incidents.length
                : incidents.filter((i) => i.status === key).length;
            const isActive = filterStatus === s;
            return (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-[#3B1F7A] text-[#A78BFA]"
                    : "bg-[#131729] border border-[#252B45] text-[#64748B] hover:text-[#94A3B8]"
                }`}
              >
                {s}
                <span className="ml-1.5 text-xs opacity-60">{count}</span>
              </button>
            );
          })}
        </div>
        <div className="flex gap-2 items-center">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 bg-[#131729] border border-[#252B45] rounded-lg text-[#94A3B8] text-sm focus:outline-none focus:border-[#7C3AED] transition-colors"
          >
            <option value="All">All Types</option>
            {INCIDENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-sm font-semibold rounded-lg transition-colors"
          >
            <Plus size={16} />
            Log Incident
          </button>
        </div>
      </div>

      {/* Table */}
      {filtered.length > 0 ? (
        <div className="bg-[#131729] border border-[#252B45] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#1A1F35] text-[#94A3B8] text-[11px] uppercase tracking-wide border-b border-[#252B45]">
                  <th className="text-left px-4 py-3 font-semibold">Date</th>
                  <th className="text-left px-4 py-3 font-semibold">Club</th>
                  <th className="text-left px-4 py-3 font-semibold">Type</th>
                  <th className="text-left px-4 py-3 font-semibold">Description</th>
                  <th className="text-left px-4 py-3 font-semibold">Reported By</th>
                  <th className="text-left px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((incident) => (
                  <tr
                    key={incident.id}
                    className="border-t border-[#252B45]/60 hover:bg-[#1A1F35]/50 transition-colors cursor-pointer"
                    onClick={() => setViewingIncident(incident)}
                  >
                    <td className="px-4 py-3 text-[#94A3B8] whitespace-nowrap">
                      {new Date(incident.date).toLocaleDateString("en-AU", {
                        day: "numeric", month: "short", year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3 font-semibold text-[#F1F5F9]">
                      {incident.club?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${TYPE_BADGE[incident.type] ?? TYPE_BADGE["Other"]}`}>
                        {incident.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#94A3B8] max-w-xs">
                      <span className="line-clamp-2">{incident.description}</span>
                    </td>
                    <td className="px-4 py-3 text-[#94A3B8]">{incident.reported_by ?? "—"}</td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="relative group inline-block">
                        <button className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_BADGE[incident.status] ?? ""}`}>
                          {incident.status.replace("_", " ")}
                          <ChevronDown size={10} />
                        </button>
                        <div className="absolute left-0 top-full mt-1 bg-[#1A1F35] border border-[#252B45] rounded-lg shadow-xl z-10 hidden group-hover:block min-w-32">
                          {["open", "in_progress", "resolved", "closed"].map((s) => (
                            <button
                              key={s}
                              onClick={() => quickStatusUpdate(incident.id, s)}
                              className={`block w-full text-left px-3 py-2 text-xs hover:bg-[#252B45] transition-colors ${incident.status === s ? "text-[#A78BFA]" : "text-[#94A3B8]"}`}
                            >
                              {s.replace("_", " ")}
                            </button>
                          ))}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => openEdit(incident)}
                          className="p-1.5 text-[#64748B] hover:text-[#A78BFA] hover:bg-[#252B45] rounded transition-colors"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(incident.id)}
                          disabled={deleting === incident.id}
                          className="p-1.5 text-[#64748B] hover:text-[#EF4444] hover:bg-[#7F1D1D]/20 rounded transition-colors disabled:opacity-40"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-[#131729] border border-[#252B45] rounded-xl p-16 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#1A1F35] border border-[#252B45] flex items-center justify-center mb-4">
            <AlertTriangle size={28} className="text-[#64748B]" />
          </div>
          <h2 className="text-lg font-bold text-[#F1F5F9] mb-2">No incidents found</h2>
          <p className="text-[#64748B] text-sm mb-6 max-w-sm">
            {incidents.length > 0 ? "Try adjusting your filters." : "Log incidents across all clubs and track them to resolution."}
          </p>
          {incidents.length === 0 && (
            <button
              onClick={openCreate}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-sm font-semibold rounded-lg transition-colors"
            >
              <Plus size={16} />
              Log First Incident
            </button>
          )}
        </div>
      )}

      {/* View Modal */}
      {viewingIncident && !modalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={closeModal}>
          <div
            className="bg-[#0B0E1A] border border-[#252B45] rounded-2xl w-full max-w-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between p-6 border-b border-[#252B45]">
              <div>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${TYPE_BADGE[viewingIncident.type] ?? TYPE_BADGE["Other"]}`}>
                    {viewingIncident.type}
                  </span>
                  <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_BADGE[viewingIncident.status] ?? ""}`}>
                    {viewingIncident.status.replace("_", " ")}
                  </span>
                </div>
                <div className="text-xs text-[#64748B] mt-1 flex gap-3">
                  <span>{viewingIncident.club?.name ?? "—"}</span>
                  <span>{new Date(viewingIncident.date).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })}</span>
                  {viewingIncident.reported_by && <span>by {viewingIncident.reported_by}</span>}
                </div>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => { setViewingIncident(null); openEdit(viewingIncident); }}
                  className="p-2 text-[#64748B] hover:text-[#A78BFA] hover:bg-[#252B45] rounded-lg transition-colors"
                >
                  <Edit2 size={16} />
                </button>
                <button onClick={closeModal} className="p-2 text-[#64748B] hover:text-[#F1F5F9] hover:bg-[#252B45] rounded-lg transition-colors">
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <div className="text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-1.5">Description</div>
                <p className="text-sm text-[#94A3B8] whitespace-pre-wrap">{viewingIncident.description}</p>
              </div>
              {viewingIncident.resolution_notes && (
                <div>
                  <div className="text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-1.5">Resolution Notes</div>
                  <p className="text-sm text-[#94A3B8] whitespace-pre-wrap">{viewingIncident.resolution_notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit/Create Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={closeModal}>
          <div
            className="bg-[#0B0E1A] border border-[#252B45] rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-[#252B45]">
              <h2 className="text-lg font-bold text-[#F1F5F9]">{editing ? "Edit Incident" : "Log Incident"}</h2>
              <button onClick={closeModal} className="p-2 text-[#64748B] hover:text-[#F1F5F9] hover:bg-[#252B45] rounded-lg transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#64748B] mb-1.5 uppercase tracking-wide">Date *</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="w-full px-3 py-2.5 bg-[#131729] border border-[#252B45] rounded-lg text-[#F1F5F9] text-sm focus:outline-none focus:border-[#7C3AED] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#64748B] mb-1.5 uppercase tracking-wide">Club</label>
                  <select
                    value={form.club_id}
                    onChange={(e) => setForm({ ...form, club_id: e.target.value })}
                    className="w-full px-3 py-2.5 bg-[#131729] border border-[#252B45] rounded-lg text-[#F1F5F9] text-sm focus:outline-none focus:border-[#7C3AED] transition-colors"
                  >
                    {clubs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#64748B] mb-1.5 uppercase tracking-wide">Type</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="w-full px-3 py-2.5 bg-[#131729] border border-[#252B45] rounded-lg text-[#F1F5F9] text-sm focus:outline-none focus:border-[#7C3AED] transition-colors"
                  >
                    {INCIDENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#64748B] mb-1.5 uppercase tracking-wide">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full px-3 py-2.5 bg-[#131729] border border-[#252B45] rounded-lg text-[#F1F5F9] text-sm focus:outline-none focus:border-[#7C3AED] transition-colors"
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#64748B] mb-1.5 uppercase tracking-wide">Reported By</label>
                <input
                  type="text"
                  value={form.reported_by}
                  onChange={(e) => setForm({ ...form, reported_by: e.target.value })}
                  placeholder="Staff member name"
                  className="w-full px-3 py-2.5 bg-[#131729] border border-[#252B45] rounded-lg text-[#F1F5F9] text-sm placeholder-[#475569] focus:outline-none focus:border-[#7C3AED] transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#64748B] mb-1.5 uppercase tracking-wide">Description *</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={4}
                  placeholder="Describe what happened, who was involved, and any immediate actions taken…"
                  className="w-full px-3 py-2.5 bg-[#131729] border border-[#252B45] rounded-lg text-[#F1F5F9] text-sm placeholder-[#475569] focus:outline-none focus:border-[#7C3AED] transition-colors resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#64748B] mb-1.5 uppercase tracking-wide">Resolution Notes</label>
                <textarea
                  value={form.resolution_notes}
                  onChange={(e) => setForm({ ...form, resolution_notes: e.target.value })}
                  rows={3}
                  placeholder="How was this resolved? Any follow-up actions required?"
                  className="w-full px-3 py-2.5 bg-[#131729] border border-[#252B45] rounded-lg text-[#F1F5F9] text-sm placeholder-[#475569] focus:outline-none focus:border-[#7C3AED] transition-colors resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-6 border-t border-[#252B45]">
              {editing && (
                <button
                  onClick={() => handleDelete(editing.id)}
                  className="text-sm text-[#64748B] hover:text-[#EF4444] transition-colors flex items-center gap-1.5"
                >
                  <Trash2 size={14} />
                  Delete
                </button>
              )}
              <div className={`flex gap-3 ${!editing ? "ml-auto" : ""}`}>
                <button onClick={closeModal} className="px-4 py-2 text-sm text-[#94A3B8] hover:text-[#F1F5F9] transition-colors">
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !form.description.trim()}
                  className="px-5 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? "Saving…" : editing ? "Save Changes" : "Log Incident"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
