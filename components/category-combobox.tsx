"use client";

import { Command } from "cmdk";
import { Check, ChevronDown } from "lucide-react";
import { useMemo, useState } from "react";
import { kategoriAwal, tampilkanKategori } from "@/lib/categories";

export function CategoryCombobox({ value, onChange, categories = [] }: { value: string; onChange: (value: string) => void; categories?: string[] }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const options = useMemo(() => [...new Set([...kategoriAwal, ...categories.map(tampilkanKategori)])], [categories]);
  const normalized = query.trim();
  const hasExact = options.some((option) => option.toLocaleLowerCase() === normalized.toLocaleLowerCase());

  function pilih(next: string) {
    // `Command.Item` can be activated through click, touch, or keyboard.
    // Always close the controlled menu before propagating the chosen category.
    setOpen(false);
    setQuery("");
    onChange(next);
  }
  function pilihDenganPointer(event: React.PointerEvent<HTMLDivElement>, next: string) {
    // Close immediately on touch/click instead of waiting for cmdk's select event.
    event.preventDefault();
    pilih(next);
  }
  return <div className="relative">
    <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center justify-between rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-left text-sm text-stone-800" aria-expanded={open}>
      <span className={value ? "" : "text-stone-400"}>{value ? tampilkanKategori(value) : "Ketik atau pilih kategori..."}</span><ChevronDown size={16} />
    </button>
    {open && <Command className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-stone-200 bg-white p-1 shadow-lg">
      <Command.Input value={query} onValueChange={setQuery} placeholder="Ketik atau pilih kategori..." className="w-full border-b border-stone-100 px-3 py-2 text-sm outline-none" />
      <Command.List className="max-h-48 overflow-auto py-1">
        <Command.Empty className="px-3 py-2 text-sm text-stone-500">Tidak ada kategori yang sama.</Command.Empty>
        {normalized && !hasExact && <Command.Item value={`buat-${normalized}`} onPointerDown={(event) => pilihDenganPointer(event, normalized)} onSelect={() => pilih(normalized)} className="cursor-pointer rounded-lg px-3 py-2 text-sm aria-selected:bg-orange-50">Buat kategori “{normalized}”</Command.Item>}
        {options.map((option) => <Command.Item key={option} value={option} onPointerDown={(event) => pilihDenganPointer(event, option)} onSelect={() => pilih(option)} className="flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm aria-selected:bg-orange-50">{option}{value === option && <Check size={15} />}</Command.Item>)}
      </Command.List>
    </Command>}
  </div>;
}
