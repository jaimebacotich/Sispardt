"use client";

import { useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Lock,
  LockOpen,
  Save,
  X as XIcon,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ConfirmModal } from "@/components/shared";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ── Tipos ────────────────────────────────────────────────────────────────────

export type FieldType = "text" | "number" | "select";

export interface FieldDef {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  tableOptions?: { value: string; label: string }[]; // opciones para resolver labels en la tabla (si difiere de options)
  min?: number;
  max?: number;
  numeric?: boolean;   // convierte el valor a número antes de enviar (para selects de IDs enteros)
  virtual?: boolean;   // se muestra en el formulario pero NO se envía al guardar
  clearFields?: string[]; // al cambiar este campo, limpia los campos indicados
}

export interface CatalogoItem {
  id: string | number;
  esSistema?: boolean;
  [key: string]: unknown;
}

interface CatalogoCrudProps {
  titulo: string;
  descripcion?: string;
  icono?: React.ElementType;
  datos: CatalogoItem[];
  campos: FieldDef[];
  isLoading?: boolean;
  showSistemaColumn?: boolean;
  onSave: (item: Record<string, unknown>) => Promise<void>;
  onDelete: (id: string | number) => Promise<void>;
  onFormFieldChange?: (name: string, value: string) => void;
  onFormOpen?: () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function emptyValues(campos: FieldDef[]): Record<string, string> {
  const v: Record<string, string> = {};
  for (const c of campos) v[c.name] = "";
  return v;
}

function itemToValues(item: CatalogoItem, campos: FieldDef[]): Record<string, string> {
  const v: Record<string, string> = {};
  for (const c of campos) {
    // Campos virtuales siempre empiezan vacíos al editar
    v[c.name] = c.virtual ? "" : String(item[c.name] ?? "");
  }
  return v;
}

function validate(values: Record<string, string>, campos: FieldDef[]): string | null {
  for (const c of campos) {
    if (c.virtual) continue; // los campos virtuales no se validan
    const val = values[c.name]?.trim() ?? "";
    if (c.required && val === "") return `"${c.label}" es requerido`;
    if (c.type === "number" && val !== "" && isNaN(Number(val)))
      return `"${c.label}" debe ser un número`;
    if (c.type === "number" && c.min !== undefined && Number(val) < c.min)
      return `"${c.label}" debe ser ≥ ${c.min}`;
    if (c.type === "number" && c.max !== undefined && Number(val) > c.max)
      return `"${c.label}" debe ser ≤ ${c.max}`;
  }
  return null;
}

function getLabelForValue(campo: FieldDef, value: string): string {
  if (campo.type === "select") {
    const opts = campo.tableOptions ?? campo.options;
    return opts?.find((o) => o.value === value)?.label ?? value;
  }
  return value;
}

// ── Formulario inline ─────────────────────────────────────────────────────────

interface InlineFormProps {
  campos: FieldDef[];
  values: Record<string, string>;
  onChange: (name: string, value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  isEdit: boolean;
  isSaving?: boolean;
}

function InlineForm({ campos, values, onChange, onSave, onCancel, isEdit, isSaving }: InlineFormProps) {
  // Determinar columnas según cantidad de campos (excluyendo virtuales del count de grilla no aplica)
  const gridClass =
    campos.length === 1 ? "grid-cols-1 max-w-sm" :
    campos.length === 2 ? "grid-cols-1 sm:grid-cols-2" :
    campos.length === 3 ? "grid-cols-1 sm:grid-cols-3" :
    "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4";

  return (
    <div className="bg-muted/40 border border-border rounded-xl p-4 space-y-3">
      <p className="text-xs font-semibold text-foreground/70 uppercase tracking-wide">
        {isEdit ? "Editar registro" : "Nuevo registro"}
      </p>
      <div className={cn("grid gap-3", gridClass)}>
        {campos.map((campo) => (
          <div key={campo.name}>
            <label className="text-xs font-medium text-foreground mb-1 block">
              {campo.label}
              {campo.required && !campo.virtual && <span className="text-destructive ml-0.5">*</span>}
              {campo.virtual && <span className="text-muted-foreground/50 ml-1 text-[10px]">(filtro)</span>}
            </label>
            {campo.type === "select" ? (
              <Select
                value={values[campo.name] ?? ""}
                onValueChange={(v) => onChange(campo.name, v === "_" ? "" : (v ?? ""))}
              >
                <SelectTrigger className="h-9 text-sm w-full">
                  <SelectValue
                    placeholder={campo.placeholder ?? `Seleccionar ${campo.label}...`}
                    label={campo.options?.find((o) => o.value === values[campo.name])?.label}
                  />
                </SelectTrigger>
                <SelectContent>
                  {campo.virtual && (
                    <SelectItem value="_">— Todos —</SelectItem>
                  )}
                  {campo.options?.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                type={campo.type === "number" ? "number" : "text"}
                value={values[campo.name] ?? ""}
                onChange={(e) => onChange(campo.name, e.target.value)}
                placeholder={campo.placeholder}
                min={campo.min}
                max={campo.max}
                className="h-9 text-sm"
              />
            )}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={onSave}
          disabled={isSaving}
          className="flex items-center gap-1.5 bg-primary text-primary-foreground px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save size={14} />
          {isSaving ? "Guardando..." : isEdit ? "Guardar cambios" : "Agregar"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isSaving}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border border-border hover:bg-muted transition-colors text-muted-foreground disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <XIcon size={14} />
          Cancelar
        </button>
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

export function CatalogoCrud({
  titulo, descripcion, icono: Icono, datos, campos, isLoading,
  showSistemaColumn, onSave, onDelete, onFormFieldChange, onFormOpen,
}: CatalogoCrudProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>(emptyValues(campos));
  const [deleteId, setDeleteId] = useState<string | number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function openAdd() {
    setEditingId(null);
    setFormValues(emptyValues(campos));
    setFormError(null);
    setShowForm(true);
    onFormOpen?.();
  }

  function openEdit(item: CatalogoItem) {
    setEditingId(item.id);
    setFormValues(itemToValues(item, campos));
    setFormError(null);
    setShowForm(true);
    onFormOpen?.();
  }

  function handleCancel() {
    setShowForm(false);
    setEditingId(null);
    setFormError(null);
  }

  function handleFieldChange(name: string, value: string) {
    setFormValues((prev) => {
      const campo = campos.find((c) => c.name === name);
      const updates: Record<string, string> = { [name]: value };
      if (campo?.clearFields) {
        for (const f of campo.clearFields) updates[f] = "";
      }
      return { ...prev, ...updates };
    });
    setFormError(null);
    onFormFieldChange?.(name, value);
  }

  async function handleSave() {
    const error = validate(formValues, campos);
    if (error) { setFormError(error); return; }

    const parsed: Record<string, unknown> = {};
    if (editingId) parsed.id = editingId;
    for (const c of campos) {
      if (c.virtual) continue; // nunca se envían campos virtuales
      if (formValues[c.name] === "") continue;
      parsed[c.name] = (c.type === "number" || c.numeric) ? Number(formValues[c.name]) : formValues[c.name];
    }

    setIsSaving(true);
    try {
      await onSave(parsed);
      toast.success(`${titulo} ${editingId ? "actualizado" : "agregado"}`);
      setShowForm(false);
      setEditingId(null);
      setFormValues(emptyValues(campos));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : (err as { message?: string })?.message || "Error al guardar el registro";
      setFormError(msg);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      await onDelete(deleteId);
      toast.success(`${titulo} eliminado`);
      setDeleteId(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : (err as { message?: string })?.message || "Error al eliminar el registro";
      toast.error(msg);
    } finally {
      setIsDeleting(false);
    }
  }

  // Campos visibles en la tabla (excluye virtuales)
  const camposTabla = campos.filter((c) => !c.virtual);

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <TooltipProvider>
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {Icono && (
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                <Icono size={14} className="text-primary" />
              </div>
            )}
            <div>
              <h3 className="text-sm font-semibold text-foreground">{titulo}</h3>
              {descripcion && (
                <p className="text-xs text-muted-foreground">{descripcion}</p>
              )}
            </div>
            <span className="ml-1 text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-medium">
              {datos?.length || 0}
            </span>
          </div>
          <button
            type="button"
            onClick={showForm && !editingId ? handleCancel : openAdd}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
              showForm && !editingId
                ? "border border-border hover:bg-muted text-muted-foreground"
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            )}
          >
            {showForm && !editingId ? (
              <><XIcon size={14} /> Cancelar</>
            ) : (
              <><Plus size={14} /> Agregar</>
            )}
          </button>
        </div>

        {/* Formulario inline */}
        {showForm && (
          <div>
            {formError && (
              <p className="text-xs text-destructive mb-2 px-1">{formError}</p>
            )}
            <InlineForm
              campos={campos}
              values={formValues}
              onChange={handleFieldChange}
              onSave={handleSave}
              onCancel={handleCancel}
              isEdit={!!editingId}
              isSaving={isSaving}
            />
          </div>
        )}

        {/* Tabla */}
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                {camposTabla.map((c) => (
                  <th
                    key={c.name}
                    className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide"
                  >
                    {c.label}
                  </th>
                ))}
                {showSistemaColumn && (
                  <th className="px-3 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide text-center w-20">
                    Sistema
                  </th>
                )}
                <th className="px-4 py-2.5 w-20" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={camposTabla.length + (showSistemaColumn ? 2 : 1)} className="px-4 py-8 text-center text-muted-foreground text-sm">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                      Cargando datos...
                    </div>
                  </td>
                </tr>
              ) : !datos || datos.length === 0 ? (
                <tr>
                  <td
                    colSpan={camposTabla.length + (showSistemaColumn ? 2 : 1)}
                    className="px-4 py-8 text-center text-muted-foreground text-sm"
                  >
                    No hay registros. Haz clic en &ldquo;Agregar&rdquo; para crear el primero.
                  </td>
                </tr>
              ) : (
                datos.map((item) => {
                  const isBeingEdited = editingId === item.id && showForm;
                  const bloqueado = !!item.esSistema;
                  return (
                    <tr
                      key={item.id}
                      className={cn(
                        "group hover:bg-muted/30 transition-colors",
                        isBeingEdited && "bg-primary/5"
                      )}
                    >
                      {camposTabla.map((c) => (
                        <td key={c.name} className="px-4 py-2.5">
                          <span className={cn(
                            "text-sm",
                            c.type === "number" && "font-mono text-foreground/80",
                          )}>
                            {getLabelForValue(c, String(item[c.name] ?? "—"))}
                          </span>
                        </td>
                      ))}
                      {showSistemaColumn && (
                        <td className="px-3 py-2.5 text-center">
                          {bloqueado ? (
                            <Tooltip>
                              <TooltipTrigger>
                                <span className="inline-flex justify-center cursor-default">
                                  <Lock size={14} className="text-amber-500" />
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>Registro de sistema — no se puede modificar</TooltipContent>
                            </Tooltip>
                          ) : (
                            <Tooltip>
                              <TooltipTrigger>
                                <span className="inline-flex justify-center cursor-default">
                                  <LockOpen size={14} className="text-muted-foreground/35" />
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>Registro editable</TooltipContent>
                            </Tooltip>
                          )}
                        </td>
                      )}
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-end gap-1">
                          {!bloqueado && (
                            <button
                              type="button"
                              onClick={() => openEdit(item)}
                              className="p-1.5 rounded bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 transition-colors"
                              title="Editar"
                            >
                              <Pencil size={13} />
                            </button>
                          )}
                          {!bloqueado && (
                            <button
                              type="button"
                              onClick={() => setDeleteId(item.id)}
                              className="p-1.5 rounded bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                              title="Eliminar"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <ConfirmModal
          open={!!deleteId}
          onClose={() => setDeleteId(null)}
          onConfirm={handleDelete}
          title={`Eliminar ${titulo.toLowerCase()}`}
          description={`¿Confirmas la eliminación de "${datos?.find((i) => i.id === deleteId)?.[camposTabla[0]?.name] ?? deleteId}"? Esta acción es irreversible.`}
          confirmLabel="Eliminar"
          variant="destructive"
          isLoading={isDeleting}
        />
      </div>
    </TooltipProvider>
  );
}
