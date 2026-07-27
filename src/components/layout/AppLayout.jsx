import { useState } from 'react';

import Navbar from './Navbar';
import Sidebar from './Sidebar';
import './Layout.css';

function AppLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app-shell">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="app-shell__main">
        <Navbar onMenu={() => setSidebarOpen(true)} />
        <main className="app-content">{children}</main>
      </div>
    </div>
  );
}

export default AppLayout;
