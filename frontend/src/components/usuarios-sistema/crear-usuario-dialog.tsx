"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Copy, Check, Eye, EyeOff, UserPlus } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateUsuarioSistema, useRolesSistema } from "@/hooks/useUsuariosSistema";
import type { UsuarioSistemaCreadoResponse } from "@/types/api";

// Roles habilitados para la gestión de usuarios del sistema
const ROLES_PERMITIDOS = new Set(["rol_admin_general", "rol_responsable_registro", "rol_tecnico_registro"]);

const schema = z.object({
  username: z
    .string()
    .min(5, "Mínimo 5 caracteres")
    .max(100)
    .regex(/^[a-z0-9._-]+$/, "Solo letras minúsculas, números, puntos, guiones"),
  nombres: z.string().min(2, "Requerido").max(150),
  apellidos: z.string().min(2, "Requerido").max(150),
  rol_nombre: z.string().min(1, "Selecciona un rol"),
});

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
}

export function CrearUsuarioDialog({ open, onClose }: Props) {
  const [resultado, setResultado] = useState<UsuarioSistemaCreadoResponse | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [mostrarPass, setMostrarPass] = useState(false);

  const { data: roles = [] } = useRolesSistema();
  const rolesDisponibles = roles.filter((r) => ROLES_PERMITIDOS.has(r.nombre));

  const crear = useCreateUsuarioSistema();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { username: "", nombres: "", apellidos: "", rol_nombre: "" },
  });

  async function onSubmit(data: FormData) {
    const res = await crear.mutateAsync(data).catch(() => null);
    if (res) setResultado(res);
  }

  function handleClose() {
    form.reset();
    setResultado(null);
    setCopiado(false);
    setMostrarPass(false);
    onClose();
  }

  async function copiarCredenciales() {
    if (!resultado) return;
    const texto = `Usuario: ${resultado.usuario.username}\nContraseña: ${resultado.password_temporal}`;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(texto);
      } else {
        // Fallback para contextos HTTP (desarrollo local)
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

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && !resultado) handleClose(); }}>
      <DialogContent className="sm:max-w-md">
        {resultado ? (
          // ── Vista de éxito con credenciales ──────────────────────────────
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-green-600">
                <UserPlus size={20} />
                Usuario creado exitosamente
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
                  <span className="font-mono font-semibold">
                    {resultado.usuario.username}
                  </span>
                </div>

                <div className="flex justify-between items-center text-sm gap-2">
                  <span className="text-muted-foreground font-medium shrink-0">
                    Contraseña temporal
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold tracking-wider">
                      {mostrarPass
                        ? resultado.password_temporal
                        : "•".repeat(resultado.password_temporal.length)}
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
              <Button onClick={handleClose}>Cerrar</Button>
            </DialogFooter>
          </>
        ) : (
          // ── Formulario de creación ────────────────────────────────────────
          <>
            <DialogHeader>
              <DialogTitle>Nuevo usuario del sistema</DialogTitle>
            </DialogHeader>

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  placeholder="ej: jperez"
                  autoComplete="off"
                  {...form.register("username")}
                />
                {form.formState.errors.username && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.username.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="nombres">Nombres</Label>
                  <Input
                    id="nombres"
                    placeholder="Juan"
                    {...form.register("nombres")}
                  />
                  {form.formState.errors.nombres && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.nombres.message}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="apellidos">Apellidos</Label>
                  <Input
                    id="apellidos"
                    placeholder="Pérez"
                    {...form.register("apellidos")}
                  />
                  {form.formState.errors.apellidos && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.apellidos.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="rol_nombre">Rol</Label>
                <Select
                  onValueChange={(v) => form.setValue("rol_nombre", v ?? "")}
                  value={form.watch("rol_nombre")}
                >
                  <SelectTrigger id="rol_nombre">
                    <SelectValue placeholder="Selecciona un rol...">
                      {(rolesDisponibles.find((r) => r.nombre === form.watch("rol_nombre"))?.descripcion
                        ?? form.watch("rol_nombre"))
                        || "Selecciona un rol..."}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {rolesDisponibles.map((r) => (
                      <SelectItem key={r.id} value={r.nombre}>
                        {r.descripcion ?? r.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.rol_nombre && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.rol_nombre.message}
                  </p>
                )}
              </div>

              <p className="text-xs text-orange-500">
                La contraseña inicial es generada automáticamente por el sistema y se mostrará
                una única vez al confirmar.
              </p>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={handleClose}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={crear.isPending}>
                  {crear.isPending ? "Creando..." : "Crear usuario"}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
