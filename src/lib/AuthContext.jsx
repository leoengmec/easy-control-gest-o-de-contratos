const checkUserAuth = async () => {
    try {
      setIsLoadingAuth(true);
      
      // Pega o usuário logado via Google
      const currentUser = await base44.auth.me();
      console.log("Usuário logado:", currentUser.email);

      try {
        // Busca na sua tabela de 'Usuario' criada no painel 'Dados'
        const registrosPerfil = await base44.entities.Usuario.filter({ 
          email: currentUser.email 
        });
        
        if (registrosPerfil && registrosPerfil.length > 0) {
          currentUser.perfil = registrosPerfil[0].perfil;
          currentUser.nome = registrosPerfil[0].nome;
          currentUser.usuario_id = registrosPerfil[0].id;
        } else {
          // Fallback caso você ainda não tenha criado a linha na tabela
          currentUser.perfil = "Pendente";
          currentUser.nome = currentUser.name || "Novo Usuário";
        }
      } catch (dbError) {
        console.warn("Entidade 'Usuario' não encontrada em 'Dados':", dbError);
        currentUser.perfil = "Pendente";
      }

      setUser(currentUser);
      setIsAuthenticated(true);
      setIsLoadingAuth(false);
    } catch (error) {
      console.error('Falha crítica na autenticação:', error);
      setIsLoadingAuth(false);
      setIsAuthenticated(false);
    }
  };