"use client";
import { cx } from "@/lib/format";

export function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  unit,
  format,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  unit?: string;
  format?: (v: number) => string;
}) {
  return (
    <label className="block">
      <div className="flex items-center justify-between text-[11px] text-muted">
        <span className="uppercase tracking-wide">{label}</span>
        <span className="tabular font-semibold text-content">
          {format ? format(value) : value}
          {unit ? ` ${unit}` : ""}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full accent-accent"
        aria-label={label}
      />
    </label>
  );
}

export function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step,
  unit,
  placeholder,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <div className="text-[11px] uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-1 flex items-center gap-1">
        <input
          type="number"
          value={value ?? ""}
          min={min}
          max={max}
          step={step}
          placeholder={placeholder}
          onChange={(e) =>
            onChange(e.target.value === "" ? null : Number(e.target.value))
          }
          className="tabular w-full rounded-md border border-border bg-panel-2 px-2 py-1 text-sm text-content"
          aria-label={label}
        />
        {unit && <span className="text-xs text-muted">{unit}</span>}
      </div>
    </label>
  );
}

export function Select<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <label className="block">
      <div className="text-[11px] uppercase tracking-wide text-muted">{label}</div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="mt-1 w-full rounded-md border border-border bg-panel-2 px-2 py-1 text-sm text-content"
        aria-label={label}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  swatch,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  swatch?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cx(
        "flex w-full items-center justify-between rounded-md border px-2 py-1.5 text-left text-xs transition",
        checked
          ? "border-accent/40 bg-accent/10 text-content"
          : "border-border bg-panel-2/40 text-muted hover:bg-panel-2",
      )}
      aria-pressed={checked}
    >
      <span className="flex items-center gap-2">
        {swatch}
        {label}
      </span>
      <span
        className={cx(
          "h-3.5 w-3.5 rounded-sm border",
          checked ? "border-accent bg-accent" : "border-border bg-transparent",
        )}
      />
    </button>
  );
}
