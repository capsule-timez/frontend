# Cápsula em grupo na Web

A criação de cápsula permite escolher entre individual e em grupo, e a rota `/capsulas/entrar` permite entrar em uma cápsula em grupo com um código de convite. A listagem e o detalhe exibem o selo **Grupo** e os participantes, e o código de convite aparece no detalhe apenas para o criador.

A interface já faz as chamadas reais pelo `capsuleService`, sem dados simulados. O backend dessa funcionalidade está em desenvolvimento, então **o contrato abaixo é uma suposição** e precisa ser confirmado na integração.

## Contrato esperado da API

### `POST /api/capsules`

Corpo de uma cápsula em grupo, com os campos de hoje mais `type` e `contributionDeadline`:

```json
{
  "title": "Turma 2026",
  "text": "Mensagem",
  "recipientEmail": "turma@example.com",
  "scheduleDate": "2026-12-31T12:00:00.000Z",
  "type": "GROUP",
  "contributionDeadline": "2026-12-01T12:00:00.000Z"
}
```

A cápsula individual continua **sem** `type` e `contributionDeadline`. O `createCapsuleSchema` atual usa `strictObject` e responde `422` a campos desconhecidos, então enviar `type: "INDIVIDUAL"` quebraria a criação individual. O backend de grupo precisa assumir `INDIVIDUAL` quando `type` não vier.

### `POST /api/capsules/join`

```json
{ "inviteCode": "ABC123" }
```

A resposta precisa trazer ao menos o `id` da cápsula, usado para abrir o detalhe. Em erro (código inválido, prazo encerrado), a Web mostra a `message` da API em um toast, no formato de erro padrão do contrato. Um erro de validação em `details` com `field: "inviteCode"` também é marcado no campo.

### Cápsula nas respostas

Campos adicionais em `POST /api/capsules`, `POST /api/capsules/join`, `GET /api/capsules/{id}` e nos itens de `GET /api/capsules`:

| Campo | Tipo | Uso na Web |
| --- | --- | --- |
| `type` | `"INDIVIDUAL"` ou `"GROUP"` | Selo **Grupo**. Ausente é tratado como individual |
| `contributionDeadline` | ISO 8601 em UTC ou `null` | Prazo exibido no detalhe |
| `inviteCode` | string ou `null` | Código exibido ao criar e no detalhe. A API deve enviá-lo só para o criador |
| `participants` | `{ id, name, isCreator }[]` | Lista no detalhe, resumo no card e identificação do criador |

A listagem funciona sem `participants`, apenas sem o resumo de nomes. Já o detalhe depende do campo: a Web compara `participants[].id` com o usuário da sessão e `isCreator` para decidir se mostra o código de convite e o botão de excluir. Sem essa informação, o código fica oculto, mesmo que a API o envie.

## Pontos de ajuste na integração

Se o backend definir nomes diferentes, os ajustes ficam concentrados em:

- `src/types/capsule.ts`: formato dos campos.
- `src/services/capsuleService.ts`: `joinCapsule`, com a rota e o nome do campo do código.
- `src/utils/capsuleGroup.ts`: como identificar o criador.

## Comportamento até o backend ficar pronto

- Cápsulas individuais funcionam normalmente.
- Criar uma cápsula em grupo recebe `422` da API atual, e a mensagem aparece no campo de prazo.
- Entrar com código recebe `404` da API atual, e a mensagem aparece em um toast.

## Validação

Execute `npm test`. Os testes das telas ficam em `tests/NovaCapsulaPage.test.tsx`, `tests/EntrarCapsulaPage.test.tsx` e `tests/CapsulaEmGrupo.test.tsx`. As regras e o serviço ficam em `tests/capsuleValidation.test.ts`, `tests/capsuleGroup.test.ts` e `tests/groupCapsuleService.test.ts`.
