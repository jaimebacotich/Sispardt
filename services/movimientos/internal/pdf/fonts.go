package pdf

import (
	_ "embed"

	"github.com/go-pdf/fpdf"
)

//go:embed DejaVuSansCondensed.ttf
var fontRegular []byte

//go:embed DejaVuSansCondensed-Bold.ttf
var fontBold []byte

//go:embed DejaVuSansCondensed-Oblique.ttf
var fontItalic []byte

// cargarFuentes registra la fuente DejaVu (UTF-8) en un pdf dado.
// Soporta estilos: "" (regular), "B" (bold), "I" (italic).
func cargarFuentes(pdf *fpdf.Fpdf) {
	pdf.AddUTF8FontFromBytes("DejaVu", "", fontRegular)
	pdf.AddUTF8FontFromBytes("DejaVu", "B", fontBold)
	pdf.AddUTF8FontFromBytes("DejaVu", "I", fontItalic)
}
