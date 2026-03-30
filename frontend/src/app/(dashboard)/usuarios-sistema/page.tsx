import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { UsuariosSistemaView } from "@/components/usuarios-sistema/usuarios-sistema-view";

export const metadata: Metadata = {
  title: "Gestión de Usuarios — SISPARDT",
};

export default function UsuariosSistemaPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title="Gestión de Usuarios del Sistema"
        subtitle="Administra las cuentas de acceso al sistema. Solo Administrador General."
      />
      <UsuariosSistemaView />
    </div>
  );
}
