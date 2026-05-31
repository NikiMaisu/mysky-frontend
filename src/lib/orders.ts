import type { OrderStatus } from "@/types";

export const ORDER_STATUSES: OrderStatus[] = [
  "QUOTED",
  "SCHEDULED",
  "IN_PROGRESS",
  "DONE",
  "CANCELLED",
];

const STATUS_LABEL: Record<OrderStatus, string> = {
  QUOTED: "Quoted",
  SCHEDULED: "Scheduled",
  IN_PROGRESS: "In progress",
  DONE: "Done",
  CANCELLED: "Cancelled",
};

const STATUS_TAG: Record<OrderStatus, string> = {
  QUOTED: "status-tag-quoted",
  SCHEDULED: "status-tag-scheduled",
  IN_PROGRESS: "status-tag-progress",
  DONE: "status-tag-done",
  CANCELLED: "status-tag-cancelled",
};

export const statusLabel = (s: OrderStatus) => STATUS_LABEL[s];
export const statusTag = (s: OrderStatus) => STATUS_TAG[s];

export function formatGel(amount: number): string {
  return `${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₾`;
}

export function formatMinutes(min: number): string {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Convert an ISO string to the value a <input type="datetime-local"> expects (local time). */
export function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Convert a datetime-local value to an ISO string with offset. */
export function fromLocalInput(value: string): string {
  return new Date(value).toISOString();
}
