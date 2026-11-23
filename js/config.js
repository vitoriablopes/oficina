// =============================================================
//  CONFIGURAÇÃO — o único arquivo que você precisa editar.
//  Passo a passo completo no README.md.
// =============================================================
export const CONFIG = {
  // Nome que aparece no topo do app
  nome: 'Oficina',

  // 1) Cole aqui o objeto firebaseConfig do seu projeto Firebase
  //    (Console do Firebase › Configurações do projeto › Seus apps › Web).
  //    Enquanto ficar null, o app funciona só neste aparelho (sem sincronizar).
  //    Pode ser o mesmo projeto do Atelier ou um novo.
  firebase: {
  // Nome que aparece no topo do app
    apiKey: "AIzaSyDj0nsWXY3zG9CrdLOG5VReQj2CKGnInuM",
    authDomain: "atelier-cebcb.firebaseapp.com",
    projectId: "atelier-cebcb",
    storageBucket: "atelier-cebcb.firebasestorage.app",
    messagingSenderId: "324527598482",
    appId: "1:324527598482:web:54751bf28e81f2950a2f4b"
},
  // Exemplo de como fica depois de colar:
  // firebase: {
  //   apiKey: "AIza...",
  //   authDomain: "minha-oficina.firebaseapp.com",
  //   projectId: "minha-oficina",
  //   storageBucket: "minha-oficina.appspot.com",
  //   messagingSenderId: "1234567890",
  //   appId: "1:1234567890:web:abc123"
  // },

  // 2) E-mails que podem criar/editar aulas e listas na nuvem (o seu).
  //    Use o mesmo e-mail no arquivo firestore.rules.
  admins: ['biaferreira310@gmail.com'],
};
