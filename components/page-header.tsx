import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}

export default function PageHeader({ title, subtitle, action, className }: PageHeaderProps) {
  return (
    <div className={cn("flex items-start justify-between mb-6 flex-wrap gap-3", className)}>
      <div>
        <h1 className="text-2xl font-bold text-[#F1F5F9] tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-[#94A3B8] mt-1">{subtitle}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}
