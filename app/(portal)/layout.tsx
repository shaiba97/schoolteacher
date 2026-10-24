import { BottomNav } from "@/components/portal/bottom-nav";
import { LanguageToggle } from "@/components/portal/language-toggle";
import { PortalName } from "@/components/portal/portal-name";
import { TenantLockedNotice } from "@/components/portal/tenant-locked-notice";
import { MobileTopBar } from "@/components/portal/mobile-top-bar";
import { Sidebar } from "@/components/portal/sidebar";

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
 className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-4 p-4 pb-28 pt-[4.5rem] md:flex-row md:p-4">
      <TenantLockedNotice />
      <MobileTopBar />
      <header className="hidden shrink-0 print:hidden md:block md:w-56 md:rounded-2xl md:bg-sidebar md:shadow-sm">
        <div className="flex items-center justify-between gap-2 bg-secondary px-3 pb-2 pt-3 md:rounded-t-2xl">
          <PortalName />
          <LanguageToggle className="border-[#FBCFE8] bg-white" />
        </div>
        <Sidebar />
      </header>
      <main className="min-w-0 flex-1">{children}</main>
      <BottomNav />
    </div>
  );
}
