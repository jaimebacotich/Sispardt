import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { UsuariosConectadosView } from "@/components/auditoria-sesiones/usuarios-conectados-view";

export const metadata = { title: "Usuarios Conectados" };

export default async function UsuariosConectadosPage() {
  const isMock = process.env.NEXT_PUBLIC_MOCK_API === "true";
  if (!isMock) {
    const session = await auth();
    if (!session?.user?.roles?.includes("admin_general")) redirect("/home");
  }

  return <UsuariosConectadosView />;
}
