import { cn } from "@/lib/utils";

export default function SectionLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-center gap-3 mb-4", className)}>
      <span className="text-[11px] font-bold text-[#A78BFA] uppercase tracking-[1.5px] whitespace-nowrap">
        {children}
      </span>
      <div className="flex-1 h-px bg-[#252B45]" />
    </div>
  );
}
