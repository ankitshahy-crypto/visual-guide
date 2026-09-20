import type { ReactNode } from "react";

export default function PhoneShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full justify-center bg-desk">
      <div className="relative flex h-full min-h-0 w-full max-w-[430px] flex-col overflow-hidden bg-paper text-ink shadow-[0_0_0_1px_#000]">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}
