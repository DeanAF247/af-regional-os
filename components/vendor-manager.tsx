"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Plus,
  Search,
  Package,
  Edit2,
  Trash2,
  X,
  ExternalLink,
  Download,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

const VENDOR_CATEGORIES = [
  "Cleaning",
  "Equipment",
  "Marketing",
  "IT & Tech",
  "Maintenance",
  "Supplies",
  "Legal & Compliance",
  "Other",
];

interface Club {
  id: string;
  name: string;
}

interface Vendor {
  id: string;
  name: string;
  category: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  notes: string | null;
  status: string;
  vendor_clubs: { club_id: string; club: { name: string } | null }[];
}

interface FormState {
  name: string;
  category: string;
  contact_name: string;
  email: string;
  phone: string;
  website: string;
  notes: string;
  status: string;
  club_ids: string[];
}

const EMPTY_FORM: FormState = {
  name: "",
  category: "Cleaning",
  contact_name: "",
  email: "",
  phone: "",
  website: "",
  notes: "",
  status: "active",
  club_ids: [],
};

export default function VendorManager({
  vendors,
  clubs,
}: {
  vendors: Vendor[];
  clubs: Club[];
}) {
  const router = useRouter();
  const supabase = createClient();

  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");
  const [filterStatus, setFilterStatus] = useState("active");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Vendor | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  function openCreate(category?: string) {
    setEditing(null);
    setForm({ ...EMPTY_FORM, category: category ?? "Cleaning" });
    setModalOpen(true);
  }

  function openEdit(v: Vendor) {
    setEditing(v);
    setForm({
      name: v.name,
      category: v.category,
      contact_name: v.contact_name ?? "",
      email: v.email ?? "",
      phone: v.phone ?? "",
      website: v.website ?? "",
      notes: v.notes ?? "",
      status: v.status,
      club_ids: (v.vendor_clubs ?? []).map((vc) => vc.club_id),
    });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
    setForm(EMPTY_FORM);
  }

  function toggleClub(id: string) {
    setForm((prev) => ({
      ...prev,
      club_ids: prev.club_ids.includes(id)
        ? prev.club_ids.filter((c) => c !== id)
        : [...prev.club_ids, id],
    }));
  }

  async function handleSave() {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        category: form.category,
        contact_name: form.contact_name.trim() || null,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        website: form.website.trim() || null,
        notes: form.notes.trim() || null,
        status: form.status,
      };

      let vendorId = editing?.id;

      if (editing) {
        await supabase.from("vendors").update(payload).eq("id", editing.id);
        await supabase.from("vendor_clubs").delete().eq("vendor_id", editing.id);
      } else {
        const { data } = await supabase.from("vendors").insert(payload).select("id").single();
        vendorId = data?.id;
      }

      if (vendorId && form.club_ids.length > 0) {
        await supabase.from("vendor_clubs").insert(
          form.club_ids.map((club_id) => ({ vendor_id: vendorId, club_id }))
        );
      }

      closeModal();
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this vendor? This cannot be undone.")) return;
    setDeleting(id);
    await supabase.from("vendor_clubs").delete().eq("vendor_id", id);
    await supabase.from("vendors").delete().eq("id", id);
    setDeleting(null);
    router.refresh();
  }

  function exportCsv() {
    const rows = [
      ["Name", "Category", "Contact", "Email", "Phone", "Website", "Status", "Clubs"],
      ...filtered.map((v) => [
        v.name,
        v.category,
        v.contact_name ?? "",
        v.email ?? "",
        v.phone ?? "",
        v.website ?? "",
        v.status,
        (v.vendor_clubs ?? []).map((vc) => vc.club?.name ?? "").join("; "),
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
    a.download = "vendors.csv";
    a.click();
  }

  function toggleCollapse(cat: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }

  const filtered = vendors.filter((v) => {
    const matchSearch =
      !search ||
      v.name.toLowerCase().includes(search.toLowerCase()) ||
      (v.contact_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (v.email ?? "").toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCategory === "All" || v.category === filterCategory;
    const matchStatus = filterStatus === "All" || v.status === filterStatus;
    return matchSearch && matchCat && matchStatus;
  });

  const grouped = VENDOR_CATEGORIES.reduce<Record<string, Vendor[]>>((acc, cat) => {
    acc[cat] = filtered.filter((v) => v.category === cat);
    return acc;
  }, {});

  const activeCount = vendors.filter((v) => v.status === "active").length;

  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="flex items-center gap-3 flex-wrap flex-1">
          <div className="relative min-w-52 flex-1 max-w-72">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
            <input
              type="text"
              placeholder="Search vendors…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-[#131729] border border-[#252B45] rounded-lg text-[#F1F5F9] text-sm placeholder-[#64748B] focus:outline-none focus:border-[#7C3AED] transition-colors"
            />
          </div>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-2 bg-[#131729] border border-[#252B45] rounded-lg text-[#94A3B8] text-sm focus:outline-none focus:border-[#7C3AED] transition-colors"
          >
            <option value="All">All Categories</option>
            {VENDOR_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 bg-[#131729] border border-[#252B45] rounded-lg text-[#94A3B8] text-sm focus:outline-none focus:border-[#7C3AED] transition-colors"
          >
            <option value="All">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportCsv}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#1A1F35] border border-[#252B45] hover:border-[#7C3AED] text-[#94A3B8] hover:text-[#A78BFA] text-sm font-semibold rounded-lg transition-all"
          >
            <Download size={16} />
            Export CSV
          </button>
          <button
            onClick={() => openCreate()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-sm font-semibold rounded-lg transition-colors"
          >
            <Plus size={16} />
            Add Vendor
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-3 mb-6 text-sm text-[#64748B]">
        <span className="text-[#F1F5F9] font-semibold">{activeCount}</span> active vendors
        <span className="text-[#252B45]">·</span>
        <span className="text-[#F1F5F9] font-semibold">{filtered.length}</span> showing
      </div>

      {/* Category groups */}
      {VENDOR_CATEGORIES.map((category) => {
        const items = grouped[category] ?? [];
        const isCollapsed = collapsed.has(category);

        return (
          <div key={category} className="mb-5">
            <button
              onClick={() => toggleCollapse(category)}
              className="flex items-center gap-2 w-full mb-3 text-left group"
            >
              {isCollapsed ? (
                <ChevronRight size={14} className="text-[#64748B]" />
              ) : (
                <ChevronDown size={14} className="text-[#64748B]" />
              )}
              <span className="text-[11px] uppercase tracking-widest font-bold text-[#64748B] group-hover:text-[#94A3B8] transition-colors">
                {category}
              </span>
              <span className="text-[11px] text-[#475569] ml-1">({items.length})</span>
            </button>

            {!isCollapsed && (
              <>
                {items.length > 0 ? (
                  <div className="bg-[#131729] border border-[#252B45] rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-[#1A1F35] text-[#94A3B8] text-[11px] uppercase tracking-wide border-b border-[#252B45]">
                            <th className="text-left px-4 py-3 font-semibold">Vendor</th>
                            <th className="text-left px-4 py-3 font-semibold">Contact</th>
                            <th className="text-left px-4 py-3 font-semibold">Email</th>
                            <th className="text-left px-4 py-3 font-semibold">Phone</th>
                            <th className="text-left px-4 py-3 font-semibold">Clubs</th>
                            <th className="text-left px-4 py-3 font-semibold">Status</th>
                            <th className="px-4 py-3" />
                          </tr>
                        </thead>
                        <tbody>
                          {items.map((vendor) => (
                            <tr key={vendor.id} className="border-t border-[#252B45]/60 hover:bg-[#1A1F35]/50 transition-colors">
                              <td className="px-4 py-3">
                                <div className="font-semibold text-[#F1F5F9]">{vendor.name}</div>
                                {vendor.notes && (
                                  <div className="text-[11px] text-[#475569] mt-0.5 max-w-[180px] truncate">{vendor.notes}</div>
                                )}
                              </td>
                              <td className="px-4 py-3 text-[#94A3B8]">{vendor.contact_name ?? "—"}</td>
                              <td className="px-4 py-3 text-[#94A3B8]">
                                {vendor.email ? (
                                  <a href={`mailto:${vendor.email}`} className="hover:text-[#A78BFA] transition-colors">
                                    {vendor.email}
                                  </a>
                                ) : "—"}
                              </td>
                              <td className="px-4 py-3 text-[#94A3B8]">{vendor.phone ?? "—"}</td>
                              <td className="px-4 py-3">
                                <div className="flex flex-wrap gap-1">
                                  {(vendor.vendor_clubs ?? []).length > 0
                                    ? vendor.vendor_clubs.map((vc) => (
                                        <span key={vc.club_id} className="inline-block px-2 py-0.5 bg-[#252B45] text-[#94A3B8] text-[10px] rounded-full">
                                          {vc.club?.name ?? "?"}
                                        </span>
                                      ))
                                    : <span className="text-[11px] text-[#475569]">All clubs</span>
                                  }
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                                  vendor.status === "active" ? "bg-[#064E3B] text-[#10B981]" : "bg-[#252B45] text-[#64748B]"
                                }`}>
                                  {vendor.status}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-1 justify-end">
                                  {vendor.website && (
                                    <a
                                      href={vendor.website}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="p-1.5 text-[#64748B] hover:text-[#3B82F6] hover:bg-[#252B45] rounded transition-colors"
                                    >
                                      <ExternalLink size={14} />
                                    </a>
                                  )}
                                  <button
                                    onClick={() => openEdit(vendor)}
                                    className="p-1.5 text-[#64748B] hover:text-[#A78BFA] hover:bg-[#252B45] rounded transition-colors"
                                  >
                                    <Edit2 size={14} />
                                  </button>
                                  <button
                                    onClick={() => handleDelete(vendor.id)}
                                    disabled={deleting === vendor.id}
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
                  <div className="bg-[#131729] border border-[#252B45] rounded-xl p-5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Package size={18} className="text-[#252B45]" />
                      <p className="text-sm text-[#475569]">No vendors in this category.</p>
                    </div>
                    <button
                      onClick={() => openCreate(category)}
                      className="text-xs text-[#7C3AED] hover:text-[#A78BFA] transition-colors flex items-center gap-1"
                    >
                      <Plus size={12} />
                      Add
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        );
      })}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={closeModal}>
          <div
            className="bg-[#0B0E1A] border border-[#252B45] rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-[#252B45]">
              <h2 className="text-lg font-bold text-[#F1F5F9]">{editing ? "Edit Vendor" : "Add Vendor"}</h2>
              <button onClick={closeModal} className="p-2 text-[#64748B] hover:text-[#F1F5F9] hover:bg-[#252B45] rounded-lg transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#64748B] mb-1.5 uppercase tracking-wide">Vendor Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Clean Co."
                  className="w-full px-3 py-2.5 bg-[#131729] border border-[#252B45] rounded-lg text-[#F1F5F9] text-sm placeholder-[#475569] focus:outline-none focus:border-[#7C3AED] transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#64748B] mb-1.5 uppercase tracking-wide">Category</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full px-3 py-2.5 bg-[#131729] border border-[#252B45] rounded-lg text-[#F1F5F9] text-sm focus:outline-none focus:border-[#7C3AED] transition-colors"
                  >
                    {VENDOR_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#64748B] mb-1.5 uppercase tracking-wide">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full px-3 py-2.5 bg-[#131729] border border-[#252B45] rounded-lg text-[#F1F5F9] text-sm focus:outline-none focus:border-[#7C3AED] transition-colors"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#64748B] mb-1.5 uppercase tracking-wide">Contact Name</label>
                  <input
                    type="text"
                    value={form.contact_name}
                    onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
                    placeholder="e.g. Jane Smith"
                    className="w-full px-3 py-2.5 bg-[#131729] border border-[#252B45] rounded-lg text-[#F1F5F9] text-sm placeholder-[#475569] focus:outline-none focus:border-[#7C3AED] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#64748B] mb-1.5 uppercase tracking-wide">Phone</label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="0400 000 000"
                    className="w-full px-3 py-2.5 bg-[#131729] border border-[#252B45] rounded-lg text-[#F1F5F9] text-sm placeholder-[#475569] focus:outline-none focus:border-[#7C3AED] transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#64748B] mb-1.5 uppercase tracking-wide">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="contact@vendor.com"
                    className="w-full px-3 py-2.5 bg-[#131729] border border-[#252B45] rounded-lg text-[#F1F5F9] text-sm placeholder-[#475569] focus:outline-none focus:border-[#7C3AED] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#64748B] mb-1.5 uppercase tracking-wide">Website</label>
                  <input
                    type="url"
                    value={form.website}
                    onChange={(e) => setForm({ ...form, website: e.target.value })}
                    placeholder="https://vendor.com"
                    className="w-full px-3 py-2.5 bg-[#131729] border border-[#252B45] rounded-lg text-[#F1F5F9] text-sm placeholder-[#475569] focus:outline-none focus:border-[#7C3AED] transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#64748B] mb-1.5 uppercase tracking-wide">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={3}
                  placeholder="Contract details, renewal dates, special terms…"
                  className="w-full px-3 py-2.5 bg-[#131729] border border-[#252B45] rounded-lg text-[#F1F5F9] text-sm placeholder-[#475569] focus:outline-none focus:border-[#7C3AED] transition-colors resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#64748B] mb-2 uppercase tracking-wide">
                  Clubs (leave blank = all clubs)
                </label>
                <div className="flex flex-wrap gap-2">
                  {clubs.map((club) => {
                    const selected = form.club_ids.includes(club.id);
                    return (
                      <button
                        key={club.id}
                        type="button"
                        onClick={() => toggleClub(club.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          selected
                            ? "bg-[#3B1F7A] text-[#A78BFA] border border-[#7C3AED]"
                            : "bg-[#131729] border border-[#252B45] text-[#64748B] hover:text-[#94A3B8]"
                        }`}
                      >
                        {club.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-6 border-t border-[#252B45]">
              {editing && (
                <button
                  onClick={() => { handleDelete(editing.id); closeModal(); }}
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
                  disabled={saving || !form.name.trim()}
                  className="px-5 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? "Saving…" : editing ? "Save Changes" : "Add Vendor"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
