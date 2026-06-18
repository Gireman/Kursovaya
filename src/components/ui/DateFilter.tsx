import { useRef } from 'react';

interface DateFilterProps {
  value: string;
  onChange: (value: string) => void;
}

export function DateFilter({ value, onChange }: DateFilterProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const openPicker = () => inputRef.current?.showPicker?.();

  return (
    <div className="flex items-center gap-2 cursor-pointer" onClick={openPicker}>
      <span className="material-symbols-outlined text-on-surface-variant">calendar_month</span>
      <input
        ref={inputRef}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="date-no-indicator bg-transparent border-none focus:ring-0 text-body-md text-on-surface py-0 text-label-md outline-none cursor-pointer"
      />
    </div>
  );
}
