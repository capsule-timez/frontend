# Cápsula em grupo na Web

A criação de cápsula permite escolher entre individual e em grupo. Na cápsula em grupo, quem cria define um prazo para contribuições e recebe um código de convite; quem tem o código entra pela rota `/capsulas/entrar` (ou por um convite por e-mail, veja [convite-por-email.md](convite-por-email.md)). Até o prazo, cada participante, inclusive quem criou, pode enviar quantas contribuições quiser, cada uma com texto, imagens ou os dois. Na data de entrega, a cápsula vai para o `recipientEmail` escolhido na criação, e a página pública mostra a mensagem de quem criou e todas as contribuições.

A Web segue o contrato implementado no backend (`src/services/capsule.service.ts`, `contribution.service.ts` e `publicCapsule.service.ts`), conferido também pelos testes do backend.

## Regras da API

- A cápsula em grupo exige `recipientEmail`, como a individual. A entrega vai só para esse e-mail.
- O prazo (`contributionDeadline`) precisa estar no futuro e antes da data de entrega. Depois dele, a API recusa entrar na cápsula e contribuir com `409 CONTRIBUTION_DEADLINE_PASSED`.
- Cada contribuição tem texto opcional de até 2.000 caracteres e até 3 imagens (JPEG, PNG ou WebP de até 10 MB). Ela precisa de texto ou de ao menos uma imagem, e não pode ser alterada depois.
- As contribuições são visíveis para todos os participantes no detalhe.
- Só quem criou anexa arquivos à cápsula (`POST /api/capsules/{id}/files`, até 5), exclui a cápsula e recebe o código de convite.

## Contrato usado pela Web

### `POST /api/capsules`

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

A cápsula individual vai sem `type` e sem `contributionDeadline`. Na resposta da cápsula em grupo vêm `type`, `contributionDeadline` e `inviteCode`.

### `GET /api/capsules` e `GET /api/capsules/{id}`

O detalhe e a listagem **não** trazem `type` nem `contributionDeadline`. A cápsula em grupo é a que traz `participants`:

```json
{
  "participants": [
    { "name": "Ana Lima", "role": "OWNER" },
    { "name": "Bruno Reis", "role": "MEMBER" }
  ],
  "contributions": [
    {
      "id": "…",
      "author": { "name": "Bruno Reis" },
      "text": null,
      "createdAt": "2026-11-10T12:00:00.000Z",
      "files": [{ "id": "…", "fileName": "foto.png", "downloadUrl": "…" }]
    }
  ],
  "inviteCode": "a1b2c3…"
}
```

`contributions` só vem no detalhe, e `inviteCode` só vem para o `OWNER`. Por isso a Web considera dono da cápsula quem recebe o `inviteCode` (`src/utils/capsuleGroup.ts`).

### `POST /api/capsules/join`

Corpo `{ "inviteCode": "…" }`. Responde o mesmo detalhe de `GET /api/capsules/{id}`, de onde a Web tira o `id` para abrir a cápsula. Código inexistente responde `404`.

### `POST /api/capsules/{id}/contributions`

Só texto vai em JSON (`{ "text": "…" }`). Com imagens, a Web manda `multipart/form-data` com o campo `text` (opcional) e as imagens no campo `files`, tudo numa requisição só. A resposta é a contribuição criada, e a Web recarrega o detalhe em seguida.

### `GET /api/public/capsules/{token}`

Traz `title`, `text`, `creatorName`, `sentAt` e os `files` da cápsula, mais `contributions` (no mesmo formato do detalhe) quando ela é em grupo.

## Limitações atuais do backend

- O detalhe não informa o prazo. A Web mostra o formulário de contribuição e o de convites enquanto a cápsula está `SCHEDULED` e os fecha quando a API responde `409 CONTRIBUTION_DEADLINE_PASSED`. Se o backend passar a enviar `contributionDeadline` no detalhe, a Web já usa esse valor para exibir o prazo e fechar os formulários.
- Os participantes vêm só com nome e papel, sem identificador. A lista de participantes não indica quem já contribuiu.

## Validação

Execute `npm test`. Os testes das telas ficam em `tests/NovaCapsulaPage.test.tsx`, `tests/EntrarCapsulaPage.test.tsx`, `tests/CapsulaEmGrupo.test.tsx`, `tests/CapsuleContribution.test.tsx` e `tests/CapsulaPublicaPage.test.tsx`. As regras e o serviço ficam em `tests/capsuleValidation.test.ts`, `tests/capsuleGroup.test.ts` e `tests/groupCapsuleService.test.ts`.
