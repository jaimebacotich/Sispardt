package pdf

import (
	"fmt"
	"io"
	"strings"

	"github.com/go-pdf/fpdf"
	"sispardt/movimientos/internal/domain"
)

// InfoEstablecimiento agrupa los datos del hotel para el encabezado del PDF.
type InfoEstablecimiento struct {
	Nombre        string
	Clasificacion string
	Categoria     string
	Direccion     string
	Telefono      string
}

// Hoja Carta landscape: 279.4 × 215.9 mm → usamos 279 × 216
// Márgenes: 8mm c/lado → ancho útil 263mm | alto útil ≈ 196mm
//
// Distribución de columnas (total ≈ 255mm):
//  N°(6) FIng(18) Nombre(38) APat(32) AMat(29) Tipo(12) NDoc(22) FNac(17) Nac(25) Proc(24) Pieza(13) FSal(19)
const (
	marginPD = 8.0

	colN       = 6.0
	colFIng    = 18.0
	colNombre  = 38.0
	colAPat    = 32.0
	colAMat    = 29.0
	colTipo    = 12.0
	colNDoc    = 22.0
	colFNac    = 17.0
	colNac     = 25.0
	colProc    = 24.0
	colPieza   = 13.0
	colFSal    = 19.0

	rowHPD  = 6.0  // altura cabecera tabla
	rowDPD  = 5.5  // altura filas datos
	fszPD   = 7.0  // fuente datos
	fszHPD  = 6.5  // fuente cabecera tabla
)

type colDef struct {
	header string
	width  float64
	align  string
}

var columnasPartes = []colDef{
	{"N°",       colN,      "C"},
	{"F. Ing.",  colFIng,   "C"},
	{"Nombre",   colNombre, "L"},
	{"Ap. Pat.", colAPat,   "L"},
	{"Ap. Mat.", colAMat,   "L"},
	{"Tipo",     colTipo,   "C"},
	{"N° Doc.",  colNDoc,   "C"},
	{"F. Nac.",  colFNac,   "C"},
	{"Nacion.",  colNac,    "L"},
	{"Proced.",  colProc,   "L"},
	{"Pieza",    colPieza,  "C"},
	{"F. Sal.",  colFSal,   "C"},
}

func anchoTotalPartes() float64 {
	t := 0.0
	for _, c := range columnasPartes {
		t += c.width
	}
	return t
}

func GenerarParteDiario(w io.Writer, reporte *domain.ReporteParteDiario, info InfoEstablecimiento) error {
	pdf := fpdf.NewCustom(&fpdf.InitType{
		OrientationStr: "L",
		UnitStr:        "mm",
		SizeStr:        "Letter", // hoja carta 279×216mm
		FontDirStr:     "",
	})
	cargarFuentes(pdf)

	pdf.SetMargins(marginPD, 8, marginPD)
	pdf.SetAutoPageBreak(true, 12)
	pdf.AliasNbPages("{nb}")

	pdf.SetFooterFunc(func() {
		pageW, _ := pdf.GetPageSize()
		pdf.SetY(-10)
		pdf.SetFont("DejaVu", "I", 6.0)
		pdf.SetTextColor(100, 100, 100)
		pdf.CellFormat(pageW-marginPD*2, 4,
			"Sistema de Partes Diarios Tarija - SISPARDT", "", 0, "L", false, 0, "")
		pdf.SetX(marginPD)
		pdf.CellFormat(pageW-marginPD*2, 4,
			fmt.Sprintf("Página %d de {nb}", pdf.PageNo()), "", 0, "R", false, 0, "")
	})

	pdf.AddPage()

	// ── Nombre del establecimiento ────────────────────────────────────────────
	pdf.SetFont("DejaVu", "B", 15)
	pdf.SetTextColor(0, 0, 0)
	pdf.CellFormat(0, 8, info.Nombre, "", 1, "C", false, 0, "")

	pdf.SetFont("DejaVu", "", 8.5)
	pdf.CellFormat(0, 5, "Reporte de Parte Diario", "", 1, "C", false, 0, "")
	pdf.Ln(2)

	// ── Datos del establecimiento en una línea ────────────────────────────────
	pdf.SetFont("DejaVu", "", 7.0)
	pdf.SetTextColor(60, 60, 60)

	partes := []string{}
	if info.Clasificacion != "" {
		partes = append(partes, "Clasif.: "+info.Clasificacion)
	}
	if info.Categoria != "" {
		partes = append(partes, "Categ.: "+info.Categoria)
	}
	if info.Direccion != "" {
		partes = append(partes, "Dir.: "+info.Direccion)
	}
	if info.Telefono != "" {
		partes = append(partes, "Tel.: "+info.Telefono)
	}
	if len(partes) > 0 {
		pdf.CellFormat(0, 4.5, strings.Join(partes, "   |   "), "", 1, "L", false, 0, "")
	}

	// ── Fecha de reporte + Presentación + Condición ───────────────────────────
	pdf.SetFont("DejaVu", "", 7.5)
	pdf.SetTextColor(0, 0, 0)
	pdf.CellFormat(0, 4.5, "Fecha de reporte: "+reporte.Fecha, "", 1, "L", false, 0, "")

	// Fecha/hora de presentación y condición en la misma línea, izquierda, negro negrita
	pdf.SetFont("DejaVu", "B", 7.0)
	pdf.SetTextColor(0, 0, 0)
	pdf.CellFormat(0, 4.0,
		"Presentación: "+reporte.FechaHoraGeneracion+"   |   Condición: "+reporte.Condicion,
		"", 1, "L", false, 0, "")
	pdf.Ln(2)

	// ── Ingresos ───────────────────────────────────────────────────────────────
	pdf.SetFont("DejaVu", "B", 8)
	pdf.CellFormat(0, 5, "INGRESOS:", "", 1, "L", false, 0, "")
	pdf.Ln(1)
	dibujarTablaPartes(pdf, reporte.Ingresos)
	pdf.Ln(4)

	// ── Salidas ────────────────────────────────────────────────────────────────
	pdf.SetFont("DejaVu", "B", 8)
	pdf.CellFormat(0, 5, "SALIDAS:", "", 1, "L", false, 0, "")
	pdf.Ln(1)
	dibujarTablaPartes(pdf, reporte.Salidas)

	return pdf.Output(w)
}

func dibujarTablaPartes(pdf *fpdf.Fpdf, filas []domain.ReporteFilaParteDiario) {
	// ── Cabecera — mismo estilo que reportes consolidados ──────────────────────
	pdf.SetFont("DejaVu", "B", fszHPD)
	pdf.SetFillColor(139, 115, 85)   // marrón oliva
	pdf.SetTextColor(255, 255, 255)  // texto blanco
	pdf.SetDrawColor(160, 160, 160)
	pdf.SetLineWidth(0.2)

	for _, col := range columnasPartes {
		pdf.CellFormat(col.width, rowHPD, col.header, "1", 0, "C", true, 0, "")
	}
	pdf.Ln(-1)

	if len(filas) == 0 {
		pdf.SetFont("DejaVu", "I", fszPD)
		pdf.SetFillColor(245, 245, 220) // crema
		pdf.SetTextColor(100, 100, 100)
		pdf.CellFormat(anchoTotalPartes(), rowDPD, "Sin registros para esta fecha.", "1", 1, "C", true, 0, "")
		return
	}

	pdf.SetFont("DejaVu", "", fszPD)
	pdf.SetTextColor(0, 0, 0)
	for i, fila := range filas {
		if i%2 == 0 {
			pdf.SetFillColor(255, 255, 255)  // blanco
		} else {
			pdf.SetFillColor(245, 245, 220)  // crema
		}

		valores := []string{
			fmt.Sprintf("%d", fila.Numero),
			fila.FechaIngreso,
			truncar(fila.Nombre, 18),
			truncar(fila.ApellidoPaterno, 16),
			truncar(fila.ApellidoMaterno, 14),
			fila.TipoDocumento,
			fila.NroDocumento,
			fila.FechaNacimiento,
			truncar(fila.Nacionalidad, 13),
			truncar(fila.Procedencia, 12),
			fila.NroPieza,
			fila.FechaSalida,
		}

		for j, col := range columnasPartes {
			pdf.CellFormat(col.width, rowDPD, valores[j], "1", 0, col.align, true, 0, "")
		}
		pdf.Ln(-1)
	}
}

func truncar(s string, max int) string {
	runes := []rune(s)
	if len(runes) <= max {
		return s
	}
	return string(runes[:max-1]) + "."
}
