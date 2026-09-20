interface Props {
  on: boolean;
  onChange: (value: boolean) => void;
  label: string;
  accent?: boolean;
}

export default function Toggle({ on, onChange, label, accent = false }: Props) {
  const track = on ? (accent ? "bg-action" : "bg-ink") : "bg-[#d4d4d4]";
  return (
    <label className="inline-flex cursor-pointer items-center gap-2">
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        onClick={() => onChange(!on)}
        className={`relative h-7 w-12 shrink-0 border border-ink ${track} focus:outline-none focus-visible:ring-2 focus-visible:ring-action`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 border border-ink bg-paper ${on ? "left-[1.55rem]" : "left-0.5"}`}
        />
      </button>
      <span className="text-base">{label}</span>
    </label>
  );
}
