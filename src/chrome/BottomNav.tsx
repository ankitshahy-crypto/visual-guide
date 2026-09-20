import { CircleHelp, Home, Plus } from "lucide-react";

export type BottomTab = "home" | "new" | "help";

interface Props {
  active: BottomTab;
  onHome: () => void;
  onNew: () => void;
  onHelp: () => void;
}

const TABS = [
  { id: "home" as const, label: "Home", Icon: Home },
  { id: "new" as const, label: "New", Icon: Plus },
  { id: "help" as const, label: "Help", Icon: CircleHelp },
];

/** Floating pill nav: Home, New, Help. */
export default function BottomNav({ active, onHome, onNew, onHelp }: Props) {
  const go = { home: onHome, new: onNew, help: onHelp };

  return (
    <nav
      data-bottom-nav
      aria-label="Main"
      className="shrink-0 px-5 pb-3 pt-2"
    >
      <div className="flex items-center justify-around rounded-full border border-white/10 bg-black/75 px-1.5 py-1 shadow-[0_8px_24px_rgba(0,0,0,0.45)] backdrop-blur-md">
        {TABS.map(({ id, label, Icon }) => {
          const on = active === id;
          return (
            <button
              key={id}
              type="button"
              aria-current={on ? "page" : undefined}
              aria-label={label}
              onClick={go[id]}
              className={`flex min-w-[5.25rem] flex-col items-center gap-0.5 rounded-full px-3 py-2 text-[11px] font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-action ${
                on ? "bg-chrome-ink text-ink" : "text-ash"
              }`}
            >
              <Icon size={20} strokeWidth={on ? 2.4 : 2} />
              {label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
