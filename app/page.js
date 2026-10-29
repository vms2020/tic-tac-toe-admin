"use client";

import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-white p-6 transition-colors dark:bg-gray-950">
      <section className="w-full max-w-md rounded-2xl border border-gray-100 bg-gray-50 p-8 text-center shadow-lg transition-colors dark:border-gray-700 dark:bg-gray-800">
        <h1 className="mb-4 text-4xl font-extrabold text-gray-900 dark:text-white">
          Tic-Tac-Toe 2026
        </h1>
        <p className="mb-8 text-gray-600 dark:text-gray-300">
          Welcome to the central command hub. Authorized administrators can view metrics, configure active servers, and modify system credentials below.
        </p>
        <Link
          href="/admin"
          className="inline-block w-full rounded-lg bg-blue-600 px-6 py-3 font-bold text-white transition hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
        >
          Open Admin Panel
        </Link>
      </section>
    </main>
  );
}
