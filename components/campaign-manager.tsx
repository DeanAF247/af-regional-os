"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import {
  Plus, X, Megaphone, Calendar, DollarSign,
  Pencil, Trash2, Loader2, ChevronDown, ChevronUp, Check,
} from "lucide-react";

// ─── Activity Library ───────────────────────────────────────────────────────

interface ActivityDef {
  label: string;
  emoji: string;
  color: string;       // active pill classes
  tasks: string[];
}

const ACTIVITY_LIBRARY: Record<string, ActivityDef> = {
  meta_ads: {
    label: "Meta Ads",
    emoji: "📱",
    color: "bg-[#1E3A5F] text-[#60A5FA] border-[#1D4ED8]/60",
    tasks: [
      "Define target audience & demographics",
      "Set campaign objective (Leads / Traffic / Conversions)",
      "Create ad creative — images or video",
      "Write ad copy & headline",
      "Set up Meta Pixel / Conversions API tracking",
      "Configure budget & bid strategy",
      "Set up A/B test variants",
      "Submit ads for review",
      "Monitor performance daily for first week",
      "Optimise based on results",
    ],
  },
  google_ads: {
    label: "Google Ads",
    emoji: "🔍",
    color: "bg-[#7F1D1D]/40 text-[#FCA5A5] border-[#991B1B]/60",
    tasks: [
      "Define keywords & match types",
      "Write ad copy & extensions",
      "Set up conversion tracking",
      "Configure bidding strategy",
      "Set daily budget cap",
      "Create or review landing page",
      "Launch campaign",
      "Review quality scores weekly",
      "Monitor & optimise",
    ],
  },
  email_campaign: {
    label: "Email Campaign",
    emoji: "✉️",
    color: "bg-[#064E3B]/50 text-[#34D399] border-[#065F46]/60",
    tasks: [
      "Define email list / audience segment",
      "Write subject line & preview text",
      "Design email template",
      "Write body copy & CTA",
      "Add UTM tracking links",
      "Test email on mobile & desktop",
      "Send test to team for approval",
      "Schedule or send campaign",
      "Review open rate & click-through rate",
      "Follow up with non-openers (optional)",
    ],
  },
  sms_campaign: {
    label: "SMS Campaign",
    emoji: "💬",
    color: "bg-[#3B1F7A]/50 text-[#C4B5FD] border-[#6D28D9]/60",
    tasks: [
      "Define SMS contact list (opt-in only)",
      "Write SMS copy (160 char limit)",
      "Include opt-out instruction",
      "Get manager approval on copy",
      "Schedule send time",
      "Send test SMS to team",
      "Launch campaign",
      "Review delivery & response rate",
    ],
  },
  flyers: {
    label: "Flyers",
    emoji: "📄",
    color: "bg-[#78350F]/40 text-[#FCD34D] border-[#92400E]/60",
    tasks: [
      "Brief designer with campaign details",
      "Review first design draft",
      "Approve final design",
      "Get print quote",
      "Place print order",
      "Receive printed stock",
      "Plan distribution (letterbox / in-club / events)",
      "Distribute flyers",
    ],
  },
  corflutes: {
    label: "Corflutes",
    emoji: "🪧",
    color: "bg-[#78350F]/40 text-[#FCD34D] border-[#92400E]/60",
    tasks: [
      "Brief designer with dimensions & campaign brief",
      "Review first design draft",
      "Approve final artwork",
      "Get print quote",
      "Place print order",
      "Plan placement locations (council approval if needed)",
      "Receive printed stock",
      "Install corflutes at all locations",
      "Remove after campaign ends",
    ],
  },
  signage: {
    label: "Signage",
    emoji: "🏷️",
    color: "bg-[#1A1F35] text-[#94A3B8] border-[#334155]/60",
    tasks: [
      "Define signage locations (internal / external)",
      "Brief designer with specs & dimensions",
      "Review & approve artwork",
      "Get production quote",
      "Order signage production",
      "Receive produced signage",
      "Install at all clubs",
      "Remove / replace after campaign",
    ],
  },
  social_organic: {
    label: "Social (Organic)",
    emoji: "📸",
    color: "bg-[#831843]/40 text-[#F9A8D4] border-[#9D174D]/60",
    tasks: [
      "Plan content calendar for campaign period",
      "Create post graphics / photos / video",
      "Write captions for each post",
      "Get approval on content",
      "Schedule posts in advance",
      "Publish to Instagram, Facebook, TikTok",
      "Engage with comments & DMs daily",
      "Review reach & engagement after campaign",
    ],
  },
  referral_program: {
    label: "Referral Program",
    emoji: "👥",
    color: "bg-[#064E3B]/50 text-[#34D399] border-[#065F46]/60",
    tasks: [
      "Define referral incentive (e.g. free week, discount)",
      "Create referral cards or digital link",
      "Brief all front desk staff",
      "Set up tracking in CRM / system",
      "Display referral materials in-club",
      "Run for duration of campaign",
      "Track referrals & reward members",
      "Review total referrals at end",
    ],
  },
  in_club_promo: {
    label: "In-Club Promo",
    emoji: "🏋️",
    color: "bg-[#3B1F7A]/50 text-[#C4B5FD] border-[#6D28D9]/60",
    tasks: [
      "Design in-club display materials",
      "Brief front desk & floor staff",
      "Set up physical displays at entry",
      "Train staff on promo details & script",
      "Run promo activities (free trial, open day, etc.)",
      "Track leads from in-club activity",
      "Review results with team",
    ],
  },
  radio_podcast: {
    label: "Radio / Podcast",
    emoji: "📻",
    color: "bg-[#7C2D12]/40 text-[#FDBA74] border-[#9A3412]/60",
    tasks: [
      "Define target stations / podcasts & audience",
      "Write ad script (30s or 60s)",
      "Record voiceover / audio",
      "Get approval on final audio",
      "Book media slots",
      "Confirm airing dates & times",
      "Monitor and review reach",
    ],
  },
};

const ACTIVITY_KEYS = Object.keys(ACTIVITY_LIBRARY) as (keyof typeof ACTIVITY_LIBRARY)[];

// ─── Types ───────────────────────────────────────────────────────────────────

interface Club { id: string; name: string }

interface ActivityTask { id: string; label: string; completed: boolean }
interface CampaignActivity { key: string; tasks: ActivityTask[] }

interface Campaign {
  id: string;
  name: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  budget: number | null;
  status: string;
  activities: CampaignActivity[] | null;
  campaign_clubs: { club_id: string }[];
}

type FormState = {
  name: string;
  description: string;
  status: string;
  start_date: string;
  end_date: string;
  budget: string;
  clubIds: string[];
  activities: CampaignActivity[];
};

const EMPTY_FORM: FormState = {
  name: "", description: "", status: "planned",
  start_date: "", end_date: "", budget: "",
  clubIds: [], activities: [],
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeActivity(key: string): CampaignActivity {
  return { key, tasks: [] };
}

function formatDate(d: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}
function formatBudget(b: number | null) {
  if (b == null) return null;
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(b);
}

const STATUS_STYLES: Record<string, string> = {
  planned:   "bg-[#1E2640] text-[#94A3B8] border-[#252B45]",
  active:    "bg-[#064E3B]/40 text-[#10B981] border-[#065F46]",
  completed: "bg-[#1A1F35] text-[#475569] border-[#252B45]",
  paused:    "bg-[#78350F]/30 text-[#F59E0B] border-[#92400E]",
};
const STATUS_DOT: Record<string, string> = {
  planned: "bg-[#64748B]", active: "bg-[#10B981]",
  completed: "bg-[#475569]", paused: "bg-[#F59E0B]",
};
const STATUSES = ["planned", "active", "completed", "paused"] as const;

// ─── Component ───────────────────────────────────────────────────────────────

export default function CampaignManager({ campaigns: initial, clubs }: { campaigns: Campaign[]; clubs: Club[] }) {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState(initial);
  // Sync local state when server re-fetches after router.refresh()
  useEffect(() => { setCampaigns(initial); }, [initial]);
  const [filter, setFilter]       = useState("all");
  const [modal, setModal]         = useState<"create" | "edit" | null>(null);
  const [editId, setEditId]       = useState<string | null>(null);
  const [form, setForm]           = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving]       = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleting, setDeleting]   = useState<string | null>(null);
  const [expandedActivity, setExpandedActivity] = useState<string | null>(null);
  const [viewingCampaign, setViewingCampaign]   = useState<Campaign | null>(null);
  const [newTaskText, setNewTaskText]           = useState<Record<string, string>>({});

  const filtered = filter === "all" ? campaigns : campaigns.filter((c) => c.status === filter);

  // ── Modal helpers ──────────────────────────────────────────────────────────

  function openCreate() {
    setForm(EMPTY_FORM);
    setEditId(null);
    setExpandedActivity(null);
    setSaveError(null);
    setModal("create");
  }

  function openEdit(c: Campaign) {
    setSaveError(null);
    setForm({
      name:        c.name,
      description: c.description ?? "",
      status:      c.status,
      start_date:  c.start_date ?? "",
      end_date:    c.end_date ?? "",
      budget:      c.budget != null ? String(c.budget) : "",
      clubIds:     c.campaign_clubs.map((cc) => cc.club_id),
      activities:  c.activities ?? [],
    });
    setEditId(c.id);
    setExpandedActivity(null);
    setModal("edit");
  }

  function closeModal() {
    setModal(null);
    setEditId(null);
    setViewingCampaign(null);
  }

  function toggleClub(id: string) {
    setForm((f) => ({
      ...f,
      clubIds: f.clubIds.includes(id) ? f.clubIds.filter((x) => x !== id) : [...f.clubIds, id],
    }));
  }

  // ── Activity helpers ───────────────────────────────────────────────────────

  function toggleActivity(key: string) {
    setForm((f) => {
      const exists = f.activities.find((a) => a.key === key);
      if (exists) {
        // Remove
        const next = f.activities.filter((a) => a.key !== key);
        if (expandedActivity === key) setExpandedActivity(null);
        return { ...f, activities: next };
      } else {
        // Add with defaults, then auto-expand
        setExpandedActivity(key);
        return { ...f, activities: [...f.activities, makeActivity(key)] };
      }
    });
  }

  function toggleTask(activityKey: string, taskId: string) {
    setForm((f) => ({
      ...f,
      activities: f.activities.map((a) =>
        a.key !== activityKey ? a : {
          ...a,
          tasks: a.tasks.map((t) => t.id === taskId ? { ...t, completed: !t.completed } : t),
        }
      ),
    }));
  }

  function addTask(activityKey: string) {
    const label = (newTaskText[activityKey] ?? "").trim();
    if (!label) return;
    const id = `${activityKey}_${Date.now()}`;
    setForm((f) => ({
      ...f,
      activities: f.activities.map((a) =>
        a.key !== activityKey ? a : { ...a, tasks: [...a.tasks, { id, label, completed: false }] }
      ),
    }));
    setNewTaskText((prev) => ({ ...prev, [activityKey]: "" }));
  }

  function removeTask(activityKey: string, taskId: string) {
    setForm((f) => ({
      ...f,
      activities: f.activities.map((a) =>
        a.key !== activityKey ? a : { ...a, tasks: a.tasks.filter((t) => t.id !== taskId) }
      ),
    }));
  }

  // ── Save / Delete ──────────────────────────────────────────────────────────

  async function handleSave() {
    if (!form.name.trim()) return;
    setSaving(true);
    setSaveError(null);
    const supabase = createClient();

    // Try without activities first in case the column doesn't exist yet,
    // then retry with it once we know the base insert works.
    const payload = {
      name:        form.name.trim(),
      description: form.description.trim() || null,
      status:      form.status,
      start_date:  form.start_date || null,
      end_date:    form.end_date || null,
      budget:      form.budget ? parseFloat(form.budget) : null,
      activities:  form.activities,
    };

    try {
      if (modal === "create") {
        const { data, error } = await supabase.from("campaigns").insert(payload).select().single();
        if (error) throw error;
        if (data && form.clubIds.length > 0) {
          const { error: clubErr } = await supabase.from("campaign_clubs").insert(
            form.clubIds.map((club_id) => ({ campaign_id: data.id, club_id }))
          );
          if (clubErr) throw clubErr;
        }
      } else if (modal === "edit" && editId) {
        const { error } = await supabase.from("campaigns").update(payload).eq("id", editId);
        if (error) throw error;
        await supabase.from("campaign_clubs").delete().eq("campaign_id", editId);
        if (form.clubIds.length > 0) {
          const { error: clubErr } = await supabase.from("campaign_clubs").insert(
            form.clubIds.map((club_id) => ({ campaign_id: editId, club_id }))
          );
          if (clubErr) throw clubErr;
        }
      }

      setSaving(false);
      closeModal();
      router.refresh();
    } catch (err: any) {
      console.error("Campaign save error:", err);
      setSaveError(err?.message ?? "Failed to save. Check the console for details.");
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    const supabase = createClient();
    await supabase.from("campaign_clubs").delete().eq("campaign_id", id);
    const { error } = await supabase.from("campaigns").delete().eq("id", id);
    if (!error) {
      setCampaigns((prev) => prev.filter((c) => c.id !== id));
      router.refresh();
    }
    setDeleting(null);
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Filter tabs */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex gap-2 flex-wrap">
          {["all", ...STATUSES].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${
                filter === s
                  ? "bg-[#3B1F7A] text-[#A78BFA]"
                  : "bg-[#131729] border border-[#252B45] text-[#64748B] hover:text-[#94A3B8]"
              }`}
            >
              {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
              {s !== "all" && (
                <span className="ml-1.5 text-[10px] opacity-60">
                  {campaigns.filter((c) => c.status === s).length}
                </span>
              )}
            </button>
          ))}
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-sm font-semibold rounded-lg transition-colors"
        >
          <Plus size={16} />
          New Campaign
        </button>
      </div>

      {/* Campaign cards */}
      {filtered.length === 0 ? (
        <div className="bg-[#131729] border border-[#252B45] rounded-xl p-16 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#1A1F35] border border-[#252B45] flex items-center justify-center mb-4">
            <Megaphone size={28} className="text-[#64748B]" />
          </div>
          <h2 className="text-lg font-bold text-[#F1F5F9] mb-2">
            {filter === "all" ? "No campaigns yet" : `No ${filter} campaigns`}
          </h2>
          <p className="text-[#64748B] text-sm mb-6 max-w-sm">
            {filter === "all"
              ? "Create your first campaign to track activities, checklists, budgets and clubs."
              : `No campaigns with status "${filter}" found.`}
          </p>
          {filter === "all" && (
            <button onClick={openCreate} className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-sm font-semibold rounded-lg transition-colors">
              <Plus size={16} />
              Create Campaign
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((c) => {
            const assignedClubs = clubs.filter((cl) => c.campaign_clubs.some((cc) => cc.club_id === cl.id));
            const activities = c.activities ?? [];
            const totalTasks = activities.reduce((sum, a) => sum + a.tasks.length, 0);
            const doneTasks  = activities.reduce((sum, a) => sum + a.tasks.filter((t) => t.completed).length, 0);

            return (
              <div
                key={c.id}
                onClick={() => setViewingCampaign(c)}
                className="bg-[#131729] border border-[#252B45] rounded-xl p-5 hover:border-[#7C3AED]/40 transition-colors cursor-pointer"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-[#F1F5F9] text-base truncate">{c.name}</h3>
                    {c.description && (
                      <p className="text-[#64748B] text-sm mt-0.5 line-clamp-2">{c.description}</p>
                    )}
                  </div>
                  <span className={`flex-shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${STATUS_STYLES[c.status]}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[c.status]}`} />
                    {c.status.charAt(0).toUpperCase() + c.status.slice(1)}
                  </span>
                </div>

                {/* Meta row */}
                <div className="flex flex-wrap gap-4 text-xs text-[#64748B] mb-3">
                  {(c.start_date || c.end_date) && (
                    <div className="flex items-center gap-1.5">
                      <Calendar size={12} />
                      <span>{formatDate(c.start_date) ?? "—"}{c.end_date ? ` → ${formatDate(c.end_date)}` : ""}</span>
                    </div>
                  )}
                  {c.budget != null && (
                    <div className="flex items-center gap-1.5">
                      <DollarSign size={12} />
                      <span>{formatBudget(c.budget)}</span>
                    </div>
                  )}
                </div>

                {/* Activity pills */}
                {activities.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {activities.map((a) => {
                      const def = ACTIVITY_LIBRARY[a.key];
                      if (!def) return null;
                      const done = a.tasks.filter((t) => t.completed).length;
                      return (
                        <span key={a.key} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${def.color}`}>
                          {def.emoji} {def.label}
                          <span className="opacity-60 ml-0.5">{done}/{a.tasks.length}</span>
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* Progress bar */}
                {totalTasks > 0 && (
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-[11px] text-[#64748B] mb-1">
                      <span>Overall progress</span>
                      <span className={doneTasks === totalTasks ? "text-[#10B981]" : ""}>{doneTasks}/{totalTasks} tasks</span>
                    </div>
                    <div className="h-1.5 bg-[#1A1F35] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#7C3AED] rounded-full transition-all"
                        style={{ width: `${(doneTasks / totalTasks) * 100}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Clubs */}
                {assignedClubs.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {assignedClubs.map((cl) => (
                      <span key={cl.id} className="px-2 py-0.5 bg-[#1A1F35] border border-[#252B45] rounded-full text-[11px] text-[#94A3B8]">
                        {cl.name}
                      </span>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 pt-3 border-t border-[#252B45]" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => openEdit(c)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[#1A1F35] transition-colors"
                  >
                    <Pencil size={12} />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(c.id)}
                    disabled={deleting === c.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#64748B] hover:text-[#EF4444] hover:bg-[#7F1D1D]/20 transition-colors disabled:opacity-50"
                  >
                    {deleting === c.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── View Modal ─────────────────────────────────────────────────────── */}
      {viewingCampaign && !modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={closeModal}>
          <div className="absolute inset-0 bg-black/70" />
          <div
            className="relative bg-[#0B0E1A] border border-[#252B45] rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between px-6 py-5 border-b border-[#252B45]">
              <div>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h2 className="text-lg font-bold text-[#F1F5F9]">{viewingCampaign.name}</h2>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${STATUS_STYLES[viewingCampaign.status]}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[viewingCampaign.status]}`} />
                    {viewingCampaign.status}
                  </span>
                </div>
                {viewingCampaign.description && (
                  <p className="text-sm text-[#64748B] mt-1">{viewingCampaign.description}</p>
                )}
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button onClick={() => { setViewingCampaign(null); openEdit(viewingCampaign); }} className="p-2 text-[#64748B] hover:text-[#A78BFA] hover:bg-[#252B45] rounded-lg transition-colors">
                  <Pencil size={16} />
                </button>
                <button onClick={closeModal} className="p-2 text-[#64748B] hover:text-[#F1F5F9] hover:bg-[#252B45] rounded-lg transition-colors">
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="px-6 py-5 space-y-5">
              {(viewingCampaign.activities ?? []).length === 0 ? (
                <p className="text-sm text-[#475569] italic text-center py-6">No activities added to this campaign yet.</p>
              ) : (
                (viewingCampaign.activities ?? []).map((activity) => {
                  const def = ACTIVITY_LIBRARY[activity.key];
                  if (!def) return null;
                  const done  = activity.tasks.filter((t) => t.completed).length;
                  const total = activity.tasks.length;
                  const pct   = Math.round((done / total) * 100);
                  return (
                    <div key={activity.key} className="bg-[#131729] border border-[#252B45] rounded-xl overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-3 border-b border-[#252B45]">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{def.emoji}</span>
                          <span className="font-semibold text-[#F1F5F9] text-sm">{def.label}</span>
                          <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${def.color}`}>
                            {done}/{total}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-1.5 bg-[#1A1F35] rounded-full overflow-hidden">
                            <div className="h-full bg-[#7C3AED] rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs text-[#64748B]">{pct}%</span>
                        </div>
                      </div>
                      <div className="divide-y divide-[#252B45]/60">
                        {activity.tasks.map((task) => (
                          <div key={task.id} className="flex items-center gap-3 px-4 py-2.5">
                            <span className={`w-4 h-4 rounded flex-shrink-0 flex items-center justify-center ${task.completed ? "bg-[#7C3AED]" : "border border-[#334155]"}`}>
                              {task.completed && <Check size={10} className="text-white" strokeWidth={3} />}
                            </span>
                            <span className={`text-sm ${task.completed ? "line-through text-[#475569]" : "text-[#94A3B8]"}`}>
                              {task.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Create / Edit Modal ────────────────────────────────────────────── */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={closeModal} />
          <div className="relative bg-[#0B0E1A] border border-[#252B45] rounded-2xl w-full max-w-2xl shadow-2xl max-h-[92vh] overflow-y-auto">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#252B45] sticky top-0 bg-[#0B0E1A] z-10">
              <h2 className="text-lg font-bold text-[#F1F5F9]">
                {modal === "create" ? "New Campaign" : "Edit Campaign"}
              </h2>
              <button onClick={closeModal} className="p-1.5 rounded-lg text-[#64748B] hover:text-[#F1F5F9] hover:bg-[#1A1F35] transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-5">

              {/* ── Basic Info ── */}
              <div>
                <p className="text-[11px] uppercase tracking-widest font-bold text-[#475569] mb-3">Campaign Details</p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#94A3B8] uppercase tracking-wide mb-1.5">
                      Campaign Name <span className="text-[#EF4444]">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      placeholder="e.g. January Promo — All Clubs"
                      className="w-full px-3 py-2 bg-[#131729] border border-[#252B45] rounded-lg text-[#F1F5F9] text-sm placeholder-[#475569] focus:outline-none focus:border-[#7C3AED] transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#94A3B8] uppercase tracking-wide mb-1.5">Description</label>
                    <textarea
                      value={form.description}
                      onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                      placeholder="Campaign goals, target audience, key messages…"
                      rows={2}
                      className="w-full px-3 py-2 bg-[#131729] border border-[#252B45] rounded-lg text-[#F1F5F9] text-sm placeholder-[#475569] focus:outline-none focus:border-[#7C3AED] transition-colors resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#94A3B8] uppercase tracking-wide mb-1.5">Status</label>
                      <select
                        value={form.status}
                        onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                        className="w-full px-3 py-2 bg-[#131729] border border-[#252B45] rounded-lg text-[#F1F5F9] text-sm focus:outline-none focus:border-[#7C3AED] transition-colors"
                      >
                        {STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#94A3B8] uppercase tracking-wide mb-1.5">Start Date</label>
                      <input
                        type="date"
                        value={form.start_date}
                        onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
                        className="w-full px-3 py-2 bg-[#131729] border border-[#252B45] rounded-lg text-[#F1F5F9] text-sm focus:outline-none focus:border-[#7C3AED] transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#94A3B8] uppercase tracking-wide mb-1.5">End Date</label>
                      <input
                        type="date"
                        value={form.end_date}
                        onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
                        className="w-full px-3 py-2 bg-[#131729] border border-[#252B45] rounded-lg text-[#F1F5F9] text-sm focus:outline-none focus:border-[#7C3AED] transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#94A3B8] uppercase tracking-wide mb-1.5">Budget (AUD)</label>
                    <div className="relative max-w-40">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B] text-sm">$</span>
                      <input
                        type="number"
                        min={0}
                        step={100}
                        value={form.budget}
                        onChange={(e) => setForm((f) => ({ ...f, budget: e.target.value }))}
                        placeholder="0"
                        className="w-full pl-7 pr-3 py-2 bg-[#131729] border border-[#252B45] rounded-lg text-[#F1F5F9] text-sm placeholder-[#475569] focus:outline-none focus:border-[#7C3AED] transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#94A3B8] uppercase tracking-wide mb-2">Assign to Clubs</label>
                    <div className="flex flex-wrap gap-2">
                      {clubs.map((cl) => {
                        const checked = form.clubIds.includes(cl.id);
                        return (
                          <button
                            key={cl.id}
                            type="button"
                            onClick={() => toggleClub(cl.id)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                              checked
                                ? "bg-[#3B1F7A] border-[#7C3AED] text-[#A78BFA]"
                                : "bg-[#131729] border-[#252B45] text-[#64748B] hover:border-[#7C3AED]/50 hover:text-[#94A3B8]"
                            }`}
                          >
                            <span className={`w-3.5 h-3.5 rounded flex-shrink-0 border flex items-center justify-center ${checked ? "bg-[#7C3AED] border-[#7C3AED]" : "border-[#475569]"}`}>
                              {checked && <Check size={9} className="text-white" strokeWidth={3} />}
                            </span>
                            {cl.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Activity Pills ── */}
              <div className="border-t border-[#252B45] pt-5">
                <div className="mb-3">
                  <p className="text-[11px] uppercase tracking-widest font-bold text-[#475569]">Marketing Activities</p>
                  <p className="text-xs text-[#475569] mt-0.5">Select all channels active in this campaign. Each gets a pre-built task checklist.</p>
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  {ACTIVITY_KEYS.map((key) => {
                    const def    = ACTIVITY_LIBRARY[key];
                    const active = form.activities.some((a) => a.key === key);
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => toggleActivity(key)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold border transition-all ${
                          active
                            ? def.color
                            : "bg-[#131729] border-[#252B45] text-[#64748B] hover:border-[#7C3AED]/40 hover:text-[#94A3B8]"
                        }`}
                      >
                        <span>{def.emoji}</span>
                        {def.label}
                        {active && <X size={13} className="ml-0.5 opacity-70" />}
                      </button>
                    );
                  })}
                </div>

                {/* Per-activity checklists */}
                {form.activities.length > 0 && (
                  <div className="space-y-3">
                    {form.activities.map((activity) => {
                      const def       = ACTIVITY_LIBRARY[activity.key];
                      if (!def) return null;
                      const isOpen    = expandedActivity === activity.key;
                      const done      = activity.tasks.filter((t) => t.completed).length;
                      const total     = activity.tasks.length;

                      return (
                        <div key={activity.key} className="bg-[#131729] border border-[#252B45] rounded-xl overflow-hidden">
                          {/* Activity header */}
                          <button
                            type="button"
                            onClick={() => setExpandedActivity(isOpen ? null : activity.key)}
                            className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#1A1F35]/50 transition-colors"
                          >
                            <div className="flex items-center gap-2.5">
                              <span className="text-base">{def.emoji}</span>
                              <span className="font-semibold text-[#F1F5F9] text-sm">{def.label}</span>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${def.color}`}>
                                {done}/{total} done
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-1.5 bg-[#252B45] rounded-full overflow-hidden">
                                <div className="h-full bg-[#7C3AED] rounded-full transition-all" style={{ width: `${(done / total) * 100}%` }} />
                              </div>
                              {isOpen ? <ChevronUp size={14} className="text-[#64748B]" /> : <ChevronDown size={14} className="text-[#64748B]" />}
                            </div>
                          </button>

                          {/* Checklist */}
                          {isOpen && (
                            <div className="border-t border-[#252B45]">
                              {activity.tasks.length === 0 && (
                                <p className="px-4 py-3 text-xs text-[#475569] italic">No tasks yet — add one below.</p>
                              )}
                              {activity.tasks.map((task) => (
                                <div
                                  key={task.id}
                                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#1A1F35]/40 group border-b border-[#252B45]/50 last:border-b-0"
                                >
                                  <button
                                    type="button"
                                    onClick={() => toggleTask(activity.key, task.id)}
                                    className={`w-4 h-4 rounded flex-shrink-0 flex items-center justify-center transition-colors ${
                                      task.completed ? "bg-[#7C3AED] border border-[#7C3AED]" : "border border-[#334155] hover:border-[#7C3AED]/60"
                                    }`}
                                  >
                                    {task.completed && <Check size={10} className="text-white" strokeWidth={3} />}
                                  </button>
                                  <span className={`flex-1 text-sm transition-colors ${task.completed ? "line-through text-[#475569]" : "text-[#94A3B8]"}`}>
                                    {task.label}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => removeTask(activity.key, task.id)}
                                    className="opacity-0 group-hover:opacity-100 p-1 text-[#475569] hover:text-[#EF4444] transition-all rounded"
                                  >
                                    <X size={12} />
                                  </button>
                                </div>
                              ))}
                              {/* Add task input */}
                              <div className="flex items-center gap-2 px-4 py-2.5 border-t border-[#252B45]/50">
                                <input
                                  type="text"
                                  value={newTaskText[activity.key] ?? ""}
                                  onChange={(e) => setNewTaskText((prev) => ({ ...prev, [activity.key]: e.target.value }))}
                                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTask(activity.key); } }}
                                  placeholder="Add a task…"
                                  className="flex-1 bg-transparent text-sm text-[#94A3B8] placeholder-[#334155] focus:outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={() => addTask(activity.key)}
                                  disabled={!(newTaskText[activity.key] ?? "").trim()}
                                  className="p-1 rounded text-[#64748B] hover:text-[#A78BFA] hover:bg-[#252B45] transition-colors disabled:opacity-30"
                                >
                                  <Plus size={14} />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-[#0B0E1A] border-t border-[#252B45]">
              {saveError && (
                <div className="px-6 py-3 bg-[#7F1D1D]/30 border-b border-[#EF4444]/30 text-xs text-[#EF4444]">
                  <strong>Error:</strong> {saveError}
                </div>
              )}
              <div className="flex items-center justify-end gap-3 px-6 py-4">
                <button
                  onClick={closeModal}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[#1A1F35] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !form.name.trim()}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  {saving && <Loader2 size={14} className="animate-spin" />}
                  {modal === "create" ? "Create Campaign" : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
