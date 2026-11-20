import { useEffect, useState } from "react";
import { toast } from "sonner";
import { IS_PREVIEW } from "./utils";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferred: BeforeInstallPromptEvent | null = null;
const subs = new Set<() => void>();
const notify = () => subs.forEach((s) => s());

/** Registra o service worker (só em produção) e avisa quando há versão nova */
export function registerPWA() {
  if (IS_PREVIEW || import.meta.env.DEV || !("serviceWorker" in navigator)) return;

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    notify();
  });

  window.addEventListener("load", async () => {
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      const offerUpdate = (worker: ServiceWorker) =>
        toast("Nova versão disponível", {
          duration: Infinity,
          action: { label: "Atualizar", onClick: () => worker.postMessage("SKIP_WAITING") },
        });

      if (reg.waiting && navigator.serviceWorker.controller) offerUpdate(reg.waiting);
      reg.addEventListener("updatefound", () => {
        const sw = reg.installing;
        sw?.addEventListener("statechange", () => {
          if (sw.state === "installed" && navigator.serviceWorker.controller) offerUpdate(sw);
        });
      });

      let reloaded = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (reloaded) return;
        reloaded = true;
        window.location.reload();
      });
    } catch {
      /* sem SW o app continua funcionando como site */
    }
  });
}

export const isStandalone = () =>
  window.matchMedia?.("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;

/** Botão "Instalar app": só aparece quando o navegador permite */
export function useInstallPrompt() {
  const [, force] = useState(0);
  useEffect(() => {
    const s = () => force((n) => n + 1);
    subs.add(s);
    return () => {
      subs.delete(s);
    };
  }, []);

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    deferred = null;
    notify();
  };

  return { canInstall: !!deferred && !isStandalone(), install };
}
