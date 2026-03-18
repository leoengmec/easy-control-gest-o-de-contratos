// ... (mantenha os imports iguais)

export default function Layout({ children, currentPageName }) {
  // ... (mantenha a lógica de auth e notificações igual)

  return (
    <div 
      className="min-h-screen flex transition-colors duration-300" 
      style={{ 
        backgroundColor: 'var(--bg-primary, #f9fafb)', 
        color: 'var(--text-primary, #1a2e4a)' 
      }}
    >
      <BarraAcessibilidade />

      <style>{`
        /* Força todos os textos e fundos a herdarem as cores da acessibilidade */
        body { 
          background-color: var(--bg-primary, #f9fafb) !important; 
          color: var(--text-primary, #1a2e4a) !important; 
        }
        /* Garante que links e cards também sigam a cor do texto */
        main *, aside * { color: inherit !important; }
        .nav-active { background: rgba(255,255,255,0.15); border-left: 4px solid #3b82f6; }
      `}</style>

      {/* Sidebar - Agora usa a variável --bg-sidebar */}
      <aside 
        style={{ backgroundColor: 'var(--bg-sidebar, #1a2e4a)' }}
        className={`fixed inset-y-0 left-0 z-50 w-64 text-white flex flex-col transform transition-transform duration-200 lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="p-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-500 rounded-lg flex items-center justify-center">
              <Scale className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-bold text-sm leading-tight">Easy Control</div>
              <div className="text-xs opacity-70">Gestão de Contratos</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {visibleNav.map(item => {
            const isActive = location.pathname.includes(item.page) || (currentPageName === item.page);
            return (
              <Link
                key={item.page}
                to={createPageUrl(item.page)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${isActive ? "nav-active" : "opacity-80 hover:opacity-100 hover:bg-white/5"}`}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User Info */}
        {user && (
          <div className="p-4 border-t border-white/10">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-xs font-bold uppercase">
                {user.full_name?.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium truncate">{user.full_name}</div>
                <div className="text-[10px] opacity-60 uppercase">{user.role}</div>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 ml-0 lg:ml-64">
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>

      {/* Rodapé Dinâmico */}
      <footer 
        style={{ backgroundColor: 'var(--bg-sidebar, #111e30)', borderTop: '1px solid rgba(255,255,255,0.05)' }}
        className="hidden lg:flex fixed bottom-0 left-0 w-64 text-[10px] px-4 py-2 flex-col text-white/40"
      >
        <span>© {new Date().getFullYear()} Easy Control</span>
        <span>v1.0.0</span>
      </footer>
    </div>
  );
}