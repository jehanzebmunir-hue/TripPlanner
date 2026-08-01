import { useState } from "react";
import { api } from "../api";
import { useChecklist, useToggleChecklistItem } from "../hooks";
import { ChecklistEntry } from "../types";

const OFFLINE_SAVE_LABEL = "Save this itinerary for offline access";

export function ChecklistScreen({ tripId, city }: { tripId: string; city: string }) {
  const { data, isLoading } = useChecklist(tripId);
  const toggle = useToggleChecklistItem(tripId);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  if (isLoading || !data) return <p className="text-sm text-ink-soft">Loading…</p>;

  const groups: { title: string; items: ChecklistEntry[] }[] = [
    { title: "From your itinerary", items: data.fromItinerary },
    { title: "Weeks out", items: data.weeksOut },
    { title: "Day of departure", items: data.dayOf },
  ];

  async function saveForOffline(itemKey: string) {
    setSaving(true);
    try {
      await api.prefetchForOffline(tripId, city);
      toggle.mutate({ itemKey, checked: true });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-ink-soft">Booking items from your itinerary, plus a generic prep timeline.</p>

      {groups.map((g) => (
        <div key={g.title}>
          <h3 className="mb-2 font-mono text-[11px] uppercase tracking-wide text-ink-faint">{g.title}</h3>
          {g.items.length === 0 && <p className="text-xs text-ink-faint">Nothing here yet.</p>}
          {g.items.map((item) =>
            item.label === OFFLINE_SAVE_LABEL ? (
              <div key={item.id} className="flex items-start justify-between gap-2.5 border-t border-line py-2.5 last:border-b">
                <div className={`text-[13.5px] ${item.checked ? "text-ink-faint line-through" : ""}`}>
                  {item.label}
                </div>
                <button
                  type="button"
                  onClick={() => saveForOffline(item.id)}
                  disabled={saving}
                  className="shrink-0 border border-accent px-2.5 py-1 text-xs font-semibold text-accent disabled:opacity-60"
                >
                  {saving ? "Saving…" : saved || item.checked ? "Saved ✓" : "Save now"}
                </button>
              </div>
            ) : (
              <label key={item.id} className="flex items-start gap-2.5 border-t border-line py-2.5 last:border-b">
                <input
                  type="checkbox"
                  checked={item.checked}
                  onChange={(e) => toggle.mutate({ itemKey: item.id, checked: e.target.checked })}
                  className="mt-0.5 accent-accent"
                />
                <div>
                  <div className={`text-[13.5px] ${item.checked ? "text-ink-faint line-through" : ""}`}>
                    {item.label}
                  </div>
                  {item.hint && <div className="text-xs text-ink-faint">{item.hint}</div>}
                </div>
              </label>
            )
          )}
        </div>
      ))}
    </div>
  );
}
