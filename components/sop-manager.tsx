"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Plus,
  Search,
  FileText,
  Edit2,
  Trash2,
  X,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  CheckCircle,
  Clock,
} from "lucide-react";

const SOP_CATEGORIES = [
  "Operations",
  "Marketing",
  "HR & Staff",
  "Finance",
  "Safety & Compliance",
  "Member Experience",
  "Other",
];

interface Sop {
  id: string;
  title: string;
  category: string;
  content: string | null;
  status: string;
  version: string | null;
  owner: string | null;
  last_reviewed: string | null;
  created_at: string;
}

interface FormState {
  title: string;
  category: string;
  content: string;
  status: string;
  version: string;
  owner: string;
  last_reviewed: string;
}

const EMPTY_FORM: FormState = {
  title: "",
  category: "Operations",
  content: "",
  status: "draft",
  version: "1.0",
  owner: "",
  last_reviewed: "",
};

const STATUS_STYLES: Record<string, string> = {
  published: "bg-[#064E3B] text-[#10B981]",
  draft:     "bg-[#252B45] text-[#64748B]",
  archived:  "bg-[#1A1F35] text-[#475569]",
};

export default function SopManager({ sops }: { sops: Sop[] }) {
  const router = useRouter();
  const supabase = createClient();

  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Sop | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [viewingSop, setViewingSop] = useState<Sop | null>(null);

  function openCreate(category?: string) {
    setEditing(null);
    setForm({ ...EMPTY_FORM, category: category ?? "Operations" });
    setModalOpen(true);
  }

  function openEdit(sop: Sop) {
    setEditing(sop);
    setForm({
      title: sop.title,
      category: sop.category,
      content: sop.content ?? "",
      status: sop.status,
      version: sop.version ?? "1.0",
      owner: sop.owner ?? "",
      last_reviewed: sop.last_reviewed ?? "",
    });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
    setForm(EMPTY_FORM);
  }

  async function handleSave() {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        category: form.category,
        content: form.content.trim() || null,
        status: form.status,
        version: form.version.trim() || null,
        owner: form.owner.trim() || null,
        last_reviewed: form.last_reviewed || null,
      };

      if (editing) {
        await supabase.from("sops").update(payload).eq("id", editing.id);
      } else {
        await supabase.from("sops").insert(payload);
      }

      closeModal();
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this SOP? This cannot be undone.")) return;
    setDeleting(id);
    await supabase.from("sops").delete().eq("id", id);
    setDeleting(null);
    router.refresh();
  }

  function toggleCategory(cat: string) {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }

  // Filter
  const filtered = sops.filter((s) => {
    const matchSearch =
      !search ||
      s.title.toLowerCase().includes(search.toLowerCase()) ||
      (s.content ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (s.owner ?? "").toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCategory === "All" || s.category === filterCategory;
    const matchStatus = filterStatus === "All" || s.status === filterStatus;
    return matchSearch && matchCat && matchStatus;
  });

  // Group by category
  const grouped = SOP_CATEGORIES.reduce<Record<string, Sop[]>>((acc, cat) => {
    acc[cat] = filtered.filter((s) => s.category === cat);
    return acc;
  }, {});

  const publishedCount = sops.filter((s) => s.status === "published").length;
  const draftCount = sops.filter((s) => s.status === "draft").length;

  return (
    <>
      {/* Stats row */}
      <div className="flex gap-4 mb-6">
        <div className="bg-[#131729] border border-[#252B45] rounded-xl px-4 py-3 flex items-center gap-3">
          <CheckCircle size={16} className="text-[#10B981]" />
          <div>
            <div className="text-lg font-bold text-[#F1F5F9]">{publishedCount}</div>
            <div className="text-xs text-[#64748B]">Published</div>
          </div>
        </div>
        <div className="bg-[#131729] border border-[#252B45] rounded-xl px-4 py-3 flex items-center gap-3">
          <Clock size={16} className="text-[#64748B]" />
          <div>
            <div className="text-lg font-bold text-[#F1F5F9]">{draftCount}</div>
            <div className="text-xs text-[#64748B]">Drafts</div>
          </div>
        </div>
        <div className="bg-[#131729] border border-[#252B45] rounded-xl px-4 py-3 flex items-center gap-3">
          <FileText size={16} className="text-[#7C3AED]" />
          <div>
            <div className="text-lg font-bold text-[#F1F5F9]">{sops.length}</div>
            <div className="text-xs text-[#64748B]">Total SOPs</div>
          </div>
        </div>
        <div className="ml-auto">
          <button
            onClick={() => openCreate()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-sm font-semibold rounded-lg transition-colors"
          >
            <Plus size={16} />
            New SOP
          </button>
        </div>
      </div>

      {/* Search & filter */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <div className="flex-1 min-w-56 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
          <input
            type="text"
            placeholder="Search SOPs…"
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
          {SOP_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 bg-[#131729] border border-[#252B45] rounded-lg text-[#94A3B8] text-sm focus:outline-none focus:border-[#7C3AED] transition-colors"
        >
          <option value="All">All Statuses</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {/* Category groups */}
      {SOP_CATEGORIES.map((category) => {
        const items = grouped[category] ?? [];
        const isCollapsed = collapsedCategories.has(category);

        return (
          <div key={category} className="mb-5">
            <button
              onClick={() => toggleCategory(category)}
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
                    {items.map((sop, i) => (
                      <div
                        key={sop.id}
                        className={`flex items-center gap-4 px-4 py-3.5 hover:bg-[#1A1F35]/60 transition-colors cursor-pointer ${
                          i > 0 ? "border-t border-[#252B45]/60" : ""
                        }`}
                        onClick={() => setViewingSop(sop)}
                      >
                        <FileText size={16} className="text-[#64748B] flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-[#F1F5F9] truncate">{sop.title}</span>
                            {sop.version && (
                              <span className="text-[10px] text-[#475569] border border-[#252B45] rounded px-1.5 py-0.5 flex-shrink-0">
                                v{sop.version}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-0.5">
                            {sop.owner && <span className="text-[12px] text-[#64748B]">{sop.owner}</span>}
                            {sop.last_reviewed && (
                              <span className="text-[12px] text-[#475569]">
                                Reviewed {new Date(sop.last_reviewed).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                              </span>
                            )}
                            {sop.content && (
                              <span className="text-[12px] text-[#475569] truncate max-w-xs hidden sm:block">
                                {sop.content.slice(0, 80)}{sop.content.length > 80 ? "…" : ""}
                              </span>
                            )}
                          </div>
                        </div>
                        <span className={`flex-shrink-0 inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_STYLES[sop.status] ?? ""}`}>
                          {sop.status}
                        </span>
                        <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => openEdit(sop)}
                            className="p-1.5 text-[#64748B] hover:text-[#A78BFA] hover:bg-[#252B45] rounded transition-colors"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(sop.id)}
                            disabled={deleting === sop.id}
                            className="p-1.5 text-[#64748B] hover:text-[#EF4444] hover:bg-[#7F1D1D]/20 rounded transition-colors disabled:opacity-40"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-[#131729] border border-[#252B45] rounded-xl p-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText size={20} className="text-[#252B45]" />
                      <p className="text-sm text-[#475569]">No SOPs in this category yet.</p>
                    </div>
                    <button
                      onClick={() => openCreate(category)}
                      className="text-xs text-[#7C3AED] hover:text-[#A78BFA] transition-colors flex items-center gap-1"
                    >
                      <Plus size={12} />
                      Add SOP
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        );
      })}

      {/* View Modal */}
      {viewingSop && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setViewingSop(null)}>
          <div
            className="bg-[#0B0E1A] border border-[#252B45] rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between p-6 border-b border-[#252B45]">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-lg font-bold text-[#F1F5F9]">{viewingSop.title}</h2>
                  {viewingSop.version && (
                    <span className="text-[11px] text-[#475569] border border-[#252B45] rounded px-1.5 py-0.5">v{viewingSop.version}</span>
                  )}
                  <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_STYLES[viewingSop.status] ?? ""}`}>
                    {viewingSop.status}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-[#64748B]">
                  <span>{viewingSop.category}</span>
                  {viewingSop.owner && <span>Owner: {viewingSop.owner}</span>}
                  {viewingSop.last_reviewed && (
                    <span>Reviewed: {new Date(viewingSop.last_reviewed).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setViewingSop(null); openEdit(viewingSop); }}
                  className="p-2 text-[#64748B] hover:text-[#A78BFA] hover:bg-[#252B45] rounded-lg transition-colors"
                >
                  <Edit2 size={16} />
                </button>
                <button onClick={() => setViewingSop(null)} className="p-2 text-[#64748B] hover:text-[#F1F5F9] hover:bg-[#252B45] rounded-lg transition-colors">
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="p-6">
              {viewingSop.content ? (
                <div className="text-sm text-[#94A3B8] whitespace-pre-wrap leading-relaxed">{viewingSop.content}</div>
              ) : (
                <p className="text-sm text-[#475569] italic">No content added yet.</p>
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
              <h2 className="text-lg font-bold text-[#F1F5F9]">{editing ? "Edit SOP" : "New SOP"}</h2>
              <button onClick={closeModal} className="p-2 text-[#64748B] hover:text-[#F1F5F9] hover:bg-[#252B45] rounded-lg transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#64748B] mb-1.5 uppercase tracking-wide">Title *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. New Member Onboarding Process"
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
                    {SOP_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#64748B] mb-1.5 uppercase tracking-wide">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full px-3 py-2.5 bg-[#131729] border border-[#252B45] rounded-lg text-[#F1F5F9] text-sm focus:outline-none focus:border-[#7C3AED] transition-colors"
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#64748B] mb-1.5 uppercase tracking-wide">Owner / Responsible</label>
                  <input
                    type="text"
                    value={form.owner}
                    onChange={(e) => setForm({ ...form, owner: e.target.value })}
                    placeholder="e.g. Regional Manager"
                    className="w-full px-3 py-2.5 bg-[#131729] border border-[#252B45] rounded-lg text-[#F1F5F9] text-sm placeholder-[#475569] focus:outline-none focus:border-[#7C3AED] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#64748B] mb-1.5 uppercase tracking-wide">Version</label>
                  <input
                    type="text"
                    value={form.version}
                    onChange={(e) => setForm({ ...form, version: e.target.value })}
                    placeholder="1.0"
                    className="w-full px-3 py-2.5 bg-[#131729] border border-[#252B45] rounded-lg text-[#F1F5F9] text-sm placeholder-[#475569] focus:outline-none focus:border-[#7C3AED] transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#64748B] mb-1.5 uppercase tracking-wide">Last Reviewed Date</label>
                <input
                  type="date"
                  value={form.last_reviewed}
                  onChange={(e) => setForm({ ...form, last_reviewed: e.target.value })}
                  className="w-full px-3 py-2.5 bg-[#131729] border border-[#252B45] rounded-lg text-[#F1F5F9] text-sm focus:outline-none focus:border-[#7C3AED] transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#64748B] mb-1.5 uppercase tracking-wide">Content / Procedure</label>
                <textarea
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  rows={10}
                  placeholder="Write the SOP content here. Use plain text — describe the steps, responsibilities, and any important notes."
                  className="w-full px-3 py-2.5 bg-[#131729] border border-[#252B45] rounded-lg text-[#F1F5F9] text-sm placeholder-[#475569] focus:outline-none focus:border-[#7C3AED] transition-colors resize-y font-mono"
                />
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
                  disabled={saving || !form.title.trim()}
                  className="px-5 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? "Saving…" : editing ? "Save Changes" : "Create SOP"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
