import Link from "next/link";
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#1A2B5F]">
        <span className="font-serif text-3xl font-black text-[#F5C200]">O</span>
      </div>
      <h1 className="font-serif text-4xl font-bold text-[#1A2B5F]">404</h1>
      <p className="mt-2 text-lg font-semibold text-slate-600">Page introuvable</p>
      <Link href="/dashboard" className="mt-6 rounded-xl bg-[#1A2B5F] px-6 py-3 text-sm font-bold text-[#F5C200]">
        Retour au tableau de bord
      </Link>
    </div>
  );
}
