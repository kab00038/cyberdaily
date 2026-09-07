// app/(dashboard)/layout.tsx — Server component that provides the shared
// application shell for all dashboard routes.
//
// The interactive state (sidebar collapse, mobile drawer) lives in the
// client wrapper `./layout-client` (a server component cannot own state),
// so this layout stays a plain server component and simply mounts the shell.
import Shell from "./layout-client";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Shell>{children}</Shell>;
}