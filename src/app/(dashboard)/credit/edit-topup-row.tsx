"use client";

import { IconCheck, IconPencil, IconX } from "@tabler/icons-react";
import { useRef, useState } from "react";

import { editTopupAmountAction } from "@/features/transactions/actions";

interface EditTopupRowProps {
  transactionId: string;
  currentAmountCents: number;
  isEditable: boolean;
}

export function EditTopupRow({ transactionId, currentAmountCents, isEditable }: EditTopupRowProps) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const formattedAmount = (currentAmountCents / 100).toFixed(2) + " €";

  if (!isEditable || !editing) {
    return (
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-sm font-semibold text-fg tabular-nums">{formattedAmount}</span>
        {isEditable && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="p-1 text-fg-subtle hover:text-fg hover:bg-elevated rounded transition-colors"
            title="Modifier le montant"
          >
            <IconPencil size={14} />
          </button>
        )}
      </div>
    );
  }

  async function handleSave() {
    const raw = inputRef.current?.value ?? "";
    const value = parseFloat(raw);
    if (!raw || isNaN(value) || value <= 0) {
      setError("Montant invalide");
      return;
    }
    setPending(true);
    setError(null);
    const res = await editTopupAmountAction(null, { transactionId, amount: value });
    setPending(false);
    if ((res as any).error) {
      setError((res as any).error);
    } else {
      setEditing(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1 shrink-0">
      <div className="flex items-center gap-1">
        <input
          ref={inputRef}
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0.01"
          defaultValue={(currentAmountCents / 100).toFixed(2)}
          disabled={pending}
          className="w-24 bg-surface-900 border border-border rounded px-2 py-1 text-sm text-fg focus:outline-none focus:border-accent-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        <button
          type="button"
          onClick={handleSave}
          disabled={pending}
          className="p-1 text-green-400 hover:text-green-300 hover:bg-elevated rounded transition-colors disabled:opacity-50"
          title="Confirmer"
        >
          <IconCheck size={14} />
        </button>
        <button
          type="button"
          onClick={() => { setEditing(false); setError(null); }}
          disabled={pending}
          className="p-1 text-fg-subtle hover:text-fg hover:bg-elevated rounded transition-colors disabled:opacity-50"
          title="Annuler"
        >
          <IconX size={14} />
        </button>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
