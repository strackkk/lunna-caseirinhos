const supabaseUrl = CONFIG.supabaseUrl.trim();
const supabaseAnonKey = CONFIG.supabaseAnonKey.trim();

window.storeBackend = {
  client: null,
  status: "not-configured",
  error: null,
};

if (supabaseUrl || supabaseAnonKey) {
  if (!supabaseUrl || !supabaseAnonKey) {
    window.storeBackend.status = "error";
    window.storeBackend.error = "Preencha tanto supabaseUrl quanto supabaseAnonKey.";
  } else {
    let parsedUrl;
    try {
      parsedUrl = new URL(supabaseUrl);
    } catch {
      window.storeBackend.status = "error";
      window.storeBackend.error = "supabaseUrl não é uma URL válida.";
    }

    if (parsedUrl && !["https:", "http:"].includes(parsedUrl.protocol)) {
      window.storeBackend.status = "error";
      window.storeBackend.error = "supabaseUrl deve usar HTTPS (ou HTTP apenas em desenvolvimento local).";
    } else if (parsedUrl && parsedUrl.protocol === "http:" &&
      parsedUrl.hostname !== "localhost" && parsedUrl.hostname !== "127.0.0.1") {
      window.storeBackend.status = "error";
      window.storeBackend.error = "Use HTTPS para o projeto Supabase fora do computador local.";
    } else if (!window.storeBackend.error) {
      if (!window.supabase || typeof window.supabase.createClient !== "function") {
        window.storeBackend.status = "error";
        window.storeBackend.error = "A biblioteca do Supabase não carregou. Verifique a conexão e recarregue a página.";
      } else {
        try {
          window.storeBackend.client = window.supabase.createClient(
            supabaseUrl,
            supabaseAnonKey,
            {
              auth: {
                storageKey: "lunna-caseirinhos-auth",
                autoRefreshToken: true,
                persistSession: true,
                detectSessionInUrl: true,
              },
            }
          );
          window.storeBackend.status = "ready";
        } catch (error) {
          window.storeBackend.status = "error";
          window.storeBackend.error = "Não foi possível iniciar o Supabase. Confira a Project URL e a chave anon/public.";
          console.error("Falha ao inicializar o cliente Supabase:", error);
        }
      }
    }
  }
}

if (window.storeBackend.status === "error") {
  console.error(window.storeBackend.error);
}
