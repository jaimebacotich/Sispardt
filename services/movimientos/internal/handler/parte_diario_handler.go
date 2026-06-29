package handler

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/rs/zerolog/log"

	"sispardt/movimientos/internal/auth"
	"sispardt/movimientos/internal/domain"
	"sispardt/movimientos/internal/pdf"
	"sispardt/movimientos/internal/repository"
	"sispardt/movimientos/internal/service"
)

// ─── Catálogos ────────────────────────────────────────────────────────────────

type CatalogosHandler struct{ svc *service.ParteDiarioService }

func NewCatalogosHandler(svc *service.ParteDiarioService) *CatalogosHandler {
	return &CatalogosHandler{svc: svc}
}

func (h *CatalogosHandler) List(w http.ResponseWriter, r *http.Request) {
	cat, err := h.svc.GetCatalogos(r.Context())
	if err != nil {
		jsonError(w, http.StatusInternalServerError, "error al obtener catálogos")
		return
	}
	jsonOK(w, cat)
}

// ─── Partes Diarios ───────────────────────────────────────────────────────────

type ParteDiarioHandler struct{ svc *service.ParteDiarioService }

func NewParteDiarioHandler(svc *service.ParteDiarioService) *ParteDiarioHandler {
	return &ParteDiarioHandler{svc: svc}
}

func (h *ParteDiarioHandler) List(w http.ResponseWriter, r *http.Request) {
	claims := auth.FromContext(r.Context())
	params := domain.ListPartesParams{
		Page:            parseIntQuery(r, "page", 1),
		PageSize:        parseIntQuery(r, "page_size", 20),
		FechaDesde:      r.URL.Query().Get("fecha_desde"),
		FechaHasta:      r.URL.Query().Get("fecha_hasta"),
		FechaReporte:    r.URL.Query().Get("fecha_reporte"),
		HabitacionID:    r.URL.Query().Get("habitacion_id"),
		SoloActivos:     r.URL.Query().Get("solo_activos") == "true",
		SoloCheckout:    r.URL.Query().Get("solo_checkout") == "true",
		EstadoOperativo: r.URL.Query().Get("estado_operativo"),
		IncluirAnulados: r.URL.Query().Get("incluir_anulados") == "true",
		SalidaFecha:     r.URL.Query().Get("salida_fecha"),
		ActivoEnFecha:   r.URL.Query().Get("activo_en_fecha"),
	}
	if claims.HasRole(auth.RoleRecepcionista) {
		params.EstablecimientoID = claims.EstablecimientoID
	} else {
		params.EstablecimientoID = r.URL.Query().Get("establecimiento_id")
	}
	result, err := h.svc.List(r.Context(), params)
	if err != nil {
		log.Error().Err(err).Interface("params", params).Msg("error al listar partes")
		jsonError(w, http.StatusInternalServerError, "error al listar partes: "+err.Error())
		return
	}
	jsonOK(w, result)
}

func (h *ParteDiarioHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	claims := auth.FromContext(r.Context())
	estID := claims.EstablecimientoID
	if estID == "" {
		estID = r.URL.Query().Get("establecimiento_id")
	}
	id := chi.URLParam(r, "id")
	parte, err := h.svc.GetByID(r.Context(), id, estID)
	if err != nil {
		log.Error().Err(err).Str("id", id).Str("establecimiento_id", estID).Msg("error al obtener parte")
		jsonError(w, http.StatusInternalServerError, "error al obtener parte")
		return
	}
	if parte == nil {
		jsonError(w, http.StatusNotFound, "parte diario no encontrado")
		return
	}
	jsonOK(w, parte)
}

func (h *ParteDiarioHandler) Create(w http.ResponseWriter, r *http.Request) {
	claims := auth.FromContext(r.Context())
	if claims == nil {
		log.Error().Msg("Claims no encontrados en el contexto")
		jsonError(w, http.StatusUnauthorized, "sesión no encontrada")
		return
	}

	if claims.EstablecimientoID == "" {
		jsonError(w, http.StatusForbidden, "recepcionista sin establecimiento asignado")
		return
	}
	var req domain.CreateParteDiarioRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, http.StatusBadRequest, "cuerpo de solicitud inválido")
		return
	}
	result, err := h.svc.Create(r.Context(), claims.Sub, claims.Username, claims.FirstName, claims.LastName, r.RemoteAddr, claims.EstablecimientoID, req)
	if err != nil {
		log.Error().Err(err).Str("sub", claims.Sub).Msg("Error al crear parte diario")
		jsonError(w, http.StatusBadRequest, err.Error())
		return
	}
	jsonCreated(w, result)
}

func (h *ParteDiarioHandler) Checkout(w http.ResponseWriter, r *http.Request) {
	claims := auth.FromContext(r.Context())
	id := chi.URLParam(r, "id")
	result, err := h.svc.Checkout(r.Context(), id, claims.Sub, r.RemoteAddr, claims.EstablecimientoID)
	if err != nil {
		if err.Error() == "parte diario no encontrado" {
			jsonError(w, http.StatusNotFound, err.Error())
			return
		}
		jsonError(w, http.StatusBadRequest, err.Error())
		return
	}
	jsonOK(w, result)
}

func (h *ParteDiarioHandler) Anular(w http.ResponseWriter, r *http.Request) {
	claims := auth.FromContext(r.Context())
	id := chi.URLParam(r, "id")
	if err := h.svc.Anular(r.Context(), id, claims.Sub, r.RemoteAddr, claims.EstablecimientoID); err != nil {
		if err.Error() == "parte diario no encontrado" {
			jsonError(w, http.StatusNotFound, err.Error())
			return
		}
		jsonError(w, http.StatusBadRequest, err.Error())
		return
	}
	jsonNoContent(w)
}

func (h *ParteDiarioHandler) Reporte(w http.ResponseWriter, r *http.Request) {
	claims := auth.FromContext(r.Context())

	// Recepcionista: usa el establecimiento del JWT (forzado por RLS).
	// Responsable de registro: puede seleccionar cualquier establecimiento.
	var estID string
	if claims.HasRole(auth.RoleRecepcionista) {
		estID = claims.EstablecimientoID
		if estID == "" {
			jsonError(w, http.StatusForbidden, "recepcionista sin establecimiento asignado")
			return
		}
	} else {
		estID = r.URL.Query().Get("establecimiento_id")
		if estID == "" {
			jsonError(w, http.StatusBadRequest, "parámetro 'establecimiento_id' requerido")
			return
		}
	}
	fecha := r.URL.Query().Get("fecha")
	if fecha == "" {
		jsonError(w, http.StatusBadRequest, "parámetro 'fecha' requerido (YYYY-MM-DD)")
		return
	}
	q := r.URL.Query()
	infoEstab := pdf.InfoEstablecimiento{
		Nombre:        q.Get("nombre"),
		Clasificacion: q.Get("clasificacion"),
		Categoria:     q.Get("categoria"),
		Direccion:     q.Get("direccion"),
		Telefono:      q.Get("telefono"),
	}

	reporte, err := h.svc.GetReportePorFecha(r.Context(), estID, fecha)
	if err != nil {
		log.Error().Err(err).Str("establecimiento_id", estID).Str("fecha", fecha).Msg("error al generar reporte")
		jsonError(w, http.StatusInternalServerError, "error al generar reporte: "+err.Error())
		return
	}

	nombreArchivo := fmt.Sprintf("parte-diario-%s.pdf", fecha)
	w.Header().Set("Content-Type", "application/pdf")
	w.Header().Set("Content-Disposition", fmt.Sprintf(`inline; filename="%s"`, nombreArchivo))

	if err := pdf.GenerarParteDiario(w, reporte, infoEstab); err != nil {
		log.Error().Err(err).Msg("error al escribir PDF")
	}
}

func (h *ParteDiarioHandler) ReporteMunicipioNacional(w http.ResponseWriter, r *http.Request) {
	var req domain.ReqReporteMunicipio
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, http.StatusBadRequest, "cuerpo de solicitud inválido")
		return
	}
	if req.Anio <= 0 || req.Mes < 1 || req.Mes > 12 || len(req.Establecimientos) == 0 {
		jsonError(w, http.StatusBadRequest, "municipio, anio, mes y establecimientos son requeridos")
		return
	}

	reporte, err := h.svc.GetReporteMunicipioNacional(r.Context(), req)
	if err != nil {
		log.Error().Err(err).Str("municipio", req.Municipio).Msg("error al generar reporte municipio nacional")
		jsonError(w, http.StatusInternalServerError, "error al generar reporte: "+err.Error())
		return
	}

	nombreArchivo := fmt.Sprintf("consolidado-municipal-%s-%02d.pdf", strings.ReplaceAll(req.Municipio, " ", "-"), req.Mes)
	w.Header().Set("Content-Type", "application/pdf")
	w.Header().Set("Content-Disposition", fmt.Sprintf(`inline; filename="%s"`, nombreArchivo))

	if err := pdf.GenerarReporteMunicipioNacional(w, reporte); err != nil {
		log.Error().Err(err).Msg("error al escribir PDF reporte municipio")
	}
}

func (h *ParteDiarioHandler) ReporteMunicipioInternacional(w http.ResponseWriter, r *http.Request) {
	var req domain.ReqReporteMunicipio
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, http.StatusBadRequest, "cuerpo de solicitud inválido")
		return
	}
	if req.Anio <= 0 || req.Mes < 1 || req.Mes > 12 || len(req.Establecimientos) == 0 {
		jsonError(w, http.StatusBadRequest, "municipio, anio, mes y establecimientos son requeridos")
		return
	}

	reporte, err := h.svc.GetReporteMunicipioInternacional(r.Context(), req)
	if err != nil {
		log.Error().Err(err).Str("municipio", req.Municipio).Msg("error al generar reporte municipio internacional")
		jsonError(w, http.StatusInternalServerError, "error al generar reporte: "+err.Error())
		return
	}

	nombreArchivo := fmt.Sprintf("consolidado-internacional-%s-%02d.pdf", strings.ReplaceAll(req.Municipio, " ", "-"), req.Mes)
	w.Header().Set("Content-Type", "application/pdf")
	w.Header().Set("Content-Disposition", fmt.Sprintf(`inline; filename="%s"`, nombreArchivo))

	if err := pdf.GenerarReporteMunicipioInternacional(w, reporte); err != nil {
		log.Error().Err(err).Msg("error al escribir PDF reporte municipio internacional")
	}
}

func (h *ParteDiarioHandler) ReporteNacional(w http.ResponseWriter, r *http.Request) {
	estID := r.URL.Query().Get("establecimiento_id")
	if estID == "" {
		jsonError(w, http.StatusBadRequest, "parámetro 'establecimiento_id' requerido")
		return
	}
	anioStr := r.URL.Query().Get("anio")
	mesStr := r.URL.Query().Get("mes")
	if anioStr == "" || mesStr == "" {
		jsonError(w, http.StatusBadRequest, "parámetros 'anio' y 'mes' requeridos")
		return
	}
	anio, errA := strconv.Atoi(anioStr)
	mes, errM := strconv.Atoi(mesStr)
	if errA != nil || errM != nil || mes < 1 || mes > 12 {
		jsonError(w, http.StatusBadRequest, "año o mes inválido")
		return
	}
	nombreEstablecimiento := r.URL.Query().Get("nombre")
	municipio := r.URL.Query().Get("municipio")

	reporte, err := h.svc.GetReporteNacional(r.Context(), estID, anio, mes, nombreEstablecimiento, municipio)
	if err != nil {
		log.Error().Err(err).Str("establecimiento_id", estID).Int("anio", anio).Int("mes", mes).Msg("error al generar reporte nacional")
		jsonError(w, http.StatusInternalServerError, "error al generar reporte: "+err.Error())
		return
	}

	nombreArchivo := fmt.Sprintf("reporte-nacional-%s-%02d.pdf", anioStr, mes)
	w.Header().Set("Content-Type", "application/pdf")
	w.Header().Set("Content-Disposition", fmt.Sprintf(`inline; filename="%s"`, nombreArchivo))

	if err := pdf.GenerarReporteNacional(w, reporte); err != nil {
		log.Error().Err(err).Msg("error al escribir PDF reporte nacional")
	}
}

func (h *ParteDiarioHandler) ReporteInternacional(w http.ResponseWriter, r *http.Request) {
	estID := r.URL.Query().Get("establecimiento_id")
	if estID == "" {
		jsonError(w, http.StatusBadRequest, "parámetro 'establecimiento_id' requerido")
		return
	}
	anioStr := r.URL.Query().Get("anio")
	mesStr  := r.URL.Query().Get("mes")
	if anioStr == "" || mesStr == "" {
		jsonError(w, http.StatusBadRequest, "parámetros 'anio' y 'mes' requeridos")
		return
	}
	anio, errA := strconv.Atoi(anioStr)
	mes,  errM := strconv.Atoi(mesStr)
	if errA != nil || errM != nil || mes < 1 || mes > 12 {
		jsonError(w, http.StatusBadRequest, "año o mes inválido")
		return
	}
	q := r.URL.Query()
	reporte, err := h.svc.GetReporteInternacional(
		r.Context(), estID, anio, mes,
		q.Get("nombre"), q.Get("municipio"),
	)
	if err != nil {
		log.Error().Err(err).Str("establecimiento_id", estID).Msg("error al generar reporte internacional")
		jsonError(w, http.StatusInternalServerError, "error al generar reporte: "+err.Error())
		return
	}

	nombreArchivo := fmt.Sprintf("reporte-internacional-%s-%02d.pdf", anioStr, mes)
	w.Header().Set("Content-Type", "application/pdf")
	w.Header().Set("Content-Disposition", fmt.Sprintf(`inline; filename="%s"`, nombreArchivo))

	if err := pdf.GenerarReporteInternacional(w, reporte); err != nil {
		log.Error().Err(err).Msg("error al escribir PDF reporte internacional")
	}
}

func (h *ParteDiarioHandler) EstadoHabitaciones(w http.ResponseWriter, r *http.Request) {
	claims := auth.FromContext(r.Context())
	estID := claims.EstablecimientoID
	if estID == "" {
		estID = r.URL.Query().Get("establecimiento_id")
	}
	if estID == "" {
		jsonError(w, http.StatusBadRequest, "establecimiento_id requerido")
		return
	}
	fecha := r.URL.Query().Get("fecha")
	result, err := h.svc.GetHabitacionesEstado(r.Context(), estID, fecha)
	if err != nil {
		log.Error().Err(err).Str("establecimiento_id", estID).Msg("error al obtener estado de habitaciones")
		jsonError(w, http.StatusInternalServerError, "error al obtener estado de habitaciones: "+err.Error())
		return
	}
	jsonOK(w, result)
}

// ─── Cierres Diarios ──────────────────────────────────────────────────────────

type CierreDiarioHandler struct{ svc *service.ParteDiarioService }

func NewCierreDiarioHandler(svc *service.ParteDiarioService) *CierreDiarioHandler {
	return &CierreDiarioHandler{svc: svc}
}

func (h *CierreDiarioHandler) Create(w http.ResponseWriter, r *http.Request) {
	claims := auth.FromContext(r.Context())
	if claims.EstablecimientoID == "" {
		jsonError(w, http.StatusForbidden, "sin establecimiento asignado")
		return
	}
	var req domain.CreateCierreDiarioRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, http.StatusBadRequest, "cuerpo de solicitud inválido")
		return
	}
	result, err := h.svc.CreateCierre(r.Context(), claims.Sub, claims.Sub, claims.Username, claims.FirstName, claims.LastName, r.RemoteAddr, claims.EstablecimientoID, req)
	if err != nil {
		jsonError(w, http.StatusBadRequest, err.Error())
		return
	}
	jsonCreated(w, result)
}

func (h *CierreDiarioHandler) PreviewCierre(w http.ResponseWriter, r *http.Request) {
	claims := auth.FromContext(r.Context())
	estID := claims.EstablecimientoID
	if estID == "" {
		estID = r.URL.Query().Get("establecimiento_id")
	}
	if estID == "" {
		jsonError(w, http.StatusBadRequest, "establecimiento_id requerido")
		return
	}
	fecha := r.URL.Query().Get("fecha")
	if fecha == "" {
		jsonError(w, http.StatusBadRequest, "parámetro 'fecha' requerido")
		return
	}
	checkins, checkouts, huespedes, err := h.svc.PreviewCierre(r.Context(), estID, fecha)
	if err != nil {
		jsonError(w, http.StatusInternalServerError, "error al obtener conteos")
		return
	}
	jsonOK(w, map[string]int{
		"totalCheckins":  checkins,
		"totalCheckouts": checkouts,
		"huespedes":      huespedes,
	})
}

func (h *CierreDiarioHandler) FechaCierreActual(w http.ResponseWriter, r *http.Request) {
	claims := auth.FromContext(r.Context())
	estID := claims.EstablecimientoID
	if estID == "" {
		estID = r.URL.Query().Get("establecimiento_id")
	}
	if estID == "" {
		jsonError(w, http.StatusBadRequest, "establecimiento_id requerido")
		return
	}
	fechaHoy, fechaAyer, fechaInicio, err := h.svc.GetFechaCierreActual(r.Context(), estID)
	if err != nil {
		jsonError(w, http.StatusInternalServerError, "error al obtener fecha de cierre")
		return
	}
	jsonOK(w, map[string]any{
		"fechaHoy":               fechaHoy,
		"fechaCierre":            fechaAyer,
		"fechaInicioOperaciones": fechaInicio,
	})
}

func (h *CierreDiarioHandler) List(w http.ResponseWriter, r *http.Request) {
	claims := auth.FromContext(r.Context())
	estID := claims.EstablecimientoID
	if estID == "" {
		estID = r.URL.Query().Get("establecimiento_id")
	}
	if estID == "" {
		jsonError(w, http.StatusBadRequest, "establecimiento_id requerido")
		return
	}
	result, err := h.svc.ListCierres(r.Context(), estID)
	if err != nil {
		jsonError(w, http.StatusInternalServerError, "error al listar cierres")
		return
	}
	jsonOK(w, result)
}

func (h *CierreDiarioHandler) Pendientes(w http.ResponseWriter, r *http.Request) {
	claims := auth.FromContext(r.Context())
	estID := claims.EstablecimientoID
	if estID == "" {
		estID = r.URL.Query().Get("establecimiento_id")
	}
	if estID == "" {
		jsonError(w, http.StatusBadRequest, "establecimiento_id requerido")
		return
	}
	result, err := h.svc.GetFechasPendientes(r.Context(), estID)
	if err != nil {
		if errors.Is(err, repository.ErrFechaInicioNoDisponible) {
			jsonError(w, http.StatusUnprocessableEntity, "FECHA_INICIO_NO_DISPONIBLE")
			return
		}
		jsonError(w, http.StatusInternalServerError, "error al obtener fechas pendientes")
		return
	}
	jsonOK(w, result)
}

func (h *CierreDiarioHandler) GetByFecha(w http.ResponseWriter, r *http.Request) {
	claims := auth.FromContext(r.Context())
	fecha := chi.URLParam(r, "fecha")
	estID := claims.EstablecimientoID
	if estID == "" {
		estID = r.URL.Query().Get("establecimiento_id")
	}
	if estID == "" {
		jsonError(w, http.StatusBadRequest, "establecimiento_id requerido")
		return
	}
	result, err := h.svc.GetCierrePorFecha(r.Context(), estID, fecha)
	if err != nil {
		jsonError(w, http.StatusInternalServerError, "error al obtener cierre")
		return
	}
	if result == nil {
		jsonError(w, http.StatusNotFound, "cierre no encontrado para esa fecha")
		return
	}
	jsonOK(w, result)
}

// ─── Estadísticas ─────────────────────────────────────────────────────────────

type EstadisticasHandler struct{ svc *service.ParteDiarioService }

func NewEstadisticasHandler(svc *service.ParteDiarioService) *EstadisticasHandler {
	return &EstadisticasHandler{svc: svc}
}

func (h *EstadisticasHandler) OcupacionDiaria(w http.ResponseWriter, r *http.Request) {
	estIDs, desde, hasta, ok := h.parseStatsParams(w, r)
	if !ok {
		return
	}
	result, err := h.svc.OcupacionDiaria(r.Context(), estIDs, desde, hasta)
	if err != nil {
		jsonError(w, http.StatusBadRequest, err.Error())
		return
	}
	jsonOK(w, result)
}

func (h *EstadisticasHandler) Resumen(w http.ResponseWriter, r *http.Request) {
	estIDs, desde, hasta, ok := h.parseStatsParams(w, r)
	if !ok {
		return
	}
	result, err := h.svc.ResumenEstadisticas(r.Context(), estIDs, desde, hasta)
	if err != nil {
		jsonError(w, http.StatusBadRequest, err.Error())
		return
	}
	jsonOK(w, result)
}

func (h *EstadisticasHandler) Nacionalidades(w http.ResponseWriter, r *http.Request) {
	estIDs, desde, hasta, ok := h.parseStatsParams(w, r)
	if !ok {
		return
	}
	result, err := h.svc.Nacionalidades(r.Context(), estIDs, desde, hasta)
	if err != nil {
		jsonError(w, http.StatusBadRequest, err.Error())
		return
	}
	jsonOK(w, result)
}

func (h *EstadisticasHandler) MotivosViaje(w http.ResponseWriter, r *http.Request) {
	estIDs, desde, hasta, ok := h.parseStatsParams(w, r)
	if !ok {
		return
	}
	agrupacion := r.URL.Query().Get("agrupacion")
	if agrupacion == "" {
		agrupacion = "mes"
	}
	result, err := h.svc.MotivosViaje(r.Context(), estIDs, desde, hasta, agrupacion)
	if err != nil {
		jsonError(w, http.StatusBadRequest, err.Error())
		return
	}
	jsonOK(w, result)
}

func (h *EstadisticasHandler) TiposHabitacion(w http.ResponseWriter, r *http.Request) {
	estIDs, desde, hasta, ok := h.parseStatsParams(w, r)
	if !ok {
		return
	}
	result, err := h.svc.TiposHabitacion(r.Context(), estIDs, desde, hasta)
	if err != nil {
		jsonError(w, http.StatusBadRequest, err.Error())
		return
	}
	jsonOK(w, result)
}

// parseStatsParams extrae y valida fecha_desde y fecha_hasta.
// Acepta establecimiento_id (único) o establecimiento_ids (lista separada por comas).
// Para recepcionistas siempre se fuerza el establecimiento del token JWT.
func (h *EstadisticasHandler) parseStatsParams(w http.ResponseWriter, r *http.Request) (estIDs []string, desde, hasta string, ok bool) {
	claims := auth.FromContext(r.Context())
	if claims.HasRole(auth.RoleRecepcionista) {
		if claims.EstablecimientoID != "" {
			estIDs = []string{claims.EstablecimientoID}
		}
	} else {
		if single := r.URL.Query().Get("establecimiento_id"); single != "" {
			estIDs = []string{single}
		} else if multi := r.URL.Query().Get("establecimiento_ids"); multi != "" {
			estIDs = strings.Split(multi, ",")
		}
	}
	desde = r.URL.Query().Get("fecha_desde")
	hasta = r.URL.Query().Get("fecha_hasta")
	if desde == "" || hasta == "" {
		jsonError(w, http.StatusBadRequest, "fecha_desde y fecha_hasta son requeridas")
		return nil, "", "", false
	}
	return estIDs, desde, hasta, true
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

func parseIntQuery(r *http.Request, key string, fallback int) int {
	v := r.URL.Query().Get(key)
	if v == "" {
		return fallback
	}
	n, err := strconv.Atoi(v)
	if err != nil || n <= 0 {
		return fallback
	}
	return n
}
