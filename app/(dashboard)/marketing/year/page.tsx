"use client";

import { useState, useEffect } from "react";
import PageHeader from "@/components/page-header";
import { Plus, X, Pencil, Trash2, ChevronDown, Calendar, Tag } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

type CampaignType = "National" | "Seasonal" | "Product Launch" | "Promotional" | "Local";
type Channel      = "Digital" | "Social Media" | "Email" | "In-Club" | "PR" | "Multi-Channel" | "OOH";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const MONTH_ABBR = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const CAMPAIGN_TYPES: CampaignType[] = ["National","Seasonal","Product Launch","Promotional","Local"];
const CHANNELS: Channel[]            = ["Digital","Social Media","Email","In-Club","PR","Multi-Channel","OOH"];

const TYPE_COLOR: Record<CampaignType, { bg: string; text: string; bar: string }> = {
  "National":       { bg: "bg-[#3B1F7A]/40 border-[#7C3AED]/50",   text: "text-[#A78BFA]", bar: "bg-[#7C3AED]"  },
  "Seasonal":       { bg: "bg-[#1E3A5F]/40 border-[#3B82F6]/40",   text: "text-[#60A5FA]", bar: "bg-[#3B82F6]"  },
  "Product Launch": { bg: "bg-[#3B2A0A]/40 border-[#F59E0B]/40",   text: "text-[#FBBF24]", bar: "bg-[#F59E0B]"  },
  "Promotional":    { bg: "bg-[#0A3B2A]/40 border-[#10B981]/40",   text: "text-[#34D399]", bar: "bg-[#10B981]"  },
  "Local":          { bg: "bg-[#1A1F35]/60 border-[#252B45]",      text: "text-[#94A3B8]", bar: "bg-[#64748B]"  },
};

interface Campaign {
  id:          string;
  name:        string;
  type:        CampaignType;
  channel:     Channel;
  startMonth:  number; // 0-indexed
  endMonth:    number; // 0-indexed
  year:        number;
  targetAudience: string;
  notes:       string;
  hqProvided:  boolean;
}

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = [CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1];


// ─── Helpers ─────────────────────────────────────────────────────────────────

function SelectField<T extends string>({
  value, onChange, options, className,
}: { value: T; onChange: (v: T) => void; options: T[]; className?: string }) {
  return (
    <div className="relative">
      <select value={value} onChange={(e) => onChange(e.target.value as T)}
        className={cn("appearance-none bg-[#1A1F35] border border-[#252B45] text-[#F1F5F9] text-sm rounded-lg px-3 py-2 pr-8 focus:outline-none focus:border-[#7C3AED] cursor-pointer", className)}>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
      <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#64748B] pointer-events-none" />
    </div>
  );
}

// ─── Campaign modal ───────────────────────────────────────────────────────────

type ModalMode = { type: "add" } | { type: "edit"; campaign: Campaign };

function CampaignModal({ mode, year, onSave, onClose }: {
  mode: ModalMode; year: number;
  onSave: (c: Campaign) => void; onClose: () => void;
}) {
  const initial: Campaign = mode.type === "edit" ? mode.campaign : {
    id: crypto.randomUUID(), name: "", type: "National", channel: "Multi-Channel",
    startMonth: 0, endMonth: 0, year, targetAudience: "", notes: "", hqProvided: false,
  };
  const [form, setForm] = useState<Campaign>(initial);

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-[#131729] border border-[#252B45] rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#252B45]">
          <h2 className="text-[#F1F5F9] font-bold text-[15px]">
            {mode.type === "add" ? "Add National Campaign" : "Edit Campaign"}
          </h2>
          <button onClick={onClose} className="text-[#64748B] hover:text-[#F1F5F9] transition-colors"><X size={18} /></button>
        </div>

        <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="block text-[#94A3B8] text-[11px] font-semibold uppercase tracking-wide mb-1.5">Campaign Name *</label>
            <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. New Year New You"
              className="w-full bg-[#1A1F35] border border-[#252B45] text-[#F1F5F9] text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#7C3AED] placeholder:text-[#334155]" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[#94A3B8] text-[11px] font-semibold uppercase tracking-wide mb-1.5">Type</label>
              <SelectField value={form.type} onChange={(v) => setForm((f) => ({ ...f, type: v }))} options={CAMPAIGN_TYPES} className="w-full" />
            </div>
            <div>
              <label className="block text-[#94A3B8] text-[11px] font-semibold uppercase tracking-wide mb-1.5">Primary Channel</label>
              <SelectField value={form.channel} onChange={(v) => setForm((f) => ({ ...f, channel: v }))} options={CHANNELS} className="w-full" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[#94A3B8] text-[11px] font-semibold uppercase tracking-wide mb-1.5">Start Month</label>
              <SelectField
                value={MONTHS[form.startMonth]}
                onChange={(v) => {
                  const idx = MONTHS.indexOf(v);
                  setForm((f) => ({ ...f, startMonth: idx, endMonth: Math.max(idx, f.endMonth) }));
                }}
                options={MONTHS as any}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-[#94A3B8] text-[11px] font-semibold uppercase tracking-wide mb-1.5">End Month</label>
              <SelectField
                value={MONTHS[form.endMonth]}
                onChange={(v) => {
                  const idx = MONTHS.indexOf(v);
                  setForm((f) => ({ ...f, endMonth: Math.max(idx, f.startMonth) }));
                }}
                options={MONTHS.slice(form.startMonth) as any}
                className="w-full"
              />
            </div>
          </div>

          <div>
            <label className="block text-[#94A3B8] text-[11px] font-semibold uppercase tracking-wide mb-1.5">Target Audience</label>
            <input value={form.targetAudience} onChange={(e) => setForm((f) => ({ ...f, targetAudience: e.target.value }))}
              placeholder="e.g. Non-members, lapsed members"
              className="w-full bg-[#1A1F35] border border-[#252B45] text-[#F1F5F9] text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#7C3AED] placeholder:text-[#334155]" />
          </div>

          <div>
            <label className="block text-[#94A3B8] text-[11px] font-semibold uppercase tracking-wide mb-1.5">Notes</label>
            <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={2} placeholder="Campaign details, creative links, HQ instructions..."
              className="w-full bg-[#1A1F35] border border-[#252B45] text-[#F1F5F9] text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#7C3AED] placeholder:text-[#334155] resize-none" />
          </div>

          <label className="flex items-center gap-3 cursor-pointer group">
            <div
              onClick={() => setForm((f) => ({ ...f, hqProvided: !f.hqProvided }))}
              className={cn(
                "w-10 h-5 rounded-full border-2 transition-all flex-shrink-0 relative cursor-pointer",
                form.hqProvided ? "bg-[#7C3AED] border-[#7C3AED]" : "bg-[#1A1F35] border-[#252B45]",
              )}
            >
              <span className={cn(
                "absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all",
                form.hqProvided ? "left-[22px]" : "left-0.5",
              )} />
            </div>
            <span className="text-[13px] text-[#94A3B8]">HQ provides creative assets for this campaign</span>
          </label>
        </div>

        <div className="px-6 py-4 border-t border-[#252B45] flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-[#94A3B8] hover:text-[#F1F5F9] transition-colors">Cancel</button>
          <button
            onClick={() => { if (form.name.trim()) { onSave(form); onClose(); } }}
            disabled={!form.name.trim()}
            className="px-5 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors"
          >
            {mode.type === "add" ? "Add Campaign" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function MarketingYearPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("year-overview-campaigns");
      if (stored) setCampaigns(JSON.parse(stored));
    } catch { /* ignore */ }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem("year-overview-campaigns", JSON.stringify(campaigns));
  }, [campaigns, hydrated]);
  const [modal,     setModal]     = useState<ModalMode | null>(null);
  const [year,      setYear]      = useState(CURRENT_YEAR);
  const [typeFilter, setTypeFilter] = useState<CampaignType | "All">("All");

  function saveCampaign(c: Campaign) {
    setCampaigns((prev) => {
      const idx = prev.findIndex((x) => x.id === c.id);
      if (idx >= 0) { const next = [...prev]; next[idx] = c; return next; }
      return [...prev, c];
    });
  }

  function deleteCampaign(id: string) {
    setCampaigns((prev) => prev.filter((c) => c.id !== id));
  }

  const yearCampaigns = campaigns
    .filter((c) => c.year === year)
    .filter((c) => typeFilter === "All" || c.type === typeFilter);

  // Build month → campaigns map
  const monthMap: Record<number, Campaign[]> = {};
  for (let m = 0; m < 12; m++) monthMap[m] = [];
  yearCampaigns.forEach((c) => {
    for (let m = c.startMonth; m <= c.endMonth; m++) {
      monthMap[m].push(c);
    }
  });

  return (
    <div>
      <PageHeader
        title="Marketing Year Overview"
        subtitle="National & regional campaigns planned across the year"
        action={
          <button
            onClick={() => setModal({ type: "add" })}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-sm font-semibold rounded-lg transition-colors"
          >
            <Plus size={16} />
            Add Campaign
          </button>
        }
      />

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex items-center gap-1 bg-[#1A1F35] border border-[#252B45] rounded-lg p-1">
          {YEARS.map((y) => (
            <button
              key={y}
              onClick={() => setYear(y)}
              className={cn(
                "px-4 py-1.5 rounded-md text-sm font-semibold transition-all",
                year === y ? "bg-[#7C3AED] text-white" : "text-[#64748B] hover:text-[#F1F5F9]",
              )}
            >
              {y}
            </button>
          ))}
        </div>
        <SelectField
          value={typeFilter}
          onChange={setTypeFilter}
          options={["All", ...CAMPAIGN_TYPES] as any}
          className="text-[13px]"
        />
        <span className="text-[#64748B] text-[13px] ml-auto">
          {yearCampaigns.length} campaign{yearCampaigns.length !== 1 ? "s" : ""} · {year}
        </span>
      </div>

      {/* Year legend */}
      <div className="flex flex-wrap gap-2 mb-6">
        {CAMPAIGN_TYPES.map((t) => {
          const cfg = TYPE_COLOR[t];
          const count = yearCampaigns.filter((c) => c.type === t).length;
          return (
            <div key={t} className={cn("flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[12px] font-semibold", cfg.bg, cfg.text)}>
              <span className={cn("w-2 h-2 rounded-full", cfg.bar)} />
              {t}
              {count > 0 && <span className="text-[10px] opacity-70">·{count}</span>}
            </div>
          );
        })}
      </div>

      {/* ── Gantt / Timeline View ─────────────────────────────────────────────── */}
      <div className="mb-8">
        <div className="text-[#94A3B8] text-[11px] font-semibold uppercase tracking-widest mb-3">Timeline · {year}</div>
        <div className="bg-[#131729] border border-[#252B45] rounded-xl overflow-hidden">
          {/* Month headers */}
          <div className="grid grid-cols-12 border-b border-[#252B45]">
            {MONTH_ABBR.map((m, i) => (
              <div key={i} className={cn(
                "px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-wide border-r border-[#252B45]/50 last:border-r-0",
                new Date().getMonth() === i && new Date().getFullYear() === year
                  ? "text-[#A78BFA] bg-[#3B1F7A]/20"
                  : "text-[#64748B]",
              )}>
                {m}
              </div>
            ))}
          </div>

          {/* Campaign rows */}
          {yearCampaigns.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-[#334155] text-sm">
              No campaigns for {year}. Add one above.
            </div>
          ) : (
            <div className="divide-y divide-[#252B45]/50">
              {yearCampaigns.map((c) => {
                const cfg = TYPE_COLOR[c.type];
                const spanCols = c.endMonth - c.startMonth + 1;
                return (
                  <div key={c.id} className="grid grid-cols-12 min-h-[52px] group hover:bg-[#1A1F35]/30 transition-colors">
                    {/* Empty cells before start */}
                    {c.startMonth > 0 && (
                      <div className={`col-span-${c.startMonth}`} style={{ gridColumn: `span ${c.startMonth}` }} />
                    )}
                    {/* Campaign bar */}
                    <div
                      style={{ gridColumn: `span ${spanCols}` }}
                      className="p-1.5 flex items-center"
                    >
                      <div className={cn(
                        "w-full h-9 rounded-lg border px-2 flex items-center gap-1.5 transition-all cursor-pointer min-w-0",
                        cfg.bg,
                      )}>
                        <span className={cn("text-[12px] font-semibold truncate min-w-0 flex-1", cfg.text)}>{c.name}</span>
                        {c.hqProvided && spanCols >= 2 && (
                          <span className="flex-shrink-0 text-[10px] text-[#64748B] bg-[#252B45] rounded px-1.5 py-0.5">HQ</span>
                        )}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => setModal({ type: "edit", campaign: c })} className={cn("p-1 hover:opacity-100 transition-opacity", cfg.text)}>
                            <Pencil size={11} />
                          </button>
                          <button onClick={() => deleteCampaign(c.id)} className="p-1 text-[#EF4444] hover:opacity-100 transition-opacity">
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </div>
                    </div>
                    {/* Empty cells after end */}
                    {c.endMonth < 11 && (
                      <div style={{ gridColumn: `span ${11 - c.endMonth}` }} />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Month-by-month breakdown ──────────────────────────────────────────── */}
      <div className="mb-8">
        <div className="text-[#94A3B8] text-[11px] font-semibold uppercase tracking-widest mb-3">Month-by-Month · {year}</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {MONTHS.map((month, i) => {
            const monthCampaigns = monthMap[i];
            const isCurrent = new Date().getMonth() === i && new Date().getFullYear() === year;
            return (
              <div key={i} className={cn(
                "bg-[#131729] border rounded-xl p-4",
                isCurrent ? "border-[#7C3AED]/50" : "border-[#252B45]",
              )}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[#F1F5F9] text-[13px] font-bold">{month}</span>
                    {isCurrent && (
                      <span className="text-[10px] font-semibold text-[#A78BFA] bg-[#3B1F7A]/30 px-1.5 py-0.5 rounded">Now</span>
                    )}
                  </div>
                  <span className="text-[11px] text-[#64748B]">{monthCampaigns.length} active</span>
                </div>

                {monthCampaigns.length === 0 ? (
                  <div className="text-[#334155] text-[12px] py-2">No campaigns this month</div>
                ) : (
                  <div className="space-y-2">
                    {monthCampaigns.map((c) => {
                      const cfg = TYPE_COLOR[c.type];
                      return (
                        <div key={c.id} className={cn("flex items-center gap-2 px-2.5 py-2 rounded-lg border text-[12px]", cfg.bg)}>
                          <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", cfg.bar)} />
                          <span className={cn("font-semibold truncate flex-1", cfg.text)}>{c.name}</span>
                          {c.hqProvided && <span className="text-[10px] text-[#64748B] flex-shrink-0">HQ</span>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Campaign detail table ─────────────────────────────────────────────── */}
      <div>
        <div className="text-[#94A3B8] text-[11px] font-semibold uppercase tracking-widest mb-3">All Campaigns · {year}</div>
        <div className="bg-[#131729] border border-[#252B45] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#1A1F35] text-[#94A3B8] text-[11px] uppercase tracking-wide">
                  <th className="text-left px-4 py-3 font-semibold">Campaign</th>
                  <th className="text-left px-4 py-3 font-semibold">Type</th>
                  <th className="text-left px-4 py-3 font-semibold">Channel</th>
                  <th className="text-left px-4 py-3 font-semibold">Period</th>
                  <th className="text-left px-4 py-3 font-semibold">Target Audience</th>
                  <th className="text-left px-4 py-3 font-semibold">HQ Assets</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {yearCampaigns.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-[#64748B]">
                      No campaigns for {year}. Add one to get started.
                    </td>
                  </tr>
                ) : yearCampaigns.map((c) => {
                  const cfg = TYPE_COLOR[c.type];
                  return (
                    <tr key={c.id} className="border-t border-[#252B45]/60 hover:bg-[#1A1F35]/50 transition-colors group">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-[#F1F5F9]">{c.name}</div>
                        {c.notes && <div className="text-[11px] text-[#475569] mt-0.5 max-w-xs truncate">{c.notes}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] font-semibold border", cfg.bg, cfg.text)}>
                          <span className={cn("w-1.5 h-1.5 rounded-full", cfg.bar)} />
                          {c.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#94A3B8] text-[13px]">
                        <span className="flex items-center gap-1.5">
                          <Tag size={11} className="text-[#64748B]" />
                          {c.channel}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#94A3B8] text-[13px]">
                        <span className="flex items-center gap-1.5">
                          <Calendar size={11} className="text-[#64748B]" />
                          {MONTH_ABBR[c.startMonth]}
                          {c.endMonth !== c.startMonth && ` → ${MONTH_ABBR[c.endMonth]}`}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#94A3B8] text-[13px]">{c.targetAudience || "—"}</td>
                      <td className="px-4 py-3">
                        {c.hqProvided ? (
                          <span className="text-[12px] font-semibold text-[#34D399] bg-[#0A3B2A]/50 border border-[#10B981]/30 px-2 py-0.5 rounded">Yes</span>
                        ) : (
                          <span className="text-[12px] text-[#475569]">No</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => setModal({ type: "edit", campaign: c })} className="p-1.5 text-[#64748B] hover:text-[#A78BFA] hover:bg-[#1A1F35] rounded-lg transition-colors">
                            <Pencil size={13} />
                          </button>
                          <button onClick={() => deleteCampaign(c.id)} className="p-1.5 text-[#64748B] hover:text-[#EF4444] hover:bg-[#1A1F35] rounded-lg transition-colors">
                            <Trash2 size={13} />
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
      </div>

      {modal && (
        <CampaignModal mode={modal} year={year} onSave={saveCampaign} onClose={() => setModal(null)} />
      )}
    </div>
  );
}
