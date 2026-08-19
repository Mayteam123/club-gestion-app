import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Users, UserPlus, FileSpreadsheet, Trash2, Pencil, Search, Upload } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { supabase } from '@/lib/supabase';
import { fetchAllStudents, createStudent, updateStudent, deleteStudent } from '@/lib/data';
import { formatCurrency } from '@/lib/format';
import type { Student } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';

type DebtMap = Record<string, number>;

export function AlumnasScreen() {
  const toast = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [debts, setDebts] = useState<DebtMap>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Student | null>(null);
  const [showImport, setShowImport] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const s = await fetchAllStudents();
      setStudents(s);
      // fetch debts via pending attendances
      const { data } = await supabase.from('attendances').select('student_id, price, status').eq('status', 'pending');
      const map: DebtMap = {};
      for (const a of data ?? []) {
        map[a.student_id] = (map[a.student_id] ?? 0) + Number(a.price);
      }
      setDebts(map);
    } catch {
      toast.error('No pudimos cargar las alumnas.');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const sorted = [...students].sort((a, b) => a.full_name.localeCompare(b.full_name));
    if (!search.trim()) return sorted;
    return sorted.filter((s) => s.full_name.toLowerCase().includes(search.toLowerCase()));
  }, [students, search]);

  async function handleSave(data: { full_name: string; category: string; age: string; phone: string }) {
    if (!data.full_name.trim()) {
      toast.error('El nombre y apellido son obligatorios.');
      return;
    }
    try {
      if (editing) {
        await updateStudent(editing.id, {
          full_name: data.full_name.trim(),
          category: data.category.trim(),
          age: data.age ? Number(data.age) : null,
          phone: data.phone.trim() || null,
        });
        setStudents((prev) => prev.map((s) => (s.id === editing.id ? { ...s, full_name: data.full_name.trim(), category: data.category.trim(), age: data.age ? Number(data.age) : null, phone: data.phone.trim() || null } : s)));
        toast.success('Alumna actualizada.');
      } else {
        const created = await createStudent({
          full_name: data.full_name.trim(),
          category: data.category.trim(),
          age: data.age ? Number(data.age) : null,
          phone: data.phone.trim() || null,
        });
        setStudents((prev) => [...prev, created]);
        toast.success('Alumna agregada.');
      }
      setShowAdd(false);
      setEditing(null);
    } catch {
      toast.error('No pudimos guardar los cambios.');
    }
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    try {
      await deleteStudent(confirmDelete.id);
      setStudents((prev) => prev.filter((s) => s.id !== confirmDelete.id));
      toast.success('Alumna eliminada.');
    } catch {
      toast.error('No se pudo eliminar la alumna.');
    } finally {
      setConfirmDelete(null);
    }
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setShowImport(false);
    try {
      const text = await file.text();
      const rows = parseCSV(text);
      if (rows.length === 0) {
        toast.error('El archivo no tiene filas válidas.');
        return;
      }
      const existing = new Set(students.map((s) => s.full_name.toLowerCase().trim()));
      let added = 0;
      for (const row of rows) {
        const name = (row.Nombre || row.nombre || row[0] || '').trim();
        if (!name) continue;
        if (existing.has(name.toLowerCase())) continue;
        const category = (row.Categoria || row.categoria || row[1] || '').trim();
        const ageStr = (row.Edad || row.edad || row[2] || '').trim();
        const phone = (row.Telefono || row.telefono || row[3] || '').trim();
        const created = await createStudent({
          full_name: name,
          category,
          age: ageStr ? Number(ageStr) : null,
          phone: phone || null,
        });
        setStudents((prev) => [...prev, created]);
        existing.add(name.toLowerCase());
        added++;
      }
      toast.success(`${added} alumna${added === 1 ? '' : 's'} importada${added === 1 ? '' : 's'} correctamente.`);
    } catch {
      toast.error('No pudimos importar el archivo.');
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 pt-4 pb-28">
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl h-16 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 pt-4 pb-28">
      <div className="mb-4">
        <h1 className="text-2xl font-extrabold text-ink">Tus alumnas</h1>
      </div>

      <div className="flex gap-2 mb-4">
        <Button size="lg" className="flex-1" onClick={() => { setEditing(null); setShowAdd(true); }}>
          <UserPlus className="w-5 h-5" /> Agregar alumna
        </Button>
        <Button variant="secondary" size="lg" onClick={() => setShowImport(true)}>
          <FileSpreadsheet className="w-5 h-5" /> Importar
        </Button>
      </div>

      {students.length > 0 && (
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar alumna..."
            className="w-full h-11 rounded-2xl border border-gray-200 bg-white pl-10 pr-4 text-sm outline-none focus:border-fuchsia-400 focus:ring-2 focus:ring-fuchsia-100"
          />
        </div>
      )}

      {students.length === 0 ? (
        <EmptyState
          icon={<Users className="w-7 h-7" />}
          title="No tenés alumnas todavía"
          description="Agregá alumnas una por una o importá un archivo Excel/CSV."
          action={
            <div className="flex gap-2">
              <Button onClick={() => { setEditing(null); setShowAdd(true); }}>
                <UserPlus className="w-4 h-4" /> Agregar alumna
              </Button>
            </div>
          }
        />
      ) : (
        <div className="space-y-2.5">
          {filtered.map((s) => {
            const debt = debts[s.id] ?? 0;
            return (
              <div key={s.id} className="bg-white rounded-2xl shadow-card p-4 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="font-bold text-ink uppercase tracking-wide text-sm truncate">{s.full_name}</h3>
                  {s.category && <p className="text-xs text-gray-400">{s.category}</p>}
                  <p className={`text-sm font-bold mt-0.5 ${debt > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {debt > 0 ? `debe ${formatCurrency(debt)}` : 'al día'}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => { setEditing(s); setShowAdd(true); }}
                    className="w-9 h-9 rounded-full flex items-center justify-center text-gray-400 hover:bg-fuchsia-50 hover:text-fuchsia-600"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setConfirmDelete(s)}
                    className="w-9 h-9 rounded-full flex items-center justify-center text-gray-400 hover:bg-rose-50 hover:text-rose-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit sheet */}
      <StudentForm
        open={showAdd}
        onClose={() => { setShowAdd(false); setEditing(null); }}
        onSave={handleSave}
        editing={editing}
      />

      {/* Import sheet */}
      <BottomSheet open={showImport} onClose={() => setShowImport(false)} title="Importar desde Excel">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Subí un archivo CSV con las columnas: <span className="font-semibold">Nombre, Categoría, Edad, Teléfono</span>.
            Las alumnas con nombre duplicado se saltean automáticamente.
          </p>
          <div className="rounded-2xl border-2 border-dashed border-gray-200 p-6 text-center">
            <Upload className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500 mb-3">Elegí tu archivo CSV</p>
            <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={handleFile} className="hidden" />
            <Button variant="secondary" onClick={() => fileRef.current?.click()}>
              <FileSpreadsheet className="w-4 h-4" /> Seleccionar archivo
            </Button>
          </div>
          <p className="text-xs text-gray-400">
            Si tu Excel tiene extensión .xlsx, guardálo como CSV (separado por comas) antes de importarlo.
          </p>
        </div>
      </BottomSheet>

      <ConfirmDialog
        open={!!confirmDelete}
        title="Eliminar alumna"
        message={`¿Segura querés eliminar a ${confirmDelete?.full_name}? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        danger
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}

function StudentForm({ open, onClose, onSave, editing }: { open: boolean; onClose: () => void; onSave: (d: { full_name: string; category: string; age: string; phone: string }) => void; editing: Student | null }) {
  const [fullName, setFullName] = useState('');
  const [category, setCategory] = useState('');
  const [age, setAge] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setFullName(editing?.full_name ?? '');
      setCategory(editing?.category ?? '');
      setAge(editing?.age?.toString() ?? '');
      setPhone(editing?.phone ?? '');
    }
  }, [open, editing]);

  return (
    <BottomSheet open={open} onClose={onClose} title={editing ? 'Editar alumna' : 'Nueva alumna'}>
      <div className="space-y-4">
        <Input label="Nombre y apellido" placeholder="Ej: Aguirre Belén" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        <Input label="Categoría" placeholder="Ej: Libre, Off-skate..." value={category} onChange={(e) => setCategory(e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Edad" type="number" inputMode="numeric" placeholder="Ej: 16" value={age} onChange={(e) => setAge(e.target.value)} />
          <Input label="Teléfono" placeholder="Ej: 11 1234-5678" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div className="flex gap-3 pt-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button className="flex-1" loading={saving} onClick={async () => { setSaving(true); await onSave({ full_name: fullName, category, age, phone }); setSaving(false); }}>
            Guardar
          </Button>
        </div>
      </div>
    </BottomSheet>
  );
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const delim = lines[0].includes(';') ? ';' : ',';
  const headers = lines[0].split(delim).map((h) => h.trim());
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(delim).map((c) => c.trim());
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      obj[h] = cols[idx] ?? '';
      obj[idx.toString()] = cols[idx] ?? '';
    });
    rows.push(obj);
  }
  return rows;
}
