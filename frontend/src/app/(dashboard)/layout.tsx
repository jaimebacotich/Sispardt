import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isMock = process.env.NEXT_PUBLIC_MOCK_API === "true";
  const session = isMock ? null : await auth();
  if (!isMock && !session?.user) redirect("/login");

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar fijo */}
      <Sidebar />

      {/* Contenido principal */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
