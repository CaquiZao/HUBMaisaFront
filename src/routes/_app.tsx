import { useState } from "react";
import {
  Outlet,
  createFileRoute,
  useNavigate,
} from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { Sidebar } from "@/components/sidebar";
import { SearchTrigger } from "@/components/search-trigger";
import { ToastProvider } from "@/components/ui";
import { CommandPalette, useHubShortcuts } from "@/components/command-palette";
import { useAuth } from "@/components/auth-provider";
import { useEffect } from "react";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const { session, loading } = useAuth();
  const navigate = useNavigate();

  useHubShortcuts(paletteOpen, setPaletteOpen);

  useEffect(() => {
    if (!loading && !session?.user) {
      navigate({ to: "/login" });
    }
  }, [loading, session, navigate]);

  if (loading || !session?.user) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-canvas">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <ToastProvider>
      <div className="flex min-h-dvh bg-canvas">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex h-14 items-center border-b border-line px-8">
            <SearchTrigger onOpen={() => setPaletteOpen(true)} />
          </div>
          <main className="flex-1 overflow-x-hidden">
            <div className="mx-auto w-full max-w-[1440px] 2xl:max-w-[1600px] px-8 py-8">
              <motion.div
                data-motion="fade"
                initial={{ opacity: 0, y: 2 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.08, ease: "easeOut" }}
              >
                <Outlet />
              </motion.div>
            </div>
          </main>
        </div>
        <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      </div>
    </ToastProvider>
  );
}
