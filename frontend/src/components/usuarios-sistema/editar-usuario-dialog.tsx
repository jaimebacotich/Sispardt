"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

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
import {
  useUpdateUsuarioSistema,
  useCambiarRolUsuario,
  useRolesSistema,
} from "@/hooks/useUsuariosSistema";
import type { UsuarioSistema } from "@/types/api";

const ROLES_PERMITIDOS = new Set(["rol_admin_general", "rol_responsable_registro", "rol_tecnico_registro"]);

const schema = z.object({
  nombres: z.string().min(2, "Requerido").max(150),
  apellidos: z.string().min(2, "Requerido").max(150),
  estado: z.enum(["ACTIVO", "INACTIVO"]),
  rol_nombre: z.string().min(1, "Selecciona un rol"),
});

type FormData = z.infer<typeof schema>;

interface Props {
  usuario: UsuarioSistema | null;
  onClose: () => void;
}

export function EditarUsuarioDialog({ usuario, onClose }: Props) {
  const { data: roles = [] } = useRolesSistema();
  const rolesDisponibles = roles.filter((r) => ROLES_PERMITIDOS.has(r.nombre));

  const updateMut = useUpdateUsuarioSistema(usuario?.id ?? "");
  const rolMut = useCambiarRolUsuario(usuario?.id ?? "");

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (usuario) {
      form.reset({
        nombres: usuario.nombres,
        apellidos: usuario.apellidos,
        estado: usuario.estado === "ACTIVO" ? "ACTIVO" : "INACTIVO",
        rol_nombre: usuario.roles[0] ?? "",
      });
    }
  }, [usuario, form]);

  async function onSubmit(data: FormData) {
    if (!usuario) return;

    const datosChanged =
      data.nombres !== usuario.nombres ||
      data.apellidos !== usuario.apellidos ||
      data.estado !== usuario.estado;

    const rolChanged = data.rol_nombre !== usuario.roles[0];

    const ops: Promise<unknown>[] = [];
    if (datosChanged) {
      ops.push(
        updateMut.mutateAsync({
          nombres: data.nombres,
          apellidos: data.apellidos,
          estado: data.estado,
        })
      );
    }
    if (rolChanged) {
      ops.push(rolMut.mutateAsync(data.rol_nombre));
    }

    if (ops.length === 0) {
      onClose();
      return;
    }

    const results = await Promise.allSettled(ops);
    const allOk = results.every((r) => r.status === "fulfilled");
    if (allOk) onClose();
  }

  const isPending = updateMut.isPending || rolMut.isPending;

  return (
    <Dialog open={!!usuario} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar usuario — {usuario?.username}</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-nombres">Nombres</Label>
              <Input id="edit-nombres" {...form.register("nombres")} />
              {form.formState.errors.nombres && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.nombres.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-apellidos">Apellidos</Label>
              <Input id="edit-apellidos" {...form.register("apellidos")} />
              {form.formState.errors.apellidos && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.apellidos.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Estado</Label>
            <Select
              onValueChange={(v) => form.setValue("estado", (v ?? "ACTIVO") as "ACTIVO" | "INACTIVO")}
              value={form.watch("estado")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVO">Activo</SelectItem>
                <SelectItem value="INACTIVO">Inactivo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Rol</Label>
            <Select
              onValueChange={(v) => form.setValue("rol_nombre", v ?? "")}
              value={form.watch("rol_nombre")}
            >
              <SelectTrigger>
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

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Guardando..." : "Guardar cambios"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
