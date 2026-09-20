interface Props {
  onClose: () => void;
  onProjects: () => void;
  onNew: () => void;
}

export default function MenuSheet({ onClose, onProjects, onNew }: Props) {
  return (
    <div className="absolute inset-0 z-40">
      <button type="button" aria-label="Close menu" className="absolute inset-0 bg-ink/25" onClick={onClose} />
      <nav className="absolute left-0 right-0 top-0 border-b border-ink bg-paper px-4 py-3">
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
        </ul>
      </nav>
    </div>
  );
}
