export function removerAcentos(valor = '') {
  return String(valor)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function normalizarTexto(valor = '') {
  return removerAcentos(valor).trim().replace(/\s+/g, ' ').toUpperCase();
}

export function normalizarChave(valor = '') {
  return normalizarTexto(valor).toLowerCase();
}

export function nomePorEmail(email = '') {
  const usuario = String(email).split('@')[0];

  return usuario
    .split(/[._-]+/)
    .filter(Boolean)
    .map((parte) => parte.charAt(0).toUpperCase() + parte.slice(1).toLowerCase())
    .join(' ');
}
