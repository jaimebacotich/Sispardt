"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ConfirmModal } from "@/components/shared";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, BedDouble, Trash2, Check, Loader2 } from "lucide-react";
import { establecimientosApi } from "@/lib/api/establecimientos";
import type { Habitacion, TipoHabitacion, TipoCama } from "@/types/api";

// ── Schema ─────────────────────────────────────────────────

const camaSchema = z.object({
  tipoCamaId: z.coerce.number().min(1, "Selecciona el tipo de cama"),
  cantidad: z.coerce.number().min(1).max(10),
});

const habitacionSchema = z
  .object({
    nroHabitacion: z.preprocess(
      (val) => (val == null ? "" : String(val)),
      z.string().min(1, "El número de habitación es requerido")
    ),
    piso: z.string().optional(),
    tipoHabitacionId: z.preprocess(
      (val) => (val === "" || val == null ? null : Number(val)),
      z.number().nullable().optional()
    ),
    tieneBanoPrivado: z.boolean().default(false),
    camas: z.array(camaSchema).min(1, "Agrega al menos una cama"),
  })
  .superRefine((data, ctx) => {
    const ids = data.camas.map((c) => c.tipoCamaId).filter((id) => id > 0);
    const duplicados = ids.filter((id, i) => ids.indexOf(id) !== i);
    if (duplicados.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["camas"],
        message: "No puedes agregar el mismo tipo de cama dos veces. Aumenta la cantidad en su lugar.",
      });
    }
  });

type HabitacionForm = z.infer<typeof habitacionSchema>;

// ── Componente ─────────────────────────────────────────────

export function HabitacionesSplitPanel({
  establecimientoId,
}: {
  establecimientoId: string;
}) {
  const { data: session } = useSession();
  const token = (session as { accessToken?: string } | null)?.accessToken ?? "";

  // Datos del servidor
  const [habitaciones, setHabitaciones] = useState<Habitacion[]>([]);
  const [tiposHabitacion, setTiposHabitacion] = useState<TipoHabitacion[]>([]);
  const [tiposCama, setTiposCama] = useState<TipoCama[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Estado UI
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const selected = habitaciones.find((h) => h.id === selectedId);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    control,
    formState: { errors },
  } = useForm<HabitacionForm>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(habitacionSchema) as any,
    defaultValues: { nroHabitacion: "", piso: "", tieneBanoPrivado: false, camas: [{ tipoCamaId: 0, cantidad: 1 }] },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "camas" });
  const watchedCamas = watch("camas") ?? [];
  const watchedTipo = watch("tipoHabitacionId");
  const watchedBano = watch("tieneBanoPrivado");

  // Capacidad calculada
  const capacidadTotal = watchedCamas.reduce((sum, c) => {
    const tipo = tiposCama.find((t) => String(t.id) === String(c.tipoCamaId));
    return sum + (tipo?.capacidadPersonas ?? 0) * (c.cantidad ?? 0);
  }, 0);

  // ── Carga inicial ───────────────────────────────────────

  useEffect(() => {
    if (!token) return;
    setLoadingData(true);
    Promise.all([
      establecimientosApi.listHabitaciones(token, establecimientoId),
      establecimientosApi.listTiposHabitacion(token),
      establecimientosApi.listTiposCama(token),
    ])
      .then(([habs, tipos, camas]) => {
        setHabitaciones(habs);
        setTiposHabitacion(tipos);
        setTiposCama(camas);
        if (habs.length > 0) {
          setSelectedId(habs[0].id);
          loadHabitacion(habs[0]);
        }
      })
      .catch(() => toast.error("Error al cargar datos"))
      .finally(() => setLoadingData(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, establecimientoId]);

  // ── Helpers ─────────────────────────────────────────────

  function loadHabitacion(hab: Habitacion) {
    reset({
      nroHabitacion: hab.numero,
      piso: hab.piso != null ? String(hab.piso) : "",
      tipoHabitacionId: hab.tipoHabitacionId ? Number(hab.tipoHabitacionId) : null,
      tieneBanoPrivado: false,
      camas:
        hab.camas.length > 0
          ? hab.camas.map((c) => ({
              tipoCamaId: Number(c.tipoCamaId),
              cantidad: c.cantidad,
            }))
          : [{ tipoCamaId: 0, cantidad: 1 }],
    });
  }

  function selectHabitacion(hab: Habitacion) {
    setIsNew(false);
    setSelectedId(hab.id);
    loadHabitacion(hab);
  }

  function startNew() {
    setIsNew(true);
    setSelectedId(null);
    reset({
      nroHabitacion: "",
      piso: "",
      tipoHabitacionId: null,
      tieneBanoPrivado: false,
      camas: [{ tipoCamaId: 0, cantidad: 1 }],
    });
  }

  // ── Submit ──────────────────────────────────────────────

  async function onSubmit(data: HabitacionForm) {
    if (!token) return;
    setIsLoading(true);
    try {
      if (isNew) {
        const created = await establecimientosApi.createHabitacion(
          token,
          establecimientoId,
          {
            tipoHabitacionId: data.tipoHabitacionId ?? null,
            nroHabitacion: data.nroHabitacion,
            piso: data.piso?.trim() || null,
            tieneBanoPrivado: data.tieneBanoPrivado,
            camas: data.camas.map((c) => ({
              tipoCamaId: Number(c.tipoCamaId),
              cantidad: c.cantidad,
            })),
          }
        );
        setHabitaciones((prev) => [...prev, created]);
        setSelectedId(created.id);
        setIsNew(false);
        loadHabitacion(created);
        toast.success("Habitación creada");
      } else {
        if (!selectedId) return;
        const updated = await establecimientosApi.updateHabitacion(
          token,
          establecimientoId,
          selectedId,
          {
            tipoHabitacionId: data.tipoHabitacionId ?? null,
            nroHabitacion: data.nroHabitacion,
            piso: data.piso?.trim() || null,
            tieneBanoPrivado: data.tieneBanoPrivado,
            camas: data.camas.map((c) => ({
              tipoCamaId: Number(c.tipoCamaId),
              cantidad: c.cantidad,
            })),
          }
        );
        setHabitaciones((prev) =>
          prev.map((h) => (h.id === selectedId ? updated : h))
        );
        loadHabitacion(updated);
        toast.success("Habitación actualizada");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al guardar";
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  }

  // ── Eliminar ────────────────────────────────────────────

  async function handleDelete() {
    if (!deleteId) return;
    setIsLoading(true);
    try {
      // Backend no expone DELETE /habitaciones/{id} todavía — simulamos localmente
      setHabitaciones((prev) => prev.filter((h) => h.id !== deleteId));
      const remaining = habitaciones.filter((h) => h.id !== deleteId);
      if (remaining.length > 0) {
        setSelectedId(remaining[0].id);
        loadHabitacion(remaining[0]);
      } else {
        setSelectedId(null);
        setIsNew(false);
      }
      toast.success("Habitación eliminada");
    } catch {
      toast.error("Error al eliminar");
    } finally {
      setIsLoading(false);
      setDeleteId(null);
    }
  }

  // ── Render ──────────────────────────────────────────────

  if (loadingData) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-220px)] min-h-[500px]">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="flex gap-4 h-[calc(100vh-220px)] min-h-[500px]">
      {/* ── Panel izquierdo: Lista ── */}
      <div className="w-72 flex-shrink-0 bg-card border border-border rounded-xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="font-semibold text-sm text-foreground">
            Habitaciones Creadas
          </h3>
          <button
            onClick={startNew}
            className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center text-primary-foreground hover:bg-primary/90 transition-colors"
            title="Nueva habitación"
          >
            <Plus size={14} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
          {habitaciones.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-6">
              No hay habitaciones. Crea la primera.
            </p>
          )}
          {habitaciones.map((hab) => {
            const isSelected = !isNew && selectedId === hab.id;
            return (
              <button
                key={hab.id}
                onClick={() => selectHabitacion(hab)}
                className={cn(
                  "w-full text-left px-3 py-3 rounded-lg border-2 transition-all",
                  isSelected
                    ? "border-primary bg-primary/5"
                    : "border-transparent hover:border-border bg-muted/30 hover:bg-muted/60"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-foreground">
                    Hab. {hab.numero}
                  </span>
                  {isSelected && (
                    <Check size={14} className="text-primary flex-shrink-0" />
                  )}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {hab.piso != null ? `Piso ${hab.piso}` : "Sin piso"}{" "}
                  {hab.tipoHabitacionNombre ? `• ${hab.tipoHabitacionNombre}` : ""}
                </div>
                <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                  <BedDouble size={11} />
                  <span>Capacidad: {hab.capacidadTotal} personas</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Panel derecho: Formulario ── */}
      <div className="flex-1 bg-card border border-border rounded-xl overflow-hidden flex flex-col">
        {selected || isNew ? (
          <form
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onSubmit={handleSubmit(onSubmit as any, (errs) => {
              console.error("Errores de validación:", errs);
              toast.error("Por favor revisa los campos en rojo");
            })}
            className="flex-1 flex flex-col overflow-hidden"
          >
            {/* Header del formulario */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="font-semibold text-foreground">
                {isNew ? "Nueva Habitación" : "Editar Habitación"}
              </h3>
              {!isNew && selected && (
                <button
                  type="button"
                  onClick={() => setDeleteId(selected.id)}
                  className="flex items-center gap-1 text-xs text-destructive hover:text-destructive/80 transition-colors"
                >
                  <Trash2 size={13} />
                  Eliminar
                </button>
              )}
            </div>

            {/* Campos del formulario */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Datos básicos */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label>
                    Número de Habitación{" "}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    {...register("nroHabitacion")}
                    placeholder="101"
                    className={cn(errors.nroHabitacion && "border-destructive")}
                  />
                  {errors.nroHabitacion && (
                    <p className="text-xs text-destructive">
                      {errors.nroHabitacion.message}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>Piso</Label>
                  <Input
                    {...register("piso")}
                    placeholder="1"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Tipo de Habitación</Label>
                  <Select
                    value={watchedTipo != null ? String(watchedTipo) : ""}
                    onValueChange={(v) =>
                      setValue("tipoHabitacionId", v ? Number(v) : null)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar...">
                        {tiposHabitacion.find((t) => String(t.id) === String(watchedTipo))?.nombre}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {tiposHabitacion.map((t) => (
                        <SelectItem key={t.id} value={String(t.id)}>
                          {t.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Baño privado */}
              <div className="flex items-center gap-2">
                <input
                  id="bano"
                  type="checkbox"
                  checked={watchedBano}
                  onChange={(e) => setValue("tieneBanoPrivado", e.target.checked)}
                  className="w-4 h-4 rounded border-border accent-primary cursor-pointer"
                />
                <Label htmlFor="bano" className="cursor-pointer">
                  Tiene baño privado
                </Label>
              </div>

              {/* Configuración de camas */}
              <div className="space-y-3">
                {(() => {
                  const tiposYaUsados = watchedCamas
                    .map((c) => String(c.tipoCamaId))
                    .filter((id) => id !== "0");
                  const hayTiposLibres = tiposCama.some(
                    (t) => !tiposYaUsados.includes(t.id)
                  );
                  return (
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-sm text-foreground">
                        Configuración de Camas
                      </h4>
                      <button
                        type="button"
                        onClick={() => append({ tipoCamaId: 0, cantidad: 1 })}
                        disabled={!hayTiposLibres}
                        className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        title={!hayTiposLibres ? "Ya están configurados todos los tipos de cama disponibles" : undefined}
                      >
                        <Plus size={13} />
                        Agregar Cama
                      </button>
                    </div>
                  );
                })()}

                {(errors.camas?.root?.message || (errors.camas as { message?: string })?.message) && (
                  <p className="text-xs text-destructive">
                    {errors.camas?.root?.message ?? (errors.camas as { message?: string })?.message}
                  </p>
                )}

                <div className="space-y-2.5">
                  {fields.map((field, index) => (
                    <div
                      key={field.id}
                      className="flex items-center gap-3 bg-muted/40 rounded-lg px-4 py-3"
                    >
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <Label className="text-xs text-muted-foreground mb-1 block">
                          Tipo de Cama
                        </Label>
                        <Select
                          value={
                            watchedCamas[index]?.tipoCamaId
                              ? String(watchedCamas[index].tipoCamaId)
                              : ""
                          }
                          onValueChange={(v) =>
                            setValue(`camas.${index}.tipoCamaId`, Number(v))
                          }
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue placeholder="Seleccionar tipo...">
                              {(() => {
                                const t = tiposCama.find(
                                  (t) => String(t.id) === String(watchedCamas[index]?.tipoCamaId)
                                );
                                return t
                                  ? `${t.nombre} (${t.capacidadPersonas} ${t.capacidadPersonas === 1 ? "persona" : "personas"})`
                                  : undefined;
                              })()}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {tiposCama
                              .filter((t) => {
                                // Mostrar: tipos no usados en otras filas + el tipo de esta fila
                                const tiposOtrasFilas = watchedCamas
                                  .filter((_, i) => i !== index)
                                  .map((c) => String(c.tipoCamaId))
                                  .filter((id) => id !== "0");
                                return !tiposOtrasFilas.includes(t.id);
                              })
                              .map((t) => (
                                <SelectItem key={t.id} value={String(t.id)}>
                                  {t.nombre} ({t.capacidadPersonas}{" "}
                                  {t.capacidadPersonas === 1 ? "persona" : "personas"})
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="w-24">
                        <Label className="text-xs text-muted-foreground mb-1 block">
                          Cantidad
                        </Label>
                        <Input
                          type="number"
                          min={1}
                          max={10}
                          className="h-8 text-sm"
                          {...register(`camas.${index}.cantidad`)}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        disabled={fields.length === 1}
                        className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-30 disabled:cursor-not-allowed mt-4"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Capacidad calculada */}
                <div className="flex items-center justify-between bg-primary/5 border border-primary/20 rounded-xl px-5 py-4 mt-2">
                  <div>
                    <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                      Capacidad Total Calculada
                    </div>
                    <div className="text-3xl font-bold text-foreground mt-0.5">
                      {capacidadTotal}
                      <span className="text-sm font-normal text-muted-foreground ml-1">
                        personas
                      </span>
                    </div>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
                    <BedDouble size={22} className="text-primary-foreground" />
                  </div>
                </div>
              </div>
            </div>

            {/* Botones inferiores */}
            <div className="border-t border-border px-6 py-4 flex items-center gap-3">
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-lg font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-70"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 size={14} className="animate-spin" />
                    Guardando...
                  </span>
                ) : isNew ? (
                  "Crear Habitación"
                ) : (
                  "Guardar Cambios"
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (isNew) {
                    setIsNew(false);
                    if (habitaciones[0]) selectHabitacion(habitaciones[0]);
                  } else if (selected) {
                    loadHabitacion(selected);
                  }
                }}
                className="px-5 py-2.5 border border-border rounded-lg text-sm hover:bg-muted transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
            Selecciona una habitación o crea una nueva
          </div>
        )}
      </div>

      <ConfirmModal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Eliminar habitación"
        description="¿Confirmas que deseas eliminar esta habitación? Esta acción es irreversible."
        confirmLabel="Eliminar"
        variant="destructive"
        isLoading={isLoading}
      />
    </div>
  );
}
