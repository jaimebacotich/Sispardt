package pdf

import (
	"fmt"
	"io"
	"strings"

	"github.com/go-pdf/fpdf"
	"sispardt/movimientos/internal/domain"
)

// Dimensiones para A4 landscape (297×210mm), márgenes 4mm → ancho útil 289mm.
// Tabla total = 9 + 9×27 + 26 = 278mm → espacio sobrante = 11mm → centrado con 5.5mm/lado.
const (
	colDias   = 9.0
	colI      = 14.0
	colP      = 13.0
	colTotalI = 13.0
	colTotalP = 13.0

	rowHdr1 = 4.5
	rowHdr2 = 3.8
	rowData = 3.7
	rowTot  = 4.5

	fszTitulo   = 9.5
	fszEstab    = 13.0
	fszMeta     = 7.0
	fszSeccion  = 6.5
	fszHdrDepto = 5.5
	fszHdrIP    = 5.5
	fszDato     = 5.5

	marginNac = 4.0
)

var (
	colorHdrDepto  = [3]int{139, 115, 85}
	colorHdrSub    = [3]int{160, 135, 100}
	colorRowPar    = [3]int{255, 255, 255}
	colorRowImpar  = [3]int{245, 245, 220}
	colorTotalFila = [3]int{216, 191, 216}
	colorNegro     = [3]int{0, 0, 0}
	colorBlanco    = [3]int{255, 255, 255}
	colorBorde     = [3]int{160, 160, 160}
	colorGrisOsc   = [3]int{80, 80, 80}
)

// tablaAncho devuelve el ancho total de la tabla en mm.
func tablaAncho() float64 {
	return colDias + 9*(colI+colP) + colTotalI + colTotalP // 9+243+26 = 278
}

func GenerarReporteNacional(w io.Writer, r *domain.ReporteNacional) error {
	pdf := fpdf.NewCustom(&fpdf.InitType{
		OrientationStr: "L",
		UnitStr:        "mm",
		SizeStr:        "A4",
	})
	cargarFuentes(pdf)
	pdf.SetMargins(marginNac, marginNac, marginNac)
	pdf.SetAutoPageBreak(true, 9)
	pdf.AliasNbPages("{nb}")

	pdf.SetFooterFunc(func() {
		pageW, _ := pdf.GetPageSize()
		pdf.SetY(-8)
		pdf.SetFont("DejaVu", "I", 6.0)
		pdf.SetTextColor(colorGrisOsc[0], colorGrisOsc[1], colorGrisOsc[2])
		pdf.CellFormat(pageW-marginNac*2, 4,
			"Sistema de Partes Diarios Tarija - SISPARDT", "", 0, "L", false, 0, "")
		pdf.SetX(marginNac)
		pdf.CellFormat(pageW-marginNac*2, 4,
			fmt.Sprintf("Página %d de {nb}", pdf.PageNo()), "", 0, "R", false, 0, "")
	})

	pdf.AddPage()

	// X inicial para centrar la tabla en la página
	pageW, _ := pdf.GetPageSize()
	startX := (pageW - tablaAncho()) / 2

	// ── Cabecera ──────────────────────────────────────────────────────────────

	// Título centrado (usa ancho completo)
	pdf.SetFont("DejaVu", "B", fszTitulo)
	pdf.SetTextColor(colorNegro[0], colorNegro[1], colorNegro[2])
	pdf.CellFormat(0, 5.5, "ESTADÍSTICAS DE ESTABLECIMIENTOS DE HOSPEDAJE TURÍSTICO", "", 1, "C", false, 0, "")

	// Nombre del establecimiento centrado
	pdf.SetFont("DejaVu", "B", fszEstab)
	pdf.CellFormat(0, 7, r.NombreEstablecimiento, "", 1, "C", false, 0, "")

	// Municipio y Mes/Año — alineados con el borde izquierdo de la tabla
	pdf.SetFont("DejaVu", "", fszMeta)
	pdf.SetTextColor(colorGrisOsc[0], colorGrisOsc[1], colorGrisOsc[2])

	pdf.SetX(startX)
	pdf.CellFormat(tablaAncho(), 4.5, "Municipio: "+r.Municipio, "", 1, "L", false, 0, "")
	pdf.SetX(startX)
	pdf.CellFormat(tablaAncho(), 4.5, "Mes / Año: "+r.MesAnio, "", 1, "L", false, 0, "")
	pdf.Ln(1.5)

	// Sección — alineada con el borde izquierdo de la tabla
	pdf.SetFont("DejaVu", "B", fszSeccion)
	pdf.SetTextColor(colorNegro[0], colorNegro[1], colorNegro[2])
	pdf.SetX(startX)
	pdf.CellFormat(tablaAncho(), 3.5, "NÚMERO DE LLEGADAS (I) y PERNOCTACIONES (P)", "", 1, "L", false, 0, "")
	pdf.Ln(1)

	// ── Tabla centrada ────────────────────────────────────────────────────────
	dibujarCabeceraTabla(pdf, r.Departamentos, startX)

	pdf.SetFont("DejaVu", "", fszDato)
	pdf.SetDrawColor(colorBorde[0], colorBorde[1], colorBorde[2])
	pdf.SetLineWidth(0.15)

	for i, fila := range r.Filas {
		if i%2 == 0 {
			pdf.SetFillColor(colorRowPar[0], colorRowPar[1], colorRowPar[2])
		} else {
			pdf.SetFillColor(colorRowImpar[0], colorRowImpar[1], colorRowImpar[2])
		}
		pdf.SetTextColor(colorNegro[0], colorNegro[1], colorNegro[2])

		pdf.SetX(startX)
		pdf.CellFormat(colDias, rowData, fmt.Sprintf("%d", fila.Dia), "1", 0, "C", true, 0, "")
		for _, dep := range r.Departamentos {
			c := fila.PorDepto[dep]
			pdf.CellFormat(colI, rowData, fmtVal(c.Llegadas), "1", 0, "C", true, 0, "")
			pdf.CellFormat(colP, rowData, fmtVal(c.Pernoctaciones), "1", 0, "C", true, 0, "")
		}
		pdf.CellFormat(colTotalI, rowData, fmtVal(fila.TotalLlegadas), "1", 0, "C", true, 0, "")
		pdf.CellFormat(colTotalP, rowData, fmtVal(fila.TotalPernoc), "1", 1, "C", true, 0, "")
	}

	// ── Fila TOTAL ────────────────────────────────────────────────────────────
	pdf.SetFillColor(colorTotalFila[0], colorTotalFila[1], colorTotalFila[2])
	pdf.SetFont("DejaVu", "B", fszDato)
	pdf.SetTextColor(colorNegro[0], colorNegro[1], colorNegro[2])
	pdf.SetX(startX)
	pdf.CellFormat(colDias, rowTot, "TOTAL", "1", 0, "C", true, 0, "")
	for _, dep := range r.Departamentos {
		t := r.TotalesPorDepto[dep]
		pdf.CellFormat(colI, rowTot, fmtVal(t.Llegadas), "1", 0, "C", true, 0, "")
		pdf.CellFormat(colP, rowTot, fmtVal(t.Pernoctaciones), "1", 0, "C", true, 0, "")
	}
	pdf.CellFormat(colTotalI, rowTot, fmtVal(r.TotalGeneral.Llegadas), "1", 0, "C", true, 0, "")
	pdf.CellFormat(colTotalP, rowTot, fmtVal(r.TotalGeneral.Pernoctaciones), "1", 1, "C", true, 0, "")

	return pdf.Output(w)
}

func dibujarCabeceraTabla(pdf *fpdf.Fpdf, deptos []string, startX float64) {
	pdf.SetDrawColor(colorBorde[0], colorBorde[1], colorBorde[2])
	pdf.SetLineWidth(0.25)

	// Fila 1: celda vacía + nombres departamento + TOTAL
	pdf.SetFillColor(colorHdrDepto[0], colorHdrDepto[1], colorHdrDepto[2])
	pdf.SetTextColor(colorBlanco[0], colorBlanco[1], colorBlanco[2])
	pdf.SetFont("DejaVu", "B", fszHdrDepto)

	pdf.SetX(startX)
	pdf.CellFormat(colDias, rowHdr1, "", "1", 0, "C", true, 0, "")
	for _, dep := range deptos {
		pdf.CellFormat(colI+colP, rowHdr1, abreviarDepto(dep), "1", 0, "C", true, 0, "")
	}
	pdf.CellFormat(colTotalI+colTotalP, rowHdr1, "TOTAL", "1", 1, "C", true, 0, "")

	// Fila 2: DÍAS | I | P × 9 deptos | I | P total
	pdf.SetFillColor(colorHdrSub[0], colorHdrSub[1], colorHdrSub[2])
	pdf.SetFont("DejaVu", "B", fszHdrIP)

	pdf.SetX(startX)
	pdf.CellFormat(colDias, rowHdr2, "DÍAS", "1", 0, "C", true, 0, "")
	for range deptos {
		pdf.CellFormat(colI, rowHdr2, "I", "1", 0, "C", true, 0, "")
		pdf.CellFormat(colP, rowHdr2, "P", "1", 0, "C", true, 0, "")
	}
	pdf.CellFormat(colTotalI, rowHdr2, "I", "1", 0, "C", true, 0, "")
	pdf.CellFormat(colTotalP, rowHdr2, "P", "1", 1, "C", true, 0, "")
}

func abreviarDepto(nombre string) string {
	abrev := map[string]string{
		"Cochabamba": "COCHABAMBA",
		"La Paz":     "LA PAZ",
		"Oruro":      "ORURO",
		"Chuquisaca": "CHUQUISACA",
		"Santa Cruz": "SANTA CRUZ",
		"Tarija":     "TARIJA",
		"Beni":       "BENI",
		"Pando":      "PANDO",
		"Potosí":     "POTOSÍ",
	}
	if a, ok := abrev[nombre]; ok {
		return a
	}
	return strings.ToUpper(nombre)
}

func fmtVal(v int) string {
	return fmt.Sprintf("%d", v)
}
