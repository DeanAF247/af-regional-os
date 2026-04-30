import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number | null | undefined): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPercent(value: number | null | undefined, decimals = 1): string {
  if (value == null) return "—";
  return `${value.toFixed(decimals)}%`;
}

export function formatNumber(value: number | null | undefined): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-AU").format(value);
}

export function pct(actual: number | null, target: number | null): number | null {
  if (!actual || !target) return null;
  return Math.round((actual / target) * 1000) / 10;
}

export function statusColor(pctValue: number | null): "green" | "amber" | "red" {
  if (pctValue == null) return "amber";
  if (pctValue >= 90) return "green";
  if (pctValue >= 70) return "amber";
  return "red";
}
