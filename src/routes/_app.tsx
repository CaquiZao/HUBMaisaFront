import { useState } from "react";
import { Outlet, createFileRoute, useRouterState } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { Sidebar } from "@/components/sidebar";
import { SearchTrigger } from "@/components/search-trigger";
import { ToastProvider } from "@/components/ui";
import { CommandPalette, useHubShortcuts } from "@/components/command-palette";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [paletteOpen, setPaletteOpen] = useState(false);
  useHubShortcuts(paletteOpen, setPaletteOpen);

  return (
    <ToastProvider>
      <div className="flex min-h-dvh bg-canvas">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex h-14 items-center border-b border-line px-8">
            <SearchTrigger onOpen={() => setPaletteOpen(true)} />
          </div>
          <main className="flex-1 overflow-x-hidden">
            <div className="mx-auto w-full max-w-[1120px] px-8 py-8">
              <AnimatePresence mode="wait">
                <motion.div
                  key={pathname}
                  data-motion="fade"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
                >
                  <Outlet />
                </motion.div>
              </AnimatePresence>
            </div>
          </main>
        </div>
        <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      </div>
    </ToastProvider>
  );
}

