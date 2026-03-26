"use client";

import { useEffect } from "react";
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
import { Save, UserPlus, UserCog, ShieldCheck } from "lucide-react";
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
}

// ── Componente ────────────────────────────────────────────────────────────────

export function PersonalSheet({
  open,
  onClose,
  onSave,
  item,
  existingCI,
  tiposPersonal,
}: PersonalSheetProps) {
  const isEdit = !!item;
  const yaEsUsuarioSistema = !!item?.keycloakUserId;

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setError,
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
    },
  });

  const usuarioSistema = watch("usuarioSistema");
  const documentoIdentidad = watch("documentoIdentidad");

  // Username generado (solo informativo)
  const usernamePreview = documentoIdentidad?.trim()
    ? `recep.${documentoIdentidad.trim().toLowerCase()}`
    : null;

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
          }
        : {
            nombres: "",
            apellidos: "",
            tipoPersonalId: "",
            documentoIdentidad: "",
            telefono: "",
            usuarioSistema: false,
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
    if (data.usuarioSistema && !ci) {
      setError("documentoIdentidad", {
        message: "El documento de identidad es requerido para crear usuario de sistema",
      });
      return;
    }
    const safeData: PersonalCreate = {
      nombres: data.nombres.trim(),
      apellidos: data.apellidos.trim(),
      tipoPersonalId: Number(data.tipoPersonalId),
      documentoIdentidad: ci || undefined,
      telefono: data.telefono?.trim() || undefined,
      usuarioSistema: data.usuarioSistema,
    };
    onSave(safeData);
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="flex flex-col">
        {/* Header */}
        <SheetHeader className="border-b border-border pb-4">
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
              : "Completa los datos para registrar un nuevo integrante."}
          </SheetDescription>
        </SheetHeader>

        {/* Form */}
        <form
          id="personal-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex-1 overflow-y-auto px-4 py-5 space-y-5"
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

          {/* Usuario de sistema */}
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
                  Crea un acceso para que esta persona pueda ingresar al sistema como recepcionista.
                </p>
              </div>
            </label>

            {/* Vista previa del usuario a crear */}
            {usuarioSistema && !yaEsUsuarioSistema && (
              <div className={cn(
                "ml-7 rounded-lg border p-3 text-xs space-y-1",
                usernamePreview
                  ? "border-primary/30 bg-primary/5"
                  : "border-amber-300/50 bg-amber-50/50 dark:bg-amber-950/20"
              )}>
                {usernamePreview ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Usuario:</span>
                      <span className="font-mono font-semibold text-foreground">{usernamePreview}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Contraseña inicial:</span>
                      <span className="font-mono text-muted-foreground">configurada por admin</span>
                    </div>
                    <p className="text-muted-foreground pt-1 border-t border-border/50">
                      Al primer inicio de sesión se solicitará cambiar la contraseña.
                    </p>
                  </>
                ) : (
                  <p className="text-amber-700 dark:text-amber-400">
                    Ingresa el CI para ver el usuario que se generará.
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
        </form>

        {/* Footer */}
        <SheetFooter className="border-t border-border pt-4">
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
