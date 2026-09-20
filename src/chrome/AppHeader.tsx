import { useState, type ReactNode } from "react";
import { ChevronLeft, Menu } from "lucide-react";
import MenuSheet from "./MenuSheet";

interface Props {
  title: string;
  back?: () => void;
  menu?: boolean;
  onProjects?: () => void;
  onNew?: () => void;
  trailing?: ReactNode;
  align?: "left" | "center";
  menuSide?: "left" | "right";
}

export default function AppHeader({
  title,
  back,
  menu = false,
  onProjects,
  onNew,
  trailing,
  align = "left",
  menuSide = "left",
}: Props) {
  const [open, setOpen] = useState(false);
  const showMenu = menu && onProjects && onNew;

  const menuBtn = showMenu ? (
    <button
      type="button"
      aria-label="Menu"
      onClick={() => setOpen(true)}
      className="flex h-10 w-10 items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-action"
    >
      <Menu size={26} strokeWidth={2.25} />
    </button>
  ) : null;

  const left = back ? (
    <button
      type="button"
      aria-label="Back"
      onClick={back}
      className="flex h-10 w-10 items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-action"
    >
      <ChevronLeft size={28} strokeWidth={2.25} />
    </button>
  ) : showMenu && menuSide === "left" ? menuBtn : <span className="h-10 w-10" />;

  const right = trailing ?? (showMenu && menuSide === "right" ? menuBtn : <span className="h-10 w-10" />);

  return (
    <>
      <header className="flex items-center gap-2 px-4 pb-2 pt-4">
        {left}
        <h1 className={`min-w-0 flex-1 text-2xl font-bold leading-tight ${align === "center" ? "text-center" : ""}`}>
          {title}
        </h1>
        <div className="flex h-10 min-w-10 items-center justify-center">{right}</div>
      </header>
      {open && showMenu ? (
        <MenuSheet
          onClose={() => setOpen(false)}
          onProjects={() => { setOpen(false); onProjects?.(); }}
          onNew={() => { setOpen(false); onNew?.(); }}
        />
      ) : null}
    </>
  );
}
