package pdf

import (
	"fmt"
	"io"

	"github.com/go-pdf/fpdf"
	"sispardt/movimientos/internal/domain"
)

// A4 portrait (210×297mm), márgenes 6mm → ancho útil 198mm.
//
// Columnas:
//   N°(6) + CLASIF(15) + NOMBRE(38) + CATEG(16) +
//   9 deptos×(I6+P5.5)=103.5 + TOTAL_NAC(I8+P7)=15
//   Total = 6+15+38+16+103.5+15 = 193.5mm ✓
const (
	colMN    = 6.0   // N°
	colMClas = 15.0  // Clasificación
	colMNom  = 38.0  // Nombre
	colMCat  = 16.0  // Categoría
	colMI    = 6.0   // I por departamento
	colMP    = 5.5   // P por departamento
	colMTI   = 8.0   // TOTAL I
	colMTP   = 7.0   // TOTAL P

	rowMHdr1 = 5.0   // fila cabecera 1 (nombre depto)
	rowMHdr2 = 4.0   // fila cabecera 2 (I / P)
	rowMData = 4.2   // fila datos
	rowMTot  = 5.0   // fila TOTAL

	fszMTitulo  = 8.5
	fszMEstab   = 11.0
	fszMMeta    = 7.0
	fszMSec     = 6.5
	fszMHdr     = 5.0
	fszMHdrSub  = 4.5
	fszMDato    = 5.0

	marginMun = 6.0
)

// abreviarDepto6 abrevia el nombre del departamento para la cabecera estrecha.
func abreviarDepto6(d string) string {
	m := map[string]string{
		"Chuquisaca": "CHQSA",
		"La Paz":     "LA PAZ",
		"Cochabamba": "CBBA",
		"Oruro":      "ORU",
		"Potosí":     "PTOS",
		"Tarija":     "TARIJA",
		"Santa Cruz": "S.CRUZ",
		"Beni":       "BENI",
		"Pando":      "PANDO",
	}
	if a, ok := m[d]; ok {
		return a
	}
	return d
}

// anchoTablaM calcula el ancho total de la tabla del municipio.
func anchoTablaM(nDeptos int) float64 {
	return colMN + colMClas + colMNom + colMCat +
		float64(nDeptos)*(colMI+colMP) +
		colMTI + colMTP
}

func GenerarReporteMunicipioNacional(w io.Writer, r *domain.ReporteMunicipioNacional) error {
	pdf := fpdf.NewCustom(&fpdf.InitType{
		OrientationStr: "P",    // portrait
		UnitStr:        "mm",
		SizeStr:        "A4",
	})
	cargarFuentes(pdf)
	pdf.SetMargins(marginMun, marginMun, marginMun)
	pdf.SetAutoPageBreak(true, 12)
	pdf.AliasNbPages("{nb}")

	pdf.SetFooterFunc(func() {
		pageW, _ := pdf.GetPageSize()
		pdf.SetY(-10)
		pdf.SetFont("DejaVu", "I", 6.0)
		pdf.SetTextColor(80, 80, 80)
		pdf.CellFormat(pageW-marginMun*2, 4,
			"Sistema de Partes Diarios Tarija - SISPARDT", "", 0, "L", false, 0, "")
		pdf.SetX(marginMun)
		pdf.CellFormat(pageW-marginMun*2, 4,
			fmt.Sprintf("Página %d de {nb}", pdf.PageNo()), "", 0, "R", false, 0, "")
	})

	pdf.AddPage()

	pageW, _ := pdf.GetPageSize()
	nDeptos := len(r.Departamentos)
	tablaW  := anchoTablaM(nDeptos)
	startX  := (pageW - tablaW) / 2

	// ── Cabecera ──────────────────────────────────────────────────────────────
	pdf.SetFont("DejaVu", "B", fszMTitulo)
	pdf.SetTextColor(0, 0, 0)
	pdf.CellFormat(0, 5.5, "ESTADÍSTICAS DE ESTABLECIMIENTOS DE HOSPEDAJE TURÍSTICO", "", 1, "C", false, 0, "")

	pdf.SetFont("DejaVu", "B", fszMEstab)
	pdf.CellFormat(0, 6.5, "Municipio: "+r.Municipio, "", 1, "C", false, 0, "")

	pdf.SetFont("DejaVu", "", fszMMeta)
	pdf.SetTextColor(80, 80, 80)
	pdf.SetX(startX)
	pdf.CellFormat(tablaW, 4.0, "Mes / Año: "+r.MesAnio, "", 1, "L", false, 0, "")
	pdf.Ln(1.5)

	pdf.SetFont("DejaVu", "B", fszMSec)
	pdf.SetTextColor(0, 0, 0)
	pdf.SetX(startX)
	pdf.CellFormat(tablaW, 3.5,
		"NÚMERO DE LLEGADAS (I) y PERNOCTACIONES (P), SEGÚN DEPARTAMENTO DE RESIDENCIA",
		"", 1, "L", false, 0, "")
	pdf.Ln(1)

	// ── Cabecera de tabla ─────────────────────────────────────────────────────
	pdf.SetDrawColor(160, 160, 160)
	pdf.SetLineWidth(0.2)

	// Fila 1: meta cols vacías + nombres departamento + TOTAL NACIONALES
	pdf.SetFillColor(139, 115, 85)
	pdf.SetTextColor(255, 255, 255)
	pdf.SetFont("DejaVu", "B", fszMHdr)

	metaW := colMN + colMClas + colMNom + colMCat

	pdf.SetX(startX)
	pdf.CellFormat(metaW, rowMHdr1, "", "1", 0, "C", true, 0, "")
	for _, dep := range r.Departamentos {
		pdf.CellFormat(colMI+colMP, rowMHdr1, abreviarDepto6(dep), "1", 0, "C", true, 0, "")
	}
	pdf.CellFormat(colMTI+colMTP, rowMHdr1, "TOTAL NAC.", "1", 1, "C", true, 0, "")

	// Fila 2: N° / CLASIF / NOMBRE / CATEG | I / P × 9 | I / P
	pdf.SetFillColor(160, 135, 100)
	pdf.SetFont("DejaVu", "B", fszMHdrSub)

	pdf.SetX(startX)
	pdf.CellFormat(colMN,   rowMHdr2, "N°",     "1", 0, "C", true, 0, "")
	pdf.CellFormat(colMClas, rowMHdr2, "CLASIF.", "1", 0, "C", true, 0, "")
	pdf.CellFormat(colMNom, rowMHdr2, "NOMBRE",  "1", 0, "C", true, 0, "")
	pdf.CellFormat(colMCat, rowMHdr2, "CATEG.",  "1", 0, "C", true, 0, "")
	for range r.Departamentos {
		pdf.CellFormat(colMI, rowMHdr2, "I", "1", 0, "C", true, 0, "")
		pdf.CellFormat(colMP, rowMHdr2, "P", "1", 0, "C", true, 0, "")
	}
	pdf.CellFormat(colMTI, rowMHdr2, "I", "1", 0, "C", true, 0, "")
	pdf.CellFormat(colMTP, rowMHdr2, "P", "1", 1, "C", true, 0, "")

	// ── Filas de datos ────────────────────────────────────────────────────────
	pdf.SetFont("DejaVu", "", fszMDato)
	pdf.SetLineWidth(0.15)

	for i, fila := range r.Filas {
		if i%2 == 0 {
			pdf.SetFillColor(255, 255, 255)
		} else {
			pdf.SetFillColor(245, 245, 220)
		}
		pdf.SetTextColor(0, 0, 0)

		pdf.SetX(startX)
		pdf.CellFormat(colMN,    rowMData, fmt.Sprintf("%d", fila.Numero), "1", 0, "C", true, 0, "")
		pdf.CellFormat(colMClas, rowMData, truncar(fila.Clasificacion, 9),   "1", 0, "L", true, 0, "")
		pdf.CellFormat(colMNom,  rowMData, truncar(fila.Nombre, 20),         "1", 0, "L", true, 0, "")
		pdf.CellFormat(colMCat,  rowMData, truncar(fila.Categoria, 10),      "1", 0, "L", true, 0, "")
		for _, dep := range r.Departamentos {
			c := fila.PorDepto[dep]
			pdf.CellFormat(colMI, rowMData, fmtVal(c.Llegadas),       "1", 0, "C", true, 0, "")
			pdf.CellFormat(colMP, rowMData, fmtVal(c.Pernoctaciones),  "1", 0, "C", true, 0, "")
		}
		pdf.CellFormat(colMTI, rowMData, fmtVal(fila.TotalLlegadas), "1", 0, "C", true, 0, "")
		pdf.CellFormat(colMTP, rowMData, fmtVal(fila.TotalPernoc),   "1", 1, "C", true, 0, "")
	}

	// ── Fila TOTAL ────────────────────────────────────────────────────────────
	pdf.SetFillColor(216, 191, 216)
	pdf.SetFont("DejaVu", "B", fszMDato)
	pdf.SetTextColor(0, 0, 0)

	pdf.SetX(startX)
	pdf.CellFormat(metaW, rowMTot, "TOTAL", "1", 0, "C", true, 0, "")
	for _, dep := range r.Departamentos {
		t := r.TotalGeneral.PorDepto[dep]
		pdf.CellFormat(colMI, rowMTot, fmtVal(t.Llegadas),      "1", 0, "C", true, 0, "")
		pdf.CellFormat(colMP, rowMTot, fmtVal(t.Pernoctaciones), "1", 0, "C", true, 0, "")
	}
	pdf.CellFormat(colMTI, rowMTot, fmtVal(r.TotalGeneral.TotalLlegadas), "1", 0, "C", true, 0, "")
	pdf.CellFormat(colMTP, rowMTot, fmtVal(r.TotalGeneral.TotalPernoc),   "1", 1, "C", true, 0, "")

	return pdf.Output(w)
}
