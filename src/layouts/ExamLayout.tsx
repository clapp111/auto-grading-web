import type { ReactNode } from "react";

interface ExamLayoutProps {
  sidebar: ReactNode;
  children: ReactNode;
}

export default function ExamLayout({ sidebar, children }: ExamLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-[#f7f8fa]">
      <aside className="w-64 shrink-0 border-r border-gray-200 bg-white">
        {sidebar}
      </aside>
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
