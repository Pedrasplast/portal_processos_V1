import { useCallback, useEffect, useRef, useState } from 'react';

export function useMensagem() {
  const [mensagem, setMensagem] = useState({ tipo: '', texto: '' });
  const timeoutRef = useRef(null);

  const mostrarMensagem = useCallback((tipo, texto, duracao = 4500) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    setMensagem({ tipo, texto });
    timeoutRef.current = setTimeout(() => {
      setMensagem({ tipo: '', texto: '' });
    }, duracao);
  }, []);

  const limparMensagem = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setMensagem({ tipo: '', texto: '' });
  }, []);

  useEffect(
    () => () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    },
    [],
  );

  return { mensagem, mostrarMensagem, limparMensagem };
}
