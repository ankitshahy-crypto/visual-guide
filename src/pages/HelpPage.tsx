import { LEGAL_OWNER, SUPPORT_EMAIL, SUPPORT_MAILTO } from "../lib/support";
import AppHeader from "../chrome/AppHeader";

interface Props {
  onHome: () => void;
  onNew: () => void;
}

export default function HelpPage({ onHome, onNew }: Props) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <AppHeader title="Help" menu onProjects={onHome} onNew={onNew} align="center" />
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 pb-4 pt-2">
        <section>
          <h2 className="text-lg font-bold">Help & support</h2>
          <p className="mt-2 text-base leading-snug text-ash">
            Questions about Plainstep, a stuck guide, or App Store review notes — email us. Drafts stay on this device.
          </p>
        </section>
        <a
          href={SUPPORT_MAILTO}
          className="block w-full rounded-full border border-action bg-action px-4 py-3.5 text-center text-lg font-bold text-paper focus:outline-none focus-visible:ring-2 focus-visible:ring-action"
        >
          {SUPPORT_EMAIL}
        </a>
        <p className="text-sm leading-snug text-ash">{LEGAL_OWNER}</p>
      </div>
    </div>
  );
}
