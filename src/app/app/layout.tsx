import { SidebarProvider } from '@/components/ui/sidebar';
import { AppProvider } from './app-provider';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider className="h-screen overflow-hidden">
      <AppProvider>{children}</AppProvider>
    </SidebarProvider>
  );
}
