export function todayIso() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

export function daysUntil(iso) {
  if (!iso) return null;
  const target = new Date(iso + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target - today) / (1000 * 60 * 60 * 24));
}

export function formatExpiry(iso) {
  if (!iso) return "No expiry set";
  const d = daysUntil(iso);
  if (d < 0) return `Expired ${-d}d ago`;
  if (d === 0) return "Expires today";
  if (d === 1) return "Expires tomorrow";
  if (d <= 14) return `Expires in ${d}d`;
  try {
    return `Exp ${new Date(iso + "T00:00:00").toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
    })}`;
  } catch {
    return `Exp ${iso}`;
  }
}

export function expiryBadgeClass(iso) {
  const d = daysUntil(iso);
  if (d == null) return "bg-gray-100 text-gray-700";
  if (d < 0) return "bg-red-100 text-red-800";
  if (d <= 3) return "bg-orange-100 text-orange-800";
  if (d <= 7) return "bg-yellow-100 text-yellow-800";
  return "bg-emerald-100 text-emerald-800";
}
