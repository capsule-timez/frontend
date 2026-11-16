# Convite por e-mail para cápsula em grupo na Web

No detalhe de uma cápsula em grupo, quem a criou pode informar um ou mais e-mails e enviar convites. Logo abaixo do formulário fica a lista dos convites já enviados, com o e-mail e o status de cada um. Quem recebe o e-mail abre o link `/convite/:token`, entra na cápsula e vai direto para o detalhe dela. Sem login, a pessoa entra ou cria uma conta e depois volta ao convite.

A interface já faz as chamadas reais pelo `inviteService`, sem dados simulados. O backend dessa funcionalidade ainda está em desenvolvimento, então **o contrato abaixo é uma suposição** e precisa ser confirmado na integração.

## Regras assumidas

- Só quem criou a cápsula vê o formulário e a lista. Participantes e cápsulas individuais não veem nada disso.
- Só é possível convidar enquanto ainda dá para entrar na cápsula: status `SCHEDULED` e prazo de contribuições no futuro. Depois disso, a lista continua aparecendo, mas o formulário some.
- Os e-mails podem ser separados por vírgula, ponto e vírgula, espaço ou quebra de linha. Antes de enviar, a Web passa tudo para minúsculas, remove os repetidos e valida o formato.
- Cada convite serve uma vez só. Abrir o mesmo link depois de aceito mostra que o convite já foi utilizado.

## Contrato esperado da API

### `POST /api/capsules/{id}/invites`

```json
{ "emails": ["amiga@example.com", "colega@example.com"] }
```

A Web só olha o status da resposta e, em seguida, busca a lista de novo. Nos erros de validação (`400`), quando `details` aponta um campo que começa com `emails` (por exemplo, `emails.0`), a mensagem aparece no campo e no toast.

### `GET /api/capsules/{id}/invites`

Aceita a lista direto ou dentro de `data`:

```json
{
  "data": [
    { "id": "invite-1", "email": "amiga@example.com", "status": "PENDING" }
  ]
}
```

| Status | Exibido como |
| --- | --- |
| `PENDING` | Pendente |
| `ACCEPTED` | Aceito |
| `EXPIRED` | Expirado |

Qualquer outro status aparece como veio da API.

### `POST /api/invites/{token}/accept`

Sem corpo e com o token da sessão. A resposta precisa informar a cápsula para a Web abrir o detalhe:

```json
{ "capsuleId": "capsule-1" }
```

| Resposta | O que a Web mostra |
| --- | --- |
| `200` | Toast "Você entrou na cápsula!" e o detalhe da cápsula |
| `404` | "Este convite é inválido ou não está mais disponível." |
| `409` | "Este convite já foi utilizado." |
| `410` | "Este convite expirou." |
| Outro `4xx` | A `message` da API, ou a mensagem do `404` quando ela não vier |
| `401` | Encerra a sessão, pede login e volta ao convite |
| `5xx` ou falha de rede | A mensagem de erro e o botão **Tentar novamente** |

Quando a API manda uma `message` em qualquer `4xx`, a Web mostra essa mensagem no lugar do texto padrão. Nos casos sem nova tentativa, a tela orienta a pedir um novo convite a quem criou a cápsula.

## O que fica com o backend

- Gerar o token de uso único e enviar o e-mail com o link `{WEB_URL}/convite/{token}`.
- Definir a validade do convite e marcar o status como `ACCEPTED` ou `EXPIRED`.
- Recusar convites depois do prazo de contribuições e para quem já participa. A Web só orienta o usuário; quem garante a regra é a API.

## Fluxo de login

O `ProtectedRoute` guarda o caminho em `state.returnTo` ao mandar a pessoa para o login. Depois que ela entra ou cria a conta, o `PublicOnlyRoute` só volta para esse caminho quando ele é `/convite/:token` (`src/utils/inviteReturn.ts`). Os links entre login e cadastro, tanto no cartão quanto no cabeçalho, mantêm esse `state`. Enquanto há um convite à espera, os textos do login e do cadastro explicam que é preciso entrar para aceitá-lo.

## Pontos de ajuste na integração

- `src/services/inviteService.ts`: rotas, corpo e formato das respostas.
- `src/components/CapsuleInvites/CapsuleInvites.tsx`: rótulos de status e regra de quando o formulário aparece.
- `src/pages/ConvitePage.tsx`: mensagens por status de erro.

## Testar sem o backend

A API simulada na raiz do workspace (`api-simulada-grupo.mjs`) implementa as três rotas e mostra no console o link de cada convite. Os tokens `EXPIRADO` e `USADO` simulam os erros `410` e `409`.

## Validação

Execute `npm test`. Os testes das telas ficam em `tests/CapsuleInvites.test.tsx` e `tests/ConvitePage.test.tsx`, e os do serviço em `tests/inviteService.test.mjs`.
