import { supabase } from '../lib/supabase';
import { analisarTituloDocumento, normalizarTipoDocumento } from '../utils/documentos';
import { sanitizarNomeArquivo } from '../utils/arquivos';
import { normalizarTexto } from '../utils/texto';

const BUCKET = 'pops';

export async function listarDocumentos() {
  const { data, error } = await supabase
    .from('pops')
    .select('id, titulo, setor, tipo_documento, arquivo_url, storage_path')
    .order('titulo', { ascending: true });

  if (error) throw error;
  return data || [];
}

async function validarDuplicidade({ setor, tipoDocumento, codigo }) {
  const { data, error } = await supabase
    .from('pops')
    .select('id, titulo, tipo_documento')
    .eq('setor', setor);

  if (error) throw error;

  const numero = Number(codigo);
  const duplicado = (data || []).some((documento) => {
    const titulo = analisarTituloDocumento(documento.titulo);
    if (!titulo) return false;

    const tipo = normalizarTipoDocumento(documento.tipo_documento) || titulo.tipo;
    return titulo.numero === numero && tipo === tipoDocumento;
  });

  if (duplicado) {
    throw new Error(`${tipoDocumento}-${codigo} já está cadastrado no setor ${setor}.`);
  }
}

export async function publicarDocumento({
  setor,
  tipoDocumento,
  codigo,
  descricao,
  arquivo,
}) {
  await validarDuplicidade({ setor, tipoDocumento, codigo });

  const ehPdf =
    arquivo?.type === 'application/pdf' || arquivo?.name?.toLowerCase().endsWith('.pdf');

  if (!ehPdf) {
    throw new Error('O arquivo selecionado deve estar em PDF.');
  }

  const titulo = `${tipoDocumento}-${codigo} | ${normalizarTexto(descricao)}`;
  const identificador =
    globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const caminho = `pdfs/${setor}/${codigo}/${tipoDocumento}/${identificador}-${sanitizarNomeArquivo(
    arquivo.name,
  )}`;

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(caminho, arquivo, {
    contentType: 'application/pdf',
    upsert: false,
  });

  if (uploadError) throw uploadError;

  try {
    const { error: insertError } = await supabase.from('pops').insert([
      {
        titulo,
        arquivo_url: null,
        storage_path: caminho,
        setor,
        tipo_documento: tipoDocumento,
      },
    ]);

    if (insertError) throw insertError;
    return titulo;
  } catch (error) {
    await supabase.storage.from(BUCKET).remove([caminho]);
    throw error;
  }
}

export async function obterBlobDocumento(arquivo) {
  if (arquivo?.storagePath) {
    const { data, error } = await supabase.storage.from(BUCKET).download(arquivo.storagePath);
    if (error) throw error;
    return data;
  }

  // Compatibilidade com documentos antigos que ainda tenham URL pública.
  if (arquivo?.legacyUrl) {
    const resposta = await fetch(arquivo.legacyUrl);
    if (!resposta.ok) throw new Error('Falha ao baixar arquivo legado.');
    return resposta.blob();
  }

  throw new Error('O documento não possui um arquivo associado.');
}

export async function excluirDocumento(documento) {
  if (documento.storage_path) {
    const { error: storageError } = await supabase.storage
      .from(BUCKET)
      .remove([documento.storage_path]);

    if (storageError) throw storageError;
  }

  const { error } = await supabase.from('pops').delete().eq('id', documento.id);
  if (error) throw error;
}
