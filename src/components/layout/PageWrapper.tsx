"use client";

import { Navbar } from "./Navbar";

export function PageWrapper({
  children,
  className = "",
}: {
  children:   React.ReactNode;
  className?: string;
}) {
  return (
    <>
      <Navbar />
      <main className={`pt-20 min-h-screen px-6 pb-12 ${className}`}>
        <div className="max-w-5xl mx-auto">
          {children}
        </div>
      </main>
    </>
  );
}