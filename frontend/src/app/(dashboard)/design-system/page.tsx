"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import { toast } from "sonner";
import {
  FormField,
  FormSelect,
  NumberSpinner,
  DatePicker,
  ComboboxSearch,
  DataTable,
  StatCard,
  ActionBadge,
  StatusBadge,
  ConfirmModal,
  PageHeader,
} from "@/components/shared";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, BedDouble, BarChart3, ClipboardList } from "lucide-react";
import { useState } from "react";

const schema = z.object({
  nombre: z.string().min(2, "Mínimo 2 caracteres"),
  tipo: z.string().min(1, "Requerido"),
  piso: z.number().min(1).max(20),
  fecha: z.string().min(1, "Requerido"),
  pais: z.string().min(1, "Requerido"),
});
type FormValues = z.infer<typeof schema>;

const PAISES = [
  { value: "BO", label: "Bolivia" },
  { value: "AR", label: "Argentina" },
  { value: "BR", label: "Brasil" },
  { value: "CL", label: "Chile" },
  { value: "PE", label: "Perú" },
  { value: "CO", label: "Colombia" },
  { value: "PY", label: "Paraguay" },
  { value: "UY", label: "Uruguay" },
  { value: "VE", label: "Venezuela" },
  { value: "EC", label: "Ecuador" },
  { value: "ES", label: "España" },
  { value: "US", label: "Estados Unidos" },
  { value: "DE", label: "Alemania" },
  { value: "FR", label: "Francia" },
  { value: "IT", label: "Italia" },
];

const TABLA_MOCK = [
  { id: "1", nombre: "Hotel Real", categoria: "5 estrellas", municipio: "Tarija", habs: 45 },
  { id: "2", nombre: "Hostal Central", categoria: "2 estrellas", municipio: "Entre Ríos", habs: 12 },
  { id: "3", nombre: "Apart Hotel Sur", categoria: "3 estrellas", municipio: "Yacuiba", habs: 28 },
];

export default function DesignSystemPage() {
  const [showModal, setShowModal] = useState(false);
  const [sortKey, setSortKey] = useState<string | undefined>();
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { nombre: "", tipo: "", piso: 1, fecha: "", pais: "" },
  });

  function onSubmit(data: FormValues) {
    toast.success(`Formulario válido: ${JSON.stringify(data)}`);
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        title="Design System — Fase 4"
        subtitle="Verificación de componentes del sistema de diseño"
      />

      {/* LoadingSpinner */}
      <Card>
        <CardHeader><CardTitle className="text-sm">LoadingSpinner</CardTitle></CardHeader>
        <CardContent className="flex items-center gap-6">
          <div className="flex flex-col items-center gap-1">
            <LoadingSpinner size="sm" />
            <span className="text-xs text-muted-foreground">sm</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <LoadingSpinner size="md" />
            <span className="text-xs text-muted-foreground">md</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <LoadingSpinner size="lg" />
            <span className="text-xs text-muted-foreground">lg</span>
          </div>
        </CardContent>
      </Card>

      {/* Badges */}
      <Card>
        <CardHeader><CardTitle className="text-sm">ActionBadge + StatusBadge</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <ActionBadge action="INSERT" />
          <ActionBadge action="UPDATE" />
          <ActionBadge action="DELETE" />
          <StatusBadge status="libre" />
          <StatusBadge status="ocupada" />
          <StatusBadge status="mantenimiento" />
          <StatusBadge status="activo" />
          <StatusBadge status="anulado" />
        </CardContent>
      </Card>

      {/* StatCards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Huéspedes" value={142} trend={12.5} />
        <StatCard icon={BedDouble} label="Habitaciones libres" value={8} trend={-3.2} />
        <StatCard icon={ClipboardList} label="Partes del día" value={23} trend={0} />
        <StatCard icon={BarChart3} label="Ocupación %" value="78%" trend={5.1} />
      </div>

      {/* Formulario completo */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Componentes de Formulario (React Hook Form + Zod)</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* FormField con Input */}
            <FormField
              control={form.control}
              name="nombre"
              label="Nombre (FormField + Input)"
              required
              render={({ field, fieldState }) => (
                <Input
                  {...field}
                  placeholder="Ej: Hotel Central"
                  aria-invalid={fieldState.invalid}
                />
              )}
            />

            {/* FormSelect */}
            <FormSelect
              control={form.control}
              name="tipo"
              label="Tipo de habitación (FormSelect)"
              required
              placeholder="Seleccionar tipo..."
              options={[
                { value: "individual", label: "Individual" },
                { value: "doble", label: "Doble" },
                { value: "triple", label: "Triple" },
                { value: "suite", label: "Suite" },
              ]}
            />

            {/* NumberSpinner */}
            <NumberSpinner
              control={form.control}
              name="piso"
              label="Piso (NumberSpinner)"
              min={1}
              max={20}
              required
            />

            {/* DatePicker */}
            <DatePicker
              control={form.control}
              name="fecha"
              label="Fecha ingreso (DatePicker)"
              required
            />

            {/* ComboboxSearch — ocupa columna completa */}
            <div className="md:col-span-2">
              <ComboboxSearch
                control={form.control}
                name="pais"
                label="Nacionalidad (ComboboxSearch — buscar país)"
                placeholder="Seleccionar país..."
                searchPlaceholder="Buscar país..."
                options={PAISES}
                clearable
                required
              />
            </div>

            <div className="md:col-span-2 flex gap-3">
              <Button type="submit">Validar formulario</Button>
              <Button type="button" variant="outline" onClick={() => form.reset()}>
                Limpiar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* DataTable con buscador y sort */}
      <Card>
        <CardHeader><CardTitle className="text-sm">DataTable — buscador + ordenamiento por columna</CardTitle></CardHeader>
        <CardContent>
          <DataTable
            searchable
            searchPlaceholder="Buscar establecimiento..."
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={(key, dir) => { setSortKey(key); setSortDir(dir); }}
            columns={[
              { key: "nombre", header: "Nombre", sortable: true, cell: (r) => r.nombre },
              { key: "categoria", header: "Categoría", sortable: true, cell: (r) => r.categoria },
              { key: "municipio", header: "Municipio", sortable: true, cell: (r) => r.municipio },
              { key: "habs", header: "Hab.", sortable: true, cell: (r) => r.habs },
            ]}
            data={TABLA_MOCK}
            total={TABLA_MOCK.length}
            getRowKey={(r) => r.id}
          />
        </CardContent>
      </Card>

      {/* ConfirmModal */}
      <Card>
        <CardHeader><CardTitle className="text-sm">ConfirmModal</CardTitle></CardHeader>
        <CardContent className="flex gap-3">
          <Button variant="outline" onClick={() => setShowModal(true)}>
            Abrir modal de confirmación
          </Button>
          <ConfirmModal
            open={showModal}
            onClose={() => setShowModal(false)}
            onConfirm={() => { toast.success("Confirmado"); setShowModal(false); }}
            title="¿Confirmar acción?"
            description="Esta acción es destructiva y no se puede deshacer."
            variant="destructive"
            confirmLabel="Sí, eliminar"
          />
        </CardContent>
      </Card>
    </div>
  );
}
