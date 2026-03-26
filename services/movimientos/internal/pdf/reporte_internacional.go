package pdf

import (
	"fmt"
	"io"

	"github.com/go-pdf/fpdf"
	"sispardt/movimientos/internal/domain"
)

// Hoja legal landscape (355.6 × 215.9 mm) — más ancha que A4 para las 30 columnas.
// Márgenes 4mm → ancho útil 347.6mm
//
// Distribución (30 países + DÍAS + TOTAL_EXT):
//   DÍAS(7) + 29×10.5(I5.5+P5) + TOTAL_EXT(14) = 7 + 304.5 + 14 = 325.5mm ✓
const (
	colDiasI  = 7.0
	colII     = 5.5
	colPI     = 5.0
	colTotEI  = 7.5
	colTotEP  = 6.5

	rowHdr1I  = 5.0
	rowHdr2I  = 4.0
	rowDataI  = 3.8
	rowTotI   = 4.5

	fszTituloI  = 8.5
	fszEstabI   = 11.0
	fszMetaI    = 6.5
	fszSecI     = 6.0
	fszHdrI     = 4.0
	fszDatoI    = 4.5

	marginNacI = 4.0
)

// anchoTablaI calcula el ancho total de la tabla internacional.
// 29 pares de columnas + DÍAS + TOTAL EXTRANJEROS
func anchoTablaI(nPaises int) float64 {
	return colDiasI + float64(nPaises)*(colII+colPI) + colTotEI + colTotEP
}

func GenerarReporteInternacional(w io.Writer, r *domain.ReporteNacional) error {
	pdf := fpdf.NewCustom(&fpdf.InitType{
		OrientationStr: "L",
		UnitStr:        "mm",
		SizeStr:        "Legal", // 355.6 × 215.9 mm
	})
	cargarFuentes(pdf)
	pdf.SetMargins(marginNacI, marginNacI, marginNacI)
	pdf.SetAutoPageBreak(true, 9)
	pdf.AliasNbPages("{nb}")

	pdf.SetFooterFunc(func() {
		pageW, _ := pdf.GetPageSize()
		pdf.SetY(-8)
		pdf.SetFont("DejaVu", "I", 6.0)
		pdf.SetTextColor(80, 80, 80)
		pdf.CellFormat(pageW-marginNacI*2, 4,
			"Sistema de Partes Diarios Tarija - SISPARDT", "", 0, "L", false, 0, "")
		pdf.SetX(marginNacI)
		pdf.CellFormat(pageW-marginNacI*2, 4,
			fmt.Sprintf("Página %d de {nb}", pdf.PageNo()), "", 0, "R", false, 0, "")
	})

	pdf.AddPage()

	pageW, _ := pdf.GetPageSize()
	nPaises := len(r.Departamentos)
	tablaW  := anchoTablaI(nPaises)
	startX  := (pageW - tablaW) / 2

	// ── Cabecera ──────────────────────────────────────────────────────────────
	pdf.SetFont("DejaVu", "B", fszTituloI)
	pdf.SetTextColor(0, 0, 0)
	pdf.CellFormat(0, 5.5, "ESTADÍSTICAS DE ESTABLECIMIENTOS DE HOSPEDAJE TURÍSTICO", "", 1, "C", false, 0, "")

	pdf.SetFont("DejaVu", "B", fszEstabI)
	pdf.CellFormat(0, 6.5, r.NombreEstablecimiento, "", 1, "C", false, 0, "")

	pdf.SetFont("DejaVu", "", fszMetaI)
	pdf.SetTextColor(80, 80, 80)
	pdf.SetX(startX)
	pdf.CellFormat(tablaW, 4.0, "Municipio: "+r.Municipio, "", 1, "L", false, 0, "")
	pdf.SetX(startX)
	pdf.CellFormat(tablaW, 4.0, "Mes / Año: "+r.MesAnio, "", 1, "L", false, 0, "")
	pdf.Ln(1.5)

	pdf.SetFont("DejaVu", "B", fszSecI)
	pdf.SetTextColor(0, 0, 0)
	pdf.SetX(startX)
	pdf.CellFormat(tablaW, 3.5,
		"NÚMERO DE LLEGADAS (I) y PERNOCTACIONES (P), SEGÚN PAÍS DE RESIDENCIA DEL VIAJERO",
		"", 1, "L", false, 0, "")
	pdf.Ln(1)

	// ── Cabecera de tabla ─────────────────────────────────────────────────────
	pdf.SetDrawColor(160, 160, 160)
	pdf.SetLineWidth(0.2)

	// Fila 1: nombres de países abreviados
	pdf.SetFillColor(139, 115, 85)
	pdf.SetTextColor(255, 255, 255)
	pdf.SetFont("DejaVu", "B", fszHdrI)

	pdf.SetX(startX)
	pdf.CellFormat(colDiasI, rowHdr1I, "", "1", 0, "C", true, 0, "")
	for _, pais := range r.Departamentos {
		pdf.CellFormat(colII+colPI, rowHdr1I, abreviarPais(pais), "1", 0, "C", true, 0, "")
	}
	pdf.CellFormat(colTotEI+colTotEP, rowHdr1I, "TOTAL", "1", 1, "C", true, 0, "")

	// Fila 2: DÍAS | I | P por país | I | P total
	pdf.SetFillColor(160, 135, 100)
	pdf.SetFont("DejaVu", "B", fszHdrI-0.5)

	pdf.SetX(startX)
	pdf.CellFormat(colDiasI, rowHdr2I, "DÍAS", "1", 0, "C", true, 0, "")
	for range r.Departamentos {
		pdf.CellFormat(colII, rowHdr2I, "I", "1", 0, "C", true, 0, "")
		pdf.CellFormat(colPI, rowHdr2I, "P", "1", 0, "C", true, 0, "")
	}
	pdf.CellFormat(colTotEI, rowHdr2I, "I", "1", 0, "C", true, 0, "")
	pdf.CellFormat(colTotEP, rowHdr2I, "P", "1", 1, "C", true, 0, "")

	// ── Filas de datos ────────────────────────────────────────────────────────
	pdf.SetFont("DejaVu", "", fszDatoI)
	pdf.SetLineWidth(0.15)

	// Calcular TOTAL EXTRANJEROS por fila (excluye BOLIVIA)
	for i, fila := range r.Filas {
		if i%2 == 0 {
			pdf.SetFillColor(255, 255, 255)
		} else {
			pdf.SetFillColor(245, 245, 220)
		}
		pdf.SetTextColor(0, 0, 0)

		var totExtL, totExtP int
		for _, pais := range r.Departamentos {
			if pais != "BOLIVIA" {
				c := fila.PorDepto[pais]
				totExtL += c.Llegadas
				totExtP += c.Pernoctaciones
			}
		}

		pdf.SetX(startX)
		pdf.CellFormat(colDiasI, rowDataI, fmt.Sprintf("%d", fila.Dia), "1", 0, "C", true, 0, "")
		for _, pais := range r.Departamentos {
			c := fila.PorDepto[pais]
			pdf.CellFormat(colII, rowDataI, fmtVal(c.Llegadas), "1", 0, "C", true, 0, "")
			pdf.CellFormat(colPI, rowDataI, fmtVal(c.Pernoctaciones), "1", 0, "C", true, 0, "")
		}
		pdf.CellFormat(colTotEI, rowDataI, fmtVal(totExtL), "1", 0, "C", true, 0, "")
		pdf.CellFormat(colTotEP, rowDataI, fmtVal(totExtP), "1", 1, "C", true, 0, "")
	}

	// ── Fila TOTAL ────────────────────────────────────────────────────────────
	pdf.SetFillColor(216, 191, 216)
	pdf.SetFont("DejaVu", "B", fszDatoI)
	pdf.SetTextColor(0, 0, 0)

	var grandTotExtL, grandTotExtP int
	for _, pais := range r.Departamentos {
		if pais != "BOLIVIA" {
			t := r.TotalesPorDepto[pais]
			grandTotExtL += t.Llegadas
			grandTotExtP += t.Pernoctaciones
		}
	}

	pdf.SetX(startX)
	pdf.CellFormat(colDiasI, rowTotI, "TOTAL", "1", 0, "C", true, 0, "")
	for _, pais := range r.Departamentos {
		t := r.TotalesPorDepto[pais]
		pdf.CellFormat(colII, rowTotI, fmtVal(t.Llegadas), "1", 0, "C", true, 0, "")
		pdf.CellFormat(colPI, rowTotI, fmtVal(t.Pernoctaciones), "1", 0, "C", true, 0, "")
	}
	pdf.CellFormat(colTotEI, rowTotI, fmtVal(grandTotExtL), "1", 0, "C", true, 0, "")
	pdf.CellFormat(colTotEP, rowTotI, fmtVal(grandTotExtP), "1", 1, "C", true, 0, "")

	return pdf.Output(w)
}

// abreviarPais devuelve una abreviación de máx 8 chars para cabeceras estrechas.
func abreviarPais(nombre string) string {
	m := map[string]string{
		"BOLIVIA":        "BOL",
		"ARGENTINA":      "ARG",
		"BRASIL":         "BRA",
		"COLOMBIA":       "COL",
		"CHILE":          "CHL",
		"ECUADOR":        "ECU",
		"PARAGUAY":       "PRY",
		"PERÚ":           "PER",
		"URUGUAY":        "URY",
		"VENEZUELA":      "VEN",
		"MÉXICO":         "MEX",
		"CANADÁ":         "CAN",
		"ESTADOS UNIDOS": "EUA",
		"OTROS AMERICA":  "OT.AMER",
		"ALEMANIA":       "ALE",
		"ESPAÑA":         "ESP",
		"FRANCIA":        "FRA",
		"INGLATERRA":     "ING",
		"ITALIA":         "ITA",
		"SUIZA":          "SUI",
		"HOLANDA":        "HOL",
		"SUECIA":         "SUE",
		"OTROS EUROPA":   "OT.EUR",
		"JAPÓN":          "JPN",
		"ISRAEL":         "ISR",
		"OTROS ASIA":     "OT.ASIA",
		"AUSTRALIA":      "AUS",
		"OTROS OCEANÍA":  "OT.OC",
		"AFRICA":         "AFR",
	}
	if a, ok := m[nombre]; ok {
		return a
	}
	runes := []rune(nombre)
	if len(runes) > 7 {
		return string(runes[:7])
	}
	return nombre
}
