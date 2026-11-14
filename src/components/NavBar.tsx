export type TabKey = "strength" | "overview" | "correlation" | "news" | "calendar";

const TABS: { key: TabKey; label: string }[] = [
  { key: "strength", label: "חוזק מטבעות" },
  { key: "overview", label: "סקירת שוק" },
  { key: "correlation", label: "קורלציה" },
  { key: "news", label: "חדשות" },
  { key: "calendar", label: "לוח כלכלי" },
];

export function NavBar({ activeTab, onTabChange }: { activeTab: TabKey; onTabChange: (tab: TabKey) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-neutral-800 bg-neutral-950 px-4 py-2">
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
  );
}
