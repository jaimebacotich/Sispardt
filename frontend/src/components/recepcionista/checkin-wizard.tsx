"use client";

import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle2, ChevronRight, ChevronLeft, BedDouble, X, AlertTriangle } from "lucide-react";
import {
  useHabitacionesEstado,
  useHabitacionesEstadoEnFecha,
  useCreateParte,
  useCatalogosMovimientos,
} from "@/hooks/useMovimientos";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import type { CatalogosMovimientos } from "@/types/api";

// ── Bolivia ID ───────────────────────────────────────────────────────────────
const ID_BOLIVIA = 1;

// ── Helper: convierte undefined/non-string a "" antes de validar ─────────────
const s = (min: number, msg: string) =>
  z.preprocess((v) => (typeof v === "string" ? v : ""), z.string().min(min, msg));

// ── Esquema completo (para submit final) ────────────────────────────────────
const wizardSchema = z
  .object({
    habitacionId:          s(1, "Selecciona una habitación"),
    tipoDocumentoId:       z.coerce.number().min(1, "Selecciona tipo de documento"),
    documentoIdentidad:    s(3, "Documento requerido (mín. 3 caracteres)"),
    nombre:                s(2, "Nombre requerido"),
    apellidoPaterno:       s(2, "Apellido paterno requerido"),
    apellidoMaterno:       z.string().optional(),
    fechaNacimiento:       s(1, "Fecha de nacimiento requerida"),
    genero:                z.enum(["M", "F", "OTRO"]),
    paisOrigenId:          z.coerce.number().min(1, "Nacionalidad requerida"),
    profesion:             z.string().optional(),
    fechaReporte:          s(1, "Fecha de reporte requerida"),
    paisProcedenciaId:     z.coerce.number().min(1, "País de procedencia requerido"),
    divPrincipalProcId:    z.coerce.number().optional(),
    divSecundariaProcId:   z.coerce.number().optional(),
    localidadProcedenciaId: z.coerce.number().optional(),
    paisDestinoId:         z.coerce.number().optional(),
    divPrincipalDestId:    z.coerce.number().optional(),
    divSecundariaDestId:   z.coerce.number().optional(),
    localidadDestinoId:    z.coerce.number().optional(),
    motivoViajeId:         z.coerce.number().optional(),
  })
  .superRefine((d, ctx) => {
    if (d.paisProcedenciaId === ID_BOLIVIA && !d.localidadProcedenciaId) {
      ctx.addIssue({ code: "custom", path: ["localidadProcedenciaId"], message: "Localidad requerida para Bolivia" });
    }
    if (d.paisDestinoId === ID_BOLIVIA && !d.localidadDestinoId) {
      ctx.addIssue({ code: "custom", path: ["localidadDestinoId"], message: "Localidad requerida para Bolivia" });
    }
  });

type FormData = z.infer<typeof wizardSchema>;

// ── Validadores por paso (z.safeParse directo, sin zodResolver) ──────────────
const v1 = z.object({ habitacionId: s(1, "Selecciona una habitación") });
const v2 = z.object({
  tipoDocumentoId:    z.coerce.number().min(1, "Selecciona tipo de documento"),
  documentoIdentidad: s(3, "Documento requerido (mín. 3 caracteres)"),
  nombre:             s(2, "Nombre requerido"),
  apellidoPaterno:    s(2, "Apellido paterno requerido"),
  fechaNacimiento:    s(1, "Fecha de nacimiento requerida"),
  genero:             z.enum(["M", "F", "OTRO"] as const),
  paisOrigenId:       z.coerce.number().min(1, "Nacionalidad requerida"),
});
const _v3 = z.object({
  paisProcedenciaId: z.coerce.number().min(1, "País de procedencia requerido"),
}); void _v3;

const STEP_VALIDATORS = [v1, v2] as const;
const STEPS = ["Habitación", "Huésped", "Detalles"];

// ── Sub-componente: selector de geografía Bolivia ────────────────────────────
interface GeoSelectorProps {
  catalogs: CatalogosMovimientos;
  divPrincipalId: number | undefined;
  divSecundariaId: number | undefined;
  localidadId: number | undefined;
  onDivPrincipal: (v: number | undefined) => void;
  onDivSecundaria: (v: number | undefined) => void;
  onLocalidad: (v: number | undefined) => void;
  errLocalidad?: string;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function GeoBoliviaSelector({
  catalogs, divPrincipalId, divSecundariaId, localidadId,
  onDivPrincipal, onDivSecundaria, onLocalidad, errLocalidad,
}: GeoSelectorProps) {
  const divsPrinc  = catalogs.divisionesPrincipales.filter((d) => d.paisId === ID_BOLIVIA);
  const divsSecund = divPrincipalId ? catalogs.divisionesSecundarias.filter((d) => d.divisionPrincipalId === divPrincipalId) : [];
  const locs       = divSecundariaId ? catalogs.localidades.filter((l) => l.divisionSecundariaId === divSecundariaId) : [];

  return (
    <div className="col-span-2 grid grid-cols-3 gap-3">
      <div className="space-y-1.5">
        <Label>Departamento</Label>
        <Select value={divPrincipalId ? String(divPrincipalId) : ""}
          onValueChange={(v) => { onDivPrincipal(Number(v)); onDivSecundaria(undefined); onLocalidad(undefined); }}>
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar..." label={divsPrinc.find((d) => d.id === divPrincipalId)?.nombre} />
          </SelectTrigger>
          <SelectContent>{divsPrinc.map((d) => <SelectItem key={d.id} value={String(d.id)}>{d.nombre}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Provincia</Label>
        <Select value={divSecundariaId ? String(divSecundariaId) : ""}
          onValueChange={(v) => { onDivSecundaria(Number(v)); onLocalidad(undefined); }}
          disabled={!divPrincipalId}>
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar..." label={divsSecund.find((d) => d.id === divSecundariaId)?.nombre} />
          </SelectTrigger>
          <SelectContent>{divsSecund.map((d) => <SelectItem key={d.id} value={String(d.id)}>{d.nombre}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Municipio *</Label>
        <Select value={localidadId ? String(localidadId) : ""}
          onValueChange={(v) => onLocalidad(Number(v))}
          disabled={!divSecundariaId}>
          <SelectTrigger className={cn(errLocalidad && "border-destructive")}>
            <SelectValue placeholder="Seleccionar..." label={locs.find((l) => l.id === localidadId)?.nombre} />
          </SelectTrigger>
          <SelectContent>{locs.map((l) => <SelectItem key={l.id} value={String(l.id)}>{l.nombre}</SelectItem>)}</SelectContent>
        </Select>
        {errLocalidad && <p className="text-xs text-destructive">{errLocalidad}</p>}
      </div>
    </div>
  );
}

// ── Helper: campo de texto con Controller (soluciona incompatibilidad Base UI) ─
interface CtrlInputProps {
  name: keyof FormData;
  control: ReturnType<typeof useForm<FormData>>["control"];
  placeholder?: string;
  type?: string;
  max?: string;
  className?: string;
  error?: string;
}

function CtrlInput({ name, control, placeholder, type = "text", max, className, error }: CtrlInputProps) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <Input
          type={type}
          value={typeof field.value === "string" ? field.value : ""}
          onChange={(e) => field.onChange((e.target as HTMLInputElement).value)}
          onBlur={field.onBlur}
          placeholder={placeholder}
          max={max}
          className={cn(error && "border-destructive", className)}
        />
      )}
    />
  );
}

// ── Wizard principal ─────────────────────────────────────────────────────────
interface CheckinWizardProps {
  onClose: () => void;
  /** Cuando se proporciona, bloquea la fecha de reporte a ese valor (modo Fuera de Plazo) */
  fechaInicial?: string;
}

export function CheckinWizard({ onClose, fechaInicial }: CheckinWizardProps) {
  const [step, setStep] = useState(0);
  const today = new Date().toISOString().slice(0, 10);
  const fechaDefault = fechaInicial ?? today;
  const esFueraDePlazo = !!fechaInicial && fechaInicial < today;

  const habsActuales = useHabitacionesEstado();
  const habsHistoricas = useHabitacionesEstadoEnFecha(esFueraDePlazo ? fechaDefault : "");
  const { data: habitaciones = [], isLoading: loadingHabs } = esFueraDePlazo ? habsHistoricas : habsActuales;
  const { data: catalogs, isLoading: loadingCats } = useCatalogosMovimientos();
  const createParte = useCreateParte();

  const habitacionesLibres = habitaciones.filter((h) => h.estado === "libre");

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<FormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(wizardSchema) as any,
    defaultValues: {
      habitacionId: "",
      tipoDocumentoId: 0,
      documentoIdentidad: "",
      nombre: "",
      apellidoPaterno: "",
      apellidoMaterno: "",
      fechaNacimiento: "",
      genero: "M",
      paisOrigenId: 0,
      profesion: "",
      fechaReporte: fechaDefault,
      paisProcedenciaId: 0,
    },
  });

  const w = watch();

  // Estado auxiliar para cascade de geografía
  const [procDivPrinc, setProcDivPrinc] = useState<number | undefined>();
  const [procDivSecund, setProcDivSecund] = useState<number | undefined>();
  const [destDivPrinc, setDestDivPrinc] = useState<number | undefined>();
  const [destDivSecund, setDestDivSecund] = useState<number | undefined>();

  // Garantiza que fechaReporte siempre tenga el valor correcto en el form (campo no controlado)
  useEffect(() => {
    setValue("fechaReporte", fechaDefault);
  }, [fechaDefault, setValue]);

  // Validación por paso usando z.safeParse directo (evita incompatibilidad Base UI + RHF)
  function nextStep() {
    clearErrors();
    const validator = STEP_VALIDATORS[step as 0 | 1];
    if (validator) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (validator as z.ZodObject<any>).safeParse(w);
      if (!result.success) {
        result.error.issues.forEach((issue) => {
          const name = issue.path[0] as keyof FormData;
          if (name) setError(name, { type: "manual", message: issue.message });
        });
        return;
      }
    }
    setStep((s) => s + 1);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function onSubmit(data: any) {
    createParte.mutate(
      {
        habitacionId: data.habitacionId,
        persona: {
          tipoDocumentoId:   data.tipoDocumentoId,
          documentoIdentidad: data.documentoIdentidad,
          nombre:             data.nombre,
          apellidoPaterno:    data.apellidoPaterno,
          apellidoMaterno:    data.apellidoMaterno || undefined,
          fechaNacimiento:    data.fechaNacimiento,
          genero:             data.genero,
          paisOrigenId:       data.paisOrigenId,
          profesion:          data.profesion || undefined,
        },
        fechaReporte:          data.fechaReporte,
        paisProcedenciaId:     data.paisProcedenciaId,
        localidadProcedenciaId: data.localidadProcedenciaId || undefined,
        paisDestinoId:         data.paisDestinoId || undefined,
        localidadDestinoId:    data.localidadDestinoId || undefined,
        motivoViajeId:         data.motivoViajeId || undefined,
      },
      { onSuccess: onClose }
    );
  }

  if (loadingHabs || loadingCats) {
    return (
      <div className="bg-card rounded-xl border border-border p-8 flex items-center justify-center">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  const cats = catalogs!;

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
      {/* Header / Stepper */}
      <div className="flex items-center justify-between border-b border-border bg-muted/30 px-6 py-4">
        <div className="flex items-center gap-0 flex-1">
          {STEPS.map((label, i) => (
            <div key={i} className="flex items-center flex-1 last:flex-none">
              <div className={cn(
                "flex items-center gap-2 text-sm font-medium transition-colors",
                i < step ? "text-emerald-600" : i === step ? "text-primary" : "text-muted-foreground"
              )}>
                <div className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 border-2 transition-all",
                  i < step ? "bg-emerald-100 border-emerald-500 text-emerald-600"
                    : i === step ? "bg-primary/10 border-primary text-primary"
                    : "bg-card border-border text-muted-foreground"
                )}>
                  {i < step ? <CheckCircle2 size={14} /> : i + 1}
                </div>
                <span className="hidden sm:block">{label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={cn("flex-1 h-px mx-3 transition-colors", i < step ? "bg-emerald-300" : "bg-border")} />
              )}
            </div>
          ))}
        </div>
        <button type="button" onClick={onClose} className="ml-4 text-muted-foreground hover:text-foreground transition-colors">
          <X size={18} />
        </button>
      </div>

      {/* Formulario */}
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <form onSubmit={handleSubmit(onSubmit as any)} className="p-6 space-y-5">

        {/* ── PASO 1: Habitación ──────────────────────────────── */}
        {step === 0 && (
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Seleccionar habitación</h3>
            {habitacionesLibres.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">No hay habitaciones disponibles.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-72 overflow-y-auto pr-1">
                {habitacionesLibres.map((hab) => (
                  <button key={hab.id} type="button"
                    onClick={() => setValue("habitacionId", hab.id)}
                    className={cn(
                      "rounded-xl border-2 p-4 text-left transition-all",
                      w.habitacionId === hab.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 bg-card"
                    )}
                  >
                    <div className="font-bold text-sm text-foreground">Hab. {hab.numero}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">Piso {hab.piso} · {hab.tipoNombre}</div>
                    <div className="flex items-center gap-1 mt-1.5 text-xs text-emerald-600 font-medium">
                      <BedDouble size={11} />{hab.capacidad} pers.
                    </div>
                  </button>
                ))}
              </div>
            )}
            {errors.habitacionId && <p className="text-xs text-destructive">{errors.habitacionId.message}</p>}
          </div>
        )}

        {/* ── PASO 2: Datos del huésped ──────────────────────── */}
        {step === 1 && (
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Datos del huésped</h3>
            <div className="grid grid-cols-2 gap-4">

              {/* Col izq: Tipo de documento / Col der: Nro. documento */}
              <div className="space-y-1.5">
                <Label>Tipo de documento *</Label>
                <Controller name="tipoDocumentoId" control={control} render={({ field }) => {
                  const td = field.value ? cats.tiposDocumento.find((t) => t.id === field.value) : undefined;
                  return (
                  <Select value={field.value ? String(field.value) : ""}
                    onValueChange={(v) => field.onChange(Number(v))}>
                    <SelectTrigger className={cn(errors.tipoDocumentoId && "border-destructive")}>
                      <SelectValue placeholder="Seleccionar..." label={td ? `${td.sigla} — ${td.descripcion}` : undefined} />
                    </SelectTrigger>
                    <SelectContent>
                      {cats.tiposDocumento.map((t) => (
                        <SelectItem key={t.id} value={String(t.id)}>{t.sigla} — {t.descripcion}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  );
                }} />
                {errors.tipoDocumentoId && <p className="text-xs text-destructive">{errors.tipoDocumentoId.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label>Nro. de documento *</Label>
                <CtrlInput name="documentoIdentidad" control={control} placeholder="12345678" error={errors.documentoIdentidad?.message} />
                {errors.documentoIdentidad && <p className="text-xs text-destructive">{errors.documentoIdentidad.message}</p>}
              </div>

              {/* Col izq: Nombre / Col der: Fecha de nacimiento */}
              <div className="space-y-1.5">
                <Label>Nombre(s) *</Label>
                <CtrlInput name="nombre" control={control} placeholder="Juan Carlos" error={errors.nombre?.message} />
                {errors.nombre && <p className="text-xs text-destructive">{errors.nombre.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label>Fecha de nacimiento *</Label>
                <CtrlInput name="fechaNacimiento" control={control} type="date" max={today} error={errors.fechaNacimiento?.message} />
                {errors.fechaNacimiento && <p className="text-xs text-destructive">{errors.fechaNacimiento.message}</p>}
              </div>

              {/* Col izq: Apellido paterno / Col der: Nacionalidad */}
              <div className="space-y-1.5">
                <Label>Apellido paterno *</Label>
                <CtrlInput name="apellidoPaterno" control={control} placeholder="Pérez" error={errors.apellidoPaterno?.message} />
                {errors.apellidoPaterno && <p className="text-xs text-destructive">{errors.apellidoPaterno.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label>Nacionalidad *</Label>
                <Controller name="paisOrigenId" control={control} render={({ field }) => (
                  <Select value={field.value ? String(field.value) : ""}
                    onValueChange={(v) => field.onChange(Number(v))}>
                    <SelectTrigger className={cn(errors.paisOrigenId && "border-destructive")}>
                      <SelectValue placeholder="Seleccionar país..." label={cats.paises.find((p) => p.id === field.value)?.nombre} />
                    </SelectTrigger>
                    <SelectContent>
                      {cats.paises.map((p) => (
                        <SelectItem key={p.id} value={String(p.id)}>{p.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )} />
                {errors.paisOrigenId && <p className="text-xs text-destructive">{errors.paisOrigenId.message}</p>}
              </div>

              {/* Col izq: Apellido materno / Col der: Género */}
              <div className="space-y-1.5">
                <Label>Apellido materno</Label>
                <CtrlInput name="apellidoMaterno" control={control} placeholder="García (opcional)" />
              </div>

              <div className="space-y-1.5">
                <Label>Género *</Label>
                <Controller name="genero" control={control} render={({ field }) => {
                  const GENERO_LABEL: Record<string, string> = { M: "Masculino", F: "Femenino", OTRO: "Otro" };
                  return (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue label={GENERO_LABEL[field.value]} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="M">Masculino</SelectItem>
                      <SelectItem value="F">Femenino</SelectItem>
                      <SelectItem value="OTRO">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                  );
                }} />
              </div>

              {/* Profesión */}
              <div className="space-y-1.5">
                <Label>Profesión <span className="text-muted-foreground">(opcional)</span></Label>
                <CtrlInput name="profesion" control={control} placeholder="Ingeniero, Médico, Docente..." />
              </div>
            </div>
          </div>
        )}

        {/* ── PASO 3: Detalles del parte ─────────────────────── */}
        {step === 2 && (
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Detalles del parte</h3>
            <div className="grid grid-cols-2 gap-4">

              {/* Fila 1: Fecha de reporte | Motivo de viaje */}
              <div className="space-y-1.5">
                <Label>Fecha de reporte</Label>
                {esFueraDePlazo ? (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 border border-amber-300 bg-amber-50 dark:bg-amber-950/20 rounded-lg px-3 py-2 text-sm font-mono text-amber-800 dark:text-amber-200 select-none">
                      {fechaDefault.split("-").reverse().join("/")}
                    </div>
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-100 dark:bg-amber-950/60 dark:text-amber-400 px-2.5 py-1.5 rounded-full uppercase tracking-wide border border-amber-300 dark:border-amber-700 whitespace-nowrap">
                      <AlertTriangle size={11} /> Fuera de Plazo
                    </span>
                  </div>
                ) : (
                  <div className="w-fit border border-border bg-muted/40 rounded-lg px-3 py-2 text-sm font-mono text-foreground select-none">
                    {fechaDefault.split("-").reverse().join("/")}
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>Motivo de viaje <span className="text-muted-foreground">(opcional)</span></Label>
                <Controller name="motivoViajeId" control={control} render={({ field }) => {
                  const motivo = field.value && field.value > 0 ? cats.motivosViaje.find((m) => m.id === field.value) : undefined;
                  return (
                  <Select value={field.value ? String(field.value) : ""}
                    onValueChange={(v) => field.onChange(v && v !== "0" ? Number(v) : undefined)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar motivo..." label={motivo?.nombre} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">— Sin especificar —</SelectItem>
                      {cats.motivosViaje.map((m) => (
                        <SelectItem key={m.id} value={String(m.id)}>{m.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  );
                }} />
              </div>

              {/* Fila 2: País procedencia | Departamento | Provincia | Municipio */}
              <div className={cn(
                "col-span-2 grid grid-cols-4 gap-3 rounded-lg transition-colors",
                w.paisProcedenciaId === ID_BOLIVIA && "border border-primary/30 bg-primary/5 p-3"
              )}>
                <div className="space-y-1.5">
                  <Label>País de procedencia *</Label>
                  <Controller name="paisProcedenciaId" control={control} render={({ field }) => (
                    <Select value={field.value ? String(field.value) : ""}
                      onValueChange={(v) => {
                        field.onChange(Number(v));
                        setProcDivPrinc(undefined); setProcDivSecund(undefined);
                        setValue("localidadProcedenciaId", undefined);
                      }}>
                      <SelectTrigger className={cn(errors.paisProcedenciaId && "border-destructive")}>
                        <SelectValue placeholder="Seleccionar..." label={cats.paises.find((p) => p.id === field.value)?.nombre} />
                      </SelectTrigger>
                      <SelectContent>
                        {cats.paises.map((p) => <SelectItem key={p.id} value={String(p.id)}>{p.nombre}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )} />
                  {errors.paisProcedenciaId && <p className="text-xs text-destructive">{errors.paisProcedenciaId.message}</p>}
                </div>
                {w.paisProcedenciaId === ID_BOLIVIA && (() => {
                  const divsPrinc = cats.divisionesPrincipales.filter((d) => d.paisId === ID_BOLIVIA);
                  const divsSecund = procDivPrinc ? cats.divisionesSecundarias.filter((d) => d.divisionPrincipalId === procDivPrinc) : [];
                  const locs = procDivSecund ? cats.localidades.filter((l) => l.divisionSecundariaId === procDivSecund) : [];
                  return (<>
                    <div className="space-y-1.5">
                      <Label>Departamento</Label>
                      <Select value={procDivPrinc ? String(procDivPrinc) : ""}
                        onValueChange={(v) => { setProcDivPrinc(Number(v)); setProcDivSecund(undefined); setValue("localidadProcedenciaId", undefined); }}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar..." label={divsPrinc.find((d) => d.id === procDivPrinc)?.nombre} />
                        </SelectTrigger>
                        <SelectContent>{divsPrinc.map((d) => <SelectItem key={d.id} value={String(d.id)}>{d.nombre}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Provincia</Label>
                      <Select value={procDivSecund ? String(procDivSecund) : ""}
                        onValueChange={(v) => { setProcDivSecund(Number(v)); setValue("localidadProcedenciaId", undefined); }}
                        disabled={!procDivPrinc}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar..." label={divsSecund.find((d) => d.id === procDivSecund)?.nombre} />
                        </SelectTrigger>
                        <SelectContent>{divsSecund.map((d) => <SelectItem key={d.id} value={String(d.id)}>{d.nombre}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Municipio *</Label>
                      <Select value={w.localidadProcedenciaId ? String(w.localidadProcedenciaId) : ""}
                        onValueChange={(v) => setValue("localidadProcedenciaId", Number(v))}
                        disabled={!procDivSecund}>
                        <SelectTrigger className={cn(errors.localidadProcedenciaId && "border-destructive")}>
                          <SelectValue placeholder="Seleccionar..." label={locs.find((l) => l.id === w.localidadProcedenciaId)?.nombre} />
                        </SelectTrigger>
                        <SelectContent>{locs.map((l) => <SelectItem key={l.id} value={String(l.id)}>{l.nombre}</SelectItem>)}</SelectContent>
                      </Select>
                      {errors.localidadProcedenciaId && <p className="text-xs text-destructive">{errors.localidadProcedenciaId.message}</p>}
                    </div>
                  </>);
                })()}
              </div>

              {/* Fila 3: País destino | Departamento | Provincia | Municipio */}
              <div className={cn(
                "col-span-2 grid grid-cols-4 gap-3 rounded-lg transition-colors",
                w.paisDestinoId === ID_BOLIVIA && "border border-primary/30 bg-primary/5 p-3"
              )}>
                <div className="space-y-1.5">
                  <Label>País de destino <span className="text-muted-foreground">(opcional)</span></Label>
                  <Controller name="paisDestinoId" control={control} render={({ field }) => {
                    const paisDest = field.value && field.value > 0 ? cats.paises.find((p) => p.id === field.value) : undefined;
                    return (
                    <Select value={field.value ? String(field.value) : ""}
                      onValueChange={(v) => {
                        field.onChange(v && v !== "0" ? Number(v) : undefined);
                        setDestDivPrinc(undefined); setDestDivSecund(undefined);
                        setValue("localidadDestinoId", undefined);
                      }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar..." label={paisDest ? paisDest.nombre : field.value === 0 || !field.value ? undefined : "— Sin especificar —"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">— Sin especificar —</SelectItem>
                        {cats.paises.map((p) => <SelectItem key={p.id} value={String(p.id)}>{p.nombre}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    );
                  }} />
                </div>
                {w.paisDestinoId === ID_BOLIVIA && (() => {
                  const divsPrinc = cats.divisionesPrincipales.filter((d) => d.paisId === ID_BOLIVIA);
                  const divsSecund = destDivPrinc ? cats.divisionesSecundarias.filter((d) => d.divisionPrincipalId === destDivPrinc) : [];
                  const locs = destDivSecund ? cats.localidades.filter((l) => l.divisionSecundariaId === destDivSecund) : [];
                  return (<>
                    <div className="space-y-1.5">
                      <Label>Departamento</Label>
                      <Select value={destDivPrinc ? String(destDivPrinc) : ""}
                        onValueChange={(v) => { setDestDivPrinc(Number(v)); setDestDivSecund(undefined); setValue("localidadDestinoId", undefined); }}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar..." label={divsPrinc.find((d) => d.id === destDivPrinc)?.nombre} />
                        </SelectTrigger>
                        <SelectContent>{divsPrinc.map((d) => <SelectItem key={d.id} value={String(d.id)}>{d.nombre}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Provincia</Label>
                      <Select value={destDivSecund ? String(destDivSecund) : ""}
                        onValueChange={(v) => { setDestDivSecund(Number(v)); setValue("localidadDestinoId", undefined); }}
                        disabled={!destDivPrinc}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar..." label={divsSecund.find((d) => d.id === destDivSecund)?.nombre} />
                        </SelectTrigger>
                        <SelectContent>{divsSecund.map((d) => <SelectItem key={d.id} value={String(d.id)}>{d.nombre}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Municipio</Label>
                      <Select value={w.localidadDestinoId ? String(w.localidadDestinoId) : ""}
                        onValueChange={(v) => setValue("localidadDestinoId", Number(v))}
                        disabled={!destDivSecund}>
                        <SelectTrigger className={cn(errors.localidadDestinoId && "border-destructive")}>
                          <SelectValue placeholder="Seleccionar..." label={locs.find((l) => l.id === w.localidadDestinoId)?.nombre} />
                        </SelectTrigger>
                        <SelectContent>{locs.map((l) => <SelectItem key={l.id} value={String(l.id)}>{l.nombre}</SelectItem>)}</SelectContent>
                      </Select>
                      {errors.localidadDestinoId && <p className="text-xs text-destructive">{errors.localidadDestinoId.message}</p>}
                    </div>
                  </>);
                })()}
              </div>

            </div>
          </div>
        )}


        {/* ── Navegación ───────────────────────────────────────── */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <button type="button" onClick={() => setStep((s) => s - 1)} disabled={step === 0}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            <ChevronLeft size={16} />Atrás
          </button>

          {step < 2 ? (
            <button type="button" onClick={nextStep}
              className="flex items-center gap-1.5 bg-primary text-primary-foreground px-5 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
              Siguiente<ChevronRight size={16} />
            </button>
          ) : (
            <button type="submit" disabled={createParte.isPending}
              className="flex items-center gap-1.5 bg-primary text-primary-foreground px-6 py-2 rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-70">
              {createParte.isPending ? "Registrando..." : "Registrar Check-in"}
              <CheckCircle2 size={16} />
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
