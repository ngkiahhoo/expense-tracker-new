"use client";

import { useRef, useState } from 'react';
import ActionIconButton from '@/components/ui/ActionIconButton';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Field';
import { removePaymentName, savePaymentName } from '@/services/paymentPlanService';
import type { PaymentName } from '@/types/paymentPlan';

interface Props {
  names: PaymentName[];
  value: string;
  onChange: (value: string) => void;
  refresh: () => Promise<void>;
  disabled: boolean;
  onBusyChange: (busy: boolean) => void;
}

export default function PaymentNameMenu({ names, value, onChange, refresh, disabled, onBusyChange }: Props) {
  const [mode, setMode] = useState<'add' | 'edit' | 'delete' | null>(null);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);
  const selected = names.find(item => String(item.id) === value);

  async function save() {
    if (lock.current || disabled) return;
    if (mode !== 'delete' && !draft.trim()) { setError('Enter a name.'); return; }
    lock.current = true;
    setSaving(true);
    onBusyChange(true);
    setError('');
    try {
      if (mode === 'delete') {
        if (!selected) throw new Error('Choose a name first.');
        await removePaymentName(selected.id);
        onChange('');
      } else {
        const id = await savePaymentName(draft, mode === 'edit' && selected ? selected.id : null);
        onChange(String(id));
      }
      await refresh();
      setMode(null);
      setDraft('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save name.');
    } finally {
      lock.current = false;
      setSaving(false);
      onBusyChange(false);
    }
  }

  return <div className="space-y-2">
    <label className="block text-sm" htmlFor="payment-name">Name</label>
    <Select id="payment-name" required value={selected ? value : ''} disabled={disabled || saving} onChange={event => { onChange(event.target.value); setMode(null); setError(''); }}>
      <option value="">Choose name</option>
      {names.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
    </Select>
    <div className="flex items-center justify-end gap-2">
      <Button type="button" disabled={disabled || saving} onClick={() => { setMode('add'); setDraft(''); setError(''); }}>Add name</Button>
      <ActionIconButton kind="edit" aria-label="Rename selected name" disabled={disabled || saving || !selected} onClick={() => { setMode('edit'); setDraft(selected?.name || ''); setError(''); }} />
      <ActionIconButton kind="delete" aria-label="Delete selected name" disabled={disabled || saving || !selected} onClick={() => { setMode('delete'); setError(''); }} />
    </div>
    {mode && <div className="space-y-2 rounded-xl border border-white/10 p-3">
      {mode === 'delete' ? <p className="text-sm">Remove {selected?.name} from the menu? Existing plans and automatic payments stay in your records.</p> : <label className="block text-sm">{mode === 'add' ? 'New name' : 'Rename name'}
        <Input maxLength={200} value={draft} disabled={saving} onChange={event => setDraft(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); void save(); } }} placeholder="Shopee" />
      </label>}
      <div className="flex gap-2">
        <Button type="button" disabled={disabled || saving} onClick={() => { void save(); }}>{saving ? 'Saving…' : mode === 'delete' ? 'Remove from menu' : 'Save name'}</Button>
        <ActionIconButton kind="close" aria-label="Close name editor" disabled={saving} onClick={() => { setMode(null); setError(''); }} />
      </div>
    </div>}
    {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
  </div>;
}
