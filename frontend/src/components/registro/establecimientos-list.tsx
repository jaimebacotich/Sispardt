"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  DataTable,
  StatusBadge,
  ConfirmModal,
  StatCard,
} from "@/components/shared";
import type { Column } from "@/components/shared/data-table";
import type { Establecimiento } from "@/types/api";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Building2,
  Pencil,
  Trash2,
  Users,
  BedDouble,
  BadgeCheck,
  ShieldAlert,
  ShieldOff,
  Eye,
  Hotel,
} from "lucide-react";
import { toast } from "sonner";
import {
  useEstablecimientos,
  useCategorias,
  useLocalidades,
  useDeleteEstablecimiento,
} from "@/hooks/useEstablecimientos";

// ── Helpers ─────────────────────────────────────────────────────────────────

const TODAY = new Date().toISOString().split("T")[0];

function getLicenciaStatus(est: Establecimiento): {
  label: string;
  variant: "vigente" | "vencida" | "sin_licencia";
} {
  if (!est.tieneLicenciaTuristica) return { label: "Sin Licencia", variant: "sin_licencia" };
  if (!est.fechaVencimientoLicencia) return { label: "Vigente", variant: "vigente" };
  return est.fechaVencimientoLicencia >= TODAY
    ? { label: "Vigente", variant: "vigente" }
    : { label: "Vencida", variant: "vencida" };
}

// ── Componente ───────────────────────────────────────────────────────────────

export function EstablecimientosList() {
  // Filtros globales
  const [divisionId, setDivisionId] = useState<string>("todos");
  const [localidadId, setLocalidadId] = useState<string>("todos");

  // Filtros secundarios
  const [search, setSearch] = useState("");
  const [clasificacionId, setClasificacionId] = useState<string>("todos");
  const [categoriaId, setCategoriaId] = useState<string>("todos");

  // Acciones
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const deleteMutation = useDeleteEstablecimiento();

  // Datos reales
  const { data: pagedResult, isLoading } = useEstablecimientos({ pageSize: 200 });
  const { data: categorias = [] } = useCategorias();
  const { data: localidades = [] } = useLocalidades();

  const establecimientos = useMemo(() => pagedResult?.data ?? [], [pagedResult]);

  // Derivar clasificaciones únicas desde categorías reales
  const clasificaciones = useMemo(() => {
    const seen = new Set<number>();
    return categorias
      .filter((c) => {
        if (!c.clasificacionId || seen.has(c.clasificacionId)) return false;
        seen.add(c.clasificacionId);
        return true;
      })
      .map((c) => ({ id: String(c.clasificacionId!), nombre: c.clasificacionNombre ?? "" }));
  }, [categorias]);

  // Solo localidades del departamento de Tarija (divisionPrincipalId = 6)
  const localidadesTarija = useMemo(
    () => localidades.filter((l) => l.divisionPrincipalId === 6),
    [localidades]
  );

  // Derivar provincias únicas de Tarija
  const divisiones = useMemo(() => {
    const seen = new Set<number>();
    return localidadesTarija
      .filter((l) => {
        if (!l.divisionSecundariaId || seen.has(l.divisionSecundariaId)) return false;
        seen.add(l.divisionSecundariaId);
        return true;
      })
      .map((l) => ({ id: String(l.divisionSecundariaId!), nombre: l.divisionSecundariaNombre ?? "" }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [localidadesTarija]);

  // Municipios filtrados por provincia seleccionada (siempre dentro de Tarija)
  const localidadesFiltradas = useMemo(
    () =>
      divisionId === "todos"
        ? localidadesTarija
        : localidadesTarija.filter((l) => String(l.divisionSecundariaId) === divisionId),
    [localidadesTarija, divisionId]
  );

  // Categorías filtradas por clasificación seleccionada
  const categoriasFiltradas = useMemo(
    () =>
      clasificacionId === "todos"
        ? categorias
        : categorias.filter((c) => String(c.clasificacionId) === clasificacionId),
    [categorias, clasificacionId]
  );

  // Dataset filtrado (client-side sobre los registros cargados)
  const filtered = useMemo(() => {
    return establecimientos.filter((e) => {
      if (divisionId !== "todos" && e.divisionSecundariaId !== divisionId) return false;
      if (localidadId !== "todos" && e.localidadId !== localidadId) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !e.razonSocial.toLowerCase().includes(q) &&
          !(e.nroLicencia ?? "").toLowerCase().includes(q)
        )
          return false;
      }
      if (clasificacionId !== "todos" && e.clasificacionId !== clasificacionId) return false;
      if (categoriaId !== "todos" && e.categoriaId !== categoriaId) return false;
      return true;
    });
  }, [establecimientos, divisionId, localidadId, search, clasificacionId, categoriaId]);

  // KPIs
  const kpis = useMemo(() => {
    const capacidadHospedaje = filtered.reduce((s, e) => s + e.capacidadHospedaje, 0);
    const conLicencia = filtered.filter(
      (e) => getLicenciaStatus(e).variant === "vigente"
    ).length;
    return { total: filtered.length, capacidadHospedaje, conLicencia };
  }, [filtered]);

  function handleDivisionChange(value: string) {
    setDivisionId(value);
    setLocalidadId("todos");
  }

  function handleClasificacionChange(value: string) {
    setClasificacionId(value);
    setCategoriaId("todos");
  }

  async function handleDelete() {
    if (!deleteId) return;
    try {
      await deleteMutation.mutateAsync(deleteId);
    } catch {
      toast.error("Error al eliminar");
    } finally {
      setDeleteId(null);
    }
  }

  // ── Columnas ───────────────────────────────────────────────────────────────

  const columns: Column<Establecimiento>[] = [
    {
      key: "licencia",
      header: "Nro. Licencia",
      cell: (e) => (
        <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">
          {e.nroLicencia ?? <span className="text-muted-foreground italic">—</span>}
        </span>
      ),
    },
    {
      key: "nombre",
      header: "Establecimiento",
      cell: (e) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Building2 size={15} className="text-primary" />
          </div>
          <div>
            <div className="text-sm font-medium text-foreground leading-tight">
              {e.razonSocialCorta}
            </div>
            <div className="text-xs text-muted-foreground truncate max-w-[180px]">
              {e.direccion}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "clasificacion",
      header: (
        <div className="leading-tight">
          <div>Clasificación</div>
          <div className="font-normal normal-case tracking-normal">Categoría</div>
        </div>
      ),
      cell: (e) => (
        <div className="space-y-0.5">
          <div className="text-xs text-muted-foreground">{e.clasificacionNombre}</div>
          <span className="text-xs font-medium bg-chart-4/10 text-chart-4 px-2 py-0.5 rounded-full border border-chart-4/20">
            {e.categoriaNombre}
          </span>
        </div>
      ),
    },
    {
      key: "inicio_reportes",
      header: "Inicia Reportes",
      cell: (e) => {
        if (!e.fechaInicioOperaciones) return <span className="text-muted-foreground italic">—</span>;
        const [y, m, d] = e.fechaInicioOperaciones.split("-");
        return <span className="text-xs text-foreground font-mono">{`${d}/${m}/${y}`}</span>;
      },
    },
    {
      key: "localidad",
      header: "Localidad",
      cell: (e) => (
        <div>
          <div className="text-sm text-foreground">{e.localidadNombre}</div>
          <div className="text-xs text-muted-foreground">{e.divisionSecundariaNombre}</div>
        </div>
      ),
    },
    {
      key: "licencia_vigente",
      header: "Lic. Turística",
      cell: (e) => {
        const { label, variant } = getLicenciaStatus(e);
        return (
          <span
            className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${variant === "vigente"
                ? "bg-status-libre/15 text-status-libre border-status-libre/30"
                : variant === "vencida"
                  ? "bg-destructive/10 text-destructive border-destructive/30"
                  : "bg-muted text-muted-foreground border-border"
              }`}
          >
            {variant === "vigente" ? (
              <BadgeCheck size={11} />
            ) : variant === "vencida" ? (
              <ShieldAlert size={11} />
            ) : (
              <ShieldOff size={11} />
            )}
            {label}
          </span>
        );
      },
    },
    {
      key: "estado",
      header: "Estado",
      cell: (e) => <StatusBadge status={e.activo ? "activo" : "anulado"} />,
    },
    {
      key: "acciones",
      header: "",
      cell: (e) => (
        <div className="flex items-center gap-1">
          <Link
            href={`/establecimientos/${e.id}/habitaciones`}
            className="px-2.5 py-1 text-xs rounded-md bg-primary/10 text-primary hover:bg-primary/20 font-medium transition-colors flex items-center gap-1"
          >
            <BedDouble size={12} />
            Habitaciones
          </Link>
          <Link
            href={`/establecimientos/${e.id}/personal`}
            className="px-2.5 py-1 text-xs rounded-md bg-chart-3/10 text-chart-3 hover:bg-chart-3/20 font-medium transition-colors flex items-center gap-1"
          >
            <Users size={12} />
            Personal
          </Link>
          <Link
            href={`/establecimientos/${e.id}`}
            className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Ver / Editar"
          >
            <Eye size={14} />
          </Link>
          <Link
            href={`/establecimientos/${e.id}`}
            className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Editar"
          >
            <Pencil size={14} />
          </Link>
          <button
            onClick={() => setDeleteId(e.id)}
            className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
            title="Eliminar"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
        Cargando establecimientos...
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ── Filtros Globales ───────────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-xl px-4 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mr-1">
            <Hotel size={14} />
            <span className="font-medium">Filtro geográfico:</span>
          </div>

          {/* País fijo */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-muted-foreground">País:</span>
            <span className="bg-muted text-foreground px-2 py-0.5 rounded font-medium">Bolivia</span>
          </div>

          {/* Departamento fijo */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-muted-foreground">Departamento:</span>
            <span className="bg-muted text-foreground px-2 py-0.5 rounded font-medium">Tarija</span>
          </div>

          {/* División Secundaria */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Provincia</span>
            <Select value={divisionId} onValueChange={(v) => handleDivisionChange(v ?? "todos")}>
              <SelectTrigger className="h-8 text-xs w-40 bg-blue-50 border-blue-200 text-blue-800 hover:bg-blue-100 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-300">
                <SelectValue
                  label={
                    divisionId === "todos"
                      ? "Todas"
                      : divisiones.find((d) => d.id === divisionId)?.nombre
                  }
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas</SelectItem>
                {divisiones.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Localidad */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Municipio</span>
            <Select value={localidadId} onValueChange={(v) => setLocalidadId(v ?? "todos")}>
              <SelectTrigger className="h-8 text-xs w-40 bg-violet-50 border-violet-200 text-violet-800 hover:bg-violet-100 dark:bg-violet-950/40 dark:border-violet-800 dark:text-violet-300">
                <SelectValue
                  label={
                    localidadId === "todos"
                      ? "Todos"
                      : localidadesFiltradas.find((l) => String(l.id) === localidadId)?.nombre
                  }
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {localidadesFiltradas.map((l) => (
                  <SelectItem key={l.id} value={String(l.id)}>
                    {l.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {(divisionId !== "todos" || localidadId !== "todos") && (
            <button
              onClick={() => {
                setDivisionId("todos");
                setLocalidadId("todos");
              }}
              className="text-xs text-muted-foreground hover:text-foreground underline"
            >
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* ── KPI Cards ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
        <StatCard
          label="Total establecimientos"
          value={kpis.total}
          icon={Building2}
          iconColor="text-primary"
          iconBg="bg-primary/10"
        />
        <StatCard
          label="Capacidad de hospedaje"
          value={kpis.capacidadHospedaje}
          suffix="plazas"
          icon={BedDouble}
          iconColor="text-chart-4"
          iconBg="bg-chart-4/10"
        />
        <StatCard
          label="Con licencia vigente"
          value={kpis.conLicencia}
          icon={BadgeCheck}
          iconColor="text-status-libre"
          iconBg="bg-status-libre/10"
        />
      </div>

      {/* ── Filtros Secundarios ────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Búsqueda */}
        <div className="relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            placeholder="Razón social o licencia..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm w-64"
          />
        </div>

        {/* Clasificación */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground whitespace-nowrap">Clasificación:</span>
          <Select
            value={clasificacionId}
            onValueChange={(v) => handleClasificacionChange(v ?? "todos")}
          >
            <SelectTrigger className="h-9 text-sm w-44 bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300">
              <SelectValue
                placeholder="Clasificación"
                label={
                  clasificacionId === "todos"
                    ? "Todas"
                    : clasificaciones.find((c) => c.id === clasificacionId)?.nombre
                }
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas</SelectItem>
              {clasificaciones.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Categoría */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground whitespace-nowrap">Categoría:</span>
          <Select value={categoriaId} onValueChange={(v) => setCategoriaId(v ?? "todos")}>
            <SelectTrigger className="h-9 text-sm w-52 bg-rose-50 border-rose-200 text-rose-800 hover:bg-rose-100 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300">
              <SelectValue
                placeholder="Categoría"
                label={
                  categoriaId === "todos"
                    ? "Todas"
                    : categoriasFiltradas.find((c) => String(c.id) === categoriaId)?.nombre
                }
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas</SelectItem>
              {categoriasFiltradas.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <span className="text-xs text-muted-foreground ml-auto">
          {filtered.length} de {establecimientos.length} registros
        </span>
      </div>

      {/* ── Tabla ──────────────────────────────────────────────────────────── */}
      <DataTable
        columns={columns}
        data={filtered}
        getRowKey={(e) => e.id}
        emptyMessage="No se encontraron establecimientos con los filtros aplicados."
      />

      <ConfirmModal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Eliminar establecimiento"
        description="¿Confirmas que deseas eliminar este establecimiento? Esta acción es irreversible."
        confirmLabel="Eliminar"
        variant="destructive"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
