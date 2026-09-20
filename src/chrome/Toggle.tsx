interface Props {
  on: boolean;
  onChange: (value: boolean) => void;
  label: string;
  accent?: boolean;
}

export default function Toggle({ on, onChange, label, accent = false }: Props) {
  const track = on ? (accent ? "#f0552b" : "#f3f4f5") : "#3a3d42";
  const knob = on && !accent ? "#111214" : "#ffffff";
  return (
    <label className="inline-flex cursor-pointer items-center gap-2">
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        onClick={() => onChange(!on)}
        className="relative shrink-0 overflow-hidden border-2 border-chrome-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-action"
        style={{ width: 48, height: 28, background: track }}
      >
        <span
          className="absolute"
          style={{
            width: 20,
            height: 20,
            top: 2,
            left: on ? 22 : 2,
            background: knob,
            border: "2px solid #f3f4f5",
          }}
        />
      </button>
      <span className="text-base">{label}</span>
    </label>
  );
}
