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

// Obtenha referências aos elementos do DOM
const form = document.getElementById("form-compras");
const lista = document.getElementById("lista-compras");
const filterPrioridade = document.getElementById("filter-prioridade");
const searchItem = document.getElementById("search-item");
const filterAprovado = document.getElementById("filter-aprovado");

/**
 * Carrega a lista de compras do Firestore, aplicando filtros e ouvindo atualizações em tempo real.
 */
function carregarCompras() {
  const prioridadeSelecionada = filterPrioridade.value;
  const termoBusca = searchItem.value.trim();
  const aprovadoSelecionado = filterAprovado.value;

  let q = collection(db, "compras"); // Refere-se à coleção 'compras'

  // Aplica filtros
  if (prioridadeSelecionada) {
    q = query(q, where("prioridade", "==", prioridadeSelecionada));
  }
  if (aprovadoSelecionado !== "") {
    const isAprovado = aprovadoSelecionado === "true";
    q = query(q, where("aprovado", "==", isAprovado));
  }
  // Firebase Firestore não suporta busca case-insensitive direta como o Supabase.
  // Para buscar por item, precisaríamos de uma abordagem diferente (ex: Elastic Search, ou buscar tudo e filtrar no cliente).
  // Por simplicidade, se houver termo de busca, vamos pular a filtragem no DB por enquanto,
  // ou você teria que buscar tudo e filtrar no cliente se a busca for essencial.
  // Para uma busca mais robusta, você precisaria de um serviço como Algolia ou uma Cloud Function.
  // Por ora, o filtro de busca no DB foi removido para evitar complexidade.
  // Se quiser manter o filtro, ele precisaria ser feito no cliente após a busca.
  // if (termoBusca) {
  //   q = query(q, where("item", ">=", termoBusca), where("item", "<=", termoBusca + '\uf8ff'));
  // }


  // Ordena os resultados pela data de inserção
  q = query(q, orderBy("inserido_em", "desc"));

  // onSnapshot escuta as mudanças em tempo real
  onSnapshot(q, (snapshot) => {
    lista.innerHTML = ""; // Limpa a lista antes de renderizar
    snapshot.forEach((docItem) => {
      const item = docItem.data();
      const li = document.createElement("li");
      li.dataset.prioridade = item.prioridade; // Para estilização de prioridade no CSS

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

      // Adiciona classe para itens concluídos
      if (item.concluido) {
        itemTextSpan.classList.add('item-concluido-from-db');
      }

      const buttonGroupDiv = document.createElement("div");
      buttonGroupDiv.classList.add("button-group");

      // Adiciona classe para itens aprovados
      if (item.aprovado) {
        li.classList.add('item-aprovado');
      }

      // Select para Parcelamento
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
        const newParcelamento = parseInt(selectParcelamento.value, 10);
        await updateDoc(doc(db, "compras", docItem.id), { parcelamento: newParcelamento });
        // onSnapshot cuidará da recarga visual, não precisamos chamar carregarCompras()
      };

      // Checkbox para Aprovado
      const checkboxAprovado = document.createElement("input");
      checkboxAprovado.type = "checkbox";
      checkboxAprovado.title = "Marcar como aprovado";
      checkboxAprovado.classList.add("aprovado-checkbox");
      checkboxAprovado.checked = item.aprovado;
      checkboxAprovado.onchange = async () => {
        await updateDoc(doc(db, "compras", docItem.id), { aprovado: checkboxAprovado.checked });
        // onSnapshot cuidará da recarga visual
      };

      // Botão Concluir
      const btnConcluir = document.createElement("button");
      btnConcluir.classList.add("concluir-toggle-button");
      btnConcluir.innerHTML = item.concluido ? '<i class="fi fi-ss-thumbs-up-trust"></i>' : '<i class="fi fi-br-check"></i>';
      btnConcluir.title = item.concluido ? "Desmarcar como concluído" : "Marcar como concluído";
      btnConcluir.onclick = async () => {
        await updateDoc(doc(db, "compras", docItem.id), { concluido: !item.concluido });
        // onSnapshot cuidará da recarga visual
      };

      // Botão Excluir
      const btnExcluir = document.createElement("button");
      btnExcluir.innerHTML = '<i class="fi fi-br-cross"></i>';
      btnExcluir.title = "Excluir item";
      btnExcluir.onclick = async () => {
        await deleteDoc(doc(db, "compras", docItem.id));
        // onSnapshot cuidará da recarga visual
      };

      buttonGroupDiv.appendChild(selectParcelamento);
      buttonGroupDiv.appendChild(checkboxAprovado);
      buttonGroupDiv.appendChild(btnConcluir);
      buttonGroupDiv.appendChild(btnExcluir);

      li.appendChild(itemTextSpan);
      li.appendChild(buttonGroupDiv);

      lista.appendChild(li);
    });

    // Se houver termo de busca, filtre no cliente (Firestore não faz ilike como Supabase)
    // Isso é uma simplificação. Para grandes volumes, considere Algolia ou Cloud Functions.
    if (termoBusca) {
      const filteredItems = Array.from(lista.children).filter(liElement => {
        const itemText = liElement.querySelector('.item-text').textContent.toLowerCase();
        return itemText.includes(termoBusca.toLowerCase());
      });
      lista.innerHTML = '';
      filteredItems.forEach(item => lista.appendChild(item));
    }

  }, (error) => {
    console.error("Erro ao carregar compras (onSnapshot):", error);
    alert("Erro ao carregar compras em tempo real.");
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
      concluido: false, // Novo item inicia não concluído
      aprovado: false,   // Novo item inicia não aprovado
      inserido_em: new Date(), // Timestamp para ordenação
    });
    form.reset();
  } catch (error) {
    console.error("Erro ao adicionar compra:", error);
    alert("Erro ao adicionar compra.");
  }
  // onSnapshot cuidará da recarga visual, não precisamos chamar carregarCompras()
});

// Adiciona listeners para os eventos de mudança nos filtros
filterPrioridade.addEventListener("change", carregarCompras);
searchItem.addEventListener("input", carregarCompras);
filterAprovado.addEventListener("change", carregarCompras);

// Inicia o carregamento e a escuta em tempo real quando a página é carregada
carregarCompras();
