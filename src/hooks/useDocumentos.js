import { useCallback, useEffect, useState } from 'react';

import { listarDocumentos } from '../services/documentosService';

export function useDocumentos() {
  const [documentos, setDocumentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');

  const recarregar = useCallback(async () => {
    setLoading(true);
    setErro('');

    try {
      setDocumentos(await listarDocumentos());
    } catch (error) {
      console.error('Erro ao carregar documentos:', error);
      setErro('Não foi possível carregar os documentos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void recarregar();
  }, [recarregar]);

  return {
    documentos,
    loading,
    erro,
    recarregar,
  };
}
