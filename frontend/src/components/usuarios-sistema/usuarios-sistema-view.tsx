"use client";

import { useState } from "react";
import { Plus, Search, Pencil, Trash2, ShieldCheck, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

import { useUsuariosSistema, useDeleteUsuarioSistema } from "@/hooks/useUsuariosSistema";
import { useAuth } from "@/hooks/useAuth";
import { CrearUsuarioDialog } from "./crear-usuario-dialog";
import { EditarUsuarioDialog } from "./editar-usuario-dialog";
import type { UsuarioSistema } from "@/types/api";

const ROL_LABELS: Record<string, string> = {
  rol_admin_general:           "Admin General",
  rol_responsable_registro:    "Resp. Registro",
  rol_tecnico_registro:        "Técnico Registro",
  rol_responsable_estadistica: "Resp. Estadística",
  rol_estadistica_externa:     "Estadística Externa",
  rol_migraciones:             "Migraciones",
  rol_recepcionista:           "Recepcionista",
};

function rolLabel(nombre: string) {
  return ROL_LABELS[nombre] ?? nombre;
}

function EstadoBadge({ estado }: { estado: string }) {
  if (estado === "ACTIVO") return <Badge className="bg-green-500/15 text-green-700 border-green-200">Activo</Badge>;
  if (estado === "INACTIVO") return <Badge variant="secondary">Inactivo</Badge>;
  return <Badge variant="destructive">Eliminado</Badge>;
}

export function UsuariosSistemaView() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [estado, setEstado] = useState<string>("");
  const [page, setPage] = useState(1);
  const [crearOpen, setCrearOpen] = useState(false);
  const [editando, setEditando] = useState<UsuarioSistema | null>(null);
  const [eliminandoId, setEliminandoId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<UsuarioSistema | null>(null);

  const { data, isLoading } = useUsuariosSistema({
    page,
    pageSize: 20,
    search: search || undefined,
    estado: estado || undefined,
  });

  const deleteMut = useDeleteUsuarioSistema();

  async function handleDeleteConfirmed() {
    if (!confirmDelete) return;
    setEliminandoId(confirmDelete.id);
    setConfirmDelete(null);
    await deleteMut.mutateAsync(confirmDelete.id).catch(() => null);
    setEliminandoId(null);
  }

  const usuarios = data?.data ?? [];
  const totalPages = data?.totalPages ?? 1;

  return (
    <div className="space-y-4">
      {/* Barra de herramientas */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Buscar por username, nombre..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-8"
          />
        </div>

        <Select
          value={estado || "todos"}
          onValueChange={(v) => { setEstado((v ?? "todos") === "todos" ? "" : (v ?? "")); setPage(1); }}
        >
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="ACTIVO">Activos</SelectItem>
            <SelectItem value="INACTIVO">Inactivos</SelectItem>
          </SelectContent>
        </Select>

        <Button onClick={() => setCrearOpen(true)} className="gap-2 shrink-0">
          <Plus size={16} />
          Nuevo usuario
        </Button>
      </div>

      {/* Tabla */}
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Username</TableHead>
              <TableHead>Nombre completo</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Creado</TableHead>
              <TableHead className="w-24 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                  Cargando...
                </TableCell>
              </TableRow>
            )}
            {!isLoading && usuarios.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                  No se encontraron usuarios
                </TableCell>
              </TableRow>
            )}
            {usuarios.map((u) => (
              <TableRow key={u.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <ShieldCheck size={13} className="text-primary" />
                    </div>
                    <span className="font-mono text-sm">{u.username}</span>
                  </div>
                </TableCell>
                <TableCell>{u.nombres} {u.apellidos}</TableCell>
                <TableCell>
                  {u.roles.length > 0 ? (
                    <Badge variant="outline" className="text-xs">
                      {rolLabel(u.roles[0])}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground text-xs">Sin rol</span>
                  )}
                </TableCell>
                <TableCell>
                  <EstadoBadge estado={u.estado} />
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {new Date(u.creado_at).toLocaleDateString("es-BO")}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      title="Editar"
                      onClick={() => setEditando(u)}
                    >
                      <Pencil size={13} />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      title="Eliminar"
                      disabled={u.id === user?.sub || eliminandoId === u.id}
                      onClick={() => setConfirmDelete(u)}
                    >
                      <Trash2 size={13} />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Página {page} de {totalPages} · {data?.total ?? 0} usuarios
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}

      {/* Dialogs */}
      <CrearUsuarioDialog open={crearOpen} onClose={() => setCrearOpen(false)} />
      <EditarUsuarioDialog usuario={editando} onClose={() => setEditando(null)} />

      {/* Confirmación de eliminación */}
      <Dialog open={!!confirmDelete} onOpenChange={(v) => { if (!v) setConfirmDelete(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <TriangleAlert size={18} />
              Eliminar usuario
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-2 text-sm text-muted-foreground">
            <p>
              ¿Estás seguro de eliminar al usuario{" "}
              <span className="font-mono font-semibold text-foreground">
                {confirmDelete?.username}
              </span>
              ?
            </p>
            <p>Su cuenta será desactivada en el Sistema y no podrá iniciar sesión.</p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirmed}
              disabled={deleteMut.isPending}
            >
              {deleteMut.isPending ? "Eliminando..." : "Sí, eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
