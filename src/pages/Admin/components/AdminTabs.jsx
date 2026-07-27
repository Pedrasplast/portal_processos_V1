import { FiClock, FiFileText, FiUsers } from 'react-icons/fi';

const TABS = [
  { id: 'documentos', label: 'Gerenciar Documentos', icon: FiFileText },
  { id: 'usuarios', label: 'Usuários Cadastrados', icon: FiUsers },
  { id: 'solicitacoes', label: 'Solicitações de Acesso', icon: FiClock },
];

function AdminTabs({ tab, onChange, pendingCount }) {
  return (
    <div className="admin-tabs">
      {TABS.map((item) => {
        const Icon = item.icon;

        return (
          <button
            key={item.id}
            type="button"
            className={`admin-tab${tab === item.id ? ' active' : ''}`}
            onClick={() => onChange(item.id)}
          >
            <Icon />
            <span>{item.label}</span>
            {item.id === 'solicitacoes' && pendingCount > 0 && (
              <strong className="admin-tab__badge">{pendingCount}</strong>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default AdminTabs;
