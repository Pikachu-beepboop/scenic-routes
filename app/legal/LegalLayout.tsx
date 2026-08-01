"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";
import "./legal.css";

export default function LegalLayout({
  title,
  updated,
  children,
}: {
  title: string;
  updated?: string;
  children: ReactNode;
}) {
  return (
    <div className="lp">
      <div className="lp-bg" />
      <div className="lp-card">
        <Link href="/profile?tab=about" className="lp-back">
          <ChevronLeft size={16} strokeWidth={2} /> Back
        </Link>

        <h1 className="lp-title">{title}</h1>
        {updated && <p className="lp-updated">Last updated: {updated}</p>}

        <div className="lp-body">{children}</div>
      </div>
    </div>
  );
}
