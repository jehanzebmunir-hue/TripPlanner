import { useState } from "react";
import { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import { api } from "../api";
import { useChecklist, useToggleChecklistItem } from "../hooks";
import { ChecklistEntry, WeatherPackingSection, WeatherPackingType } from "../types";
import { Skeleton } from "./Skeleton";

// Compared against the backend's own (English-only -- see i18n scope note
// in README) checklist template text to find this one special item, not
// user-facing itself.
const OFFLINE_SAVE_LABEL = "Save this itinerary for offline access";

// Real, deterministic C->F conversion (not a guess, not an API call) -- same
// "show native plus a converted estimate" pattern already used for price.
function celsiusToFahrenheit(c: number): number {
  return Math.round((c * 9) / 5 + 32);
}

const PACKING_LABEL_KEYS: Record<WeatherPackingType, string> = {
  rain: "checklist.packingRain",
  "warm-layer": "checklist.packingWarmLayer",
  "sun-protection": "checklist.packingSunProtection",
};

// Backend sends raw numbers and a source flag, not pre-rendered text -- built
// into real ChecklistEntry objects here so packing suggestions get the same
// real i18n coverage as the rest of this app's UI chrome, rather than the
// English-only precedent set by the (out-of-scope, backend-authored)
// weeksOut/dayOf template items.
function buildPackingEntries(t: TFunction, packing: WeatherPackingSection): ChecklistEntry[] {
  if (!packing.source) return [];
  const source = t(packing.source === "forecast" ? "checklist.packingSourceForecast" : "checklist.packingSourceHistorical");

  return packing.items.map((item) => {
    let hint: string;
    if (item.type === "rain") {
      hint = t("checklist.packingRainHint", { source, percent: Math.round(packing.rainChancePercent ?? 0) });
    } else if (item.type === "warm-layer") {
      const lowC = Math.round(packing.avgLowC ?? 0);
      hint = t("checklist.packingWarmLayerHint", { source, lowC, lowF: celsiusToFahrenheit(lowC) });
    } else {
      const highC = Math.round(packing.avgHighC ?? 0);
      hint = t("checklist.packingSunProtectionHint", { source, highC, highF: celsiusToFahrenheit(highC) });
    }
    return { id: item.id, label: t(PACKING_LABEL_KEYS[item.type]), hint, checked: item.checked };
  });
}

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

  const packingItems = buildPackingEntries(t, data.packing);
  const groups: { title: string; items: ChecklistEntry[] }[] = [
    { title: t("checklist.fromItinerary"), items: data.fromItinerary },
    // Omitted entirely (not shown with a "nothing here" empty state) when
    // there's no real weather data for this trip yet -- no dates set, or
    // the destination/live lookup didn't resolve. A real, populated section
    // or nothing, never an empty placeholder for something that isn't ready.
    ...(packingItems.length > 0 ? [{ title: t("checklist.packingTitle"), items: packingItems }] : []),
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
