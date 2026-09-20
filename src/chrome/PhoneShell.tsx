import type { ReactNode } from "react";

export default function PhoneShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full justify-center bg-desk">
      <div className="relative flex min-h-full w-full max-w-[430px] flex-col bg-paper text-ink shadow-[0_0_0_1px_#000]">
        {children}
      </div>
    </div>
  );
}
