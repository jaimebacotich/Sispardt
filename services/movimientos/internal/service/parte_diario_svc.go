package service

import (
	"context"
	"fmt"
	"time"

	pgx "github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"sispardt/movimientos/internal/domain"
	"sispardt/movimientos/internal/repository"
)

func boliviaLoc() *time.Location {
	loc, err := time.LoadLocation("America/La_Paz")
	if err != nil {
		return time.UTC
	}
	return loc
}

type ParteDiarioService struct {
	repo      *repository.ParteDiarioRepo
	auditRepo *repository.AuditoriaRepo
	pool      *pgxpool.Pool
	statsPool *pgxpool.Pool
}

func NewParteDiarioService(pool, statsPool *pgxpool.Pool) *ParteDiarioService {
	return &ParteDiarioService{
		repo:      repository.NewParteDiarioRepo(pool, statsPool),
		auditRepo: repository.NewAuditoriaRepo(statsPool),
		pool:      pool,
		statsPool: statsPool,
	}
}

// ─── Catálogos ────────────────────────────────────────────────────────────────

func (s *ParteDiarioService) GetCatalogos(ctx context.Context) (*domain.CatalogosMovimientos, error) {
	return s.repo.GetCatalogos(ctx)
}

// ─── Habitaciones Estado ──────────────────────────────────────────────────────

func (s *ParteDiarioService) GetHabitacionesEstado(ctx context.Context, establecimientoID, fecha string) ([]domain.HabitacionEstado, error) {
	if establecimientoID == "" {
		return nil, fmt.Errorf("establecimiento_id requerido")
	}
	return s.repo.GetHabitacionesEstado(ctx, establecimientoID, fecha)
}

// ─── Partes Diarios ───────────────────────────────────────────────────────────

func (s *ParteDiarioService) List(ctx context.Context, params domain.ListPartesParams) (*domain.PagedResult[domain.ParteDiarioResponse], error) {
	if params.Page <= 0 {
		params.Page = 1
	}
	if params.PageSize <= 0 {
		params.PageSize = 20
	} else if params.PageSize > 500 {
		params.PageSize = 500
	}
	data, total, err := s.repo.List(ctx, params)
	if err != nil {
		return nil, err
	}
	totalPages := total / params.PageSize
	if total%params.PageSize != 0 {
		totalPages++
	}
	return &domain.PagedResult[domain.ParteDiarioResponse]{
		Data:       data,
		Total:      total,
		Page:       params.Page,
		PageSize:   params.PageSize,
		TotalPages: totalPages,
	}, nil
}

func (s *ParteDiarioService) GetByID(ctx context.Context, id, establecimientoID string) (*domain.ParteDiarioResponse, error) {
	return s.repo.GetByID(ctx, id, establecimientoID)
}

func (s *ParteDiarioService) GetReportePorFecha(ctx context.Context, establecimientoID, fecha string) (*domain.ReporteParteDiario, error) {
	if establecimientoID == "" {
		return nil, fmt.Errorf("establecimiento_id requerido")
	}
	if fecha == "" {
		return nil, fmt.Errorf("fecha requerida")
	}
	ingresos, salidas, err := s.repo.GetReportePorFecha(ctx, establecimientoID, fecha)
	if err != nil {
		return nil, err
	}
	// Formatear fecha para el reporte: YYYY-MM-DD → DD/MM/YYYY
	fechaDisplay := fecha
	if t, e := time.Parse("2006-01-02", fecha); e == nil {
		fechaDisplay = t.Format("02/01/2006")
	}
	return &domain.ReporteParteDiario{
		Fecha:    fechaDisplay,
		Ingresos: ingresos,
		Salidas:  salidas,
	}, nil
}

func (s *ParteDiarioService) GetReporteNacional(
	ctx context.Context,
	establecimientoID string,
	anio, mes int,
	nombreEstablecimiento string,
	municipio string,
) (*domain.ReporteNacional, error) {
	if establecimientoID == "" {
		return nil, fmt.Errorf("establecimiento_id requerido")
	}
	if anio <= 0 || mes < 1 || mes > 12 {
		return nil, fmt.Errorf("año y mes inválidos")
	}

	partes, err := s.repo.GetReporteNacional(ctx, establecimientoID, anio, mes)
	if err != nil {
		return nil, err
	}

	// Orden canónico de departamentos bolivianos para las columnas del PDF
	deptoOrden := []string{
		"Chuquisaca", "La Paz", "Cochabamba", "Oruro",
		"Potosí", "Tarija", "Santa Cruz", "Beni", "Pando",
	}

	diasEnMes := time.Date(anio, time.Month(mes)+1, 0, 0, 0, 0, 0, boliviaLoc()).Day()
	loc := boliviaLoc()

	// Inicializar la matriz
	filas := make([]domain.FilaDiaria, diasEnMes)
	for i := range filas {
		filas[i] = domain.FilaDiaria{
			Dia:      i + 1,
			PorDepto: make(map[string]domain.CeldaDia),
		}
	}
	totalesPorDepto := make(map[string]domain.CeldaDia)
	var totalGeneral domain.CeldaDia

	for _, p := range partes {
		diaIdx := p.Dia - 1
		if diaIdx < 0 || diaIdx >= diasEnMes {
			continue
		}
		depto := p.Departamento

		// Llegada: el parte fue creado en ese día
		celda := filas[diaIdx].PorDepto[depto]
		celda.Llegadas++
		filas[diaIdx].PorDepto[depto] = celda
		filas[diaIdx].TotalLlegadas++
		t := totalesPorDepto[depto]
		t.Llegadas++
		totalesPorDepto[depto] = t
		totalGeneral.Llegadas++

		// Pernoctaciones: para cada día del mes, verificar si el huésped estaba activo
		ingresoTime := time.Unix(p.IngresoAt, 0).In(loc)
		for dia := 1; dia <= diasEnMes; dia++ {
			// Fin de la noche del día dia (23:59:59 hora Bolivia)
			noche := time.Date(anio, time.Month(mes), dia, 23, 59, 59, 0, loc)
			// El huésped debe haber llegado antes o durante esa noche
			if ingresoTime.After(noche) {
				continue
			}
			// Y no debe haber salido antes de que terminara esa noche
			if p.SalidaAt != nil {
				salidaTime := time.Unix(*p.SalidaAt, 0).In(loc)
				if !salidaTime.After(noche) {
					continue
				}
			}
			idx := dia - 1
			c := filas[idx].PorDepto[depto]
			c.Pernoctaciones++
			filas[idx].PorDepto[depto] = c
			filas[idx].TotalPernoc++
			td := totalesPorDepto[depto]
			td.Pernoctaciones++
			totalesPorDepto[depto] = td
			totalGeneral.Pernoctaciones++
		}
	}

	meses := []string{
		"", "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO",
		"JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE",
	}

	return &domain.ReporteNacional{
		NombreEstablecimiento: nombreEstablecimiento,
		Municipio:             municipio,
		MesAnio:               fmt.Sprintf("%s %d", meses[mes], anio),
		Departamentos:         deptoOrden,
		Filas:                 filas,
		TotalesPorDepto:       totalesPorDepto,
		TotalGeneral:          totalGeneral,
	}, nil
}

// ─── Reporte Consolidado Internacional ────────────────────────────────────────

// columnasIntl define el orden y mapeo de países del reporte internacional.
// El campo Departamento de ParteParaReporte contiene el código ISO del país.
var columnasIntl = []struct {
	Nombre string
	ISOs   []string // ISO(s) que mapean a esta columna; vacío = catch-all del grupo
	Grupo  string   // solo para catch-all
}{
	{"BOLIVIA",        []string{"BOL"}, ""},
	{"ARGENTINA",      []string{"ARG"}, ""},
	{"BRASIL",         []string{"BRA"}, ""},
	{"COLOMBIA",       []string{"COL"}, ""},
	{"CHILE",          []string{"CHL"}, ""},
	{"ECUADOR",        []string{"ECU"}, ""},
	{"PARAGUAY",       []string{"PRY"}, ""},
	{"PERÚ",           []string{"PER"}, ""},
	{"URUGUAY",        []string{"URY"}, ""},
	{"VENEZUELA",      []string{"VEN"}, ""},
	{"MÉXICO",         []string{"MEX"}, ""},
	{"CANADÁ",         []string{"CAN"}, ""},
	{"ESTADOS UNIDOS", []string{"USA"}, ""},
	{"OTROS AMERICA",  nil, "AMERICA"},
	{"ALEMANIA",       []string{"DEU"}, ""},
	{"ESPAÑA",         []string{"ESP"}, ""},
	{"FRANCIA",        []string{"FRA"}, ""},
	{"INGLATERRA",     []string{"GBR"}, ""},
	{"ITALIA",         []string{"ITA"}, ""},
	{"SUIZA",          []string{"CHE"}, ""},
	{"HOLANDA",        []string{"NLD"}, ""},
	{"SUECIA",         []string{"SWE"}, ""},
	{"OTROS EUROPA",   nil, "EUROPA"},
	{"JAPÓN",          []string{"JPN"}, ""},
	{"ISRAEL",         []string{"ISR"}, ""},
	{"OTROS ASIA",     nil, "ASIA"},
	{"AUSTRALIA",      []string{"AUS"}, ""},
	{"OTROS OCEANÍA",  nil, "OCEANIA"},
	{"AFRICA",         nil, "AFRICA"},
}

// isoNombresAmerica son los ISOs de America nombrados (tienen su propia columna).
var isoNombresAmerica = map[string]bool{"BOL":true,"ARG":true,"BRA":true,"COL":true,"CHL":true,"ECU":true,"PRY":true,"PER":true,"URY":true,"VEN":true,"MEX":true,"CAN":true,"USA":true}
var isoNombresEuropa  = map[string]bool{"DEU":true,"ESP":true,"FRA":true,"GBR":true,"ITA":true,"CHE":true,"NLD":true,"SWE":true}
var isoNombresAsia    = map[string]bool{"JPN":true,"ISR":true}
var isoNombresOceania = map[string]bool{"AUS":true}

// continenteISO determina a qué grupo "OTROS" pertenece un ISO no nombrado.
var continenteISO = func(iso string) string {
	// Prefijos de continente aproximados por ISO (simplificado)
	americaISOs := map[string]bool{
		"ATG":true,"BHS":true,"BLZ":true,"BOL":true,"BRA":true,"BRB":true,"CHL":true,"COL":true,"CRI":true,"CUB":true,"DMA":true,"DOM":true,"ECU":true,"GRD":true,"GTM":true,"GUY":true,"HND":true,"HTI":true,"JAM":true,"KNA":true,"LCA":true,"MEX":true,"NIC":true,"PAN":true,"PER":true,"PRY":true,"SLV":true,"SUR":true,"TTO":true,"URY":true,"VCT":true,"VEN":true,"ARG":true,"CAN":true,"USA":true,
	}
	europaISOs := map[string]bool{
		"ALB":true,"AND":true,"AUT":true,"BEL":true,"BGR":true,"BIH":true,"BLR":true,"CHE":true,"CYP":true,"CZE":true,"DEU":true,"DNK":true,"ESP":true,"EST":true,"FIN":true,"FRA":true,"GBR":true,"GRC":true,"HRV":true,"HUN":true,"IRL":true,"ISL":true,"ITA":true,"LIE":true,"LTU":true,"LUX":true,"LVA":true,"MDA":true,"MKD":true,"MLT":true,"MNE":true,"NLD":true,"NOR":true,"POL":true,"PRT":true,"ROU":true,"RUS":true,"SRB":true,"SVK":true,"SVN":true,"SWE":true,"UKR":true,"VAT":true,
	}
	asiaISOs := map[string]bool{
		"AFG":true,"ARE":true,"ARM":true,"AZE":true,"BGD":true,"BHR":true,"BRN":true,"BTN":true,"CHN":true,"GEO":true,"HKG":true,"IDN":true,"IND":true,"IRN":true,"IRQ":true,"ISR":true,"JOR":true,"JPN":true,"KAZ":true,"KGZ":true,"KHM":true,"KOR":true,"KWT":true,"LAO":true,"LBN":true,"LKA":true,"MAC":true,"MDV":true,"MMR":true,"MNG":true,"MYS":true,"NPL":true,"OMN":true,"PAK":true,"PHL":true,"PRK":true,"QAT":true,"SAU":true,"SGP":true,"SYR":true,"THA":true,"TJK":true,"TKM":true,"TLS":true,"TUR":true,"TWN":true,"UZB":true,"VNM":true,"YEM":true,
	}
	oceaniaISOs := map[string]bool{
		"AUS":true,"FJI":true,"FSM":true,"KIR":true,"MHL":true,"NRU":true,"NZL":true,"PLW":true,"PNG":true,"SLB":true,"TON":true,"TUV":true,"VUT":true,"WSM":true,
	}
	if americaISOs[iso] { return "AMERICA" }
	if europaISOs[iso]  { return "EUROPA" }
	if asiaISOs[iso]    { return "ASIA" }
	if oceaniaISOs[iso] { return "OCEANIA" }
	return "AFRICA"
}

// isoAColumna mapea un código ISO a la clave de columna del reporte internacional.
func isoAColumna(iso string) string {
	if isoNombresAmerica[iso] || isoNombresEuropa[iso] || isoNombresAsia[iso] || isoNombresOceania[iso] {
		// País con columna propia — busca su nombre
		for _, col := range columnasIntl {
			for _, i := range col.ISOs {
				if i == iso {
					return col.Nombre
				}
			}
		}
	}
	// Catch-all: asignar a OTROS <CONTINENTE>
	cont := continenteISO(iso)
	switch cont {
	case "AMERICA":
		if !isoNombresAmerica[iso] { return "OTROS AMERICA" }
	case "EUROPA":
		if !isoNombresEuropa[iso]  { return "OTROS EUROPA" }
	case "ASIA":
		if !isoNombresAsia[iso]    { return "OTROS ASIA" }
	case "OCEANIA":
		if !isoNombresOceania[iso] { return "OTROS OCEANÍA" }
	}
	return "AFRICA"
}

// ─── Reporte Consolidado por Municipio ────────────────────────────────────────

// deptoOrdenMunicipio: orden canónico de departamentos para el reporte por municipio.
var deptoOrdenMunicipio = []string{
	"Chuquisaca", "La Paz", "Cochabamba", "Oruro",
	"Potosí", "Tarija", "Santa Cruz", "Beni", "Pando",
}

func (s *ParteDiarioService) GetReporteMunicipioNacional(
	ctx context.Context,
	req domain.ReqReporteMunicipio,
) (*domain.ReporteMunicipioNacional, error) {
	if len(req.Establecimientos) == 0 {
		return nil, fmt.Errorf("al menos un establecimiento requerido")
	}
	if req.Anio <= 0 || req.Mes < 1 || req.Mes > 12 {
		return nil, fmt.Errorf("año o mes inválido")
	}

	// Extraer IDs
	estIDs := make([]string, len(req.Establecimientos))
	for i, e := range req.Establecimientos {
		estIDs[i] = e.ID
	}

	partes, err := s.repo.GetReporteMunicipioNacional(ctx, estIDs, req.Anio, req.Mes)
	if err != nil {
		return nil, err
	}

	// Agrupar partes por establecimiento
	partesPorEst := make(map[string][]domain.ParteParaMunicipio)
	for _, p := range partes {
		partesPorEst[p.EstablecimientoID] = append(partesPorEst[p.EstablecimientoID], p)
	}

	diasEnMes := time.Date(req.Anio, time.Month(req.Mes)+1, 0, 0, 0, 0, 0, boliviaLoc()).Day()
	loc := boliviaLoc()

	totalGen := domain.FilaEstablecimiento{PorDepto: make(map[string]domain.CeldaDia)}

	filas := make([]domain.FilaEstablecimiento, 0, len(req.Establecimientos))
	for i, meta := range req.Establecimientos {
		fila := domain.FilaEstablecimiento{
			Numero:        i + 1,
			Clasificacion: meta.Clasificacion,
			Nombre:        meta.Nombre,
			Categoria:     meta.Categoria,
			PorDepto:      make(map[string]domain.CeldaDia),
		}

		for _, p := range partesPorEst[meta.ID] {
			depto := p.Departamento

			// Llegada
			celda := fila.PorDepto[depto]
			celda.Llegadas++
			fila.PorDepto[depto] = celda
			fila.TotalLlegadas++
			tg := totalGen.PorDepto[depto]
			tg.Llegadas++
			totalGen.PorDepto[depto] = tg
			totalGen.TotalLlegadas++

			// Pernoctaciones: noches dentro del mes
			ingresoT := time.Unix(p.IngresoAt, 0).In(loc)
			for dia := 1; dia <= diasEnMes; dia++ {
				noche := time.Date(req.Anio, time.Month(req.Mes), dia, 23, 59, 59, 0, loc)
				if ingresoT.After(noche) {
					continue
				}
				if p.SalidaAt != nil {
					if !time.Unix(*p.SalidaAt, 0).In(loc).After(noche) {
						continue
					}
				}
				c := fila.PorDepto[depto]
				c.Pernoctaciones++
				fila.PorDepto[depto] = c
				fila.TotalPernoc++
				tg2 := totalGen.PorDepto[depto]
				tg2.Pernoctaciones++
				totalGen.PorDepto[depto] = tg2
				totalGen.TotalPernoc++
			}
		}
		filas = append(filas, fila)
	}

	meses := []string{"","ENERO","FEBRERO","MARZO","ABRIL","MAYO","JUNIO","JULIO","AGOSTO","SEPTIEMBRE","OCTUBRE","NOVIEMBRE","DICIEMBRE"}

	return &domain.ReporteMunicipioNacional{
		Municipio:     req.Municipio,
		MesAnio:       fmt.Sprintf("%s %d", meses[req.Mes], req.Anio),
		Departamentos: deptoOrdenMunicipio,
		Filas:         filas,
		TotalGeneral:  totalGen,
	}, nil
}

func (s *ParteDiarioService) GetReporteMunicipioInternacional(
	ctx context.Context,
	req domain.ReqReporteMunicipio,
) (*domain.ReporteMunicipioNacional, error) {
	if len(req.Establecimientos) == 0 {
		return nil, fmt.Errorf("al menos un establecimiento requerido")
	}
	if req.Anio <= 0 || req.Mes < 1 || req.Mes > 12 {
		return nil, fmt.Errorf("año o mes inválido")
	}

	estIDs := make([]string, len(req.Establecimientos))
	for i, e := range req.Establecimientos {
		estIDs[i] = e.ID
	}

	partes, err := s.repo.GetReporteMunicipioInternacional(ctx, estIDs, req.Anio, req.Mes)
	if err != nil {
		return nil, err
	}

	// Orden de columnas del reporte internacional
	ordenPaises := make([]string, len(columnasIntl))
	for i, c := range columnasIntl {
		ordenPaises[i] = c.Nombre
	}

	partesPorEst := make(map[string][]domain.ParteParaMunicipio)
	for _, p := range partes {
		partesPorEst[p.EstablecimientoID] = append(partesPorEst[p.EstablecimientoID], p)
	}

	diasEnMes := time.Date(req.Anio, time.Month(req.Mes)+1, 0, 0, 0, 0, 0, boliviaLoc()).Day()
	loc := boliviaLoc()

	totalGen := domain.FilaEstablecimiento{PorDepto: make(map[string]domain.CeldaDia)}
	filas := make([]domain.FilaEstablecimiento, 0, len(req.Establecimientos))

	for i, meta := range req.Establecimientos {
		fila := domain.FilaEstablecimiento{
			Numero:        i + 1,
			Clasificacion: meta.Clasificacion,
			Nombre:        meta.Nombre,
			Categoria:     meta.Categoria,
			PorDepto:      make(map[string]domain.CeldaDia),
		}

		for _, p := range partesPorEst[meta.ID] {
			colKey := isoAColumna(p.Departamento) // p.Departamento contiene el ISO
			esExtranjero := colKey != "BOLIVIA"

			celda := fila.PorDepto[colKey]
			celda.Llegadas++
			fila.PorDepto[colKey] = celda
			fila.TotalLlegadas++
			tg := totalGen.PorDepto[colKey]
			tg.Llegadas++
			totalGen.PorDepto[colKey] = tg
			totalGen.TotalLlegadas++

			ingresoT := time.Unix(p.IngresoAt, 0).In(loc)
			for dia := 1; dia <= diasEnMes; dia++ {
				noche := time.Date(req.Anio, time.Month(req.Mes), dia, 23, 59, 59, 0, loc)
				if ingresoT.After(noche) {
					continue
				}
				if p.SalidaAt != nil {
					if !time.Unix(*p.SalidaAt, 0).In(loc).After(noche) {
						continue
					}
				}
				c := fila.PorDepto[colKey]
				c.Pernoctaciones++
				fila.PorDepto[colKey] = c
				fila.TotalPernoc++
				tg2 := totalGen.PorDepto[colKey]
				tg2.Pernoctaciones++
				totalGen.PorDepto[colKey] = tg2
				totalGen.TotalPernoc++
			}
			_ = esExtranjero
		}
		filas = append(filas, fila)
	}

	meses := []string{"","ENERO","FEBRERO","MARZO","ABRIL","MAYO","JUNIO","JULIO","AGOSTO","SEPTIEMBRE","OCTUBRE","NOVIEMBRE","DICIEMBRE"}

	return &domain.ReporteMunicipioNacional{
		Municipio:     req.Municipio,
		MesAnio:       fmt.Sprintf("%s %d", meses[req.Mes], req.Anio),
		Departamentos: ordenPaises, // aquí "Departamentos" son los países
		Filas:         filas,
		TotalGeneral:  totalGen,
	}, nil
}

func (s *ParteDiarioService) GetReporteInternacional(
	ctx context.Context,
	establecimientoID string,
	anio, mes int,
	nombreEstablecimiento string,
	municipio string,
) (*domain.ReporteNacional, error) {
	if establecimientoID == "" {
		return nil, fmt.Errorf("establecimiento_id requerido")
	}
	if anio <= 0 || mes < 1 || mes > 12 {
		return nil, fmt.Errorf("año y mes inválidos")
	}

	partes, err := s.repo.GetReporteInternacional(ctx, establecimientoID, anio, mes)
	if err != nil {
		return nil, err
	}

	// Orden de columnas
	orden := make([]string, len(columnasIntl))
	for i, c := range columnasIntl {
		orden[i] = c.Nombre
	}

	diasEnMes := time.Date(anio, time.Month(mes)+1, 0, 0, 0, 0, 0, boliviaLoc()).Day()
	loc := boliviaLoc()

	filas := make([]domain.FilaDiaria, diasEnMes)
	for i := range filas {
		filas[i] = domain.FilaDiaria{Dia: i + 1, PorDepto: make(map[string]domain.CeldaDia)}
	}
	totalesPorDepto := make(map[string]domain.CeldaDia)
	var totalGeneral domain.CeldaDia

	for _, p := range partes {
		diaIdx := p.Dia - 1
		if diaIdx < 0 || diaIdx >= diasEnMes {
			continue
		}
		colKey := isoAColumna(p.Departamento) // Departamento contiene el ISO
		esExtranjero := colKey != "BOLIVIA"

		// Llegadas
		celda := filas[diaIdx].PorDepto[colKey]
		celda.Llegadas++
		filas[diaIdx].PorDepto[colKey] = celda
		filas[diaIdx].TotalLlegadas++
		t := totalesPorDepto[colKey]
		t.Llegadas++
		totalesPorDepto[colKey] = t
		totalGeneral.Llegadas++

		// Pernoctaciones
		ingresoTime := time.Unix(p.IngresoAt, 0).In(loc)
		for dia := 1; dia <= diasEnMes; dia++ {
			noche := time.Date(anio, time.Month(mes), dia, 23, 59, 59, 0, loc)
			if ingresoTime.After(noche) {
				continue
			}
			if p.SalidaAt != nil {
				if salidaTime := time.Unix(*p.SalidaAt, 0).In(loc); !salidaTime.After(noche) {
					continue
				}
			}
			idx := dia - 1
			c := filas[idx].PorDepto[colKey]
			c.Pernoctaciones++
			filas[idx].PorDepto[colKey] = c
			filas[idx].TotalPernoc++
			td := totalesPorDepto[colKey]
			td.Pernoctaciones++
			totalesPorDepto[colKey] = td
			if esExtranjero {
				totalGeneral.Pernoctaciones++
			}
		}
		_ = esExtranjero
	}

	meses := []string{"","ENERO","FEBRERO","MARZO","ABRIL","MAYO","JUNIO","JULIO","AGOSTO","SEPTIEMBRE","OCTUBRE","NOVIEMBRE","DICIEMBRE"}

	return &domain.ReporteNacional{
		NombreEstablecimiento: nombreEstablecimiento,
		Municipio:             municipio,
		MesAnio:               fmt.Sprintf("%s %d", meses[mes], anio),
		Departamentos:         orden,
		Filas:                 filas,
		TotalesPorDepto:       totalesPorDepto,
		TotalGeneral:          totalGeneral,
	}, nil
}

func (s *ParteDiarioService) Create(ctx context.Context, userID, username, firstName, lastName, clientIP, establecimientoID string, req domain.CreateParteDiarioRequest) (*domain.ParteDiarioResponse, error) {
	if userID == "" {
		return nil, fmt.Errorf("userID (sub) no encontrado en el token")
	}
	if establecimientoID == "" {
		return nil, fmt.Errorf("establecimientoID no encontrado en session")
	}
	if err := validateCreateRequest(req); err != nil {
		return nil, err
	}
	var created *domain.ParteDiario
	err := repository.WithAuditTx(ctx, s.pool, userID, clientIP, establecimientoID, func(tx pgx.Tx) error {
		hab, err := s.repo.GetHabitacionCache(ctx, tx, req.HabitacionID)
		if err != nil {
			return err
		}
		if hab == nil {
			return fmt.Errorf("habitación no encontrada")
		}
		if hab.EstablecimientoID != establecimientoID {
			return fmt.Errorf("habitación no pertenece al establecimiento")
		}
		persona, err := s.repo.UpsertPersona(ctx, tx, req.Persona)
		if err != nil {
			return err
		}
		created, err = s.repo.CreateParte(ctx, tx, persona.ID, establecimientoID, userID, username, firstName, lastName, req, hab)
		return err
	})
	if err != nil {
		return nil, err
	}
	return s.repo.GetByID(ctx, created.ID, establecimientoID)
}

func (s *ParteDiarioService) Checkout(ctx context.Context, parteID, userID, clientIP, establecimientoID string) (*domain.ParteDiarioResponse, error) {
	raw, err := s.repo.GetByIDRaw(ctx, parteID, establecimientoID)
	if err != nil {
		return nil, err
	}
	if raw == nil {
		return nil, fmt.Errorf("parte diario no encontrado")
	}
	if raw.EstablecimientoID != establecimientoID {
		return nil, fmt.Errorf("parte no pertenece a este establecimiento")
	}
	err = repository.WithAuditTx(ctx, s.pool, userID, clientIP, establecimientoID, func(tx pgx.Tx) error {
		return s.repo.Checkout(ctx, tx, parteID, establecimientoID)
	})
	if err != nil {
		return nil, err
	}
	return s.repo.GetByID(ctx, parteID, establecimientoID)
}

func (s *ParteDiarioService) Anular(ctx context.Context, id, userID, clientIP, establecimientoID string) error {
	raw, err := s.repo.GetByIDRaw(ctx, id, establecimientoID)
	if err != nil {
		return err
	}
	if raw == nil {
		return fmt.Errorf("parte diario no encontrado")
	}
	if raw.EstablecimientoID != establecimientoID {
		return fmt.Errorf("parte no pertenece a este establecimiento")
	}
	return repository.WithAuditTx(ctx, s.pool, userID, clientIP, establecimientoID, func(tx pgx.Tx) error {
		return s.repo.Anular(ctx, tx, id)
	})
}

// ─── Cierres ──────────────────────────────────────────────────────────────────

func (s *ParteDiarioService) ListCierres(ctx context.Context, establecimientoID string) ([]domain.CierreDiarioResponse, error) {
	cierres, err := s.repo.ListCierres(ctx, establecimientoID)
	if err != nil {
		return nil, err
	}
	resp := make([]domain.CierreDiarioResponse, len(cierres))
	for i, c := range cierres {
		resp[i] = toCierreResponse(c)
	}
	return resp, nil
}

func (s *ParteDiarioService) GetCierrePorFecha(ctx context.Context, establecimientoID, fecha string) (*domain.CierreDiarioResponse, error) {
	c, err := s.repo.GetCierrePorFecha(ctx, establecimientoID, fecha)
	if err != nil {
		return nil, err
	}
	if c == nil {
		return nil, nil
	}
	r := toCierreResponse(*c)
	return &r, nil
}

func (s *ParteDiarioService) GetFechasPendientes(ctx context.Context, establecimientoID string) ([]domain.FechaPendiente, error) {
	return s.repo.GetFechasPendientes(ctx, establecimientoID)
}

func (s *ParteDiarioService) CreateCierre(ctx context.Context, userID, cerradoPor, username, firstName, lastName, clientIP, establecimientoID string, req domain.CreateCierreDiarioRequest) (*domain.CierreDiarioResponse, error) {
	if req.FechaReporte == "" {
		return nil, fmt.Errorf("fechaReporte es requerida")
	}
	var c *domain.CierreDiario
	err := repository.WithAuditTx(ctx, s.pool, userID, clientIP, establecimientoID, func(tx pgx.Tx) error {
		var err error
		c, err = s.repo.CreateCierre(ctx, tx, establecimientoID, cerradoPor, username, firstName, lastName, req)
		return err
	})
	if err != nil {
		return nil, err
	}
	r := toCierreResponse(*c)
	return &r, nil
}

// ─── Estadísticas ─────────────────────────────────────────────────────────────

func (s *ParteDiarioService) OcupacionDiaria(ctx context.Context, estIDs []string, desde, hasta string) ([]domain.OcupacionDiaria, error) {
	desdeT, hastaT, err := parseFechas(desde, hasta)
	if err != nil {
		return nil, err
	}
	return s.repo.OcupacionDiaria(ctx, estIDs, desdeT, hastaT)
}

func (s *ParteDiarioService) ResumenEstadisticas(ctx context.Context, estIDs []string, desde, hasta string) (domain.ResumenEstadisticas, error) {
	desdeT, hastaT, err := parseFechas(desde, hasta)
	if err != nil {
		return domain.ResumenEstadisticas{}, err
	}
	return s.repo.ResumenEstadisticas(ctx, estIDs, desdeT, hastaT)
}

func (s *ParteDiarioService) Nacionalidades(ctx context.Context, estIDs []string, desde, hasta string) ([]domain.NacionalidadStat, error) {
	desdeT, hastaT, err := parseFechas(desde, hasta)
	if err != nil {
		return nil, err
	}
	return s.repo.Nacionalidades(ctx, estIDs, desdeT, hastaT)
}

func (s *ParteDiarioService) MotivosViaje(ctx context.Context, estIDs []string, desde, hasta, agrupacion string) ([]domain.MotivosPeriodo, error) {
	desdeT, hastaT, err := parseFechas(desde, hasta)
	if err != nil {
		return nil, err
	}
	return s.repo.MotivosViaje(ctx, estIDs, desdeT, hastaT, agrupacion)
}

func (s *ParteDiarioService) TiposHabitacion(ctx context.Context, estIDs []string, desde, hasta string) ([]domain.TipoHabitacionStat, error) {
	desdeT, hastaT, err := parseFechas(desde, hasta)
	if err != nil {
		return nil, err
	}
	return s.repo.TiposHabitacion(ctx, estIDs, desdeT, hastaT)
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

func parseFechas(desde, hasta string) (time.Time, time.Time, error) {
	desdeT, err := time.Parse("2006-01-02", desde)
	if err != nil {
		return time.Time{}, time.Time{}, fmt.Errorf("fecha_desde inválida (use YYYY-MM-DD)")
	}
	hastaT, err := time.Parse("2006-01-02", hasta)
	if err != nil {
		return time.Time{}, time.Time{}, fmt.Errorf("fecha_hasta inválida (use YYYY-MM-DD)")
	}
	if hastaT.Before(desdeT) {
		return time.Time{}, time.Time{}, fmt.Errorf("fecha_hasta debe ser >= fecha_desde")
	}
	return desdeT, hastaT, nil
}

func toCierreResponse(c domain.CierreDiario) domain.CierreDiarioResponse {
	var username *string
	if c.CerradoPorUsername != "" {
		u := c.CerradoPorUsername
		username = &u
	}
	var nombreCompleto *string
	nombre := ""
	if c.CerradoPorNombre != "" {
		nombre = c.CerradoPorNombre
	}
	if c.CerradoPorApellido != "" {
		if nombre != "" {
			nombre += " "
		}
		nombre += c.CerradoPorApellido
	}
	if nombre != "" {
		nombreCompleto = &nombre
	}
	return domain.CierreDiarioResponse{
		ID:                       c.ID,
		EstablecimientoID:        c.EstablecimientoID,
		FechaReporte:             c.FechaReporte,
		TotalRegistros:           c.TotalRegistros,
		TotalCheckins:            c.TotalCheckins,
		TotalCheckouts:           c.TotalCheckouts,
		CerradoPor:               c.CerradoPor,
		CerradoPorUsername:       username,
		CerradoPorNombreCompleto: nombreCompleto,
		CerradoAt:                c.CerradoAt.Format(time.RFC3339),
		Observacion:              c.Observacion,
		CondicionEntrega:         c.CondicionEntrega,
	}
}

func validateCreateRequest(req domain.CreateParteDiarioRequest) error {
	if req.HabitacionID == "" {
		return fmt.Errorf("habitacionId es requerido")
	}
	if req.FechaReporte == "" {
		return fmt.Errorf("fechaReporte es requerida")
	}
	if req.PaisProcedenciaID == 0 {
		return fmt.Errorf("paisProcedenciaId es requerido")
	}
	if req.Persona.DocumentoIdentidad == "" {
		return fmt.Errorf("documentoIdentidad del huésped es requerido")
	}
	if req.Persona.Nombre == "" {
		return fmt.Errorf("nombre del huésped es requerido")
	}
	if req.Persona.ApellidoPaterno == "" {
		return fmt.Errorf("apellidoPaterno del huésped es requerido")
	}
	return nil
}


// ─── Auditoría ────────────────────────────────────────────────────────────────

func (s *ParteDiarioService) ListAuditoria(ctx context.Context, p domain.AuditoriaListParams) ([]domain.AuditoriaTransaccion, int, error) {
	return s.auditRepo.List(ctx, p)
}
