# Cápsula em grupo na Web

A criação de cápsula permite escolher entre individual e em grupo, e a rota `/capsulas/entrar` permite entrar em uma cápsula em grupo com um código de convite. Na data de entrega, a cápsula em grupo vai para o e-mail de todos os participantes, e cada pessoa, inclusive quem criou, pode deixar 1 texto e 1 imagem. A listagem e o detalhe exibem o selo **Grupo** e os participantes, e o código de convite aparece no detalhe apenas para o criador.

A interface já faz as chamadas reais pelo `capsuleService`, sem dados simulados. O backend dessa funcionalidade está em desenvolvimento, então **o contrato abaixo é uma suposição** e precisa ser confirmado na integração.

## Regras assumidas

Pontos que a regra de negócio não define e que a Web assumiu, a confirmar:

- O anexo é uma imagem (JPEG, PNG ou WebP), os únicos tipos que `POST /api/capsules/{id}/files` aceita hoje.
- O texto é obrigatório na contribuição e a imagem é opcional.
- Depois de enviado, o texto não pode ser alterado. Quem enviou sem imagem ainda pode anexar uma até o prazo.
- As contribuições ficam lacradas até a entrega: antes dela, cada pessoa vê só a própria, e a lista de participantes indica quem já contribuiu.
- O prazo vale para entrar na cápsula e para contribuir.

## Contrato esperado da API

### `POST /api/capsules`

Corpo de uma cápsula em grupo, com `type` e `contributionDeadline` e **sem** `recipientEmail`, já que a entrega vai para todos os participantes. O `text` é a contribuição do criador:

```json
{
  "title": "Turma 2026",
  "text": "Mensagem",
  "scheduleDate": "2026-12-31T12:00:00.000Z",
  "type": "GROUP",
  "contributionDeadline": "2026-12-01T12:00:00.000Z"
}
```

A cápsula individual continua **com** `recipientEmail` e **sem** `type` e `contributionDeadline`. O `createCapsuleSchema` atual usa `strictObject` e responde `422` a campos desconhecidos, então enviar `type: "INDIVIDUAL"` quebraria a criação individual. O backend de grupo precisa assumir `INDIVIDUAL` quando `type` não vier.

### `POST /api/capsules/join`

```json
{ "inviteCode": "ABC123" }
```

A resposta precisa trazer ao menos o `id` da cápsula, usado para abrir o detalhe. Em erro (código inválido, prazo encerrado), a Web mostra a `message` da API em um toast, no formato de erro padrão do contrato. Um erro de validação em `details` com `field: "inviteCode"` também é marcado no campo.

### `POST /api/capsules/{id}/contributions`

Salva o texto da pessoa autenticada. Em erro, a Web mostra a `message` em um toast, e um erro de validação com `field: "text"` também é marcado no campo.

```json
{ "text": "Minha mensagem" }
```

### `POST /api/capsules/{id}/files`

É o mesmo upload de hoje. Em cápsula em grupo, a imagem é a da contribuição de quem enviou, com o limite de 1 por pessoa. A Web envia o texto primeiro e a imagem depois, então uma falha na imagem não perde o texto.

### Cápsula nas respostas

Campos adicionais em `POST /api/capsules`, `POST /api/capsules/join`, `GET /api/capsules/{id}` e nos itens de `GET /api/capsules`, exceto onde indicado:

| Campo | Tipo | Uso na Web |
| --- | --- | --- |
| `type` | `"INDIVIDUAL"` ou `"GROUP"` | Selo **Grupo**. Ausente é tratado como individual |
| `contributionDeadline` | ISO 8601 em UTC ou `null` | Prazo exibido no detalhe e abertura do formulário de contribuição |
| `inviteCode` | string ou `null` | Código exibido ao criar e no detalhe. A API deve enviá-lo só para o criador |
| `participants` | `{ id, name, isCreator, hasContributed }[]` | Lista no detalhe, resumo no card e identificação do criador |
| `myContribution` | `{ id, text, file }` ou `null` | Contribuição de quem está autenticado. Só no detalhe |
| `recipientEmail` | `null` em grupo | Não é exibido em grupo; a Web mostra "Todos os participantes" |

A listagem funciona sem `participants`, apenas sem o resumo de nomes. Já o detalhe depende do campo: a Web compara `participants[].id` com o usuário da sessão e `isCreator` para decidir se mostra o código de convite e o botão de excluir. Sem essa informação, o código fica oculto, mesmo que a API o envie.

Em grupo, o detalhe não exibe `text` nem `files`. A API não deve enviar o conteúdo dos outros participantes antes da entrega, já que a resposta seria visível nas ferramentas do navegador. `files` continua sendo um array, mesmo vazio.

### `GET /api/public/capsules/{token}`

Em cápsula em grupo, a resposta traz também `contributions`, e a página pública mostra um bloco por pessoa no lugar da mensagem:

```json
{
  "contributions": [
    { "id": "...", "authorName": "Ana Lima", "text": "Mensagem", "file": null }
  ]
}
```

## O que fica com o backend

- Enviar o e-mail da entrega para todos os participantes, cada um com seu link para `/c/:token`. Hoje o job envia para um único `recipientEmail`.
- Bloquear entrada e contribuição depois do prazo, e aplicar o limite de 1 texto e 1 imagem por pessoa. A Web só orienta o usuário; quem garante a regra é a API.

## Pontos de ajuste na integração

Se o backend definir nomes diferentes, os ajustes ficam concentrados em:

- `src/types/capsule.ts`: formato dos campos.
- `src/services/capsuleService.ts`: `joinCapsule` e `contributeToCapsule`, com as rotas e os nomes dos campos.
- `src/utils/capsuleGroup.ts`: como identificar o criador.

## Comportamento até o backend ficar pronto

- Cápsulas individuais funcionam normalmente.
- Criar uma cápsula em grupo recebe `422` da API atual, e a mensagem aparece no campo de prazo.
- Entrar com código recebe `404` da API atual, e a mensagem aparece em um toast.

## Validação

Execute `npm test`. Os testes das telas ficam em `tests/NovaCapsulaPage.test.tsx`, `tests/EntrarCapsulaPage.test.tsx`, `tests/CapsulaEmGrupo.test.tsx`, `tests/CapsuleContribution.test.tsx` e `tests/CapsulaPublicaPage.test.tsx`. As regras e o serviço ficam em `tests/capsuleValidation.test.ts`, `tests/capsuleGroup.test.ts` e `tests/groupCapsuleService.test.ts`.
