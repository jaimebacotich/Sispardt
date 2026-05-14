import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import type { ReporteParteDiario, ReporteFilaParteDiario } from "@/types/api";

Font.register({
  family: "Helvetica",
  fonts: [],
});

const COLS = [
  { label: "N°",             width: "4%",   key: "numero"          },
  { label: "Fecha Ing.",     width: "8%",   key: "fechaIngreso"    },
  { label: "Nombre",         width: "9%",   key: "nombre"          },
  { label: "Ap. Paterno",    width: "9%",   key: "apellidoPaterno" },
  { label: "Ap. Materno",    width: "9%",   key: "apellidoMaterno" },
  { label: "Tipo Doc.",      width: "7%",   key: "tipoDocumento"   },
  { label: "N° Documento",   width: "10%",  key: "nroDocumento"    },
  { label: "Fecha Nac.",     width: "8%",   key: "fechaNacimiento" },
  { label: "Nacionalidad",   width: "10%",  key: "nacionalidad"    },
  { label: "Procedencia",    width: "10%",  key: "procedencia"     },
  { label: "Nro. Pieza",     width: "8%",   key: "nroPieza"        },
  { label: "Fecha Sal.",     width: "8%",   key: "fechaSalida"     },
] as const;

const s = StyleSheet.create({
  page: {
    fontSize: 7,
    fontFamily: "Helvetica",
    paddingTop: 30,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  // Cabecera
  header: { textAlign: "center", marginBottom: 8 },
  titulo: { fontSize: 13, fontFamily: "Helvetica-Bold" },
  subtitulo: { fontSize: 9, marginTop: 2 },
  fecha: { fontSize: 8, marginTop: 6, textAlign: "left" },
  // Secciones
  seccion: { marginTop: 10 },
  seccionTitulo: { fontSize: 8, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  // Tabla
  tabla: { width: "100%" },
  fila: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#999" },
  filaCabecera: {
    flexDirection: "row",
    backgroundColor: "#f0f0f0",
    borderTopWidth: 0.5,
    borderBottomWidth: 0.5,
    borderColor: "#999",
  },
  celdaCabecera: {
    fontFamily: "Helvetica-Bold",
    padding: 2,
    fontSize: 6.5,
    borderRightWidth: 0.5,
    borderRightColor: "#ccc",
  },
  celda: {
    padding: 2,
    fontSize: 6.5,
    borderRightWidth: 0.5,
    borderRightColor: "#ccc",
  },
  sinDatos: { fontSize: 7, color: "#666", padding: 4 },
  // Pie de página
  footer: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 0.5,
    borderTopColor: "#bbb",
    paddingTop: 4,
    fontSize: 6.5,
    color: "#555",
  },
});

function TablaFilas({ filas }: { filas: ReporteFilaParteDiario[] }) {
  if (filas.length === 0) {
    return <Text style={s.sinDatos}>Sin registros para esta fecha.</Text>;
  }
  return (
    <View style={s.tabla}>
      {/* Cabecera */}
      <View style={s.filaCabecera}>
        {COLS.map((col) => (
          <Text key={col.key} style={[s.celdaCabecera, { width: col.width }]}>
            {col.label}
          </Text>
        ))}
      </View>
      {/* Filas */}
      {filas.map((fila, i) => (
        <View key={i} style={[s.fila, i % 2 === 1 ? { backgroundColor: "#fafafa" } : {}]}>
          {COLS.map((col) => (
            <Text key={col.key} style={[s.celda, { width: col.width }]}>
              {String(fila[col.key] ?? "")}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

interface Props {
  data: ReporteParteDiario;
  nombreEstablecimiento: string;
}

export function ParteDiarioPDF({ data, nombreEstablecimiento }: Props) {
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={s.page}>
        {/* Cabecera */}
        <View style={s.header}>
          <Text style={s.titulo}>{nombreEstablecimiento}</Text>
          <Text style={s.subtitulo}>Reporte de Parte Diario</Text>
        </View>
        <Text style={s.fecha}>Fecha: {data.fecha}</Text>

        {/* Ingresos */}
        <View style={s.seccion}>
          <Text style={s.seccionTitulo}>INGRESOS:</Text>
          <TablaFilas filas={data.ingresos} />
        </View>

        {/* Salidas */}
        <View style={s.seccion}>
          <Text style={s.seccionTitulo}>SALIDAS:</Text>
          <TablaFilas filas={data.salidas} />
        </View>

        {/* Pie de página fijo en todas las páginas */}
        <View style={s.footer} fixed>
          <Text>Sistema de Partes Diarios Tarija - SISPARDT</Text>
          <Text render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
