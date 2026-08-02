import { useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../api";
import { useChecklist, useToggleChecklistItem } from "../hooks";
import { ChecklistEntry } from "../types";
import { Skeleton } from "./Skeleton";

// Compared against the backend's own (English-only -- see i18n scope note
// in README) checklist template text to find this one special item, not
// user-facing itself.
const OFFLINE_SAVE_LABEL = "Save this itinerary for offline access";

export function ChecklistScreen({ tripId, city }: { tripId: string; city: string }) {
  const { t } = useTranslation();
  const { data, isLoading } = useChecklist(tripId);
  const toggle = useToggleChecklistItem(tripId);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <p role="status" className="sr-only">
          {t("common.loading")}
        </p>
        {[0, 1].map((i) => (
          <div key={i}>
            <Skeleton className="mb-2 h-3 w-28" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>
    );
  }

  const groups: { title: string; items: ChecklistEntry[] }[] = [
    { title: t("checklist.fromItinerary"), items: data.fromItinerary },
    { title: t("checklist.weeksOut"), items: data.weeksOut },
    { title: t("checklist.dayOf"), items: data.dayOf },
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
      <h2 className="sr-only">{t("app.tabs.checklist")}</h2>
      <p className="text-sm text-ink-soft">{t("checklist.subheading")}</p>

      {toggle.isError && (
        <p role="alert" className="border border-stale bg-stale-bg px-3 py-2 text-xs text-stale">
          {t("checklist.toggleError")}
        </p>
      )}

      {groups.map((g) => (
        <div key={g.title}>
          <h3 className="mb-2 font-mono text-[11px] uppercase tracking-wide text-ink-faint">{g.title}</h3>
          {g.items.length === 0 && <p className="text-xs text-ink-faint">{t("checklist.nothingHere")}</p>}
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
                  className="shrink-0 border border-accent px-2.5 py-2 text-xs font-semibold text-accent disabled:opacity-60"
                >
                  <span role="status">
                    {saving ? t("checklist.saving") : saved || item.checked ? t("checklist.saved") : t("checklist.saveNow")}
                  </span>
                </button>
              </div>
            ) : (
              <label key={item.id} className="flex items-start gap-2.5 border-t border-line py-2.5 last:border-b">
                <input
                  type="checkbox"
                  checked={item.checked}
                  onChange={(e) => toggle.mutate({ itemKey: item.id, checked: e.target.checked })}
                  className="mt-0.5 h-4 w-4 accent-accent"
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
