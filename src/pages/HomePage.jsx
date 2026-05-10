import { Link } from "react-router-dom";

export function HomePage() {
  return (
    <div className="min-h-screen text-stone-950">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6 sm:px-10">
        <Link to="/" className="font-heading text-lg font-semibold tracking-tight">
          crackd.fyi
        </Link>
        <Link
          to="/login"
          className="rounded-md border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition hover:border-stone-300 hover:text-stone-950"
        >
          Sign in
        </Link>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-col px-6 pb-16 pt-10 sm:px-10 sm:pb-24 sm:pt-16">
        <section className="grid gap-10 pb-16 pt-10 sm:pb-24 sm:pt-20">
          <div className="max-w-3xl">
            <p className="mb-5 text-sm font-medium uppercase tracking-[0.18em] text-stone-500">
              Interview preparation, grounded in real data
            </p>
            <h1 className="font-heading text-5xl font-semibold leading-[1.02] text-stone-950 sm:text-7xl">
              Crack your next interview.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-stone-600 sm:text-lg">
              Build a focused prep plan from real interview questions, company-specific signal, and the skills behind both.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/login"
                className="rounded-md bg-stone-950 px-5 py-3 text-sm font-semibold !text-stone-50 transition hover:bg-stone-800 hover:!text-stone-50 visited:!text-stone-50"
              >
                Sign in with email
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6 text-sm text-stone-500 sm:px-10">
        <span>crackd.fyi</span>
        <Link to="/login" className="hover:text-stone-900">
          Log in
        </Link>
      </footer>
    </div>
  );
}
