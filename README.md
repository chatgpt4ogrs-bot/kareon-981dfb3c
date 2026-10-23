# Kareon — Clinic OS (PostgreSQL)

Sistema de gestão para **clínicas multiprofissionais** (medicina, odontologia, psicologia, podologia e demais especialidades).  
Backend próprio em **PostgreSQL** (sem Supabase). Marca visual Darevo · produto Kareon.

## Pré-requisitos

- Node.js 18+
- PostgreSQL acessível (local ou remoto)

## Primeira execução

```bash
# 1) API (porta 3001)
npm run server

# 2) Frontend
npm run dev
```

Na primeira abertura informe IP, porta, usuário e senha do PostgreSQL. As tabelas são criadas automaticamente.

Admin padrão: `admin@kareon.local` / `Admin@123` (trocar no primeiro acesso).

## Funcionalidades principais

- **Superadmin · Tenants**: criar/ativar clínicas e entrar no contexto de cada uma
- Pacientes com **histórico clínico** (onde parou a última consulta)
- Agenda, recepção, sala de espera, painel TV
- Atendimento / prontuário, documentos (atestado, receita, etc.)
- Financeiro (contas, recebimentos, caixa)
- Profissionais, especialidades, salas, serviços e convênios
- Estoque e administração de usuários/perfis

## Stack

React + Vite + Tailwind · Express + JWT · PostgreSQL
