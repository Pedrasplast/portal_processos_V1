import { normalizarChave, normalizarTexto } from './texto';

export function normalizarTipoDocumento(tipo = '') {
  const tipoNormalizado = normalizarTexto(tipo)
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');

  if (tipoNormalizado === 'POP') return 'POP';
  if (tipoNormalizado === 'FLUXOGRAMA') return 'FLUXOGRAMA';
  if (tipoNormalizado === 'MAPA VISUAL') return 'MAPA VISUAL';

  return '';
}

export function formatarCodigo(numero) {
  return String(Number(numero)).padStart(2, '0');
}

export function analisarTituloDocumento(titulo = '') {
  const tituloAjustado = String(titulo).trim().replace(/\s+/g, ' ');
  const resultado = tituloAjustado.match(
    /^(POP|FLUXOGRAMA|MAPA\s+VISUAL)-(\d+)\s*\|\s*(.+)$/i,
  );

  if (!resultado) return null;

  const tipo = normalizarTipoDocumento(resultado[1]);
  const numero = Number(resultado[2]);
  const descricao = resultado[3].trim().replace(/\s+/g, ' ');

  if (!tipo || !Number.isInteger(numero) || numero <= 0 || !descricao) {
    return null;
  }

  return {
    tipo,
    numero,
    codigo: formatarCodigo(numero),
    descricao,
  };
}

export function extrairDescricaoDocumento(titulo = '') {
  return analisarTituloDocumento(titulo)?.descricao || String(titulo).trim() || 'Sem descrição';
}

export function extrairCodigoDocumento(titulo = '') {
  return analisarTituloDocumento(titulo)?.codigo || null;
}

export function normalizarDocumentos(documentos = []) {
  return documentos
    .map((documento) => {
      const titulo = analisarTituloDocumento(documento.titulo);
      if (!titulo) return null;

      return {
        ...documento,
        tipo: normalizarTipoDocumento(documento.tipo_documento) || titulo.tipo,
        numero: titulo.numero,
        codigo: titulo.codigo,
        descricao: titulo.descricao,
      };
    })
    .filter(Boolean);
}

export function agruparDocumentos(documentos = []) {
  const grupos = new Map();

  documentos.forEach((documento) => {
    const titulo = analisarTituloDocumento(documento.titulo);
    const setor = documento.setor?.trim() || 'Geral';
    const tipo = normalizarTipoDocumento(documento.tipo_documento) || titulo?.tipo;
    const codigo = titulo?.codigo || null;
    const descricao = titulo?.descricao || extrairDescricaoDocumento(documento.titulo);

    if (!tipo) return;

    const chave = codigo
      ? `${normalizarChave(setor)}::${codigo}`
      : `${normalizarChave(setor)}::sem-codigo::${documento.id}`;

    if (!grupos.has(chave)) {
      grupos.set(chave, {
        id: chave,
        codigo,
        setor,
        descricoes: {},
        arquivos: {},
      });
    }

    const grupo = grupos.get(chave);
    grupo.descricoes[tipo] = descricao;
    grupo.arquivos[tipo] = {
      id: documento.id,
      storagePath: documento.storage_path || null,
      legacyUrl: documento.arquivo_url || null,
      tipo,
      descricao,
    };
  });

  return Array.from(grupos.values()).sort((a, b) => {
    const setor = a.setor.localeCompare(b.setor, 'pt-BR');
    if (setor !== 0) return setor;

    const codigoA = a.codigo ? Number(a.codigo) : Number.MAX_SAFE_INTEGER;
    const codigoB = b.codigo ? Number(b.codigo) : Number.MAX_SAFE_INTEGER;
    return codigoA - codigoB;
  });
}

export function obterNumeracaoDocumento(documentos, setor, tipoDocumento) {
  if (!setor || !tipoDocumento) {
    return {
      numerosExistentes: [],
      numerosDisponiveis: [],
      proximoNumero: 1,
      proximoCodigo: '01',
    };
  }

  const normalizados = normalizarDocumentos(documentos).filter(
    (documento) => normalizarChave(documento.setor) === normalizarChave(setor),
  );

  const numerosExistentes = [
    ...new Set(normalizados.map((documento) => documento.numero)),
  ].sort((a, b) => a - b);

  const numerosDisponiveis = numerosExistentes.filter(
    (numero) =>
      !normalizados.some(
        (documento) => documento.numero === numero && documento.tipo === tipoDocumento,
      ),
  );

  const proximoNumero = numerosExistentes.length
    ? Math.max(...numerosExistentes) + 1
    : 1;

  return {
    numerosExistentes,
    numerosDisponiveis,
    proximoNumero,
    proximoCodigo: formatarCodigo(proximoNumero),
  };
}

export function tiposDoNumero(documentos, setor, numero) {
  return [
    ...new Set(
      normalizarDocumentos(documentos)
        .filter(
          (documento) =>
            normalizarChave(documento.setor) === normalizarChave(setor) &&
            documento.numero === numero,
        )
        .map((documento) => documento.tipo),
    ),
  ];
}
