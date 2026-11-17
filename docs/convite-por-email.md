# Convite por e-mail para cápsula em grupo na Web

No detalhe de uma cápsula em grupo, quem a criou pode informar um ou mais e-mails e enviar convites. Logo abaixo do formulário fica a lista dos convites já enviados, com o e-mail, a data de envio e o status de cada um. Quem recebe o e-mail abre o link `/convite/:token`, entra na cápsula e vai direto para o detalhe dela. Sem login, a pessoa entra ou cria uma conta e depois volta ao convite.

A Web segue o contrato do backend em `src/services/invite.service.ts`, vindo da branch `feature/ctz-76-implementar-convite-por-e-mail-para-capsula`, já mesclada no `main`.

## Regras da API

- Só o `OWNER` envia e lista convites. Para um `MEMBER`, a API responde `403`, e a Web nem mostra o cartão, porque só o dono recebe o `inviteCode`.
- O convite vale até o prazo para contribuições. Depois dele, enviar responde `409 CONTRIBUTION_DEADLINE_PASSED`, e a Web fecha o formulário.
- Cada requisição aceita de 1 a 20 e-mails. A API normaliza para minúsculas e junta repetidos; a Web faz o mesmo antes de enviar.
- Convidar de novo o mesmo e-mail gera um novo link e invalida o anterior.
- Cada link serve uma vez só.

## Contrato usado pela Web

### `POST /api/capsules/{id}/invites`

```json
{ "emails": ["amiga@example.com", "colega@example.com"] }
```

Resposta `201`, com o resultado de cada e-mail:

```json
{
  "invites": [
    { "email": "amiga@example.com", "result": "SENT" },
    { "email": "colega@example.com", "result": "ALREADY_MEMBER" }
  ]
}
```

| `result` | O que a Web mostra |
| --- | --- |
| `SENT` | Toast "Convite enviado!" ou "N convites enviados!" |
| `ALREADY_MEMBER` | Quem já participa aparece na descrição do toast. Se ninguém novo foi convidado, o toast diz "Nenhum convite novo" |
| `EMAIL_FAILED` | Toast de erro explicando que o convite ficou registrado, mas o e-mail não saiu |

Erros de validação (`422`) com `details` em `emails` ou `emails.N` aparecem no campo e no toast.

### `GET /api/capsules/{id}/invites`

```json
{
  "data": [
    {
      "email": "amiga@example.com",
      "status": "PENDING",
      "sentAt": "2026-11-13T12:00:00.000Z",
      "expiresAt": "2026-12-01T12:00:00.000Z",
      "acceptedAt": null
    }
  ]
}
```

Os itens não têm `id`; a Web usa o e-mail, que é único por cápsula.

| Status | Exibido como |
| --- | --- |
| `PENDING` | Pendente |
| `ACCEPTED` | Aceito |
| `EXPIRED` | Expirado |

### `POST /api/invites/{token}/accept`

Sem corpo e com o token da sessão. A resposta é o detalhe da cápsula, igual ao `GET /api/capsules/{id}`, e a Web usa o `id` dela para abrir o detalhe.

| Resposta | O que a Web mostra |
| --- | --- |
| `200` | Toast "Você entrou na cápsula!" e o detalhe da cápsula |
| `404` | "Este convite é inválido, expirou ou já foi utilizado." (a API não diferencia os três casos) |
| `409 CONTRIBUTION_DEADLINE_PASSED` | "O prazo para entrar nesta cápsula já terminou." |
| Outro `4xx` | A `message` da API, ou a mensagem do `404` quando ela não vier |
| `401` | Encerra a sessão, pede login e volta ao convite |
| `5xx` ou falha de rede | A mensagem de erro e o botão **Tentar novamente** |

Nos casos sem nova tentativa, a tela orienta a pedir um novo convite a quem criou a cápsula.

## Fluxo de login

O `ProtectedRoute` guarda o caminho em `state.returnTo` ao mandar a pessoa para o login. Depois que ela entra ou cria a conta, o `PublicOnlyRoute` só volta para esse caminho quando ele é `/convite/:token` (`src/utils/inviteReturn.ts`). Os links entre login e cadastro, tanto no cartão quanto no cabeçalho, mantêm esse `state`. Enquanto há um convite à espera, os textos do login e do cadastro explicam que é preciso entrar para aceitá-lo.

## Validação

Execute `npm test`. Os testes das telas ficam em `tests/CapsuleInvites.test.tsx` e `tests/ConvitePage.test.tsx`, e os do serviço em `tests/inviteService.test.mjs`.
