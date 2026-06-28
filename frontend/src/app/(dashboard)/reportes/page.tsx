"use client";

import { useState, useEffect } from "react";
import { FileBarChart2, Download, Printer, CalendarIcon, FileSpreadsheet } from "lucide-react";
import { useLocalidades, useEstablecimientos, useEstablecimiento } from "@/hooks/useEstablecimientos";
import { useReportePDF, useReporteNacionalPDF, useReporteInternacionalPDF, useReporteMunicipioNacionalPDF, useReporteMunicipioInternacionalPDF } from "@/hooks/useMovimientos";
import type { Localidad } from "@/types/api";
import { format } from "date-fns";
import { toast } from "sonner";

type TipoReporte = "parte_diario" | "nacional" | "internacional" | "municipio_nacional" | "municipio_internacional";

const TIPO_OPCIONES: { value: TipoReporte; label: string }[] = [
  { value: "parte_diario",            label: "Parte Diario" },
  { value: "nacional",                label: "Consolidado Nacional por Establecimiento" },
  { value: "internacional",           label: "Consolidado Internacional por Establecimiento" },
  { value: "municipio_nacional",      label: "Consolidado Nacional por Municipio" },
  { value: "municipio_internacional", label: "Consolidado Internacional por Municipio" },
];

const MESES = [
  { value: 1,  label: "Enero" },  { value: 2,  label: "Febrero" },
  { value: 3,  label: "Marzo" },  { value: 4,  label: "Abril" },
  { value: 5,  label: "Mayo" },   { value: 6,  label: "Junio" },
  { value: 7,  label: "Julio" },  { value: 8,  label: "Agosto" },
  { value: 9,  label: "Septiembre" }, { value: 10, label: "Octubre" },
  { value: 11, label: "Noviembre" },  { value: 12, label: "Diciembre" },
];

const hoy = new Date();
const ANIOS = Array.from({ length: 5 }, (_, i) => hoy.getFullYear() - i);
const TARIJA_DEPTO_ID = 6;

const selectClass =
  "w-full px-3 py-2 border border-input rounded-lg text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed";

export default function ReportesPage() {
  const [tipo, setTipo]               = useState<TipoReporte>("parte_diario");
  const [localidadId, setLocalidadId] = useState("");
  const [municipioNombre, setMunicipioNombre] = useState("");
  const [establecimientoId, setEstId] = useState("");
  const [establecimientoNombre, setEstNombre] = useState("");

  // Parte Diario: fecha
  const [fechaRaw, setFechaRaw]       = useState(format(hoy, "yyyy-MM-dd"));

  // Nacional: mes / año
  const [mes, setMes]   = useState(hoy.getMonth() + 1);
  const [anio, setAnio] = useState(hoy.getFullYear());

  // PDF state
  const [pdfUrl, setPdfUrl]         = useState<string | null>(null);
  const [pdfFechaLabel, setPdfLabel]= useState("");

  // Params que disparan el hook nacional
  const [paramsNac, setParamsNac] = useState<{
    estId: string | null; anio: number | null; mes: number | null; nombre: string;
  }>({ estId: null, anio: null, mes: null, nombre: "" });

  // Params que disparan el hook parte diario
  const [paramsPD, setParamsPD] = useState<{
    fecha: string | null; estId: string; nombre: string;
    clasif: string; categ: string; dir: string; tel: string;
  }>({ fecha: null, estId: "", nombre: "", clasif: "", categ: "", dir: "", tel: "" });

  // Datos geográficos
  const { data: todasLocalidades = [] } = useLocalidades();
  const localidadesTarija = (todasLocalidades as Localidad[]).filter(
    (l) => l.divisionPrincipalId === TARIJA_DEPTO_ID
  );
  const { data: estData } = useEstablecimientos(localidadId ? { localidadId } : undefined);
  const establecimientos = (estData as { data?: { id: string; razonSocial: string }[] } | undefined)?.data ?? [];

  // Datos completos del establecimiento seleccionado (para cabecera del PDF parte diario)
  const { data: estCompleto } = useEstablecimiento(establecimientoId);

  // Hook Parte Diario PDF
  const { data: blobPD, isFetching: fetchingPD, isError: errorPD } = useReportePDF(
    paramsPD.fecha,
    paramsPD.nombre,
    paramsPD.clasif,
    paramsPD.categ,
    paramsPD.dir,
    paramsPD.tel,
    paramsPD.estId || undefined
  );

  // Hook Nacional PDF
  const { data: blobNac, isFetching: fetchingNac, isError: errorNac } = useReporteNacionalPDF(
    tipo === "nacional" ? paramsNac.estId : null,
    paramsNac.anio, paramsNac.mes, paramsNac.nombre, municipioNombre
  );

  // Hook Internacional PDF (reutiliza mismos params que nacional)
  const { data: blobIntl, isFetching: fetchingIntl, isError: errorIntl } = useReporteInternacionalPDF(
    tipo === "internacional" ? paramsNac.estId : null,
    paramsNac.anio, paramsNac.mes, paramsNac.nombre, municipioNombre
  );

  // Mutations para reportes por municipio (POST con todos los establecimientos)
  const { mutateAsync: generarMunicipioNac,  isPending: fetchingMunNac  } = useReporteMunicipioNacionalPDF();
  const { mutateAsync: generarMunicipioIntl, isPending: fetchingMunIntl } = useReporteMunicipioInternacionalPDF();
  const fetchingMun = fetchingMunNac || fetchingMunIntl;

  // Establecimientos con metadata completa para el reporte municipal
  const establecimientosCompletos = (estData as {
    data?: { id: string; razonSocial: string; clasificacionNombre: string; categoriaNombre: string }[]
  } | undefined)?.data ?? [];

  const isFetching = fetchingPD || fetchingNac || fetchingIntl || fetchingMun;

  // Reset al cambiar municipio
  useEffect(() => { setEstId(""); setEstNombre(""); }, [localidadId]);
  // Reset al cambiar tipo
  useEffect(() => { setPdfUrl(null); }, [tipo]);

  // Cuando llega el PDF
  useEffect(() => {
    const blob = tipo === "parte_diario" ? blobPD : tipo === "nacional" ? blobNac : blobIntl;
    if (blob && !isFetching) {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
      setPdfUrl(blob);
    }
  // pdfUrl y tipo se excluyen intencionalmente: no deben re-disparar el efecto
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blobPD, blobNac, blobIntl, isFetching]);

  useEffect(() => {
    if (errorPD && paramsPD.fecha) {
      toast.error("No se pudo generar el reporte.");
      setParamsPD((p) => ({ ...p, fecha: null }));
    }
  // paramsPD.fecha se lee como condición, no como disparador del efecto
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [errorPD]);

  useEffect(() => {
    if ((errorNac || errorIntl) && paramsNac.estId) {
      toast.error("No se pudo generar el reporte.");
      setParamsNac({ estId: null, anio: null, mes: null, nombre: "" });
    }
  // paramsNac.estId se lee como condición, no como disparador del efecto
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [errorNac, errorIntl]);

  // Para reportes municipales no se requiere establecimiento individual
  const esMunicipal = tipo === "municipio_nacional" || tipo === "municipio_internacional";
  const requiereEstablecimiento = !esMunicipal;

  function handleGenerar() {
    if (requiereEstablecimiento && !establecimientoId) {
      toast.warning("Selecciona un municipio y un establecimiento.");
      return;
    }
    if (esMunicipal && !localidadId) {
      toast.warning("Selecciona un municipio.");
      return;
    }
    if (pdfUrl) { URL.revokeObjectURL(pdfUrl); setPdfUrl(null); }

    if (tipo === "parte_diario") {
      // igual que antes
      const fechaDisplay = format(new Date(fechaRaw + "T12:00:00"), "dd/MM/yyyy");
      setPdfLabel(`${establecimientoNombre} — ${fechaDisplay}`);
      setParamsPD({ fecha: null, estId: "", nombre: "", clasif: "", categ: "", dir: "", tel: "" });
      setTimeout(() => {
        setParamsPD({
          fecha:  fechaRaw,
          estId:  establecimientoId,
          nombre: estCompleto?.razonSocial       ?? establecimientoNombre,
          clasif: estCompleto?.clasificacionNombre ?? "",
          categ:  estCompleto?.categoriaNombre    ?? "",
          dir:    estCompleto?.direccion          ?? "",
          tel:    estCompleto?.telefono           ?? "",
        });
      }, 0);
    } else if (esMunicipal) {
      if (!localidadId || establecimientosCompletos.length === 0) {
        toast.warning("Selecciona un municipio con establecimientos.");
        return;
      }
      const mesLabel = MESES.find((m) => m.value === mes)?.label ?? "";
      setPdfLabel(`Municipio ${municipioNombre} — ${mesLabel} ${anio}`);
      if (pdfUrl) { URL.revokeObjectURL(pdfUrl); setPdfUrl(null); }
      const bodyMun = {
        municipio: municipioNombre,
        anio,
        mes,
        establecimientos: establecimientosCompletos.map((e) => ({
          id:            e.id,
          nombre:        e.razonSocial,
          clasificacion: e.clasificacionNombre ?? "",
          categoria:     e.categoriaNombre ?? "",
        })),
      };
      const generarFn = tipo === "municipio_nacional" ? generarMunicipioNac : generarMunicipioIntl;
      generarFn(bodyMun).then((url) => {
        setPdfUrl(url);
      }).catch(() => {
        toast.error("No se pudo generar el reporte del municipio.");
      });
      return;
    } else {
      // nacional o internacional — misma lógica de params
      const mesLabel = MESES.find((m) => m.value === mes)?.label ?? "";
      setPdfLabel(`${establecimientoNombre} — ${mesLabel} ${anio}`);
      setParamsNac({ estId: null, anio: null, mes: null, nombre: "" });
      setTimeout(() => {
        setParamsNac({ estId: establecimientoId, anio, mes, nombre: establecimientoNombre });
      }, 0);
    }
  }

  function handleCerrar() {
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    setPdfUrl(null);
    setParamsPD((p) => ({ ...p, fecha: null }));
    setParamsNac({ estId: null, anio: null, mes: null, nombre: "" });
  }

  const tipoSufijo = tipo === "parte_diario" ? "parte-diario"
    : tipo === "nacional" ? "reporte-nacional" : "reporte-internacional";
  const nombreArchivo = tipo === "parte_diario"
    ? `${tipoSufijo}-${establecimientoId}-${fechaRaw}.pdf`
    : `${tipoSufijo}-${establecimientoId}-${anio}-${String(mes).padStart(2, "0")}.pdf`;

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      {/* Título */}
      <div className="flex items-center gap-2">
        <FileBarChart2 className="h-6 w-6 text-blue-600" />
        <h1 className="text-xl font-semibold text-foreground">Reportes</h1>
      </div>

      {/* Formulario */}
      <div className="bg-card rounded-xl border border-border shadow-sm p-6 space-y-5">

        {/* Tipo de reporte */}
        <div className="space-y-1">
          <label className="text-sm font-medium text-foreground">Tipo de reporte</label>
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value as TipoReporte)}
            className={selectClass}
          >
            {TIPO_OPCIONES.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* Municipio + Establecimiento en cascada */}
        <div className={esMunicipal ? "grid grid-cols-1 gap-4 max-w-xs" : "grid grid-cols-2 gap-4"}>
          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">Municipio</label>
            <select
              value={localidadId}
              onChange={(e) => {
                setLocalidadId(e.target.value);
                const loc = localidadesTarija.find((l) => String(l.id) === e.target.value);
                setMunicipioNombre(loc?.nombre ?? "");
              }}
              className={selectClass}
            >
              <option value="">Seleccionar…</option>
              {localidadesTarija.map((l) => (
                <option key={l.id} value={String(l.id)}>{l.nombre}</option>
              ))}
            </select>
          </div>

          {/* Selector individual de establecimiento — oculto para reportes municipales */}
          {!esMunicipal && (
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">Establecimiento</label>
              <select
                value={establecimientoId}
                onChange={(e) => {
                  setEstId(e.target.value);
                  const est = establecimientos.find((x) => x.id === e.target.value);
                  setEstNombre(est?.razonSocial ?? "");
                }}
                disabled={!localidadId || establecimientos.length === 0}
                className={selectClass}
              >
                <option value="">
                  {!localidadId ? "Selecciona un municipio primero"
                    : establecimientos.length === 0 ? "Sin establecimientos"
                    : "Seleccionar…"}
                </option>
                {establecimientos.map((e) => (
                  <option key={e.id} value={e.id}>{e.razonSocial}</option>
                ))}
              </select>
            </div>
          )}

          {/* Info de establecimientos — visible para reportes municipales */}
          {esMunicipal && localidadId && (
            <p className="text-xs text-muted-foreground mt-1">
              {establecimientosCompletos.length} establecimiento{establecimientosCompletos.length !== 1 ? "s" : ""} en {municipioNombre}
            </p>
          )}
        </div>

        {/* Fecha — solo para Parte Diario */}
        {tipo === "parte_diario" && (
          <div className="space-y-1 w-56">
            <label className="text-sm font-medium text-foreground">Fecha de reporte</label>
            <div className="relative">
              <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <input
                type="date"
                value={fechaRaw}
                max={format(hoy, "yyyy-MM-dd")}
                onChange={(e) => setFechaRaw(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-input rounded-lg text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
        )}

        {/* Período (Mes / Año) — para Nacional, Internacional y Municipal */}
        {tipo !== "parte_diario" && (
          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">Período</label>
            <div className="flex gap-3">
              <select
                value={mes}
                onChange={(e) => setMes(Number(e.target.value))}
                className={selectClass}
              >
                {MESES.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
              <select
                value={anio}
                onChange={(e) => setAnio(Number(e.target.value))}
                className="w-28 px-3 py-2 border border-input rounded-lg text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {ANIOS.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Botón generar */}
        <button
          onClick={handleGenerar}
          disabled={(requiereEstablecimiento ? !establecimientoId : !localidadId) || isFetching}
          className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isFetching ? (
            <>
              <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Generando…
            </>
          ) : (
            <>
              <FileBarChart2 className="h-4 w-4" />
              Generar Reporte PDF
            </>
          )}
        </button>
      </div>

      {/* Preview del PDF */}
      {pdfUrl && (
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/50">
            <div>
              <p className="text-sm font-semibold text-foreground">{establecimientoNombre}</p>
              <p className="text-xs text-muted-foreground">{pdfFechaLabel}</p>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={pdfUrl}
                download={nombreArchivo}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              >
                <Download className="h-4 w-4" /> Descargar PDF
              </a>
              <button
                onClick={() => {}}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
              >
                <FileSpreadsheet className="h-4 w-4" /> Exportar Excel
              </button>
              <button
                onClick={() => {
                  const iframe = document.querySelector<HTMLIFrameElement>("#pdf-reporte-iframe");
                  iframe?.contentWindow?.print();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-border text-foreground hover:bg-muted transition-colors"
              >
                <Printer className="h-4 w-4" /> Imprimir
              </button>
              <button
                onClick={handleCerrar}
                className="text-xs text-muted-foreground hover:text-foreground px-2 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
          <iframe
            id="pdf-reporte-iframe"
            src={pdfUrl}
            className="w-full border-0"
            style={{ height: "70vh" }}
            title="Vista previa del reporte"
          />
        </div>
      )}
    </div>
  );
}
