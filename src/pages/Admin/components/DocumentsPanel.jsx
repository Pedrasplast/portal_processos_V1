import { useEffect, useMemo, useRef, useState } from 'react';
import { FiFileText, FiTrash2, FiUpload } from 'react-icons/fi';

import { SETORES, TIPOS_DOCUMENTO } from '../../../config/documentos';
import { excluirDocumento, publicarDocumento } from '../../../services/documentosService';
import {
  formatarCodigo,
  obterNumeracaoDocumento,
  tiposDoNumero,
} from '../../../utils/documentos';

function DocumentsPanel({ documentos, loading, erro, onReload, notify }) {
  const [setor, setSetor] = useState('');
  const [tipoDocumento, setTipoDocumento] = useState('');
  const [codigo, setCodigo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [arquivo, setArquivo] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [documentoExcluir, setDocumentoExcluir] = useState(null);
  const inputFileRef = useRef(null);

  const numeracao = useMemo(
    () => obterNumeracaoDocumento(documentos, setor, tipoDocumento),
    [documentos, setor, tipoDocumento],
  );

  useEffect(() => {
    if (!setor || !tipoDocumento) {
      setCodigo('');
      return;
    }

    if (numeracao.numerosDisponiveis.length) {
      setCodigo(formatarCodigo(Math.max(...numeracao.numerosDisponiveis)));
      return;
    }

    setCodigo(numeracao.proximoCodigo);
  }, [setor, tipoDocumento, numeracao]);

  async function handleSubmit(event) {
    event.preventDefault();

    if (!setor || !tipoDocumento || !codigo || descricao.trim().length < 3 || !arquivo) {
      notify('erro', 'Preencha todos os campos obrigatórios.');
      return;
    }

    setSalvando(true);
    try {
      const titulo = await publicarDocumento({
        setor,
        tipoDocumento,
        codigo,
        descricao,
        arquivo,
      });

      notify('sucesso', `${titulo} cadastrado com sucesso!`);
      setDescricao('');
      setArquivo(null);
      if (inputFileRef.current) inputFileRef.current.value = '';
      await onReload();
    } catch (error) {
      notify('erro', error.message || 'Erro ao publicar documento.');
    } finally {
      setSalvando(false);
    }
  }

  async function confirmarExclusao() {
    if (!documentoExcluir) return;

    try {
      await excluirDocumento(documentoExcluir);
      notify('sucesso', 'Documento excluído com sucesso.');
      setDocumentoExcluir(null);
      await onReload();
    } catch (error) {
      notify('erro', error.message || 'Erro ao excluir documento.');
    }
  }

  return (
    <div className="admin-stack">
      <form className="admin-card" onSubmit={handleSubmit}>
        <div className="admin-card__header">
          <div>
            <h3>Adicionar Novo Documento</h3>
            <p>O prefixo e a numeração são controlados automaticamente.</p>
          </div>
        </div>

        <div className="admin-form-grid">
          <div className="form-group">
            <label htmlFor="document-sector">Setor / Pasta</label>
            <select
              id="document-sector"
              className="form-control"
              value={setor}
              onChange={(event) => {
                setSetor(event.target.value);
                setDescricao('');
              }}
              disabled={salvando}
              required
            >
              <option value="" disabled>Selecione o setor</option>
              {SETORES.map((item) => <option key={item}>{item}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="document-type">Tipo de Documento</label>
            <select
              id="document-type"
              className="form-control"
              value={tipoDocumento}
              onChange={(event) => {
                setTipoDocumento(event.target.value);
                setDescricao('');
              }}
              disabled={salvando}
              required
            >
              <option value="" disabled>Selecione o tipo</option>
              {TIPOS_DOCUMENTO.map((tipo) => (
                <option key={tipo.valor} value={tipo.valor}>{tipo.nome}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="document-number">Número do Documento</label>
            <select
              id="document-number"
              className="form-control"
              value={codigo}
              onChange={(event) => {
                setCodigo(event.target.value);
                setDescricao('');
              }}
              disabled={salvando || !setor || !tipoDocumento}
              required
            >
              <option value="" disabled>Selecione a numeração</option>
              {numeracao.numerosDisponiveis.map((numero) => {
                const codigoExistente = formatarCodigo(numero);
                const tipos = tiposDoNumero(documentos, setor, numero);
                return (
                  <option key={codigoExistente} value={codigoExistente}>
                    {codigoExistente} — possui [{tipos.join(', ')}]
                  </option>
                );
              })}
              <option value={numeracao.proximoCodigo}>
                {numeracao.proximoCodigo} — criar nova linha
              </option>
            </select>
          </div>

          <div className="form-group admin-form-grid__wide">
            <label htmlFor="document-title">Título do Processo</label>
            <div className="document-title-control">
              <span>{tipoDocumento && codigo ? `${tipoDocumento}-${codigo} |` : 'TIPO-__ |'}</span>
              <input
                id="document-title"
                className="form-control"
                type="text"
                value={descricao}
                onChange={(event) => setDescricao(event.target.value.toUpperCase())}
                disabled={salvando || !setor || !tipoDocumento || !codigo}
                placeholder="DESCRIÇÃO DO DOCUMENTO"
                maxLength={140}
                required
              />
            </div>
          </div>

          <div className="form-group admin-form-grid__wide">
            <label htmlFor="document-file">Arquivo PDF</label>
            <input
              ref={inputFileRef}
              id="document-file"
              className="form-control"
              type="file"
              accept="application/pdf,.pdf"
              onChange={(event) => setArquivo(event.target.files?.[0] || null)}
              disabled={salvando}
              required
            />
          </div>
        </div>

        <button type="submit" className="btn btn-primary" disabled={salvando}>
          <FiUpload /> {salvando ? 'Publicando...' : 'Publicar Documento'}
        </button>
      </form>

      <section className="admin-card">
        <div className="admin-card__header">
          <div>
            <h3>Documentos Cadastrados</h3>
            <p>{documentos.length} registro(s) no repositório.</p>
          </div>
        </div>

        {erro && <div className="alert erro">{erro}</div>}

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Documento</th>
                <th>Setor</th>
                <th>Tipo</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="4" className="empty-state">Carregando...</td></tr>
              ) : documentos.length === 0 ? (
                <tr><td colSpan="4" className="empty-state">Nenhum documento cadastrado.</td></tr>
              ) : (
                documentos.map((documento) => (
                  <tr key={documento.id}>
                    <td>
                      <div className="document-cell">
                        <FiFileText />
                        <span>{documento.titulo}</span>
                      </div>
                    </td>
                    <td>{documento.setor || 'Geral'}</td>
                    <td>{documento.tipo_documento || 'POP'}</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-danger"
                        onClick={() => setDocumentoExcluir(documento)}
                      >
                        <FiTrash2 /> Excluir
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {documentoExcluir && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3>Confirmar exclusão</h3>
            <p>Remover <strong>{documentoExcluir.titulo}</strong>?</p>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setDocumentoExcluir(null)}>
                Cancelar
              </button>
              <button type="button" className="btn btn-danger" onClick={confirmarExclusao}>
                <FiTrash2 /> Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DocumentsPanel;
