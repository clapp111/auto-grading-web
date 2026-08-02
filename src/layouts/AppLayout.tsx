import type { ReactNode } from "react";

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  return <div className="min-h-screen bg-[#f7f8fa]">{children}</div>;
}
