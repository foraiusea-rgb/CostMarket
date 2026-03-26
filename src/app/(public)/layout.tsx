import Nav from "@/components/layout/Nav";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Nav />
      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-6 pb-20">
        {children}
      </main>
    </>
  );
}
