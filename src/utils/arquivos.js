import { removerAcentos } from './texto';

export function sanitizarNomeArquivo(nome = '') {
  return removerAcentos(nome).replace(/[^a-zA-Z0-9._-]/g, '_');
}

export function salvarBlob(blob, nomeArquivo) {
  if (!blob) return;

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = String(nomeArquivo || 'documento.pdf').replace(/[\\/:*?"<>|]/g, '-');
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
