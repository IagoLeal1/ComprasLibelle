// Importe o createClient do Supabase-JS para módulos ES
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// Suas chaves Supabase (mantenha-as em segurança em um ambiente de produção!)
const SUPABASE_URL = "https://svzzeihcnxtjwvvyvwih.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN2enplaWhjbnh0and2dnl2d2loIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk3MzU3OTcsImV4cCI6MjA2NTMxMTc5N30.q_9aNkQD8rYy2IZ27PmyyXHZVMkU_F7tEcnWyLtrtlg";

// Inicialize o cliente Supabase uma única vez
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
 * Carrega a lista de compras do Supabase, aplicando filtros.
 * A lista é atualizada em tempo real na interface.
 */
async function carregarCompras() {
  const prioridadeSelecionada = filterPrioridade.value;
  const termoBusca = searchItem.value.trim();
  const aprovadoSelecionado = filterAprovado.value;

  let query = supabase.from("compras").select("*");

  if (prioridadeSelecionada) {
    query = query.eq("prioridade", prioridadeSelecionada);
  }

  if (aprovadoSelecionado !== "") {
    const isAprovado = aprovadoSelecionado === "true";
    query = query.eq("aprovado", isAprovado);
  }

  if (termoBusca) {
    query = query.ilike("item", `%${termoBusca}%`);
  }

  const { data, error } = await query.order("inserido_em", { ascending: false });

  if (error) {
    console.error("Erro ao carregar compras:", error);
    alert("Erro ao carregar compras");
    return;
  }

  lista.innerHTML = "";
  data.forEach(item => {
    const li = document.createElement("li");
    li.dataset.prioridade = item.prioridade;

    const itemTextSpan = document.createElement("span");
    itemTextSpan.classList.add("item-text");
    let displayText = `${item.item} (${item.prioridade})`;
    if (item.valor) {
      displayText += ` - ${formatarMoeda(item.valor)}`;
    }
    // Mostra o parcelamento se ele existir e for diferente de 0
    if (item.parcelamento !== undefined && item.parcelamento !== null && item.parcelamento > 0) {
      displayText += ` (${item.parcelamento}x)`;
    } else if (item.parcelamento === 0) { // Para o caso de 0, exibir "À vista"
      displayText += ` (À vista)`;
    }
    itemTextSpan.textContent = displayText;

    if (item.concluido) {
      itemTextSpan.classList.add('item-concluido-from-db');
    }

    const buttonGroupDiv = document.createElement("div");
    buttonGroupDiv.classList.add("button-group");

    // === Select para Parcelamento (por item, editável) ===
    const selectParcelamento = document.createElement('select');
    selectParcelamento.classList.add('parcelamento-select');
    selectParcelamento.title = 'Número de parcelas';

    // Cria opções de 0 a 10
    for (let i = 0; i <= 10; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = i === 0 ? 'À vista' : `${i}x`;
        selectParcelamento.appendChild(option);
    }
    // Define o valor inicial do select com o valor do item ou 0
    selectParcelamento.value = item.parcelamento !== undefined && item.parcelamento !== null ? item.parcelamento : 0;

    // Evento de mudança para atualizar o DB
    selectParcelamento.onchange = async () => {
        const newParcelamento = parseInt(selectParcelamento.value, 10);
        const { error: updateError } = await supabase
            .from("compras")
            .update({ parcelamento: newParcelamento })
            .eq("id", item.id); // Atualiza o item correto pelo ID

        if (updateError) {
            console.error("Erro ao atualizar parcelamento:", updateError);
            alert("Erro ao atualizar parcelamento.");
        }
        carregarCompras(); // Recarrega a lista para refletir a mudança
    };
    // =========================================================

    const checkboxAprovado = document.createElement("input");
    checkboxAprovado.type = "checkbox";
    checkboxAprovado.title = "Marcar como aprovado";
    checkboxAprovado.classList.add("aprovado-checkbox");

    checkboxAprovado.checked = item.aprovado; 

    if (checkboxAprovado.checked) {
      li.classList.add('item-aprovado');
    }

    checkboxAprovado.onchange = async () => {
      const { error: updateError } = await supabase
        .from("compras")
        .update({ aprovado: checkboxAprovado.checked })
        .eq("id", item.id);

      if (updateError) {
        console.error("Erro ao atualizar item (aprovado):", updateError);
        alert("Erro ao atualizar item.");
      }
      carregarCompras();
    };

    const btnConcluir = document.createElement("button");
    btnConcluir.classList.add("concluir-toggle-button");
    btnConcluir.innerHTML = item.concluido ? '<i class="fi fi-br-truck-side"></i>' : '<i class="fi fi-br-check"></i>';
    btnConcluir.title = "Desmarcar como concluído";
    btnConcluir.onclick = async () => {
      const { error: updateError } = await supabase
        .from("compras")
        .update({ concluido: !item.concluido })
        .eq("id", item.id);

      if (updateError) {
        console.error("Erro ao atualizar item (concluir):", updateError);
        alert("Erro ao atualizar item.");
      }
      carregarCompras();
    };

    const btnExcluir = document.createElement("button");
    btnExcluir.innerHTML = '<i class="fi fi-br-trash"></i>';
    btnExcluir.title = "Excluir item";
    btnExcluir.onclick = async () => {
      const { error: deleteError } = await supabase
        .from("compras")
        .delete()
        .eq("id", item.id);

      if (deleteError) {
        console.error("Erro ao excluir item:", deleteError);
        alert("Erro ao excluir item.");
      }
      carregarCompras();
    };

    // Ordem dos elementos no buttonGroupDiv: Parcelamento, Aprovado, Concluir, Excluir
    buttonGroupDiv.appendChild(selectParcelamento); // Adiciona o select de parcelamento
    buttonGroupDiv.appendChild(checkboxAprovado);
    buttonGroupDiv.appendChild(btnConcluir);
    buttonGroupDiv.appendChild(btnExcluir);

    li.appendChild(itemTextSpan);
    li.appendChild(buttonGroupDiv);

    lista.appendChild(li);
  });
}

/**
 * Adiciona um novo item à lista de compras quando o formulário é submetido.
 */
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const item = document.getElementById("item").value.trim();
  const prioridade = document.getElementById("prioridade").value;
  const valor = document.getElementById("valor").value.trim(); 
  // Define parcelamento como 0 por padrão ao adicionar novo item,
  // já que o input foi removido do formulário.
  const parcelamento = 0; 

  if (!item) {
    alert("O nome do item não pode ser vazio.");
    return;
  }

  // Incluindo o 'valor' e 'parcelamento' na inserção
  const { error } = await supabase.from("compras").insert([{ item, prioridade, valor, parcelamento }]);

  if (error) {
    console.error("Erro ao adicionar compra:", error);
    alert("Erro ao adicionar compra. Verifique se o valor da prioridade e parcelamento estão corretos.");
  }

  form.reset();
  carregarCompras();
});

filterPrioridade.addEventListener("change", carregarCompras);
searchItem.addEventListener("input", carregarCompras);
filterAprovado.addEventListener("change", carregarCompras);

carregarCompras();
