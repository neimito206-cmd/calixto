// Dados PÚBLICOS do projeto. A chave "publishable" pode ficar aqui sem risco:
// quem protege os dados são as regras do banco (RLS). NUNCA coloque aqui a chave secreta/service_role.
window.CALIXTO_CONFIG = {
  url: "https://oblbsfnrgpnosleanwex.supabase.co",
  key: "sb_publishable_t4HRu4GG6WhUgSBut81oaw_2Yu0-VpP",
  // false = cadastro entra direto, sem código por e-mail (use enquanto não houver provedor de e-mail/SMTP).
  // Troque para true só depois de ligar o SMTP no Supabase e ajustar os modelos de e-mail.
  emailCode: false
};
