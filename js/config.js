// =============================================================
//  CONFIGURAÇÃO — o único arquivo que você precisa editar.
//  Passo a passo completo no README.md.
// =============================================================
export const CONFIG = {
  // Nome que aparece no topo do app
  nome: 'Oficina',

  // Projeto do Firebase (o mesmo do Atelier). A Oficina usa coleções próprias
  // (oficina_itens, oficina_midia, oficina_config), então nada se mistura.
  firebase: {
    apiKey: "AIzaSyDj0nsWXY3zG9CrdLOG5VReQj2CKGnInuM",
    authDomain: "atelier-cebcb.firebaseapp.com",
    projectId: "atelier-cebcb",
    storageBucket: "atelier-cebcb.firebasestorage.app",
    messagingSenderId: "324527598482",
    appId: "1:324527598482:web:54751bf28e81f2950a2f4b",
  },

  // E-mails que podem criar/editar aulas e listas na nuvem.
  // Use o mesmo e-mail na função ehAdmin() das regras do Firestore.
  admins: ['biaferreira310@gmail.com'],
};
