import { BottomNav } from "@/components/portal/bottom-nav";
import { TenantLockedNotice } from "@/components/portal/tenant-locked-notice";
import { MobileTopBar } from "@/components/portal/mobile-top-bar";
import { Sidebar } from "@/components/portal/sidebar";

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
 className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-4 p-4 pb-28 pt-[4.5rem] md:flex-row md:p-4">
      <TenantLockedNotice />
      <MobileTopBar />
      <header className="hidden shrink-0 print:hidden md:block md:w-56">
        <div className="px-3 pb-2 pt-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Teacher Portal</p>
        </div>
        <Sidebar />
      </header>
      <main className="min-w-0 flex-1">{children}</main>
      <BottomNav />
    </div>
  );
}
