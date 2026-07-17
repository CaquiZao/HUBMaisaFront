import { useEffect, useState } from "react";

type Tema = "claro" | "escuro";

const CHAVE = "hub-tema";

function inicial(): Tema {
  if (typeof window === "undefined") return "claro";
  const salvo = window.localStorage.getItem(CHAVE);
  if (salvo === "claro" || salvo === "escuro") return salvo;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "escuro"
    : "claro";
}

function aplicar(t: Tema) {
  const root = document.documentElement;
  root.classList.toggle("dark", t === "escuro");
}

export function useTema() {
  // SSR-safe: monta com "claro"; hidrata do storage num useEffect.
  const [tema, setTema] = useState<Tema>("claro");
  const [hidratado, setHidratado] = useState(false);

  useEffect(() => {
    const t = inicial();
    setTema(t);
    aplicar(t);
    setHidratado(true);
  }, []);

  function trocar(t: Tema) {
    setTema(t);
    aplicar(t);
    window.localStorage.setItem(CHAVE, t);
  }

  return { tema, trocar, hidratado };
}
