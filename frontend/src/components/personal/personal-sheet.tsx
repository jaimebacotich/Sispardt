"use client";

import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { FormField } from "@/components/shared/form-field";
import { FormSelect } from "@/components/shared/form-select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Save, UserPlus, UserCog, ShieldCheck, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Personal, PersonalCreate, PersonalUpdate, TipoPersonal } from "@/types/api";

// ── Schema ────────────────────────────────────────────────────────────────────

const schema = z.object({
  nombres: z.string().min(2, "Ingresa al menos 2 caracteres"),
  apellidos: z.string().min(2, "Ingresa al menos 2 caracteres"),
  tipoPersonalId: z.string().min(1, "Selecciona el tipo de personal"),
  documentoIdentidad: z.string().optional(),
  telefono: z.string().optional(),
  usuarioSistema: z.boolean(),
  username: z.string().max(100).regex(/^[a-z0-9._-]*$/, "Solo letras minúsculas, números, puntos, guiones").optional(),
});

type FormData = z.infer<typeof schema>;

// ── Props ─────────────────────────────────────────────────────────────────────

interface PersonalSheetProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: PersonalCreate | PersonalUpdate) => Promise<void>;
  item?: Personal | null;
  existingCI: string[];
  tiposPersonal: TipoPersonal[];
  canCrearRecepcionista?: boolean; // false para tecnico_registro
}

// ── Componente ────────────────────────────────────────────────────────────────

export function PersonalSheet({
  open,
  onClose,
  onSave,
  item,
  existingCI,
  tiposPersonal,
  canCrearRecepcionista = true,
}: PersonalSheetProps) {
  const isEdit = !!item;
  const yaEsUsuarioSistema = !!item?.keycloakUserId;

  const {
    control,
    register,
    handleSubmit,
    reset,
    watch,
    setError,
    formState,
    formState: { isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      nombres: "",
      apellidos: "",
      tipoPersonalId: "",
      documentoIdentidad: "",
      telefono: "",
      usuarioSistema: false,
      username: "",
    },
  });

  const usuarioSistema = watch("usuarioSistema");
  const usernameValue = watch("username");
  const usernameRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (usuarioSistema && !yaEsUsuarioSistema) {
      setTimeout(() => {
        usernameRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }, 50);
    }
  }, [usuarioSistema, yaEsUsuarioSistema]);

  useEffect(() => {
    if (!open) return;
    reset(
      item
        ? {
            nombres: item.nombres,
            apellidos: item.apellidos,
            tipoPersonalId: item.tipoPersonalId.toString(),
            documentoIdentidad: item.documentoIdentidad ?? "",
            telefono: item.telefono ?? "",
            usuarioSistema: item.usuarioSistema,
            username: "",
          }
        : {
            nombres: "",
            apellidos: "",
            tipoPersonalId: "",
            documentoIdentidad: "",
            telefono: "",
            usuarioSistema: false,
            username: "",
          }
    );
  }, [open, item, reset]);

  function onSubmit(data: FormData) {
    const ci = data.documentoIdentidad?.trim() ?? "";
    const otherCIs = existingCI.filter((c) => c !== (item?.documentoIdentidad ?? ""));
    if (ci && otherCIs.includes(ci)) {
      setError("documentoIdentidad", {
        message: "Este CI ya está registrado en el establecimiento",
      });
      return;
    }
    if (data.usuarioSistema && !yaEsUsuarioSistema) {
      const usr = data.username?.trim() ?? "";
      if (!usr) {
        setError("username", { message: "El nombre de usuario es requerido" });
        return;
      }
      if (usr.length < 5) {
        setError("username", { message: "Mínimo 5 caracteres" });
        return;
      }
    }
    const safeData: PersonalCreate = {
      nombres: data.nombres.trim(),
      apellidos: data.apellidos.trim(),
      tipoPersonalId: Number(data.tipoPersonalId),
      documentoIdentidad: ci || undefined,
      telefono: data.telefono?.trim() || undefined,
      usuarioSistema: data.usuarioSistema,
      username: (data.usuarioSistema && !yaEsUsuarioSistema)
        ? data.username?.trim()
        : undefined,
    };
    onSave(safeData);
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="flex flex-col h-full">
        {/* Header */}
        <SheetHeader className="pb-4 flex-shrink-0">
          <SheetTitle className="flex items-center gap-2">
            {isEdit ? (
              <UserCog size={16} className="text-primary" />
            ) : (
              <UserPlus size={16} className="text-primary" />
            )}
            {isEdit ? "Editar integrante" : "Agregar integrante"}
          </SheetTitle>
          <SheetDescription>
            {isEdit
              ? "Modifica los datos del integrante del personal."
              : "Completa los datos:"}
          </SheetDescription>
        </SheetHeader>

        {/* Form */}
        <form
          id="personal-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex-1 min-h-0 overflow-y-auto px-4 pt-5 pb-10 space-y-5"
        >
          {/* Nombres */}
          <FormField
            control={control}
            name="nombres"
            label="Nombres"
            required
            render={({ field, fieldState }) => (
              <Input
                {...field}
                value={field.value as string}
                placeholder="Ej: Juan Carlos"
                aria-invalid={fieldState.invalid}
                className={fieldState.error ? "border-destructive" : ""}
              />
            )}
          />

          {/* Apellidos */}
          <FormField
            control={control}
            name="apellidos"
            label="Apellidos"
            required
            render={({ field, fieldState }) => (
              <Input
                {...field}
                value={field.value as string}
                placeholder="Ej: Pérez Rodríguez"
                aria-invalid={fieldState.invalid}
                className={fieldState.error ? "border-destructive" : ""}
              />
            )}
          />

          {/* Tipo */}
          <FormSelect
            control={control}
            name="tipoPersonalId"
            label="Tipo de personal"
            required
            placeholder="Seleccionar tipo..."
            options={tiposPersonal.map((t) => ({ value: t.id.toString(), label: t.nombre }))}
          />

          {/* CI */}
          <FormField
            control={control}
            name="documentoIdentidad"
            label="CI / Documento de identidad"
            description="Debe ser único dentro del establecimiento"
            render={({ field, fieldState }) => (
              <Input
                {...field}
                value={field.value as string}
                placeholder="Ej: 7654321"
                aria-invalid={fieldState.invalid}
                className={fieldState.error ? "border-destructive" : ""}
              />
            )}
          />

          {/* Teléfono */}
          <FormField
            control={control}
            name="telefono"
            label="Teléfono de contacto"
            render={({ field, fieldState }) => (
              <Input
                {...field}
                value={field.value as string}
                placeholder="Ej: +591 70012345"
                aria-invalid={fieldState.invalid}
                className={fieldState.error ? "border-destructive" : ""}
              />
            )}
          />

          {/* Usuario de sistema — solo visible para responsable_registro y admin_general */}
          {canCrearRecepcionista && (
          <div className="space-y-2">
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                {...(control.register("usuarioSistema"))}
                disabled={yaEsUsuarioSistema}
                className="mt-0.5 h-4 w-4 rounded border-border accent-primary cursor-pointer disabled:cursor-not-allowed"
              />
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                  <ShieldCheck size={14} className="text-primary" />
                  Usuario de sistema
                  {yaEsUsuarioSistema && (
                    <span className="text-xs font-normal text-muted-foreground">(ya creado)</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Crear acceso para ingresar al sistema como recepcionista.
                </p>
              </div>
            </label>

            {/* Campo username para nuevo usuario de sistema */}
            {usuarioSistema && !yaEsUsuarioSistema && (
              <div ref={usernameRef} className="ml-7 space-y-1.5">
                <label className="text-xs font-medium text-foreground flex items-center gap-1">
                  Nombre de usuario
                  <span className="text-destructive">*</span>
                </label>
                <Input
                  {...register("username")}
                  placeholder="ej: recep.juanperez"
                  autoComplete="off"
                  className={cn(
                    "h-8 text-sm font-mono",
                    formState.errors.username ? "border-destructive" : ""
                  )}
                />
                {formState.errors.username ? (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle size={11} />
                    {formState.errors.username.message}
                  </p>
                ) : usernameValue?.trim() ? (
                  <p className="text-xs text-muted-foreground">
                    Se creará el acceso{" "}
                    <span className="font-mono font-semibold text-foreground">
                      {usernameValue.trim()}
                    </span>
                    . La contraseña se generará automáticamente.
                  </p>
                ) : (
                  <p className="text-xs text-orange-500">
                    Solo letras minúsculas, números, puntos y guiones. Mínimo 5 caracteres.
                  </p>
                )}
              </div>
            )}

            {/* Badge usuario ya creado */}
            {yaEsUsuarioSistema && (
              <div className="ml-7 rounded-lg border border-emerald-300/50 bg-emerald-50/50 dark:bg-emerald-950/20 p-3 text-xs">
                <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                  <ShieldCheck size={12} />
                  <span>Cuenta activa en el IAM</span>
                </div>
                {item?.documentoIdentidad && (
                  <div className="mt-1 font-mono text-muted-foreground">
                    recep.{item.documentoIdentidad.toLowerCase()}
                  </div>
                )}
              </div>
            )}
          </div>
          )} {/* fin canCrearRecepcionista */}
        </form>

        {/* Footer */}
        <SheetFooter className="border-t border-border pt-4 flex-shrink-0">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" form="personal-form" disabled={isSubmitting}>
            <Save size={14} />
            {isSubmitting ? "Guardando..." : "Guardar"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
