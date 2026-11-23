import Link from "next/link";

/** Locale-agnostic 404 (not-found receives no params). Trilingual, minimal. */
export default function NotFound() {
  return (
    <section className="flex min-h-[80svh] items-center pt-32">
      <div className="container-luxe">
        <p className="eyebrow text-champagne-deep">404</p>
        <h1 className="display display-xl mt-6">Page introuvable · Page not found</h1>
        <p className="mt-6 text-stone" lang="ar" dir="rtl">الصفحة غير موجودة</p>
        <div className="mt-10 flex flex-wrap gap-4">
          <Link href="/fr" className="btn btn-dark">Accueil</Link>
          <Link href="/en" className="btn btn-dark">Home</Link>
          <Link href="/ar" className="btn btn-dark">الرئيسية</Link>
        </div>
      </div>
    </section>
  );
}
