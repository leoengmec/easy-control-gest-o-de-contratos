// ... (mantenha os imports)

export default function Layout({ children, currentPageName }) {
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  // Novo estado para controlar quais grupos estão abertos
  const [openGroups, setOpenGroups] = useState({
    "GESTÃO INTELIGENTE": true,
    "FISCALIZAÇÃO CONTRATUAL": true 
  });

  const toggleGroup = (title) => {
    setOpenGroups(prev => ({ ...prev, [title]: !prev[title] }));
  };

  // ... (mapeamento de userRole)

  return (
    // ... (estrutura principal)
    
    <nav className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
      {menuGroups.map((group, idx) => {
        if (group.adminOnly && userRole !== "admin") return null;
        const isOpen = openGroups[group.title];

        return (
          <div key={idx} className="space-y-1 border-b border-white/5 pb-2">
            {/* TÍTULO DO GRUPO CLICÁVEL */}
            {sidebarOpen && (
              <button 
                onClick={() => toggleGroup(group.title)}
                className="w-full flex items-center justify-between px-3 py-2 text-[12px] font-bold text-white/60 hover:text-white uppercase tracking-wider transition-colors"
              >
                <span>{group.title}</span>
                <ChevronDown size={14} className={`transition-transform ${isOpen ? "" : "-rotate-90"}`} />
              </button>
            )}

            {/* ITENS DO GRUPO (Só aparecem se isOpen for true) */}
            <div className={`space-y-1 transition-all ${isOpen || !sidebarOpen ? "block" : "hidden"}`}>
              {group.items.filter(i => i.roles.includes(userRole)).map(item => {
                const isActive = location.pathname.includes(item.page);
                return (
                  <Link
                    key={item.page}
                    to={item.future ? "#" : createPageUrl(item.page)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-[14px] transition-all ${isActive ? "nav-active" : "opacity-70 hover:opacity-100 hover:bg-white/5"}`}
                  >
                    <item.icon className="w-5 h-5 flex-shrink-0" />
                    {sidebarOpen && <span>{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </nav>
    // ...
  );
}