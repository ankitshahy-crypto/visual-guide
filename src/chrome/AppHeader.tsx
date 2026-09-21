import { useState, type ReactNode } from "react";
import { ChevronLeft, Menu } from "lucide-react";
import MenuSheet from "./MenuSheet";

interface Props {
  title: string;
  subtitle?: string;
  wordmark?: boolean;
  /** Rounded icon hits — home chrome only; other screens stay square. */
  soft?: boolean;
  back?: () => void;
  menu?: boolean;
  onProjects?: () => void;
  trailing?: ReactNode;
  align?: "left" | "center";
  menuSide?: "left" | "right";
}

export default function AppHeader({
  title,
  subtitle,
  wordmark = false,
  soft = false,
  back,
  menu = false,
  onProjects,
  trailing,
  align = "left",
  menuSide = "left",
}: Props) {
  const [open, setOpen] = useState(false);
  const showMenu = Boolean(menu && onProjects);
  const hit = `flex h-10 w-10 items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-action ${
    soft ? "rounded-full border border-rule" : ""
  }`;

  const menuBtn = showMenu ? (
    <button type="button" aria-label="Menu" onClick={() => setOpen(true)} className={hit}>
      <Menu size={22} strokeWidth={2.25} />
    </button>
  ) : null;

  const left = back ? (
    <button type="button" aria-label="Back" onClick={back} className={hit}>
      <ChevronLeft size={28} strokeWidth={2.25} />
    </button>
  ) : showMenu && menuSide === "left" ? menuBtn : <span className="h-10 w-10" />;

  const right = trailing ?? (showMenu && menuSide === "right" ? menuBtn : <span className="h-10 w-10" />);

  const mark = wordmark ? (
    <img
      src={`${import.meta.env.BASE_URL}icons/plainstep-app-icon.svg`}
      alt=""
      width={32}
      height={32}
      className={`h-8 w-8 shrink-0 bg-paper ${soft ? "rounded-[9px]" : "border border-rule"}`}
    />
  ) : null;

  return (
    <>
      <header className={`flex gap-2 px-4 pb-2 pt-4 ${subtitle ? "items-start" : "items-center"}`}>
        {left}
        <div className={`min-w-0 flex-1 ${align === "center" ? "text-center" : ""}`}>
          <h1 className={`text-2xl font-bold leading-tight ${wordmark ? "flex items-center gap-2" : ""} ${align === "center" && wordmark ? "justify-center" : ""}`}>
            {mark}
            {title}
          </h1>
          {subtitle ? <p className="mt-1 text-sm leading-snug text-ash">{subtitle}</p> : null}
        </div>
        <div className="flex h-10 min-w-10 items-center justify-center">{right}</div>
      </header>
      {open && showMenu ? (
        <MenuSheet
          onClose={() => setOpen(false)}
          onProjects={() => { setOpen(false); onProjects?.(); }}
        />
      ) : null}
    </>
  );
}
