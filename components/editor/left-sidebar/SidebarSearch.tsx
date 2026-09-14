"use client";

import { Search, X } from "lucide-react";

export function SidebarSearch({
  value,
  onChange,
  placeholder,
  label,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
  label: string;
}) {
  return (
    <label className="editor-sidebar-search">
      <span className="sr-only">{label}</span>
      <Search size={13} strokeWidth={1.75} aria-hidden />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="editor-sidebar-search__input"
      />
      {value ? (
        <button
          type="button"
          className="editor-sidebar-search__clear"
          aria-label="Clear"
          onClick={() => onChange("")}
        >
          <X size={12} strokeWidth={2} aria-hidden />
        </button>
      ) : null}
    </label>
  );
}
