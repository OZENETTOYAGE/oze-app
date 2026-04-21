import Link from "next/link";
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4 text-center">
      <div
        className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl"
        style={{ background: "#1A2B5F" }}
      >
        <span
          className="text-3xl font-black"
          style={{ fontFamily: "Georgia,serif", color: "#F5C200" }}
        >
          O
        </span>
      </div>
      <h1
        className="text-4xl font-bold text-[#1A2B5F]"
        style={{ fontFamily: "Georgia,serif" }}
      >
        404
      </h1>
      <p className="mt-2 text-lg font-semibold text-slate-600">
        Page introuvable
      </p>
      <Link
        href="/dashboard"
        className="mt-6 rounded-xl px-6 py-3 text-sm font-bold"
        style={{ background: "#1A2B5F", color: "#F5C200" }}
      >
        Retour au tableau de bord
      </Link>
    </div>
  );
}
