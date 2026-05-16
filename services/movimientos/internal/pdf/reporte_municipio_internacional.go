package pdf

import (
	"fmt"
	"io"

	"github.com/go-pdf/fpdf"
	"sispardt/movimientos/internal/domain"
)

// Legal landscape (355.6×215.9mm), márgenes 4mm → ancho útil 347.6mm.
//
// Columnas:
//   N°(6) + CLASIF(14) + NOMBRE(34) + CATEG(14) = 68mm meta
//   29 pares × (I4.5+P4)=8.5mm = 246.5mm países
//   TOTAL_EXT(I7+P6) = 13mm
//   Total = 68 + 246.5 + 13 = 327.5mm ✓
const (
	colMILN    = 6.0    // N°
	colMILClas = 14.0   // Clasificación
	colMILNom  = 34.0   // Nombre
	colMILCat  = 14.0   // Categoría
	colMILI    = 4.5    // I por país
	colMILP    = 4.0    // P por país
	colMILTI   = 7.0    // TOTAL EXTRANJEROS I
	colMILTP   = 6.0    // TOTAL EXTRANJEROS P

	rowMILHdr1 = 5.0
	rowMILHdr2 = 4.0
	rowMILData = 4.0
	rowMILTot  = 4.8

	fszMILTit  = 8.5
	fszMILEst  = 11.0
	fszMILMeta = 6.5
	fszMILSec  = 6.0
	fszMILHdr  = 3.8
	fszMILDato = 4.2

	marginMunI = 4.0
)

func anchoTablaMI(nPaises int) float64 {
	return colMILN + colMILClas + colMILNom + colMILCat +
		float64(nPaises)*(colMILI+colMILP) +
		colMILTI + colMILTP
}

func GenerarReporteMunicipioInternacional(w io.Writer, r *domain.ReporteMunicipioNacional) error {
	pdf := fpdf.NewCustom(&fpdf.InitType{
		OrientationStr: "L",
		UnitStr:        "mm",
		SizeStr:        "Legal",
	})
	cargarFuentes(pdf)
	pdf.SetMargins(marginMunI, marginMunI, marginMunI)
	pdf.SetAutoPageBreak(true, 12)
	pdf.AliasNbPages("{nb}")

	pdf.SetFooterFunc(func() {
		pageW, _ := pdf.GetPageSize()
		pdf.SetY(-8)
		pdf.SetFont("DejaVu", "I", 5.5)
		pdf.SetTextColor(80, 80, 80)
		pdf.CellFormat(pageW-marginMunI*2, 4,
			"Sistema de Partes Diarios Tarija - SISPARDT", "", 0, "L", false, 0, "")
		pdf.SetX(marginMunI)
		pdf.CellFormat(pageW-marginMunI*2, 4,
			fmt.Sprintf("Página %d de {nb}", pdf.PageNo()), "", 0, "R", false, 0, "")
	})

	pdf.AddPage()

	pageW, _ := pdf.GetPageSize()
	nPaises := len(r.Departamentos)
	tablaW  := anchoTablaMI(nPaises)
	startX  := (pageW - tablaW) / 2

	// ── Cabecera ──────────────────────────────────────────────────────────────
	pdf.SetFont("DejaVu", "B", fszMILTit)
	pdf.SetTextColor(0, 0, 0)
	pdf.CellFormat(0, 5.0, "ESTADÍSTICAS DE ESTABLECIMIENTOS DE HOSPEDAJE TURÍSTICO", "", 1, "C", false, 0, "")

	pdf.SetFont("DejaVu", "B", fszMILEst)
	pdf.CellFormat(0, 6.0, "Municipio: "+r.Municipio, "", 1, "C", false, 0, "")

	pdf.SetFont("DejaVu", "", fszMILMeta)
	pdf.SetTextColor(80, 80, 80)
	pdf.SetX(startX)
	pdf.CellFormat(tablaW, 3.5, "Mes / Año: "+r.MesAnio, "", 1, "L", false, 0, "")
	pdf.Ln(1.5)

	pdf.SetFont("DejaVu", "B", fszMILSec)
	pdf.SetTextColor(0, 0, 0)
	pdf.SetX(startX)
	pdf.CellFormat(tablaW, 3.5,
		"NÚMERO DE LLEGADAS (I) y PERNOCTACIONES (P), SEGÚN PAÍS DE RESIDENCIA DEL VIAJERO",
		"", 1, "L", false, 0, "")
	pdf.Ln(1)

	// ── Cabecera de tabla ─────────────────────────────────────────────────────
	pdf.SetDrawColor(160, 160, 160)
	pdf.SetLineWidth(0.15)

	metaW := colMILN + colMILClas + colMILNom + colMILCat

	// Fila 1: meta vacía + países abreviados + TOTAL EXTRANJEROS
	pdf.SetFillColor(139, 115, 85)
	pdf.SetTextColor(255, 255, 255)
	pdf.SetFont("DejaVu", "B", fszMILHdr)

	pdf.SetX(startX)
	pdf.CellFormat(metaW, rowMILHdr1, "", "1", 0, "C", true, 0, "")
	for _, pais := range r.Departamentos {
		pdf.CellFormat(colMILI+colMILP, rowMILHdr1, abreviarPais(pais), "1", 0, "C", true, 0, "")
	}
	pdf.CellFormat(colMILTI+colMILTP, rowMILHdr1, "TOT.EXT", "1", 1, "C", true, 0, "")

	// Fila 2: etiquetas de sub-columna
	pdf.SetFillColor(160, 135, 100)
	pdf.SetFont("DejaVu", "B", fszMILHdr-0.3)

	pdf.SetX(startX)
	pdf.CellFormat(colMILN,    rowMILHdr2, "N°",     "1", 0, "C", true, 0, "")
	pdf.CellFormat(colMILClas, rowMILHdr2, "CLASIF.", "1", 0, "C", true, 0, "")
	pdf.CellFormat(colMILNom,  rowMILHdr2, "NOMBRE",  "1", 0, "C", true, 0, "")
	pdf.CellFormat(colMILCat,  rowMILHdr2, "CATEG.",  "1", 0, "C", true, 0, "")
	for range r.Departamentos {
		pdf.CellFormat(colMILI, rowMILHdr2, "I", "1", 0, "C", true, 0, "")
		pdf.CellFormat(colMILP, rowMILHdr2, "P", "1", 0, "C", true, 0, "")
	}
	pdf.CellFormat(colMILTI, rowMILHdr2, "I", "1", 0, "C", true, 0, "")
	pdf.CellFormat(colMILTP, rowMILHdr2, "P", "1", 1, "C", true, 0, "")

	// ── Filas de datos ────────────────────────────────────────────────────────
	pdf.SetFont("DejaVu", "", fszMILDato)
	pdf.SetLineWidth(0.12)

	for i, fila := range r.Filas {
		if i%2 == 0 {
			pdf.SetFillColor(255, 255, 255)
		} else {
			pdf.SetFillColor(245, 245, 220)
		}
		pdf.SetTextColor(0, 0, 0)

		// Calcular TOTAL EXTRANJEROS de la fila (excluye BOLIVIA)
		var totExtL, totExtP int
		for _, pais := range r.Departamentos {
			if pais != "BOLIVIA" {
				c := fila.PorDepto[pais]
				totExtL += c.Llegadas
				totExtP += c.Pernoctaciones
			}
		}

		pdf.SetX(startX)
		pdf.CellFormat(colMILN,    rowMILData, fmt.Sprintf("%d", fila.Numero), "1", 0, "C", true, 0, "")
		pdf.CellFormat(colMILClas, rowMILData, truncar(fila.Clasificacion, 9),   "1", 0, "L", true, 0, "")
		pdf.CellFormat(colMILNom,  rowMILData, truncar(fila.Nombre, 18),         "1", 0, "L", true, 0, "")
		pdf.CellFormat(colMILCat,  rowMILData, truncar(fila.Categoria, 10),      "1", 0, "L", true, 0, "")
		for _, pais := range r.Departamentos {
			c := fila.PorDepto[pais]
			pdf.CellFormat(colMILI, rowMILData, fmtVal(c.Llegadas),      "1", 0, "C", true, 0, "")
			pdf.CellFormat(colMILP, rowMILData, fmtVal(c.Pernoctaciones), "1", 0, "C", true, 0, "")
		}
		pdf.CellFormat(colMILTI, rowMILData, fmtVal(totExtL), "1", 0, "C", true, 0, "")
		pdf.CellFormat(colMILTP, rowMILData, fmtVal(totExtP), "1", 1, "C", true, 0, "")
	}

	// ── Fila TOTAL ────────────────────────────────────────────────────────────
	pdf.SetFillColor(216, 191, 216)
	pdf.SetFont("DejaVu", "B", fszMILDato)
	pdf.SetTextColor(0, 0, 0)

	var grandExtL, grandExtP int
	for _, pais := range r.Departamentos {
		if pais != "BOLIVIA" {
			t := r.TotalGeneral.PorDepto[pais]
			grandExtL += t.Llegadas
			grandExtP += t.Pernoctaciones
		}
	}

	pdf.SetX(startX)
	pdf.CellFormat(metaW, rowMILTot, "TOTALES", "1", 0, "C", true, 0, "")
	for _, pais := range r.Departamentos {
		t := r.TotalGeneral.PorDepto[pais]
		pdf.CellFormat(colMILI, rowMILTot, fmtVal(t.Llegadas),      "1", 0, "C", true, 0, "")
		pdf.CellFormat(colMILP, rowMILTot, fmtVal(t.Pernoctaciones), "1", 0, "C", true, 0, "")
	}
	pdf.CellFormat(colMILTI, rowMILTot, fmtVal(grandExtL), "1", 0, "C", true, 0, "")
	pdf.CellFormat(colMILTP, rowMILTot, fmtVal(grandExtP), "1", 1, "C", true, 0, "")

	return pdf.Output(w)
}
