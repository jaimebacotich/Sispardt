"use client";

import { useState } from "react";
import {
  Tag,
  Star,
  Wrench,
  BedDouble,
  Bed,
  Globe,
  Map,
  MapPin,
  Building,
  BookOpen,
  X as XIcon,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { CatalogoCrud, CatalogoItem } from "./catalogo-crud";
import { useSession } from "next-auth/react";
import {
  useClasificaciones, useMutateClasificacion,
  useCategorias, useMutateCategoria,
  useServicios, useMutateServicio,
  useTiposHabitacion, useMutateTipoHabitacion,
  useTiposCama, useMutateTipoCama,
  usePaises, useMutatePais,
  useDivisionesPrincipales, useMutateDivisionPrincipal,
  useDivisionesSecundarias, useMutateDivisionSecundaria,
  useLocalidades, useMutateLocalidad,
} from "@/hooks/useCatalogos";

// ── Grupos de pestañas ────────────────────────────────────────────────────────

const GRUPOS = [
  { value: "hospedaje",  label: "Catálogo de Hospedaje",  icon: BookOpen, defaultSub: "clasificaciones" },
  { value: "geografico", label: "Catálogo Geográfico",     icon: Globe,    defaultSub: "paises" },
] as const;

// ── Componente filtro select (barra de filtros) ───────────────────────────────

interface FiltroSelectProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
}

function FiltroSelect({ label, value, onChange, options, placeholder }: FiltroSelectProps) {
  const selectedLabel = value ? (options.find((o) => o.value === value)?.label ?? value) : null;
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-muted-foreground whitespace-nowrap">{label}:</span>
      <Select value={value || "_all_"} onValueChange={(v) => onChange(!v || v === "_all_" ? "" : v)}>
        <SelectTrigger className="h-8 text-xs min-w-[150px]">
          {selectedLabel
            ? <span className="truncate">{selectedLabel}</span>
            : <span className="text-muted-foreground truncate">{placeholder}</span>}
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="_all_">Todos</SelectItem>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          title="Limpiar filtro"
        >
          <XIcon size={12} />
        </button>
      )}
    </div>
  );
}

function FiltroBarra({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-3 mb-4 px-1 py-2 bg-muted/30 rounded-lg border border-border/60">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pl-1">Filtros</span>
      {children}
    </div>
  );
}

// ── View principal ────────────────────────────────────────────────────────────

export function CatalogosView() {
  const { data: session } = useSession();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const token = (session as any)?.accessToken || (session as any)?.user?.accessToken;

  const [grupoActivo, setGrupoActivo] = useState<"hospedaje" | "geografico">("hospedaje");
  const [subHospedaje, setSubHospedaje] = useState("clasificaciones");
  const [subGeografico, setSubGeografico] = useState("paises");

  // ── Filtros para tablas geográficas ──
  const [filtroPaisDP,      setFiltroPaisDP]      = useState(""); // div. principales: filtro país
  const [filtroPaisDS,      setFiltroPaisDS]      = useState(""); // div. secundarias: filtro país
  const [filtroDivPpalDS,   setFiltroDivPpalDS]   = useState(""); // div. secundarias: filtro div. ppal
  const [filtroPaisLoc,     setFiltroPaisLoc]     = useState(""); // localidades: filtro país
  const [filtroDivPpalLoc,  setFiltroDivPpalLoc]  = useState(""); // localidades: filtro div. ppal
  const [filtroDivSecLoc,   setFiltroDivSecLoc]   = useState(""); // localidades: filtro div. sec
  // Filtro tabla categorías
  const [filtroClasCategoria, setFiltroClasCategoria] = useState("");

  // ── Estado para campos virtuales del formulario (cascada de opciones) ──
  const [formDivSecPaisId,  setFormDivSecPaisId]  = useState(""); // form div. sec: país elegido
  const [formLocPaisId,     setFormLocPaisId]     = useState(""); // form localidad: país elegido
  const [formLocDivPpalId,  setFormLocDivPpalId]  = useState(""); // form localidad: div.ppal elegida

  // ── Hooks de datos ──
  const { data: clasificaciones, isLoading: loadingClasificaciones } = useClasificaciones(token);
  const mClasificacion = useMutateClasificacion(token);

  const { data: categorias, isLoading: loadingCategorias } = useCategorias(token);
  const mCategoria = useMutateCategoria(token);

  const { data: servicios, isLoading: loadingServicios } = useServicios(token);
  const mServicio = useMutateServicio(token);

  const { data: tiposHabitacion, isLoading: loadingTiposHabitacion } = useTiposHabitacion(token);
  const mTipoHabitacion = useMutateTipoHabitacion(token);

  const { data: tiposCama, isLoading: loadingTiposCama } = useTiposCama(token);
  const mTipoCama = useMutateTipoCama(token);

  const { data: paises, isLoading: loadingPaises } = usePaises(token);
  const mPais = useMutatePais(token);

  const { data: divPrincipales, isLoading: loadingDivPrincipales } = useDivisionesPrincipales(token);
  const mDivPrincipal = useMutateDivisionPrincipal(token);

  const { data: divSecundarias, isLoading: loadingDivSecundarias } = useDivisionesSecundarias(token);
  const mDivSecundaria = useMutateDivisionSecundaria(token);

  const { data: localidades, isLoading: loadingLocalidades } = useLocalidades(token);
  const mLocalidad = useMutateLocalidad(token);

  // ── Opciones base para selects ──
  const optsClasificacion = (clasificaciones || []).map((c) => ({
    value: String(c.id), label: c.nombre,
  }));
  const optsPais = (paises || []).map((p) => ({
    value: String(p.id), label: `${p.nombre} (${p.codigoIso})`,
  }));

  // ── Filtrado de tablas ──

  // Div. Principales: filtrar por país
  const filteredDivPrincipales = (divPrincipales || []).filter((d) =>
    !filtroPaisDP || d.paisId === Number(filtroPaisDP)
  );

  // Div. Principales disponibles para el filtro de div. secundarias
  const divPpalIdsPaisDS = new Set(
    (divPrincipales || []).filter((d) => !filtroPaisDS || d.paisId === Number(filtroPaisDS)).map((d) => d.id)
  );
  // Div. Secundarias: filtrar por país (cascada) y por div. ppal
  const filteredDivSecundarias = (divSecundarias || []).filter((d) =>
    (!filtroPaisDS || divPpalIdsPaisDS.has(d.divisionPrincipalId)) &&
    (!filtroDivPpalDS || d.divisionPrincipalId === Number(filtroDivPpalDS))
  );
  // Div. Ppal disponibles en filtro de Div. Secundarias (solo las del país elegido)
  const optsDivPpalFiltroDivSec = (divPrincipales || [])
    .filter((d) => !filtroPaisDS || d.paisId === Number(filtroPaisDS))
    .map((d) => ({ value: String(d.id), label: d.nombre }));

  // Localidades: filtrar por país → div. ppal → div. sec
  const divPpalIdsPaisLoc = new Set(
    (divPrincipales || []).filter((d) => !filtroPaisLoc || d.paisId === Number(filtroPaisLoc)).map((d) => d.id)
  );
  const filteredLocalidades = (localidades || []).filter((l) =>
    (!filtroPaisLoc || (l.divisionPrincipalId != null && divPpalIdsPaisLoc.has(l.divisionPrincipalId))) &&
    (!filtroDivPpalLoc || l.divisionPrincipalId === Number(filtroDivPpalLoc)) &&
    (!filtroDivSecLoc || l.divisionSecundariaId === Number(filtroDivSecLoc))
  );
  // Opciones para filtros de localidades
  const optsDivPpalFiltroLoc = (divPrincipales || [])
    .filter((d) => !filtroPaisLoc || d.paisId === Number(filtroPaisLoc))
    .map((d) => ({ value: String(d.id), label: d.nombre }));
  const optsDivSecFiltroLoc = (divSecundarias || [])
    .filter((d) =>
      (!filtroPaisLoc || divPpalIdsPaisLoc.has(d.divisionPrincipalId)) &&
      (!filtroDivPpalLoc || d.divisionPrincipalId === Number(filtroDivPpalLoc))
    )
    .map((d) => ({ value: String(d.id), label: d.nombre }));

  // Categorías: filtrar por clasificación
  const filteredCategorias = (categorias || []).filter((c) =>
    !filtroClasCategoria || String(c.clasificacionId) === filtroClasCategoria
  );

  // ── Opciones para formularios (en cascada según campo virtual) ──

  // Form Div. Principales: sin cascada, todas las opciones de país disponibles
  const optsDivPpalAll = (divPrincipales || []).map((d) => ({ value: String(d.id), label: d.nombre }));

  // Form Div. Secundarias: div. ppal filtradas por el país virtual seleccionado
  const optsDivPpalParaFormDS = (divPrincipales || [])
    .filter((d) => !formDivSecPaisId || d.paisId === Number(formDivSecPaisId))
    .map((d) => ({ value: String(d.id), label: d.nombre }));

  // Form Localidades: div. ppal filtradas por país virtual, div. sec filtradas por div. ppal virtual
  const optsDivPpalParaFormLoc = (divPrincipales || [])
    .filter((d) => !formLocPaisId || d.paisId === Number(formLocPaisId))
    .map((d) => ({ value: String(d.id), label: d.nombre }));
  const optsDivSecParaFormLoc = (divSecundarias || [])
    .filter((d) => {
      const paisOk = !formLocPaisId ||
        (divPrincipales || []).find((p) => p.id === d.divisionPrincipalId)?.paisId === Number(formLocPaisId);
      const divPpalOk = !formLocDivPpalId || d.divisionPrincipalId === Number(formLocDivPpalId);
      return paisOk && divPpalOk;
    })
    .map((d) => ({ value: String(d.id), label: d.nombre }));

  // ── Handlers de filtros con reset en cascada ──
  function onFiltroPaisDSChange(v: string) {
    setFiltroPaisDS(v);
    setFiltroDivPpalDS("");
  }
  function onFiltroPaisLocChange(v: string) {
    setFiltroPaisLoc(v);
    setFiltroDivPpalLoc("");
    setFiltroDivSecLoc("");
  }
  function onFiltroDivPpalLocChange(v: string) {
    setFiltroDivPpalLoc(v);
    setFiltroDivSecLoc("");
  }

  // ── Handlers de campos virtuales del formulario ──
  function onFormChangeDivSec(name: string, value: string) {
    if (name === "_paisFiltroDiv") setFormDivSecPaisId(value);
  }
  function onFormChangeLoc(name: string, value: string) {
    if (name === "_paisFiltroLoc")    { setFormLocPaisId(value); setFormLocDivPpalId(""); }
    if (name === "_divPpalFiltroLoc") setFormLocDivPpalId(value);
  }
  function onFormOpenDivSec() { setFormDivSecPaisId(""); }
  function onFormOpenLoc()    { setFormLocPaisId(""); setFormLocDivPpalId(""); }

  return (
    <div className="space-y-5">

      {/* ── Selector de grupo ─────────────────────────────────────────────── */}
      <div className="flex gap-2">
        {GRUPOS.map((g) => {
          const Icon = g.icon;
          const active = grupoActivo === g.value;
          return (
            <button
              key={g.value}
              type="button"
              onClick={() => setGrupoActivo(g.value)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                active
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-card text-muted-foreground border-border hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon size={15} />
              {g.label}
            </button>
          );
        })}
      </div>

      {/* ── Hospedaje ─────────────────────────────────────────────────────── */}
      {grupoActivo === "hospedaje" && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <Tabs value={subHospedaje} onValueChange={setSubHospedaje} className="flex-col">
            <div className="border-b border-border px-4 pt-3 pb-0">
              <TabsList variant="line" className="w-full justify-start gap-1 h-auto pb-0">
                <TabsTrigger value="clasificaciones" className="pb-3 text-xs gap-1.5">
                  <Tag size={13} /> Clasificaciones
                </TabsTrigger>
                <TabsTrigger value="categorias" className="pb-3 text-xs gap-1.5">
                  <Star size={13} /> Categorías
                </TabsTrigger>
                <TabsTrigger value="servicios" className="pb-3 text-xs gap-1.5">
                  <Wrench size={13} /> Servicios
                </TabsTrigger>
                <TabsTrigger value="tipos_habitacion" className="pb-3 text-xs gap-1.5">
                  <BedDouble size={13} /> Tipos de Habitación
                </TabsTrigger>
                <TabsTrigger value="tipos_cama" className="pb-3 text-xs gap-1.5">
                  <Bed size={13} /> Tipos de Cama
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="p-5">
              {/* ── Clasificaciones ── */}
              <TabsContent value="clasificaciones">
                <CatalogoCrud
                  titulo="Clasificación"
                  descripcion="Agrupación principal de establecimientos (Hotelera, Extra Hotelera)"
                  icono={Tag}
                  datos={(clasificaciones as unknown as CatalogoItem[]) || []}
                  isLoading={loadingClasificaciones}
                  onSave={async (item) => { if (item.id) { await mClasificacion.update.mutateAsync({ id: item.id as string | number, data: item }); } else { await mClasificacion.create.mutateAsync(item); } }}
                  onDelete={async (id) => { await mClasificacion.remove.mutateAsync(id) }}
                  campos={[
                    { name: "nombre", label: "Nombre", type: "text", required: true, placeholder: "Ej: Hotelera" },
                  ]}
                />
              </TabsContent>

              {/* ── Categorías ── */}
              <TabsContent value="categorias">
                {/* Filtro por clasificación */}
                <FiltroBarra>
                  <FiltroSelect
                    label="Clasificación"
                    value={filtroClasCategoria}
                    onChange={setFiltroClasCategoria}
                    options={optsClasificacion}
                    placeholder="Todas las clasificaciones"
                  />
                </FiltroBarra>
                <CatalogoCrud
                  titulo="Categoría"
                  descripcion="Subtipo de establecimiento dentro de cada clasificación"
                  icono={Star}
                  datos={(filteredCategorias as unknown as CatalogoItem[]) || []}
                  isLoading={loadingCategorias}
                  onSave={async (item) => { if (item.id) { await mCategoria.update.mutateAsync({ id: item.id as string | number, data: item }); } else { await mCategoria.create.mutateAsync(item); } }}
                  onDelete={async (id) => { await mCategoria.remove.mutateAsync(id) }}
                  campos={[
                    {
                      name: "clasificacionId",
                      label: "Clasificación",
                      type: "select",
                      required: true,
                      numeric: true,
                      options: optsClasificacion,
                    },
                    {
                      name: "nombre",
                      label: "Categoría",
                      type: "text",
                      required: true,
                      placeholder: "Ej: Hotel 3 Estrellas",
                    },
                  ]}
                />
              </TabsContent>

              {/* ── Servicios ── */}
              <TabsContent value="servicios">
                <CatalogoCrud
                  titulo="Servicio"
                  descripcion="Amenidades y servicios ofrecidos por los establecimientos"
                  icono={Wrench}
                  datos={(servicios as unknown as CatalogoItem[]) || []}
                  isLoading={loadingServicios}
                  onSave={async (item) => { if (item.id) { await mServicio.update.mutateAsync({ id: item.id as string | number, data: item }); } else { await mServicio.create.mutateAsync(item); } }}
                  onDelete={async (id) => { await mServicio.remove.mutateAsync(id) }}
                  campos={[
                    { name: "nombre", label: "Nombre del Servicio", type: "text", required: true, placeholder: "Ej: WiFi, Piscina, Spa..." },
                  ]}
                />
              </TabsContent>

              {/* ── Tipos de Habitación ── */}
              <TabsContent value="tipos_habitacion">
                <CatalogoCrud
                  titulo="Tipo de Habitación"
                  descripcion="Clasificación de habitaciones (Individual, Doble, Suite...)"
                  icono={BedDouble}
                  datos={(tiposHabitacion as unknown as CatalogoItem[]) || []}
                  isLoading={loadingTiposHabitacion}
                  onSave={async (item) => { if (item.id) { await mTipoHabitacion.update.mutateAsync({ id: item.id as string | number, data: item }); } else { await mTipoHabitacion.create.mutateAsync(item); } }}
                  onDelete={async (id) => { await mTipoHabitacion.remove.mutateAsync(id) }}
                  campos={[
                    { name: "nombre", label: "Nombre del Tipo", type: "text", required: true, placeholder: "Ej: Suite, Familiar..." },
                  ]}
                />
              </TabsContent>

              {/* ── Tipos de Cama ── */}
              <TabsContent value="tipos_cama">
                <CatalogoCrud
                  titulo="Tipo de Cama"
                  descripcion="Clasificación de camas y su capacidad de personas"
                  icono={Bed}
                  datos={(tiposCama as unknown as CatalogoItem[]) || []}
                  isLoading={loadingTiposCama}
                  onSave={async (item) => { if (item.id) { await mTipoCama.update.mutateAsync({ id: item.id as string | number, data: item }); } else { await mTipoCama.create.mutateAsync(item); } }}
                  onDelete={async (id) => { await mTipoCama.remove.mutateAsync(id) }}
                  campos={[
                    { name: "nombre", label: "Nombre", type: "text", required: true, placeholder: "Ej: Queen, King..." },
                    { name: "capacidadPersonas", label: "Capacidad (personas)", type: "number", required: true, min: 1, max: 10, placeholder: "1" },
                  ]}
                />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      )}

      {/* ── Geográfico ────────────────────────────────────────────────────── */}
      {grupoActivo === "geografico" && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <Tabs value={subGeografico} onValueChange={setSubGeografico} className="flex-col">
            <div className="border-b border-border px-4 pt-3 pb-0">
              <TabsList variant="line" className="w-full justify-start gap-1 h-auto pb-0">
                <TabsTrigger value="paises" className="pb-3 text-xs gap-1.5">
                  <Globe size={13} /> Países
                </TabsTrigger>
                <TabsTrigger value="div_principales" className="pb-3 text-xs gap-1.5">
                  <Map size={13} /> Div. Principales
                </TabsTrigger>
                <TabsTrigger value="div_secundarias" className="pb-3 text-xs gap-1.5">
                  <Building size={13} /> Div. Secundarias
                </TabsTrigger>
                <TabsTrigger value="localidades" className="pb-3 text-xs gap-1.5">
                  <MapPin size={13} /> Localidades
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="p-5">
              {/* ── Países ── */}
              <TabsContent value="paises">
                <CatalogoCrud
                  titulo="País"
                  descripcion="Países de origen y destino de huéspedes."
                  icono={Globe}
                  datos={(paises as unknown as CatalogoItem[]) || []}
                  isLoading={loadingPaises}
                  showSistemaColumn
                  onSave={async (item) => { if (item.id) { await mPais.update.mutateAsync({ id: item.id as string | number, data: item }); } else { await mPais.create.mutateAsync(item); } }}
                  onDelete={async (id) => { await mPais.remove.mutateAsync(id) }}
                  campos={[
                    { name: "nombre",    label: "Nombre del País", type: "text", required: true, placeholder: "Ej: Uruguay" },
                    { name: "codigoIso", label: "Código ISO",       type: "text", required: true, placeholder: "URY" },
                  ]}
                />
              </TabsContent>

              {/* ── Divisiones Principales ── */}
              <TabsContent value="div_principales">
                <FiltroBarra>
                  <FiltroSelect
                    label="País"
                    value={filtroPaisDP}
                    onChange={setFiltroPaisDP}
                    options={optsPais}
                    placeholder="Todos los países"
                  />
                </FiltroBarra>
                <CatalogoCrud
                  titulo="División Principal"
                  descripcion="Departamentos y regiones de primer nivel."
                  icono={Map}
                  datos={(filteredDivPrincipales as unknown as CatalogoItem[]) || []}
                  isLoading={loadingDivPrincipales}
                  showSistemaColumn
                  onSave={async (item) => { if (item.id) { await mDivPrincipal.update.mutateAsync({ id: item.id as string | number, data: item }); } else { await mDivPrincipal.create.mutateAsync(item); } }}
                  onDelete={async (id) => { await mDivPrincipal.remove.mutateAsync(id) }}
                  campos={[
                    {
                      name: "paisId",
                      label: "País",
                      type: "select",
                      required: true,
                      numeric: true,
                      options: optsPais,
                    },
                    {
                      name: "nombre",
                      label: "Nombre",
                      type: "text",
                      required: true,
                      placeholder: "Ej: Tarija",
                    },
                  ]}
                />
              </TabsContent>

              {/* ── Divisiones Secundarias ── */}
              <TabsContent value="div_secundarias">
                <FiltroBarra>
                  <FiltroSelect
                    label="País"
                    value={filtroPaisDS}
                    onChange={onFiltroPaisDSChange}
                    options={optsPais}
                    placeholder="Todos los países"
                  />
                  <FiltroSelect
                    label="Div. Principal"
                    value={filtroDivPpalDS}
                    onChange={setFiltroDivPpalDS}
                    options={optsDivPpalFiltroDivSec}
                    placeholder="Todas las divisiones"
                  />
                </FiltroBarra>
                <CatalogoCrud
                  titulo="División Secundaria"
                  descripcion="Provincias y subdivisiones de segundo nivel."
                  icono={Building}
                  datos={(filteredDivSecundarias as unknown as CatalogoItem[]) || []}
                  isLoading={loadingDivSecundarias}
                  showSistemaColumn
                  onSave={async (item) => { if (item.id) { await mDivSecundaria.update.mutateAsync({ id: item.id as string | number, data: item }); } else { await mDivSecundaria.create.mutateAsync(item); } }}
                  onDelete={async (id) => { await mDivSecundaria.remove.mutateAsync(id) }}
                  onFormFieldChange={onFormChangeDivSec}
                  onFormOpen={onFormOpenDivSec}
                  campos={[
                    {
                      name: "_paisFiltroDiv",
                      label: "País",
                      type: "select",
                      virtual: true,
                      clearFields: ["divisionPrincipalId"],
                      placeholder: "Filtrar por país...",
                      options: optsPais,
                    },
                    {
                      name: "divisionPrincipalId",
                      label: "División Principal",
                      type: "select",
                      required: true,
                      numeric: true,
                      options: optsDivPpalParaFormDS,
                      tableOptions: optsDivPpalAll,
                    },
                    {
                      name: "nombre",
                      label: "Nombre de la Provincia",
                      type: "text",
                      required: true,
                      placeholder: "Ej: Cercado",
                    },
                  ]}
                />
              </TabsContent>

              {/* ── Localidades ── */}
              <TabsContent value="localidades">
                <FiltroBarra>
                  <FiltroSelect
                    label="País"
                    value={filtroPaisLoc}
                    onChange={onFiltroPaisLocChange}
                    options={optsPais}
                    placeholder="Todos los países"
                  />
                  <FiltroSelect
                    label="Div. Principal"
                    value={filtroDivPpalLoc}
                    onChange={onFiltroDivPpalLocChange}
                    options={optsDivPpalFiltroLoc}
                    placeholder="Todas las divisiones"
                  />
                  <FiltroSelect
                    label="Div. Secundaria"
                    value={filtroDivSecLoc}
                    onChange={setFiltroDivSecLoc}
                    options={optsDivSecFiltroLoc}
                    placeholder="Todas las provincias"
                  />
                </FiltroBarra>
                <CatalogoCrud
                  titulo="Localidad"
                  descripcion="Municipios y localidades de tercer nivel."
                  icono={MapPin}
                  datos={(filteredLocalidades as unknown as CatalogoItem[]) || []}
                  isLoading={loadingLocalidades}
                  showSistemaColumn
                  onSave={async (item) => { if (item.id) { await mLocalidad.update.mutateAsync({ id: item.id as string | number, data: item }); } else { await mLocalidad.create.mutateAsync(item); } }}
                  onDelete={async (id) => { await mLocalidad.remove.mutateAsync(id) }}
                  onFormFieldChange={onFormChangeLoc}
                  onFormOpen={onFormOpenLoc}
                  campos={[
                    {
                      name: "_paisFiltroLoc",
                      label: "País",
                      type: "select",
                      virtual: true,
                      clearFields: ["_divPpalFiltroLoc", "divisionSecundariaId"],
                      placeholder: "Filtrar por país...",
                      options: optsPais,
                    },
                    {
                      name: "_divPpalFiltroLoc",
                      label: "Div. Principal",
                      type: "select",
                      virtual: true,
                      clearFields: ["divisionSecundariaId"],
                      placeholder: "Filtrar por div. principal...",
                      options: optsDivPpalParaFormLoc,
                    },
                    {
                      name: "divisionSecundariaId",
                      label: "Div. Secundaria",
                      type: "select",
                      required: true,
                      numeric: true,
                      options: optsDivSecParaFormLoc,
                      tableOptions: (divSecundarias || []).map((d) => ({ value: String(d.id), label: d.nombre })),
                    },
                    {
                      name: "nombre",
                      label: "Nombre del Municipio",
                      type: "text",
                      required: true,
                      placeholder: "Ej: Tarija",
                    },
                  ]}
                />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      )}
    </div>
  );
}
