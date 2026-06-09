"use client";

import DisableBack from "./DisableBack";

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <>
      <DisableBack />
      {children}
    </>
  );
}
