package pdf

import (
	"fmt"
	"io"

	"github.com/go-pdf/fpdf"
	"sispardt/movimientos/internal/domain"
)

// columna define el encabezado y ancho (en mm) de cada columna del reporte.
type columna struct {
	header string
	width  float64
}

var columnas = []columna{
	{"N°", 7},
	{"Fecha Ing.", 19},
	{"Nombre", 23},
	{"Ap. Paterno", 23},
	{"Ap. Materno", 21},
	{"Tipo Doc.", 15},
	{"N° Documento", 23},
	{"Fecha Nac.", 19},
	{"Nacionalidad", 26},
	{"Procedencia", 26},
	{"Nro. Pieza", 18},
	{"Fecha Sal.", 19},
}

const (
	marginH     = 10.0
	rowHeight   = 5.5
	headerH     = 6.0
	fontSize    = 7.0
	fontSizeSm  = 6.5
)

// GenerarParteDiario escribe un PDF A4 landscape en w con los datos del reporte.
func GenerarParteDiario(w io.Writer, reporte *domain.ReporteParteDiario, nombreEstablecimiento string) error {
	pdf := fpdf.NewCustom(&fpdf.InitType{
		OrientationStr: "L",
		UnitStr:        "mm",
		SizeStr:        "A4",
		FontDirStr:     "",
	})

	pdf.SetMargins(marginH, 12, marginH)
	pdf.SetAutoPageBreak(true, 15)
	pdf.AliasNbPages("{nb}")

	pdf.SetFooterFunc(func() {
		pdf.SetY(-12)
		pdf.SetFont("Helvetica", "I", 6.5)
		pdf.SetTextColor(100, 100, 100)
		pdf.CellFormat(0, 5, "Sistema de Partes Diarios Tarija - SISPARDT", "", 0, "L", false, 0, "")
		pageW, _ := pdf.GetPageSize()
		pdf.SetX(marginH)
		pdf.CellFormat(pageW-marginH*2, 5,
			fmt.Sprintf("Página %d de {nb}", pdf.PageNo()), "", 0, "R", false, 0, "")
	})

	pdf.AddPage()

	// ── Cabecera ───────────────────────────────────────────────────────────────
	pdf.SetFont("Helvetica", "B", 13)
	pdf.SetTextColor(0, 0, 0)
	pdf.CellFormat(0, 7, nombreEstablecimiento, "", 1, "C", false, 0, "")

	pdf.SetFont("Helvetica", "", 9)
	pdf.CellFormat(0, 5, "Reporte de Parte Diario", "", 1, "C", false, 0, "")
	pdf.Ln(3)

	pdf.SetFont("Helvetica", "", 8)
	pdf.CellFormat(0, 5, "Fecha: "+reporte.Fecha, "", 1, "L", false, 0, "")
	pdf.Ln(2)

	// ── Sección Ingresos ───────────────────────────────────────────────────────
	pdf.SetFont("Helvetica", "B", 8)
	pdf.CellFormat(0, 5, "INGRESOS:", "", 1, "L", false, 0, "")
	pdf.Ln(1)
	dibujarTabla(pdf, reporte.Ingresos)
	pdf.Ln(5)

	// ── Sección Salidas ────────────────────────────────────────────────────────
	pdf.SetFont("Helvetica", "B", 8)
	pdf.CellFormat(0, 5, "SALIDAS:", "", 1, "L", false, 0, "")
	pdf.Ln(1)
	dibujarTabla(pdf, reporte.Salidas)

	return pdf.Output(w)
}

func dibujarTabla(pdf *fpdf.Fpdf, filas []domain.ReporteFilaParteDiario) {
	// Cabecera de la tabla
	pdf.SetFont("Helvetica", "B", fontSizeSm)
	pdf.SetFillColor(224, 224, 224)
	pdf.SetTextColor(0, 0, 0)
	pdf.SetDrawColor(160, 160, 160)
	pdf.SetLineWidth(0.2)

	for _, col := range columnas {
		pdf.CellFormat(col.width, headerH, col.header, "1", 0, "C", true, 0, "")
	}
	pdf.Ln(-1)

	if len(filas) == 0 {
		pdf.SetFont("Helvetica", "I", fontSize)
		pdf.SetFillColor(255, 255, 255)
		anchoTotal := anchoTabla()
		pdf.CellFormat(anchoTotal, rowHeight, "Sin registros para esta fecha.", "1", 1, "C", false, 0, "")
		return
	}

	pdf.SetFont("Helvetica", "", fontSizeSm)
	for i, fila := range filas {
		// Filas alternas
		if i%2 == 0 {
			pdf.SetFillColor(255, 255, 255)
		} else {
			pdf.SetFillColor(248, 248, 248)
		}

		valores := []string{
			fmt.Sprintf("%d", fila.Numero),
			fila.FechaIngreso,
			truncar(fila.Nombre, 14),
			truncar(fila.ApellidoPaterno, 14),
			truncar(fila.ApellidoMaterno, 13),
			fila.TipoDocumento,
			fila.NroDocumento,
			fila.FechaNacimiento,
			truncar(fila.Nacionalidad, 15),
			truncar(fila.Procedencia, 15),
			fila.NroPieza,
			fila.FechaSalida,
		}

		for j, col := range columnas {
			align := "L"
			if j == 0 {
				align = "C"
			}
			pdf.CellFormat(col.width, rowHeight, valores[j], "1", 0, align, true, 0, "")
		}
		pdf.Ln(-1)
	}
}

func anchoTabla() float64 {
	total := 0.0
	for _, c := range columnas {
		total += c.width
	}
	return total
}

// truncar recorta el texto si excede el máximo de caracteres para evitar
// que desborde la celda de la tabla.
func truncar(s string, max int) string {
	runes := []rune(s)
	if len(runes) <= max {
		return s
	}
	return string(runes[:max-1]) + "…"
}
