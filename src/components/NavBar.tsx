import { TIMEFRAME_OPTIONS } from "@/lib/config";

export type TabKey = "strength" | "overview" | "correlation" | "news" | "calendar";

const TABS: { key: TabKey; label: string }[] = [
  { key: "strength", label: "חוזק מטבעות" },
  { key: "overview", label: "סקירת שוק" },
  { key: "correlation", label: "קורלציה" },
  { key: "news", label: "חדשות" },
  { key: "calendar", label: "לוח כלכלי" },
];

export function NavBar({
  activeTab,
  onTabChange,
  timeframe,
  onTimeframeChange,
}: {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  timeframe: string;
  onTimeframeChange: (timeframe: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-800 bg-neutral-950 px-4 py-2">
      <div className="flex flex-wrap gap-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
              activeTab === tab.key
                ? "bg-sky-500/20 text-sky-400"
                : "text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="flex gap-0.5 rounded bg-neutral-900 p-0.5">
        {TIMEFRAME_OPTIONS.map((tf) => (
          <button
            key={tf.label}
            onClick={() => onTimeframeChange(tf.label)}
            className={`rounded px-2 py-1 text-[11px] font-mono transition-colors ${
              timeframe === tf.label
                ? "bg-sky-500 text-white"
                : "text-neutral-500 hover:bg-neutral-800 hover:text-neutral-300"
            }`}
          >
            {tf.label}
          </button>
        ))}
      </div>
    </div>
  );
}
