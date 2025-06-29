🛍️ Lista de Compras para a Casa Libelle
📋 Visão Geral
Este é um aplicativo de Lista de Compras com Supabase para gerenciamento de itens, incluindo prioridade, valor, parcelamento, e status de aprovação/conclusão.

✨ Funcionalidades Principais
Gerenciamento de Itens: Adicione, edite (prioridade, valor, parcelamento) e exclua itens.

Status do Item: Marque itens como "Aprovado" (salvo no DB, com destaque visual e texto "APROVADO!!!") e "Concluído" (salvo no DB, com texto riscado).

Detalhes Financeiros: Exibe valor formatado (R$) e parcelamento (Nx ou "À vista").

Filtros e Busca: Filtre por prioridade, status de aprovação e pesquise por nome do item.

Ícones Visuais: Utiliza Flaticon UIcons para feedback visual.

🚀 Tecnologias
Frontend: HTML5, CSS3, JavaScript (ESM), Flaticon UIcons.

Backend: Supabase (PostgreSQL para dados, gerenciamento de API).

⚙️ Configuração
Para executar o projeto:

1. Supabase
Crie Projeto: Vá ao Painel do Supabase, crie um projeto e anote sua URL e ANON_KEY (Settings > API).

Crie Tabela compras:

No Table Editor, crie compras com colunas:

id: uuid (PK, default gen_random_uuid())

inserido_em: timestamp with time zone (default now())

item: text

prioridade: text

concluido: boolean (default FALSE)

aprovado: boolean (default FALSE)

valor: text

parcelamento: integer (default 0)

Desative RLS (para desenvolvimento simples): Em Authentication > Policies, desative o RLS para a tabela compras. (Atenção: Para produção, mantenha RLS e configure políticas seguras.)

CORS: O Supabase já permite * para a REST API. Erros de CORS em local geralmente são por "mixed content" (HTTP vs HTTPS); hospedar em HTTPS (ex: Netlify) resolve.

2. Código Local
Crie os arquivos index.html, style.css, script.js em uma pasta.

Em script.js, substitua SUA_URL_DO_SUPABASE e SUA_ANON_KEY_DO_SUPABASE pelas suas chaves.

3. Execução Local
Use um servidor HTTP local para evitar problemas de CORS:

Node.js: npm install -g http-server então http-server (acesso via http://localhost:8080).

Python: python -m http.server (acesso via http://localhost:8000).

💡 Como Usar
Adicione itens, defina prioridade e valor. Use o checkbox para aprovar, o botão de ícone para concluir/desconcluir, o select para ajustar parcelas, e o ícone de cruz para excluir. Filtre por prioridade, aprovação, ou pesquise por nome.