# Cápsula do Tempo — Aplicação Web

Interface web do sistema Cápsula do Tempo, construída em React. Consome a API REST do projeto e oferece o fluxo completo de criação, agendamento e visualização de cápsulas.

---

## Sobre o projeto

Cápsula do Tempo é um sistema que permite escrever uma mensagem hoje e recebê-la em uma data futura. O usuário cria uma cápsula com texto, imagens e arquivos, escolhe quando ela deve ser entregue e para quem — para si mesmo ou para outra pessoa. Na data agendada, o sistema envia automaticamente um e-mail com um link que abre a cápsula.

A ideia é a de uma carta para o futuro: algo guardado deliberadamente, que só se revela quando o momento chega.

### O que o sistema faz

- Cadastro e autenticação de usuários com e-mail e senha
- Criação de cápsulas com texto, imagens e arquivos anexos
- Agendamento de uma data futura para entrega
- Escolha do destinatário: o próprio usuário ou um terceiro, identificado por e-mail
- Edição e cancelamento de cápsulas ainda não entregues
- Envio automático por e-mail na data agendada, sem intervenção manual
- Visualização da cápsula por quem a recebeu, sem necessidade de ter conta no sistema
- Listagem das cápsulas criadas, com acompanhamento do status de cada uma

---

## Arquitetura do sistema

O sistema é composto por três aplicações independentes que se comunicam exclusivamente por meio de uma API REST:

| Repositório | Aplicação | Stack |
|---|---|---|
| `backend` | API REST | Node.js · Express · TypeScript · Prisma |
| `frontend` | Aplicação web (este repositório) | React · TypeScript · Vite |
| `mobile` | Aplicativo mobile | Expo · React Native · TypeScript |

A API concentra toda a regra de negócio, a persistência e a orquestração de armazenamento e envio. Web e mobile são camadas de apresentação: não possuem lógica de negócio própria e consomem os mesmos endpoints.

### Serviços de apoio

- **PostgreSQL** — usuários, cápsulas e metadados dos arquivos
- **MinIO** — armazenamento de objetos para imagens e arquivos, compatível com a API do Amazon S3
- **Resend** — envio transacional dos e-mails de entrega

### Como funciona a entrega agendada

A API executa um job a cada hora que consulta as cápsulas cuja data de entrega já passou e que ainda não foram enviadas. Para cada uma, dispara o e-mail e atualiza o status.

O e-mail não carrega os arquivos como anexo — carrega um link para uma página desta aplicação, identificada por um token de acesso. Isso contorna os limites de tamanho de anexo dos provedores de e-mail e permite que o acesso ao conteúdo continue sob controle do sistema.

Os arquivos ficam em bucket privado. Quando alguém abre a cápsula, a API gera sob demanda uma URL assinada e temporária para cada arquivo. O link do e-mail é permanente; o acesso direto ao arquivo não é.

---

## Tecnologias desta aplicação

| Ferramenta | Uso |
|---|---|
| React | Biblioteca de interface |
| TypeScript | Tipagem estática |
| Vite | Build e servidor de desenvolvimento |
| React Router | Roteamento, incluindo a rota pública de visualização |
| Axios | Cliente HTTP para consumo da API |
| ESLint | Padronização de código |

---

## Como executar

### Pré-requisitos

- Node.js 20 ou superior
- A API (`backend`) em execução, com PostgreSQL e MinIO disponíveis

Para subir a API e seus serviços, consulte o README de `backend`. O ambiente completo sobe com Docker Compose.

### Instalação

```bash
git clone <url-do-repositorio>
cd frontend
npm install
```

### Variáveis de ambiente

Copie o arquivo de exemplo e ajuste conforme necessário:

```bash
cp .env.example .env
```

| Variável | Descrição | Valor local |
|---|---|---|
| `VITE_API_URL` | Endereço base da API | `http://localhost:3000` |

A URL da API nunca deve ser fixada no código. Toda chamada passa pelo cliente HTTP configurado a partir desta variável.

### Execução

```bash
npm run dev      # servidor de desenvolvimento
npm run build    # build de produção
npm run preview  # pré-visualização do build
npm run lint     # verificação de padrões de código
```

A aplicação fica disponível em `http://localhost:5173`.

---

## Estrutura do projeto

```
src/
├── components/     Componentes reutilizáveis de interface
├── pages/          Telas, uma por rota
├── routes/         Definição de rotas e proteção de acesso
├── services/       Cliente HTTP e chamadas à API
├── hooks/          Hooks customizados
├── contexts/       Contexto de autenticação
├── styles/         Tokens de design e estilos globais
└── types/          Tipos compartilhados
```

### Rotas

| Rota | Acesso | Descrição |
|---|---|---|
| `/login` | Público | Autenticação |
| `/cadastro` | Público | Criação de conta |
| `/capsulas` | Autenticado | Listagem das cápsulas do usuário |
| `/capsulas/nova` | Autenticado | Criação de cápsula |
| `/capsulas/:id` | Autenticado | Detalhe e edição |
| `/c/:token` | Público | Visualização da cápsula recebida por e-mail |

A rota `/c/:token` é a única rota pública que exibe conteúdo. Ela existe porque o destinatário de uma cápsula pode não ter conta no sistema — o acesso é concedido pelo token contido no link, não por autenticação.

---

## Autenticação

A API emite um token JWT no login. Esse token é armazenado no navegador e enviado no cabeçalho de autorização em todas as requisições a rotas protegidas.

Rotas autenticadas redirecionam para o login quando não há sessão válida. A sessão persiste entre recarregamentos da página.

---

## Design

A interface segue o Documento de Design de Interface do projeto. Os valores abaixo são os tokens utilizados.

### Cores

| Token | Valor | Uso |
|---|---|---|
| Índigo profundo | `#2B2456` | Títulos, textos de destaque |
| Índigo primário | `#4C4099` | Botões, links, elementos ativos |
| Índigo claro | `#EDEBF7` | Fundos de destaque |
| Âmbar | `#D99A2B` | Elemento simbólico da marca |
| Fundo | `#FAF9F6` | Plano de fundo das telas |
| Superfície | `#FFFFFF` | Cartões e campos |
| Borda | `#E5E3DC` | Divisórias e contornos |
| Texto secundário | `#6B6A64` | Metadados e rótulos |

### Estados da cápsula

| Estado | Fundo | Texto |
|---|---|---|
| Agendada | `#FBF1DF` | `#6B4A0A` |
| Enviada | `#E1F5EE` | `#0F6E56` |
| Falha no envio | `#FCEBEB` | `#A32D2D` |

### Decisões relevantes

- O bloco de agendamento recebe destaque visual maior que os demais campos do formulário. É a data de entrega que diferencia o produto de um editor de texto comum.
- A barra de consumo do limite de tamanho aparece desde o primeiro anexo, não apenas quando o limite é atingido. Descobrir o limite só ao tentar salvar é a pior experiência possível para quem já escreveu tudo.
- A página pública de visualização tem tratamento visual distinto do restante da aplicação. É a tela vista por quem recebeu a cápsula, muitas vezes sem nunca ter usado o sistema.

---

## Limites do sistema

| Limite | Valor padrão |
|---|---|
| Tamanho por arquivo | 20 MB |
| Tamanho total por cápsula | 50 MB |
| Validade da URL de download | 1 hora |

Os limites são validados pela API, mas também devem ser verificados nesta aplicação antes do envio, para que o usuário receba retorno imediato.

---

## Fluxo de contribuição

O desenvolvimento segue ciclos semanais, com planejamento às segundas e revisão às sextas. As tarefas são rastreadas no Linear.

1. Crie a branch a partir do nome sugerido pela issue no Linear
2. Faça commits referenciando o identificador da issue
3. Abra um Pull Request para `main` referenciando a issue com `Fixes CAP-00`
4. Aguarde revisão antes do merge

O Linear atualiza o status da issue automaticamente conforme o Pull Request avança.

---

## Escopo

Esta entrega corresponde ao MVP do sistema. A funcionalidade de cápsulas coletivas, em que um grupo de usuários contribui para uma mesma cápsula entregue a todos os membros, foi deliberadamente adiada após a estimativa de capacidade da equipe, e está registrada como trabalho futuro na documentação do projeto.

---

## Documentação

A documentação de engenharia e de gestão do projeto está disponível no repositório de documentação:

- Documento de Visão Geral
- Documento de Requisitos
- Documento de Arquitetura de Software
- Documento de Modelagem de Dados
- Documento de Design de Interface
- Plano de Projeto
