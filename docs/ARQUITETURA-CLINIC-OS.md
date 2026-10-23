# Kareon Clinic OS — Arquitetura (v1 funcional)

## Visão

Sistema web de gestão de clínicas com PostgreSQL próprio (sem Supabase), setup na primeira execução e fluxo operacional real:

**Agenda → Recepção (check-in) → Sala de espera → Atendimento clínico → Finalização**

## Stack

| Camada | Tecnologia |
|--------|------------|
| Front-end | React 18 + TypeScript + Vite + Tailwind + shadcn/ui |
| API | Express (Node) + JWT |
| Banco | PostgreSQL (credenciais na 1ª execução) |
| Auth | users + profiles + bcrypt |

## Estrutura

```
src/
  pages/          # Recepcao, SalaEspera, AgendaClinica, AtendimentoClinico, Pacientes…
  hooks/          # use-appointments, use-encounters, use-pacientes…
  lib/api.ts      # Cliente HTTP
  contexts/       # Auth
server/
  src/db/         # schema.sql + v2 + multispecialty + v4 + migrate
  src/routes/     # appointments, waiting, encounters, finance, documents…
```

## Tabelas prioritárias (v2)

- `appointments` + `appointment_status_history`
- `waiting_queue`
- `encounters` + `clinical_addenda`
- `rooms`, `services`, `specialties`, `professionals`
- `pacientes` (código automático PAC-XXXXX)
- `audit_logs`

## Status do fluxo

`agendado` → check-in → `aguardando_atendimento` → `chamado` → `em_atendimento` → `finalizado`  
Alternativas: `cancelado`, `faltou`, `ausente`

## Entregue na v4

- Financeiro (contas, pagamentos, fechamento de caixa)
- Documentos clínicos (atestado, receita, encaminhamento, pedido de exame + PDF)
- Cadastros: salas, serviços, convênios, escala
- Lista de espera + recorrência semanal na agenda
- Painel TV público (`/painel-tv?unit_id=…`)

## Próximas etapas (roadmap)

3. Notificações (WhatsApp/e-mail) com provedor real  
4. RLS PostgreSQL completo por organização/unidade  
5. Relatórios gerenciais Excel/PDF, testes E2E, TISS / assinatura digital

## Como rodar

```bash
npm run server   # :3001
npm run dev      # :8080
```

Na 1ª abertura: IP, porta, usuário e senha do PostgreSQL → tabelas criadas automaticamente.
