"use client";

import { useState, useEffect } from "react";
import {
  Search,
  UserPlus,
  Pencil,
  PowerOff,
  RotateCcw,
  Users,
  Loader2,
  ShieldCheck,
  Copy,
  Check,
  Eye,
  EyeOff,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ConfirmModal } from "@/components/shared";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PersonalSheet } from "./personal-sheet";
import { establecimientosApi } from "@/lib/api/establecimientos";
import { useSession } from "next-auth/react";
import type { Personal, TipoPersonal } from "@/types/api";

// ── Componente principal ──────────────────────────────────────────────────────

interface PersonalViewProps {
  establecimientoId: string;
}

export function PersonalView({ establecimientoId }: PersonalViewProps) {
  const { data: session } = useSession();
  const token = (session as unknown as { accessToken?: string })?.accessToken;

  const [items, setItems] = useState<Personal[]>([]);
  const [tiposPersonal, setTiposPersonal] = useState<TipoPersonal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [busqueda, setBusqueda] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [filtroEstado, setFiltroEstado] = useState("activos");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Personal | null>(null);
  const [confirmItem, setConfirmItem] = useState<Personal | null>(null);
  const [credenciales, setCredenciales] = useState<{ username: string; password: string } | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [mostrarPass, setMostrarPass] = useState(false);

  // ── Fetch inicial ───────────────────────────────────────────────────────────

  const loadData = async () => {
    if (!token) return;
    try {
      setIsLoading(true);
      const [tiposRes, personalRes] = await Promise.all([
        establecimientosApi.listTiposPersonal(token),
        establecimientosApi.listPersonal(token, establecimientoId),
      ]);
      setTiposPersonal(tiposRes || []);
      setItems(personalRes || []);
    } catch (error) {
      toast.error("Error al cargar los datos del personal");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, establecimientoId]);

  // ── Helpers ─────────────────────────────────────────────────────────────────

  function getTipoLabel(tipoId: string) {
    return tiposPersonal.find((t) => t.id.toString() === tipoId)?.nombre ?? tipoId;
  }

  // ── Filtrado ────────────────────────────────────────────────────────────────

  const filtered = items.filter((p) => {
    const q = busqueda.toLowerCase();
    const matchBusqueda =
      !busqueda ||
      p.nombreCompleto.toLowerCase().includes(q) ||
      p.nombres.toLowerCase().includes(q) ||
      p.apellidos.toLowerCase().includes(q) ||
      (p.documentoIdentidad ?? "").includes(busqueda);
    const matchTipo = filtroTipo === "todos" || p.tipoPersonalId === filtroTipo;
    const matchEstado =
      filtroEstado === "todos"
        ? true
        : filtroEstado === "activos"
        ? p.activo
        : !p.activo;
    return matchBusqueda && matchTipo && matchEstado;
  });

  const totalActivos = items.filter((p) => p.activo).length;
  const totalInactivos = items.filter((p) => !p.activo).length;

  // ── Acciones ────────────────────────────────────────────────────────────────

  function openAdd() {
    setEditingItem(null);
    setSheetOpen(true);
  }

  function openEdit(item: Personal) {
    setEditingItem(item);
    setSheetOpen(true);
  }

  const handleSave = async (data: import("@/types/api").PersonalCreate | import("@/types/api").PersonalUpdate) => {
    if (!token) return;
    try {
      if (editingItem) {
        const res = await establecimientosApi.updatePersonal(
          token,
          establecimientoId,
          editingItem.id,
          data
        );
        setSheetOpen(false);
        await loadData();
        if (res?.password_temporal && res?.username) {
          setMostrarPass(false);
          setCopiado(false);
          setCredenciales({ username: res.username, password: res.password_temporal });
        } else {
          const msg = data.usuarioSistema && !editingItem.keycloakUserId
            ? "Integrante actualizado y usuario de sistema creado"
            : "Datos del integrante actualizados";
          toast.success(msg);
        }
      } else {
        const res = await establecimientosApi.createPersonal(token, establecimientoId, data);
        setSheetOpen(false);
        await loadData();
        if (res?.password_temporal && res?.username) {
          setMostrarPass(false);
          setCopiado(false);
          setCredenciales({ username: res.username, password: res.password_temporal });
        } else {
          toast.success("Integrante agregado al personal");
        }
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Error al guardar los datos del personal";
      toast.error(msg);
      console.error(error);
    }
  };

  async function copiarCredenciales() {
    if (!credenciales) return;
    const texto = `Usuario: ${credenciales.username}\nContraseña: ${credenciales.password}`;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(texto);
      } else {
        const ta = document.createElement("textarea");
        ta.value = texto;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      // ignorar error de clipboard
    }
  }

  async function handleToggleActivo() {
    if (!confirmItem || !token) return;
    const nextActivo = !confirmItem.activo;
    try {
      await establecimientosApi.togglePersonalActivo(
        token,
        establecimientoId,
        confirmItem.id,
        nextActivo
      );
      toast.success(nextActivo ? "Integrante reactivado" : "Integrante desactivado");
      setConfirmItem(null);
      await loadData();
    } catch (error) {
      toast.error("Error al cambiar estado del personal");
      console.error(error);
    }
  }

  const existingCI = items
    .filter((p) => !!p.documentoIdentidad)
    .map((p) => p.documentoIdentidad as string);

  // ── Render ──────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="animate-spin text-muted-foreground" size={24} />
      </div>
    );
  }

  return (
    <>
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {/* ── Barra de filtros ── */}
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-border">
          {/* Búsqueda */}
          <div className="relative flex-1 min-w-[180px]">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
            />
            <Input
              placeholder="Buscar por nombre o CI..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>

          {/* Filtro tipo */}
          <Select
            value={filtroTipo}
            onValueChange={(v) => setFiltroTipo(v ?? "todos")}
          >
            <SelectTrigger className="h-8 w-48 text-sm">
              <SelectValue
                placeholder="Todos los tipos"
                label={filtroTipo === "todos" ? "Todos los tipos" : getTipoLabel(filtroTipo)}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los tipos</SelectItem>
              {tiposPersonal.map((t) => (
                <SelectItem key={t.id.toString()} value={t.id.toString()}>
                  {t.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Filtro estado */}
          <Select
            value={filtroEstado}
            onValueChange={(v) => setFiltroEstado(v ?? "activos")}
          >
            <SelectTrigger className="h-8 w-36 text-sm">
              <SelectValue label={{ activos: "Solo activos", inactivos: "Solo inactivos", todos: "Todos" }[filtroEstado]} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="activos">Solo activos</SelectItem>
              <SelectItem value="inactivos">Solo inactivos</SelectItem>
              <SelectItem value="todos">Todos</SelectItem>
            </SelectContent>
          </Select>

          {/* Contador + botón agregar */}
          <div className="ml-auto flex items-center gap-3">
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {totalActivos} activo{totalActivos !== 1 ? "s" : ""}
              {totalInactivos > 0 &&
                ` · ${totalInactivos} inactivo${totalInactivos !== 1 ? "s" : ""}`}
            </span>
            <button
              type="button"
              onClick={openAdd}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors whitespace-nowrap"
            >
              <UserPlus size={14} />
              Agregar
            </button>
          </div>
        </div>

        {/* ── Tabla ── */}
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 border-b border-border">
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Tipo
              </th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Nombre completo
              </th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                CI
              </th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Teléfono
              </th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Estado
              </th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Sistema
              </th>
              <th className="px-4 py-2.5 w-24" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-14 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Users size={36} className="opacity-20" />
                    <p className="text-sm">
                      {items.length === 0
                        ? 'No hay personal registrado. Haz clic en "Agregar" para comenzar.'
                        : "No hay resultados para los filtros aplicados."}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((p) => (
                <tr
                  key={p.id}
                  className={cn(
                    "hover:bg-muted/30 transition-colors",
                    !p.activo && "opacity-60"
                  )}
                >
                  {/* Tipo */}
                  <td className="px-4 py-2.5">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                      {getTipoLabel(p.tipoPersonalId)}
                    </span>
                  </td>

                  {/* Nombre */}
                  <td className="px-4 py-2.5 font-medium text-foreground">
                    {p.nombreCompleto}
                  </td>

                  {/* CI */}
                  <td className="px-4 py-2.5 font-mono text-foreground/80 text-xs">
                    {p.documentoIdentidad ?? (
                      <span className="text-muted-foreground/40 not-italic font-sans">—</span>
                    )}
                  </td>

                  {/* Teléfono */}
                  <td className="px-4 py-2.5 text-foreground/80">
                    {p.telefono ?? (
                      <span className="text-muted-foreground/40">—</span>
                    )}
                  </td>

                  {/* Estado */}
                  <td className="px-4 py-2.5">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium",
                        p.activo
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      <span
                        className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          p.activo ? "bg-emerald-500" : "bg-muted-foreground/50"
                        )}
                      />
                      {p.activo ? "Activo" : "Inactivo"}
                    </span>
                  </td>

                  {/* Usuario sistema */}
                  <td className="px-4 py-2.5">
                    {p.usuarioSistema && (
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
                          p.keycloakUserId
                            ? "bg-primary/10 text-primary"
                            : "bg-amber-100 text-amber-700"
                        )}
                        title={p.keycloakUserId ? `KC: ${p.keycloakUserId}` : "Usuario pendiente de sincronizar"}
                      >
                        <ShieldCheck size={11} />
                        {p.keycloakUserId ? "Activo" : "Pendiente"}
                      </span>
                    )}
                  </td>

                  {/* Acciones */}
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(p)}
                        className="p-1.5 rounded bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 transition-colors"
                        title="Editar"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmItem(p)}
                        className={cn(
                          "p-1.5 rounded transition-colors",
                          p.activo
                            ? "bg-amber-500/10 text-amber-500 hover:bg-amber-500/20"
                            : "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"
                        )}
                        title={p.activo ? "Desactivar" : "Reactivar"}
                      >
                        {p.activo ? <PowerOff size={13} /> : <RotateCcw size={13} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Sheet agregar / editar */}
      <PersonalSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onSave={handleSave}
        item={editingItem}
        existingCI={existingCI}
        tiposPersonal={tiposPersonal}
      />

      {/* Dialog credenciales recepcionista */}
      <Dialog
        open={!!credenciales}
        onOpenChange={(v) => { if (!v) return; }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <ShieldCheck size={20} />
              Usuario de sistema creado
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Entrega estas credenciales al nuevo usuario.{" "}
              <strong className="text-destructive">
                La contraseña solo se muestra en este momento.
              </strong>{" "}
              El Sistema le pedirá cambiarla en el primer inicio de sesión.
            </p>

            <div className="rounded-lg border bg-muted/40 p-4 space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground font-medium">Usuario</span>
                <span className="font-mono font-semibold">{credenciales?.username}</span>
              </div>
              <div className="flex justify-between items-center text-sm gap-2">
                <span className="text-muted-foreground font-medium shrink-0">Contraseña temporal</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-semibold tracking-wider">
                    {mostrarPass
                      ? credenciales?.password
                      : "•".repeat(credenciales?.password.length ?? 0)}
                  </span>
                  <button
                    onClick={() => setMostrarPass((v) => !v)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    type="button"
                  >
                    {mostrarPass ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
            </div>

            <Button
              onClick={copiarCredenciales}
              variant="outline"
              className={`w-full gap-2 transition-colors ${copiado ? "border-green-500 text-green-700 bg-green-50 hover:bg-green-50" : ""}`}
            >
              {copiado ? (
                <>
                  <Check size={15} className="text-green-600" />
                  ¡Copiado! Usuario y contraseña en portapapeles
                </>
              ) : (
                <>
                  <Copy size={15} />
                  Copiar usuario y contraseña
                </>
              )}
            </Button>
          </div>

          <DialogFooter>
            <Button onClick={() => setCredenciales(null)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmación toggle activo */}
      <ConfirmModal
        open={!!confirmItem}
        onClose={() => setConfirmItem(null)}
        onConfirm={handleToggleActivo}
        title={
          confirmItem?.activo ? "Desactivar integrante" : "Reactivar integrante"
        }
        description={
          confirmItem?.activo
            ? `¿Confirmas desactivar a "${confirmItem.nombreCompleto}"? Podrás reactivarlo en cualquier momento.`
            : `¿Confirmas reactivar a "${confirmItem?.nombreCompleto}"?`
        }
        confirmLabel={confirmItem?.activo ? "Desactivar" : "Reactivar"}
        variant={confirmItem?.activo ? "destructive" : "default"}
      />
    </>
  );
}
