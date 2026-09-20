import { LEGAL_OWNER, SUPPORT_EMAIL, SUPPORT_MAILTO } from "../lib/support";

interface Props {
  onClose: () => void;
  onProjects: () => void;
  onNew: () => void;
}

export default function MenuSheet({ onClose, onProjects, onNew }: Props) {
  return (
    <div className="absolute inset-0 z-40">
      <button type="button" aria-label="Close menu" className="absolute inset-0 bg-black/50" onClick={onClose} />
      <nav className="absolute left-0 right-0 top-0 border-b border-rule bg-chrome px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <ul className="space-y-1">
          <li>
            <button type="button" className="w-full px-2 py-2 text-left text-lg font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-action" onClick={onProjects}>
              Projects
            </button>
          </li>
          <li>
            <button type="button" className="w-full px-2 py-2 text-left text-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-action" onClick={onNew}>
              New guide
            </button>
          </li>
          <li>
            <a
              href={SUPPORT_MAILTO}
              className="block w-full px-2 py-2 text-left text-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-action"
              onClick={onClose}
            >
              Help & support
              <span className="mt-0.5 block text-sm font-normal text-ash">{SUPPORT_EMAIL}</span>
            </a>
          </li>
        </ul>
        <p className="px-2 pt-2 text-sm text-ash">{LEGAL_OWNER}</p>
      </nav>
    </div>
  );
}
