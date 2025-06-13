// Importações do Firebase SDK
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  doc 
} from 'https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js';
import { // NOVAS IMPORTAÇÕES PARA AUTENTICAÇÃO
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  GoogleAuthProvider, // Para login com Google
  signInWithPopup // Para login com Google (popup)
} from 'https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js';


// SEU OBJETO firebaseConfig AQUI!
// Substitua este objeto pelo que você copiou do Console do Firebase.
const firebaseConfig = {
    apiKey: "AIzaSyAfMFkye99eIiSVbZqikF8bsfl8ePvVlZo",
    authDomain: "compraslibelle.firebaseapp.com",
    projectId: "compraslibelle",
    storageBucket: "compraslibelle.firebasestorage.app",
    messagingSenderId: "79781902542",
    appId: "1:79781902542:web:a561e26586c87c9bc4b89f",
    measurementId: "G-38RRREQ9HJ"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app); // Obtém a instância do Firestore
const auth = getAuth(app); // Obtém a instância do Auth para autenticação


// --- Referências aos elementos do DOM para Autenticação ---
const authSection = document.getElementById('auth-section');
const appContent = document.getElementById('app-content');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const showRegisterLink = document.getElementById('show-register');
const showLoginLink = document.getElementById('show-login');
const logoutBtn = document.getElementById('logout-btn');
const userEmailSpan = document.getElementById('user-email');
const googleLoginBtn = document.getElementById('google-login-btn');


// Função utilitária para formatar um número como moeda Real (BRL)
function formatarMoeda(valor) {
  const numValor = parseFloat(valor);
  if (isNaN(numValor)) {
    return '';
  }
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numValor);
}

// Obtenha referências aos elementos do DOM (já existentes)
const form = document.getElementById("form-compras");
const lista = document.getElementById("lista-compras");
const filterPrioridade = document.getElementById("filter-prioridade");
const searchItem = document.getElementById("search-item");
const filterAprovado = document.getElementById("filter-aprovado");


/**
 * Gerencia a visibilidade das seções de autenticação e aplicativo.
 * @param {Object|null} user - O objeto de usuário autenticado ou null se deslogado.
 */
function updateUI(user) {
  if (user) {
    // Usuário logado
    authSection.classList.add('hidden'); // Esconde a seção de autenticação
    appContent.classList.remove('hidden'); // Mostra o conteúdo do app
    userEmailSpan.textContent = user.email; // Exibe o e-mail do usuário
    carregarCompras(); // Carrega a lista para o usuário logado
  } else {
    // Usuário deslogado
    authSection.classList.remove('hidden'); // Mostra a seção de autenticação
    appContent.classList.add('hidden'); // Esconde o conteúdo do app
    lista.innerHTML = ''; // Limpa a lista se não houver usuário logado
    // Se o onSnapshot estiver ativo, desinscreve ele aqui para evitar erros de permissão
    if (unsubscribeFirestore) {
        unsubscribeFirestore();
        unsubscribeFirestore = null; // Zera a variável
    }
  }
}

// --- Listeners de Autenticação ---

// Alternar entre formulários de Login e Registro
showRegisterLink.addEventListener('click', (e) => {
  e.preventDefault();
  loginForm.classList.add('hidden');
  registerForm.classList.remove('hidden');
});

showLoginLink.addEventListener('click', (e) => {
  e.preventDefault();
  registerForm.classList.add('hidden');
  loginForm.classList.remove('hidden');
});

// Registrar novo usuário
registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = registerForm['register-email'].value;
  const password = registerForm['register-password'].value;

  try {
    await createUserWithEmailAndPassword(auth, email, password);
    alert('Registro efetuado com sucesso! Você está logado.');
    registerForm.reset();
  } catch (error) {
    console.error('Erro ao registrar:', error.message);
    alert('Erro ao registrar: ' + error.message);
  }
});

// Fazer Login
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = loginForm['login-email'].value;
  const password = loginForm['login-password'].value;

  try {
    await signInWithEmailAndPassword(auth, email, password);
    alert('Login efetuado com sucesso!');
    loginForm.reset();
  } catch (error) {
    console.error('Erro ao fazer login:', error.message);
    alert('Erro ao fazer login: ' + error.message);
  }
});

// Login com Google
googleLoginBtn.addEventListener('click', async () => {
  const provider = new GoogleAuthProvider();
  try {
    await signInWithPopup(auth, provider);
    alert('Login com Google efetuado com sucesso!');
  } catch (error) {
    console.error('Erro ao fazer login com Google:', error.message);
    alert('Erro ao fazer login com Google: ' + error.message);
  }
});


// Fazer Logout
logoutBtn.addEventListener('click', async () => {
  try {
    await signOut(auth);
    alert('Você foi desconectado.');
  } catch (error) {
    console.error('Erro ao fazer logout:', error.message);
    alert('Erro ao fazer logout: ' + error.message);
  }
});

// --- Listener para o estado de autenticação (sempre verifica se o usuário está logado) ---
// ESSENCIAL: onAuthStateChanged é a forma de saber se o usuário está logado
onAuthStateChanged(auth, (user) => {
  updateUI(user);
});


// --- Funções de Lógica do Aplicativo (Firestore) ---

let unsubscribeFirestore = null; // Variável para armazenar a função de desinscrição do onSnapshot

/**
 * Carrega a lista de compras do Firestore, aplicando filtros e ouvindo atualizações em tempo real.
 * A busca por item é feita no lado do cliente após a obtenção dos dados do Firestore.
 */
function carregarCompras() {
  // Desinscreve o listener anterior para evitar múltiplas chamadas se updateUI for chamado várias vezes
  if (unsubscribeFirestore) {
    unsubscribeFirestore();
    unsubscribeFirestore = null; // Zera a variável para garantir que um novo listener será criado
  }

  // Se não houver usuário logado, não tenta carregar os dados (updateUI já deve esconder a lista)
  if (!auth.currentUser) {
      console.log("Nenhum usuário logado. Não carregando a lista de compras.");
      return;
  }

  const prioridadeSelecionada = filterPrioridade.value;
  const termoBusca = searchItem.value.trim().toLowerCase(); 
  const aprovadoSelecionado = filterAprovado.value;

  let q = collection(db, "compras"); 

  if (prioridadeSelecionada) {
    q = query(q, where("prioridade", "==", prioridadeSelecionada));
  }
  if (aprovadoSelecionado !== "") {
    const isAprovado = aprovadoSelecionado === "true";
    q = query(q, where("aprovado", "==", isAprovado));
  }

  q = query(q, orderBy("inserido_em", "desc"));

  // onSnapshot escuta as mudanças em tempo real e armazena a função de desinscrição
  unsubscribeFirestore = onSnapshot(q, (snapshot) => {
    const itemsToDisplay = [];

    snapshot.forEach((docItem) => {
      const item = docItem.data();
      item.id = docItem.id; 

      if (termoBusca && !item.item.toLowerCase().includes(termoBusca)) {
        return; 
      }

      itemsToDisplay.push(item); 
    });

    lista.innerHTML = ""; 

    itemsToDisplay.forEach(item => {
      const li = document.createElement("li");
      li.dataset.prioridade = item.prioridade; 

      const itemTextSpan = document.createElement("span");
      itemTextSpan.classList.add("item-text");
      let displayText = `${item.item} (${item.prioridade})`;
      if (item.valor) {
        displayText += ` - ${formatarMoeda(item.valor)}`;
      }
      if (item.parcelamento !== undefined && item.parcelamento !== null && item.parcelamento > 0) {
        displayText += ` (${item.parcelamento}x)`;
      } else if (item.parcelamento === 0) {
        displayText += ` (À vista)`;
      }
      itemTextSpan.textContent = displayText;

      if (item.concluido) {
        itemTextSpan.classList.add('item-concluido-from-db');
      }

      const buttonGroupDiv = document.createElement("div");
      buttonGroupDiv.classList.add("button-group");

      if (item.aprovado) {
        li.classList.add('item-aprovado');
      }

      const selectParcelamento = document.createElement('select');
      selectParcelamento.classList.add('parcelamento-select');
      selectParcelamento.title = 'Número de parcelas';
      for (let i = 0; i <= 10; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = i === 0 ? 'À vista' : `${i}x`;
        selectParcelamento.appendChild(option);
      }
      selectParcelamento.value = item.parcelamento !== undefined && item.parcelamento !== null ? item.parcelamento : 0;
      selectParcelamento.onchange = async () => {
        // Garante que o usuário está logado para escrever
        if (!auth.currentUser) { alert("Você precisa estar logado para editar itens."); return; }
        const newParcelamento = parseInt(selectParcelamento.value, 10);
        await updateDoc(doc(db, "compras", item.id), { parcelamento: newParcelamento });
      };

      const checkboxAprovado = document.createElement("input");
      checkboxAprovado.type = "checkbox";
      checkboxAprovado.title = "Marcar como aprovado";
      checkboxAprovado.classList.add("aprovado-checkbox");
      checkboxAprovado.checked = item.aprovado;
      checkboxAprovado.onchange = async () => {
        // Garante que o usuário está logado para escrever
        if (!auth.currentUser) { alert("Você precisa estar logado para editar itens."); return; }
        await updateDoc(doc(db, "compras", item.id), { aprovado: checkboxAprovado.checked });
      };

      const btnConcluir = document.createElement("button");
      btnConcluir.classList.add("concluir-toggle-button");
      btnConcluir.innerHTML = item.concluido ? '<i class="fi fi-br-truck-side"></i>' : '<i class="fi fi-br-check"></i>';
      btnConcluir.title = item.concluido ? "Desmarcar como concluído" : "Marcar como concluído";
      btnConcluir.onclick = async () => {
        // Garante que o usuário está logado para escrever
        if (!auth.currentUser) { alert("Você precisa estar logado para editar itens."); return; }
        await updateDoc(doc(db, "compras", item.id), { concluido: !item.concluido });
      };

      const btnExcluir = document.createElement("button");
      btnExcluir.innerHTML = '<i class="fi fi-br-trash"></i>';
      btnExcluir.title = "Excluir item";
      btnExcluir.onclick = async () => {
        // Garante que o usuário está logado para escrever
        if (!auth.currentUser) { alert("Você precisa estar logado para excluir itens."); return; }
        await deleteDoc(doc(db, "compras", item.id));
      };

      buttonGroupDiv.appendChild(selectParcelamento);
      buttonGroupDiv.appendChild(checkboxAprovado);
      buttonGroupDiv.appendChild(btnConcluir);
      buttonGroupDiv.appendChild(btnExcluir);

      li.appendChild(itemTextSpan);
      li.appendChild(buttonGroupDiv);

      lista.appendChild(li);
    });

  }, (error) => {
    console.error("Erro ao carregar compras (onSnapshot):", error);
    // Remover o alert se o erro for de permissão porque o usuário não está logado
    // alert("Erro ao carregar compras em tempo real. Verifique seus índices do Firestore no console.");
  });
}

/**
 * Adiciona um novo item à coleção 'compras' no Firestore.
 */
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const item = document.getElementById("item").value.trim();
  const prioridade = document.getElementById("prioridade").value;
  const valor = document.getElementById("valor").value.trim(); 
  const parcelamento = 0; // Default 0 quando adicionado via formulário

  // Garante que o usuário está logado antes de tentar adicionar
  if (!auth.currentUser) {
      alert("Você precisa estar logado para adicionar itens.");
      return;
  }

  if (!item) {
    alert("O nome do item não pode ser vazio.");
    return;
  }

  try {
    await addDoc(collection(db, "compras"), {
      item: item,
      prioridade: prioridade,
      valor: valor,
      parcelamento: parcelamento,
      concluido: false, 
      aprovado: false,   
      inserido_em: new Date(), 
      userId: auth.currentUser.uid // NOVO: Armazena o ID do usuário que criou o item
    });
    form.reset();
  } catch (error) {
    console.error("Erro ao adicionar compra:", error);
    alert("Erro ao adicionar compra: " + error.message);
  }
});

// Adiciona listeners para os eventos de mudança nos filtros
filterPrioridade.addEventListener("change", carregarCompras);
searchItem.addEventListener("input", carregarCompras); 
filterAprovado.addEventListener("change", carregarCompras);

// Remove a chamada inicial de carregarCompras(), onAuthStateChanged cuidará disso.
// carregarCompras(); 
