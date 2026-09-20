interface Props {
  on: boolean;
  onChange: (value: boolean) => void;
  label: string;
  accent?: boolean;
}

export default function Toggle({ on, onChange, label, accent = false }: Props) {
  const track = on ? (accent ? "#f0552b" : "#000000") : "#c8c8c8";
  return (
    <label className="inline-flex cursor-pointer items-center gap-2">
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        onClick={() => onChange(!on)}
        className="relative shrink-0 overflow-hidden border-2 border-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-action"
        style={{ width: 48, height: 28, background: track }}
      >
        <span
          className="absolute bg-paper"
          style={{
            width: 20,
            height: 20,
            top: 2,
            left: on ? 22 : 2,
            border: "2px solid #000",
          }}
        />
      </button>
      <span className="text-base">{label}</span>
    </label>
  );
}
