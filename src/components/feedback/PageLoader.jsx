import './PageLoader.css';

function PageLoader({ texto = 'Carregando...' }) {
  return (
    <div className="page-loader" role="status" aria-live="polite">
      <span className="page-loader__spinner" aria-hidden="true" />
      <span>{texto}</span>
    </div>
  );
}

export default PageLoader;
