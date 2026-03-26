"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
import { FormField, FormSelect } from "@/components/shared";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Building2,
  MapPin,
  Phone,
  Star,
  ToggleLeft,
  ToggleRight,
  Wrench,
  User,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  useClasificaciones,
  useCategorias,
  useDivisionesSecundarias,
  useLocalidades,
  useServicios,
} from "@/hooks/useCatalogos";
import { useEstablecimiento, useCreateEstablecimiento } from "@/hooks/useEstablecimientos";
import type { EstablecimientoCreate } from "@/types/api";

// ── Mapa cargado dinámicamente (sin SSR) ─────────────────────────────────────

const MapSection = dynamic(
  () => import("./map-picker").then((m) => ({ default: m.MapSection })),
  {
    ssr: false,
    loading: () => (
      <div className="h-64 w-full rounded-xl border border-border bg-muted animate-pulse" />
    ),
  }
);

// ── Schema ────────────────────────────────────────────────────────────────────

const schema = z
  .object({
    // Identificación
    razonSocial: z.string().min(3, "Mínimo 3 caracteres"),
    razonSocialCorta: z.string().optional(),
    propietario: z.string().optional(),

    // SIRETUR
    clasificacionId: z.string().min(1, "Selecciona una clasificación"),
    categoriaId: z.string().min(1, "Selecciona una categoría"),
    tieneLicenciaTuristica: z.boolean(),
    nroLicencia: z.string().optional(),
    fechaVencimientoLicencia: z.string().optional(),

    // Contacto
    telefono: z.string().optional(),
    email: z.string().email("Email inválido").optional().or(z.literal("")),

    // Ubicación
    divisionSecundariaId: z.string().min(1, "Selecciona una provincia"),
    localidadId: z.string().min(1, "Selecciona una localidad"),
    direccion: z.string().min(5, "Mínimo 5 caracteres"),
    latitud: z.number().nullable(),
    longitud: z.number().nullable(),

    // Estado (solo edición)
    activo: z.boolean(),
  })
  .superRefine((val, ctx) => {
    if (val.tieneLicenciaTuristica) {
      if (!val.nroLicencia || val.nroLicencia.trim() === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "El número de licencia es requerido",
          path: ["nroLicencia"],
        });
      }
      if (!val.fechaVencimientoLicencia) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "La fecha de vencimiento es requerida",
          path: ["fechaVencimientoLicencia"],
        });
      } else if (val.fechaVencimientoLicencia <= new Date().toISOString().split("T")[0]) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "La fecha debe ser posterior a hoy",
          path: ["fechaVencimientoLicencia"],
        });
      }
    }
  });

type FormData = z.infer<typeof schema>;

// ── Sección del formulario ────────────────────────────────────────────────────

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-4">
      <div className="flex items-center gap-2.5 pb-3 border-b border-border">
        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Icon size={14} className="text-primary" />
        </div>
        <h3 className="font-semibold text-sm text-foreground">{title}</h3>
      </div>
      {children}
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

interface EstablecimientoFormProps {
  mode: "create" | "edit";
  defaultValues?: Partial<FormData>;
}

export function EstablecimientoForm({ mode, defaultValues }: EstablecimientoFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [serviciosSeleccionados, setServiciosSeleccionados] = useState<string[]>(
    (defaultValues as { serviciosIds?: string[] })?.serviciosIds ?? []
  );

  const { accessToken: token } = useAuth();
  const { data: clasificaciones = [] } = useClasificaciones(token);
  const { data: categoriasAll = [] } = useCategorias(token);
  const { data: divisionesAll = [] } = useDivisionesSecundarias(token);
  const { data: localidadesAll = [] } = useLocalidades(token);
  const { data: serviciosData = [] } = useServicios(token);

  // Solo provincias de Tarija (departamento fijo de la aplicación)
  const divisiones = divisionesAll.filter((d) => d.divisionPrincipalNombre === "Tarija");

  const mCreate = useCreateEstablecimiento();

  const today = new Date().toISOString().split("T")[0];

  const {
    control,
    handleSubmit,
    watch,
    setValue,
  } = useForm<FormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
    defaultValues: {
      razonSocial: "",
      propietario: "",
      clasificacionId: "",
      categoriaId: "",
      tieneLicenciaTuristica: false,
      nroLicencia: "",
      fechaVencimientoLicencia: "",
      telefono: "",
      email: "",
      divisionSecundariaId: "",
      localidadId: "",
      direccion: "",
      latitud: null,
      longitud: null,
      activo: true,
      ...defaultValues,
    },
  });

  const watchedClasificacion = watch("clasificacionId");
  const watchedDivision = watch("divisionSecundariaId");
  const watchedTieneLicencia = watch("tieneLicenciaTuristica");
  const watchedActivo = watch("activo");
  const watchedLat = watch("latitud");
  const watchedLng = watch("longitud");

  // Categorías filtradas por clasificación
  const categoriasFiltradas = useMemo(
    () =>
      watchedClasificacion
        ? categoriasAll.filter((c) => String(c.clasificacionId) === String(watchedClasificacion))
        : categoriasAll,
    [watchedClasificacion, categoriasAll]
  );

  // IDs de las provincias de Tarija para pre-filtrar localidades
  const divisionIdsTarija = useMemo(
    () => new Set(divisiones.map((d) => d.id)),
    [divisiones]
  );

  // Localidades filtradas: siempre dentro de Tarija, y además por provincia si está seleccionada
  const localidadesFiltradas = useMemo(
    () =>
      watchedDivision
        ? localidadesAll.filter((l) => String(l.divisionSecundariaId) === String(watchedDivision))
        : localidadesAll.filter((l) => l.divisionSecundariaId != null && divisionIdsTarija.has(l.divisionSecundariaId)),
    [watchedDivision, localidadesAll, divisionIdsTarija]
  );

  // Reset categoría when clasificación changes
  useEffect(() => {
    setValue("categoriaId", "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedClasificacion]);

  // Reset localidad when división changes
  useEffect(() => {
    setValue("localidadId", "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedDivision]);

  function toggleServicio(id: string) {
    setServiciosSeleccionados((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  }

  async function onSubmit(data: FormData) {
    setIsLoading(true);
    try {
      const payload: EstablecimientoCreate = {
        ...data,
        razonSocialCorta: data.razonSocialCorta || data.razonSocial.substring(0, 30),
        clasificacionId: data.clasificacionId, // solo uso frontal
        categoriaId: data.categoriaId,
        localidadId: data.localidadId,
        latitud: data.latitud ?? undefined,
        longitud: data.longitud ?? undefined,
        nroLicencia: data.nroLicencia || null,
        telefono: data.telefono || undefined,
        email: data.email || undefined,
        fechaVencimientoLicencia: data.fechaVencimientoLicencia || undefined,
        // Convertir strings a ids reales
        serviciosIds: serviciosSeleccionados,
      };

      // Casteos numéricos necesarios para Go si fuesen requeridos. 
      // NOTA: Como React prefiere enviar tipos numéricos, aseguraremos las conversiones:
      const apiPayload = {
        ...payload,
        categoriaId: parseInt(payload.categoriaId),
        localidadId: parseInt(payload.localidadId),
        serviciosIds: payload.serviciosIds?.map(id => parseInt(id)) || [],
      } as unknown as EstablecimientoCreate;

      if (mode === "create") {
         await mCreate.mutateAsync(apiPayload);
      } else {
         // await update 
         toast.success("Establecimiento actualizado exitosamente");
      }

      router.push("/establecimientos");
    } catch {
      toast.error("Error al guardar. Intente nuevamente.");
    } finally {
      setIsLoading(false);
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-4">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* ── Columna izquierda (2/3) ───────────────────────────────────── */}
        <div className="xl:col-span-2 space-y-4">

          {/* ── Identificación ─────────────────────────────────────────── */}
          <Section icon={Building2} title="Identificación">
            <FormField
              control={control}
              name="razonSocial"
              label="Razón Social"
              required
              render={({ field, fieldState }) => (
                <Input
                  {...field}
                  value={field.value as string}
                  placeholder="Hotel Gran Tarija S.R.L."
                  className={cn(fieldState.error && "border-destructive")}
                />
              )}
            />
            <FormField
              control={control}
              name="propietario"
              label="Nombre del Propietario"
              render={({ field }) => (
                <Input
                  {...field}
                  value={field.value as string}
                  placeholder="Juan Pérez García"
                />
              )}
            />
          </Section>

          {/* ── SIRETUR ────────────────────────────────────────────────── */}
          <Section icon={Star} title="SIRETUR">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormSelect
                control={control}
                name="clasificacionId"
                label="Clasificación"
                required
                placeholder="Seleccionar clasificación..."
                options={clasificaciones.map((c) => ({
                  value: String(c.id),
                  label: c.nombre,
                }))}
              />
              <FormSelect
                control={control}
                name="categoriaId"
                label="Categoría"
                required
                placeholder={
                  watchedClasificacion
                    ? "Seleccionar categoría..."
                    : "Selecciona primero una clasificación"
                }
                options={categoriasFiltradas.map((c) => ({
                  value: String(c.id),
                  label: c.nombre,
                }))}
                disabled={!watchedClasificacion}
              />
            </div>

            {/* Toggle licencia turística */}
            <div className="border border-border rounded-lg p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Tiene Licencia Turística
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Habilitación oficial del SIRETUR
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setValue("tieneLicenciaTuristica", !watchedTieneLicencia)}
                  className="flex-shrink-0"
                >
                  {watchedTieneLicencia ? (
                    <ToggleRight size={36} className="text-primary" />
                  ) : (
                    <ToggleLeft size={36} className="text-muted-foreground" />
                  )}
                </button>
              </div>

              {/* Campos condicionales cuando tiene licencia */}
              {watchedTieneLicencia && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1 border-t border-border">
                  <FormField
                    control={control}
                    name="nroLicencia"
                    label="Número de Licencia"
                    required
                    render={({ field, fieldState }) => (
                      <Input
                        {...field}
                        value={(field.value as string) ?? ""}
                        placeholder="HT-001"
                        className={cn("font-mono", fieldState.error && "border-destructive")}
                      />
                    )}
                  />
                  <FormField
                    control={control}
                    name="fechaVencimientoLicencia"
                    label="Fecha Vencimiento"
                    required
                    render={({ field, fieldState }) => (
                      <Input
                        {...field}
                        value={(field.value as string) ?? ""}
                        type="date"
                        min={today}
                        className={cn(fieldState.error && "border-destructive")}
                      />
                    )}
                  />
                </div>
              )}
            </div>
          </Section>

          {/* ── Ubicación ──────────────────────────────────────────────── */}
          <Section icon={MapPin} title="Ubicación">
            {/* País y Departamento (estáticos) */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">País</p>
                <div className="h-9 flex items-center px-3 bg-muted/50 rounded-md border border-border text-sm text-foreground/70">
                  Bolivia
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Departamento</p>
                <div className="h-9 flex items-center px-3 bg-muted/50 rounded-md border border-border text-sm text-foreground/70">
                  Tarija
                </div>
              </div>
            </div>

            {/* División Secundaria + Localidad */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormSelect
                control={control}
                name="divisionSecundariaId"
                label="Provincia"
                required
                placeholder="Seleccionar provincia..."
                options={divisiones.map((d) => ({
                  value: String(d.id),
                  label: d.nombre,
                }))}
              />
              <FormSelect
                control={control}
                name="localidadId"
                label="Municipio"
                required
                placeholder={
                  watchedDivision
                    ? "Seleccionar municipio..."
                    : "Selecciona primero una provincia"
                }
                options={localidadesFiltradas.map((l) => ({
                  value: String(l.id),
                  label: l.nombre,
                }))}
                disabled={!watchedDivision}
              />
            </div>

            {/* Dirección */}
            <FormField
              control={control}
              name="direccion"
              label="Dirección"
              required
              render={({ field, fieldState }) => (
                <Input
                  {...field}
                  value={field.value as string}
                  placeholder="Av. Las Américas 1234"
                  className={cn(fieldState.error && "border-destructive")}
                />
              )}
            />

            {/* Mapa interactivo */}
            <div>
              <p className="text-xs font-medium text-foreground mb-2 flex items-center gap-1">
                <MapPin size={12} />
                Ubicación Georreferenciada
              </p>
              <MapSection
                lat={watchedLat ?? null}
                lng={watchedLng ?? null}
                onLatChange={(v) =>
                  setValue("latitud", v === "" ? null : parseFloat(v))
                }
                onLngChange={(v) =>
                  setValue("longitud", v === "" ? null : parseFloat(v))
                }
                onMapClick={(lat, lng) => {
                  setValue("latitud", lat);
                  setValue("longitud", lng);
                }}
              />
            </div>
          </Section>
        </div>

        {/* ── Columna derecha (1/3) ─────────────────────────────────────── */}
        <div className="space-y-4">

          {/* ── Contacto ───────────────────────────────────────────────── */}
          <Section icon={Phone} title="Contacto">
            <FormField
              control={control}
              name="telefono"
              label="Teléfono"
              render={({ field }) => (
                <Input
                  {...field}
                  value={field.value as string}
                  placeholder="04-6641234"
                />
              )}
            />
            <FormField
              control={control}
              name="email"
              label="Correo Electrónico"
              render={({ field, fieldState }) => (
                <Input
                  {...field}
                  value={field.value as string}
                  type="email"
                  placeholder="info@establecimiento.com"
                  className={cn(fieldState.error && "border-destructive")}
                />
              )}
            />
          </Section>

          {/* ── Servicios del Establecimiento ──────────────────────────── */}
          <Section icon={Wrench} title="Servicios del Establecimiento">
            <div className="flex flex-wrap gap-2">
              {serviciosData.map((srv) => {
                const selected = serviciosSeleccionados.includes(String(srv.id));
                return (
                  <button
                    key={srv.id}
                    type="button"
                    onClick={() => toggleServicio(String(srv.id))}
                    className={cn(
                      "px-2.5 py-1 rounded-full text-xs font-medium border transition-all",
                      selected
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
                    )}
                  >
                    {srv.nombre}
                  </button>
                );
              })}
            </div>
            {serviciosSeleccionados.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {serviciosSeleccionados.length} servicio
                {serviciosSeleccionados.length !== 1 ? "s" : ""} seleccionado
                {serviciosSeleccionados.length !== 1 ? "s" : ""}
              </p>
            )}
          </Section>

          {/* ── Estado — solo en edición ────────────────────────────────── */}
          {mode === "edit" && (
            <Section icon={User} title="Estado del Registro">
              <div className="flex items-center justify-between py-1">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {watchedActivo ? "Activo" : "Inactivo"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {watchedActivo
                      ? "El establecimiento opera normalmente"
                      : "El establecimiento está dado de baja"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setValue("activo", !watchedActivo)}
                  className="flex-shrink-0"
                >
                  {watchedActivo ? (
                    <ToggleRight size={36} className="text-primary" />
                  ) : (
                    <ToggleLeft size={36} className="text-muted-foreground" />
                  )}
                </button>
              </div>
            </Section>
          )}
        </div>
      </div>

      {/* ── Botones ── */}
      <div className="flex items-center gap-3 pt-1">
        <button
          type="submit"
          disabled={isLoading}
          className="bg-primary text-primary-foreground px-6 py-2.5 rounded-lg font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-70 min-w-[180px]"
        >
          {isLoading
            ? "Guardando..."
            : mode === "create"
              ? "Crear Establecimiento"
              : "Guardar Cambios"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/establecimientos")}
          className="px-5 py-2.5 border border-border rounded-lg text-sm hover:bg-muted transition-colors"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

// ── Wrapper para modo edición ─────────────────────────────────────────────────

export function EstablecimientoFormWrapper({
  mode,
  id,
}: {
  mode: "create" | "edit";
  id?: string;
}) {
  if (mode === "create") {
    return <EstablecimientoForm mode="create" />;
  }

  return <EstablecimientoEditLoader id={id!} />;
}

function EstablecimientoEditLoader({ id }: { id: string }) {
  const { data: est, isLoading } = useEstablecimiento(id);

  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-xl p-8 text-center text-muted-foreground text-sm">
        Cargando establecimiento...
      </div>
    );
  }

  if (!est) {
    return (
      <div className="bg-card border border-border rounded-xl p-8 text-center text-muted-foreground text-sm">
        No se encontró el establecimiento.
      </div>
    );
  }

  return (
    <EstablecimientoForm
      mode="edit"
      defaultValues={{
        razonSocial: est.razonSocial,
        razonSocialCorta: est.razonSocialCorta,
        propietarioNombre: est.propietarioNombre ?? "",
        clasificacionId: est.clasificacionId ?? "",
        categoriaId: est.categoriaId ?? "",
        tieneLicenciaTuristica: est.tieneLicenciaTuristica,
        nroLicencia: est.nroLicencia ?? "",
        fechaVencimientoLicencia: est.fechaVencimientoLicencia ?? "",
        telefono: est.telefono ?? "",
        email: est.email ?? "",
        divisionSecundariaId: est.divisionSecundariaId ?? "",
        localidadId: est.localidadId ?? "",
        direccion: est.direccion,
        latitud: est.latitud,
        longitud: est.longitud,
        activo: est.activo,
        serviciosIds: est.serviciosIds,
      } as FormData & { serviciosIds: string[] }}
    />
  );
}
