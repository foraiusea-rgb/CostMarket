import Nav from "@/components/layout/Nav";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/markets");

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-6 pb-20">
        {children}
      </main>
    </>
  );
}
