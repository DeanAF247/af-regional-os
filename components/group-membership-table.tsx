interface ClubMembership {
  id:                 string;
  name:               string;
  total_count:        number | null;
  direct_debit_count: number | null;
}

function ddVariant(pct: number | null) {
  if (pct == null) return "text-[#94A3B8]";
  if (pct >= 80)   return "text-[#059669] font-semibold";
  if (pct >= 65)   return "text-[#D97706] font-semibold";
  return "text-[#EF4444] font-semibold";
}

export default function GroupMembershipTable({ clubs }: { clubs: ClubMembership[] }) {
  const totalMembers = clubs.reduce((s, c) => s + (c.total_count        ?? 0), 0);
  const totalDD      = clubs.reduce((s, c) => s + (c.direct_debit_count ?? 0), 0);
  const groupDDPct   = totalMembers > 0 ? Math.round((totalDD / totalMembers) * 100) : null;
  const hasAnyData   = clubs.some((c) => c.total_count != null);

  if (!hasAnyData) {
    return (
      <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-6 mb-8 text-center">
        <p className="text-sm text-[#94A3B8]">No membership data for this period. Enter figures in the KPI form.</p>
      </div>
    );
  }

  return (
    <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl overflow-hidden mb-8">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#F8FAFC] text-[#64748B] text-[11px] uppercase tracking-wide border-b border-[#E2E8F0]">
              <th className="text-left px-4 py-3 font-semibold">Club</th>
              <th className="text-right px-4 py-3 font-semibold">Total Members</th>
              <th className="text-right px-4 py-3 font-semibold text-[#7C3AED]">Direct Debit</th>
              <th className="text-right px-4 py-3 font-semibold text-[#7C3AED]">DD %</th>
              <th className="text-right px-4 py-3 font-semibold">Non-DD</th>
              <th className="px-4 py-3 font-semibold w-32">DD Bar</th>
            </tr>
          </thead>
          <tbody>
            {clubs.map((club, i) => {
              const ddPct  = club.total_count && club.direct_debit_count != null
                ? Math.round((club.direct_debit_count / club.total_count) * 100)
                : null;
              const nonDD  = club.total_count != null && club.direct_debit_count != null
                ? club.total_count - club.direct_debit_count
                : null;
              const barWidth = Math.min(ddPct ?? 0, 100);

              return (
                <tr key={club.id} className={`border-t border-[#E2E8F0]/60 hover:bg-[#F8FAFC]/50 transition-colors ${i % 2 === 1 ? "bg-[#F8FAFC]/20" : ""}`}>
                  <td className="px-4 py-3 font-semibold text-[#0F172A]">{club.name}</td>
                  <td className="px-4 py-3 text-right text-[#0F172A]">
                    {club.total_count != null ? club.total_count.toLocaleString() : "—"}
                  </td>
                  <td className="px-4 py-3 text-right text-[#6D28D9] font-semibold">
                    {club.direct_debit_count != null ? club.direct_debit_count.toLocaleString() : "—"}
                  </td>
                  <td className={`px-4 py-3 text-right ${ddVariant(ddPct)}`}>
                    {ddPct != null ? `${ddPct}%` : "—"}
                  </td>
                  <td className="px-4 py-3 text-right text-[#64748B]">
                    {nonDD != null ? nonDD.toLocaleString() : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-1.5 bg-[#E2E8F0] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#7C3AED]"
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}

            {/* Group Total */}
            <tr className="border-t-2 border-[#E2E8F0] bg-[#F8FAFC] font-bold">
              <td className="px-4 py-3 text-[#6D28D9]">Group Total</td>
              <td className="px-4 py-3 text-right text-[#0F172A]">{totalMembers.toLocaleString()}</td>
              <td className="px-4 py-3 text-right text-[#6D28D9]">{totalDD.toLocaleString()}</td>
              <td className={`px-4 py-3 text-right ${ddVariant(groupDDPct)}`}>
                {groupDDPct != null ? `${groupDDPct}%` : "—"}
              </td>
              <td className="px-4 py-3 text-right text-[#64748B]">
                {(totalMembers - totalDD).toLocaleString()}
              </td>
              <td className="px-4 py-3" />
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
