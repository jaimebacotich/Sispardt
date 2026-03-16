import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AuditoriaSesionesView } from "@/components/auditoria-sesiones/auditoria-sesiones-view";

export const metadata = { title: "Auditoría de Sesiones" };

export default async function AuditoriaSesionesPage() {
  const isMock = process.env.NEXT_PUBLIC_MOCK_API === "true";
  if (!isMock) {
    const session = await auth();
    if (!session?.user?.roles?.includes("admin_general")) redirect("/home");
  }

  return <AuditoriaSesionesView />;
}
