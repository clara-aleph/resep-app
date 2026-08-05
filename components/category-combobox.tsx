"use client";

import { Command } from "cmdk";
import { Check, ChevronDown } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { kategoriAwal, tampilkanKategori } from "@/lib/categories";

export function CategoryCombobox({ value, onChange, categories = [] }: { value: string; onChange: (value: string) => void; categories?: string[] }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const touchStartYRef = useRef<number | null>(null);
  const touchDidMoveRef = useRef(false);
  const selectionLockRef = useRef(false);
  const options = useMemo(() => [...new Set([...kategoriAwal, ...categories.map(tampilkanKategori)])], [categories]);
  const normalized = query.trim();
  const hasExact = options.some((option) => option.toLocaleLowerCase() === normalized.toLocaleLowerCase());

  function resetTouchState() {
    touchStartYRef.current = null;
    touchDidMoveRef.current = false;
    selectionLockRef.current = false;
  }
  function pilih(next: string) {
    setOpen(false);
    setQuery("");
    onChange(next);
  }
  function pilihDariDaftar(next: string) {
    // cmdk can emit both click and select for one tap. It must only commit once.
    // A touch drag is a scroll gesture, never a category selection.
    if (touchDidMoveRef.current || selectionLockRef.current) return;
    selectionLockRef.current = true;
    pilih(next);
  }
  function mulaiSentuhan(event: React.TouchEvent<HTMLDivElement>) {
    touchStartYRef.current = event.touches[0]?.clientY ?? null;
    touchDidMoveRef.current = false;
  }
  function gerakkanSentuhan(event: React.TouchEvent<HTMLDivElement>) {
    const startY = touchStartYRef.current;
    const currentY = event.touches[0]?.clientY;
    if (startY !== null && currentY !== undefined && Math.abs(currentY - startY) > 8) touchDidMoveRef.current = true;
  }

  return <div className="relative">
    <button
      type="button"
      onClick={() => {
        const nextOpen = !open;
        if (nextOpen) resetTouchState();
        setOpen(nextOpen);
      }}
      className="flex w-full items-center justify-between rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-left text-sm text-stone-800"
      aria-expanded={open}
    >
      <span className={value ? "" : "text-stone-400"}>{value ? tampilkanKategori(value) : "Ketik atau pilih kategori..."}</span>
      <ChevronDown size={16} />
    </button>
    {open && <Command className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-stone-200 bg-white p-1 shadow-lg">
      <Command.Input value={query} onValueChange={setQuery} placeholder="Ketik atau pilih kategori..." className="w-full border-b border-stone-100 px-3 py-2 text-sm outline-none" />
      <Command.List onTouchStart={mulaiSentuhan} onTouchMove={gerakkanSentuhan} onKeyDown={() => { touchDidMoveRef.current = false; }} className="max-h-48 overflow-auto py-1">
        <Command.Empty className="px-3 py-2 text-sm text-stone-500">Tidak ada kategori yang sama.</Command.Empty>
        {normalized && !hasExact && <Command.Item value={`buat-${normalized}`} onSelect={() => pilihDariDaftar(normalized)} onClick={() => pilihDariDaftar(normalized)} className="cursor-pointer rounded-lg px-3 py-2 text-sm aria-selected:bg-orange-50">Buat kategori “{normalized}”</Command.Item>}
        {options.map((option) => <Command.Item key={option} value={option} onSelect={() => pilihDariDaftar(option)} onClick={() => pilihDariDaftar(option)} className="flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm aria-selected:bg-orange-50">{option}{tampilkanKategori(value) === option && <Check size={15} />}</Command.Item>)}
      </Command.List>
    </Command>}
  </div>;
}
