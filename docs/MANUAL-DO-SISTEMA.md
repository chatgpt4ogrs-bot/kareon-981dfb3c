# Kareon — Manual do Sistema

> Documento de referência do Kareon: o que existe, como funciona, quais regras foram criadas e o que verificar quando algo der errado.
> **Mantenha este arquivo atualizado** a cada mudança no sistema (seção 14 traz o histórico).
>
> Última atualização: 09/10/2026

---

## Sumário

1. [Visão geral e tecnologias](#1-visão-geral-e-tecnologias)
2. [Estrutura de pastas](#2-estrutura-de-pastas)
3. [Login, sessão e segurança de acesso](#3-login-sessão-e-segurança-de-acesso)
4. [Perfis, tipos de acesso e abas](#4-perfis-tipos-de-acesso-e-abas)
5. [Menu e rotas (quem vê o quê)](#5-menu-e-rotas-quem-vê-o-quê)
6. [Painel administrativo](#6-painel-administrativo)
7. [Usuários](#7-usuários)
8. [Clínicas](#8-clínicas)
9. [Exclusões e Auditoria](#9-exclusões-e-auditoria)
10. [Módulos: Pacientes, Agenda, Estoque, Câmeras](#10-módulos-pacientes-agenda-estoque-câmeras)
11. [Banco de dados (Supabase)](#11-banco-de-dados-supabase)
12. [Edge Function `manage-clinic-user`](#12-edge-function-manage-clinic-user)
13. [Solução de problemas (erros conhecidos)](#13-solução-de-problemas-erros-conhecidos)
14. [Pendências e histórico de mudanças](#14-pendências-e-histórico-de-mudanças)

---

## 1. Visão geral e tecnologias

Kareon é um sistema para clínicas terapêuticas: cadastro de pacientes, agenda, estoque, câmeras, usuários por clínica e um painel administrativo central (Admin Master).

| Camada | Tecnologia |
|---|---|
| Interface | React 18 + TypeScript + Vite |
| Componentes visuais | shadcn/ui (Radix) + Tailwind CSS + ícones lucide-react |
| Dados no front | TanStack Query (cache de 5 min por padrão) |
| Backend | Supabase (Postgres + Auth + RLS + Edge Functions) |
| Funções no servidor | Edge Function `manage-clinic-user` (Deno, usa a chave service_role **somente no servidor**) |

**Regra de ouro:** a interface esconde o que o usuário não pode usar, mas quem garante a segurança é o **banco (RLS, triggers)** e a **Edge Function**. Toda regra importante existe nos dois lados.

---

## 2. Estrutura de pastas

```
kareon-981dfb3c/
├── src/
│   ├── App.tsx                  # Rotas e guardas de acesso
│   ├── contexts/AuthContext.tsx # Login, perfil logado, papéis, abas liberadas
│   ├── lib/
│   │   ├── permissions.ts       # Abas do sistema, modelos por tipo, menu, rotas permitidas
│   │   ├── audit.ts             # Exclusão com auditoria (deleteWithAudit / logDeletion)
│   │   └── manage-user.ts       # Chamada da Edge Function mostrando o erro real
│   ├── hooks/
│   │   ├── use-perfis.ts        # Perfis de acesso (tabela perfis_acesso)
│   │   ├── use-estoque.ts       # Estoque (salvo no navegador, por clínica)
│   │   ├── use-pacientes.ts / use-eventos.ts / use-cameras.ts / use-objetivos.ts ...
│   ├── pages/                   # Telas (Dashboard, Pacientes, Agenda, Estoque, Admin...)
│   └── components/
│       ├── ConfirmDeleteDialog.tsx      # Popup de exclusão com motivo obrigatório
│       ├── SensitiveAreaGuard.tsx       # Pede a senha de novo para áreas sensíveis
│       └── admin/                        # AcessosPicker, PerfisPanel, AuditoriaPanel, drawers...
├── supabase/
│   ├── functions/manage-clinic-user/    # Criar/editar/excluir/listar usuários
│   └── migrations/                      # Scripts SQL (rodar no SQL Editor)
└── docs/MANUAL-DO-SISTEMA.md            # Este documento
```

---

## 3. Login, sessão e segurança de acesso

| Regra | Onde está |
|---|---|
| Login por e-mail/senha ou Google (Google precisa estar ativado no Supabase — ver seção 13) | `AuthContext.tsx` |
| **Status do usuário:** `ativo` = acesso normal; `inativo` = bloqueado (tela "conta desativada"); qualquer outro (ex.: `pendente`) = **modo visita** | `AuthContext.tsx` → `resolveAccessFlags` |
| Admin Master e Gestor nunca caem em modo visita | idem |
| **Modo visita:** vê Início, Pacientes e Agenda com dados de demonstração; Estoque e Câmeras aparecem desabilitados; não pode criar/editar (rotas `/novo`, `/editar`, `/sessao`, `/objetivo` bloqueadas) | `permissions.ts` |
| **Troca de senha obrigatória:** se `must_change_password = true`, o usuário é levado para `/alterar-senha` antes de qualquer tela | `App.tsx` → `ProtectedRoute` |
| **Logout automático** após **10 minutos** sem atividade | `AppLayout.tsx` → `useIdleLogout` |
| **Áreas sensíveis** (Painel administrativo e Câmeras) pedem a senha novamente; o desbloqueio vale **15 minutos** por aba do navegador | `SensitiveAreaGuard.tsx` |
| Papel (`role`) desconhecido no banco é tratado como "sem perfil" (sem acesso a abas) | `AuthContext.tsx` → `normalizeAppRole` |

### 3.1 Linguagem com o cliente: "suporte"

- Para **todos os usuários, exceto o Admin Master**, o Admin Master é o **suporte**. Mensagens, avisos e erros mostrados a eles **nunca** dizem "Admin Master" ou "administrador": dizem **"entre em contato com o suporte"**.
- Textos que só o Admin Master vê (Painel administrativo, aba Perfis, Auditoria) podem citar "Admin Master".
- Ao criar uma mensagem nova (tela, Edge Function ou `RAISE EXCEPTION` no banco), siga esta regra. Quando a mesma tela aparece para todos, use `isAdmin` para trocar o texto.

---

## 4. Perfis, tipos de acesso e abas

### 4.1 Conceitos

- **Tipo de acesso (`profiles.role`)** — define as **regras do sistema**. São 6 valores fixos:

| Tipo (valor no banco) | Nome original | Regra especial |
|---|---|---|
| `admin` | Admin Master | Acesso total, todas as clínicas, todas as abas. Único que acessa o Painel administrativo e a Auditoria |
| `supervisor_plataforma` | Gestor | **Dono de uma ou mais clínicas.** Gerencia **somente as clínicas vinculadas a ele** pelo Admin Master (tabela `gestor_clinicas`). Não tem `clinic_id` próprio; **invisível** para usuários de clínica. Ver 4.6 |
| `clinica_admin` | Admin Clínica | Gerencia a própria clínica |
| `responsavel_clinica` | Responsável | Gestão operacional da clínica |
| `terapeuta` | Terapeuta | Atende pacientes |
| `familiar` | Familiar | **Vê somente os pacientes vinculados a ele**. O vínculo **não** é feito no cadastro do usuário (sem vínculo, não vê nenhum paciente) |

- **Perfil (`perfis_acesso`)** — é o **nome exibido** (livre, editável) + descrição + abas pré-marcadas, apontando para um tipo de acesso. Ex.: um perfil "Recepção" com tipo `responsavel_clinica`.
- **Abas liberadas (`profiles.permissions`)** — lista individual de cada usuário. É **isso** que decide o que ele acessa (exceto Admin Master, que tem tudo).

### 4.2 Abas do sistema

| Aba (id) | Nome | Rota |
|---|---|---|
| `pacientes` | Pacientes | `/pacientes` |
| `agenda` | Agenda | `/agenda` |
| `estoque` | Estoque | `/estoque` |
| `cameras` | Câmeras | `/cameras` (aparece como **Indisponível** no menu) |
| `clinica_detalhes` | Dados da clínica | `/clinica/detalhes` |
| `clinica_usuarios` | Usuários da clínica | `/clinica/usuarios` |

Início (`/`), Meu perfil (`/perfil`) e Alterar senha estão **sempre** liberados.

### 4.3 Modelos padrão (abas pré-marcadas por tipo)

| Tipo | Abas pré-marcadas |
|---|---|
| Admin Master | todas |
| Gestor | Pacientes, Agenda, Estoque, Câmeras, Usuários da clínica |
| Admin Clínica | todas |
| Responsável | Pacientes, Agenda, Estoque, Câmeras |
| Terapeuta | Pacientes, Agenda, Estoque |
| Familiar | Câmeras |

> Esses valores ficam em `src/lib/permissions.ts` (`ROLE_DEFAULT_TABS`) **e** na Edge Function (`ROLE_DEFAULT_TABS`). **Se mudar um, mude o outro.**

### 4.4 Como as abas de um usuário são calculadas (`resolveTabs`)

1. Admin Master → todas as abas.
2. Se `profiles.permissions` tem uma lista → usa a lista.
3. Se `permissions` é `null` (usuário antigo) → usa o modelo padrão do tipo. Na tabela de usuários aparece "(padrão)".

### 4.5 Regras de perfis (sub-aba Perfis)

- Os 6 perfis originais entram como **pré-cadastrados**: podem ser **renomeados** e ter descrição/abas alteradas, mas **não podem ser excluídos nem mudar de tipo**.
- Perfis novos (**personalizados**) podem ser criados, editados e excluídos.
- **Não existe** perfil personalizado do tipo Admin Master (bloqueado no banco).
- Nome de perfil **não pode repetir** (ignora maiúsculas/minúsculas).
- Perfil **em uso por algum usuário não pode ser excluído** (troque o perfil dos usuários antes).
- Alterar as abas de um perfil vale para **novos cadastros**; usuários existentes mantêm os acessos que já têm.
- Somente o **Admin Master** cria/edita/exclui perfis. Todos os usuários logados podem **ler** a lista (para exibir os nomes).
- Se a tabela `perfis_acesso` não existir (migration não rodada), o sistema usa os 6 perfis padrão e a aba Perfis mostra um aviso.

### 4.6 Gestor (dono de várias clínicas)

- O vínculo Gestor ↔ clínicas fica na tabela **`gestor_clinicas`** (`profile_id`, `clinic_id`). Um Gestor pode ter **uma ou várias** clínicas.
- **Somente o Admin Master** vincula/desvincula clínicas do Gestor — no cadastro (campo **"Clínicas do gestor \*"**, obrigatório ≥ 1) ou editando o usuário.
- O Gestor **enxerga e gerencia apenas as clínicas vinculadas**: pacientes, agenda, câmeras, terapeutas e usuários dessas clínicas (no código: `clinicScope` do `AuthContext`; `null` = todas, só para o Admin Master).
- O Gestor **pode**: ver suas clínicas ("Minhas clínicas"), editar os dados delas (menos CNPJ), criar/editar/excluir usuários dessas clínicas (escolhendo em qual clínica, se tiver mais de uma) e mover usuários entre as **suas** clínicas.
- O Gestor **não pode**: criar, excluir, ativar ou desativar clínicas; vincular clínicas a si mesmo; criar/editar Admin Master ou outro Gestor; ver clínicas que não são dele.
- Gestor sem nenhuma clínica vinculada vê uma mensagem pedindo ao Admin Master para vincular.
- Se o usuário deixar de ser Gestor (troca de perfil), os vínculos em `gestor_clinicas` são removidos.

---

## 5. Menu e rotas (quem vê o quê)

| Rota | Quem acessa | Guarda |
|---|---|---|
| `/` Início | todos logados | `ProtectedRoute` |
| `/pacientes`, `/agenda`, `/estoque`, `/cameras` | quem tem a aba correspondente | `RoleRoute` + `canAccessRoute` |
| `/clinica/detalhes` | aba "Dados da clínica" | `RoleRoute` |
| `/clinica/usuarios` | aba "Usuários da clínica" | `RoleRoute` |
| `/admin` Painel administrativo | **somente Admin Master** (+ senha de novo) | `AdminRoute` + `SensitiveAreaGuard` |
| `/admin/clinicas`, `/admin/clinicas/:id` | Admin Master (todas) e Gestor (**só as vinculadas**; outra clínica → "Acesso negado") | `GlobalClinicsRoute` + checagem na página |
| `/admin/usuarios`, `/admin/usuarios/:id` | somente Admin Master | `AdminRoute` |

**Menu lateral:**
- Mostra só as abas liberadas para o usuário.
- Admin Master vê "Painel administrativo" (não vê as abas de clínica "Dados da clínica"/"Usuários da clínica" separadas).
- Gestor vê "Minhas clínicas" (não vê "Dados da clínica", pois não tem clínica única) e "Usuários da clínica" (usuários de todas as suas clínicas).
- Abaixo do nome aparece o **nome do perfil** (o personalizado, se houver).
- Quem tentar abrir uma rota sem permissão é redirecionado para o Início.

---

## 6. Painel administrativo

Rota `/admin` (só Admin Master). Sub-abas (endereço `?tab=`):

| Sub-aba | `?tab=` | O que faz |
|---|---|---|
| Clínicas | `clinicas` | Lista, cria, edita, ativa/desativa e exclui clínicas |
| Usuários | `usuarios` | Lista, cria, edita e exclui usuários de todas as clínicas |
| Perfis | `perfis` | Renomeia perfis pré-cadastrados e cria/edita/exclui perfis personalizados |
| Auditoria | `auditoria` | Histórico de **todas as exclusões** com motivo, autor e cópia do registro |

---

## 7. Usuários

### 7.1 Quem gerencia usuários

- **Admin Master:** todos os usuários de todas as clínicas.
- **Gestor:** usuários de **todas as clínicas vinculadas a ele** (seção 4.6).
- **Quem tem a aba "Usuários da clínica":** somente usuários **da própria clínica**.
- Usuário de clínica **nunca vê** Admin Master nem Gestor na lista.
- Lista do Admin Master mostra também os Gestores.

### 7.2 Cadastro (popup "Novo usuário")

1. Nome, e-mail, senha inicial (mínimo 6 caracteres).
2. **Perfil \*** (lista suspensa) — ao escolher, aparece a descrição e a seção **Acessos** com as abas pré-marcadas do perfil. Antes de escolher, as abas ficam ocultas.
3. Se o perfil for do tipo **Familiar** → não pede pacientes; aparece só o aviso de que ele verá apenas os pacientes vinculados.
4. Se o perfil for do tipo **Gestor** → campo obrigatório **Clínicas do gestor** (marcar uma ou mais; só o Admin Master cadastra Gestor). O Gestor não recebe `clinic_id`.
5. Se quem cadastra é um Gestor com mais de uma clínica → campo obrigatório **Clínica** (escolhe entre as dele). Com uma só, é usada automaticamente.
6. Configurações avançadas: clínica (Admin Master), usuário ativo, exigir troca de senha no primeiro login (padrão: sim).

### 7.3 Regras de cadastro/edição (garantidas na Edge Function)

| Regra | Mensagem se violada |
|---|---|
| Perfil é obrigatório e válido | "Selecione um perfil válido para o usuário" |
| Usuário de clínica **não pode criar/editar** Admin Master ou Gestor | "Papel não permitido para admin da clínica" / "Não é permitido atribuir este papel" |
| **Ninguém libera uma aba que não possui** (exceto Admin Master) | "Você não pode liberar abas que não possui. Para liberar, entre em contato com o suporte" |
| Se não enviar abas, um não-admin grava o modelo do perfil **∩** as abas que ele próprio tem | — |
| Usuário de clínica cria usuários **sempre na própria clínica** | — |
| Gestor cria usuários só em uma das **suas** clínicas | "Escolha a clínica do usuário" |
| Admin Master troca a clínica de qualquer usuário; Gestor só move entre as suas clínicas | — |
| Gestor precisa de ≥ 1 clínica vinculada | "Vincule o gestor a pelo menos uma clínica" |
| Só o Admin Master altera as clínicas de um Gestor | "Somente o suporte altera as clínicas do gestor. Entre em contato com o suporte" |
| Familiar pode ser criado **sem pacientes**. Se a chamada enviar `paciente_ids`, eles precisam ser **da mesma clínica** do familiar | "Os pacientes precisam ser da mesma clínica do familiar" |
| Se o vínculo de pacientes falhar, o usuário recém-criado é apagado (não fica pela metade) | "Falha ao vincular pacientes: ..." |
| Se o perfil vier com `perfil_id`, o servidor busca o perfil no banco e usa o **tipo dele** (ignora o que a tela mandou) | "Perfil não encontrado" |
| E-mail de usuário já excluído pode ser reutilizado (perfis órfãos sem login com esse e-mail são removidos antes) | — |
| O perfil é gravado com `upsert` (o gatilho `handle_new_user` pode não ter criado a linha) | — |

### 7.3.1 Cadastros aguardando aprovação (modo visita)

- Quem cria conta pelo site ou pelo Google entra em **modo visita** (status diferente de `ativo`/`inativo`, normalmente `pendente`).
- Esses usuários **não aparecem na lista normal**: ficam na seção **"Aguardando aprovação"** no topo de Painel → Usuários (só o Admin Master vê).
- A lista vem da Edge Function (`list_pending`) e inclui também **logins sem linha em `profiles`** (o gatilho `handle_new_user` não consegue gravar perfil sem `role` — seção 11.4).
- **Aprovar:** escolher perfil, clínica (ou clínicas, se Gestor) e acessos → o perfil é gravado com `status = ativo` e `must_change_password = false` (a pessoa já escolheu a senha). O usuário vai para a lista normal. Ele precisa **recarregar a página ou entrar de novo** para sair do modo visita.
- **Recusar:** pede motivo → registra na Auditoria ("cadastro recusado") e **exclui a conta**.
- Aprovar/recusar só funciona para quem ainda está pendente ("Este cadastro já foi aprovado").

### 7.4 Familiar

- Vínculo salvo em `paciente_usuarios` (tipo `familiar`). Desde 09/10 **não é feito no cadastro do usuário**; o vínculo existente é feito no **cadastro/edição do paciente** (`PacienteForm`).
- Familiar sem nenhum vínculo **não vê nenhum paciente** (regra mantida em `use-pacientes.ts` e na tela inicial do familiar).
- Na lista de pacientes e no detalhe, o familiar só enxerga os vinculados; abrir outro paciente dá erro.

### 7.5 Exclusão de usuário

- Popup com **motivo obrigatório** → Edge Function grava a **auditoria antes** de apagar o login. Se a auditoria falhar, nada é excluído. Se a exclusão do login falhar, o registro de auditoria é desfeito.
- Ninguém pode excluir a si mesmo.

---

## 8. Clínicas

| Regra | Onde |
|---|---|
| Só Admin Master cria, ativa/desativa e exclui clínicas | Interface (`AdminClinicas`, `ClinicaDetalheDrawer`, `AdminClinicaDetalhe`) + RLS + trigger `trg_guard_clinics_status` ("Somente o suporte pode ativar ou desativar clínicas...") |
| Gestor vê e edita (menos CNPJ) **só as clínicas vinculadas** | Políticas `gestor_select_linked_clinics` / `gestor_update_linked_clinics` |
| Quem tem a aba "Dados da clínica" vê e edita a **própria** clínica | `/clinica/detalhes` |
| **CNPJ não pode ser alterado depois de preenchido** — campo travado na edição; o banco recusa ("O CNPJ da clínica não pode ser alterado. Para corrigir, entre em contato com o suporte"). Pode ser informado no cadastro ou preenchido **uma vez** se estiver vazio. Correção só direto no banco | Telas de edição + trigger `trg_guard_clinics_cnpj` |
| Desativar clínica marca `status = inativa` e preserva os dados | — |
| Excluir clínica: popup com motivo → `delete_with_audit('clinica', ...)` | seção 9 |

---

## 9. Exclusões e Auditoria

### 9.1 Regra geral

**Toda exclusão pede um motivo** (mínimo 3 caracteres) no popup `ConfirmDeleteDialog`. O botão só libera com o motivo preenchido. Se der erro, o popup continua aberto.

**Sem registro de auditoria, não há exclusão.**

### 9.2 Como cada exclusão é feita

| O que é excluído | Mecanismo | Tipo na auditoria |
|---|---|---|
| Clínica | RPC `delete_with_audit` (exclui + registra na **mesma transação**) | `clinica` |
| Paciente | RPC `delete_with_audit` | `paciente` |
| Evento da agenda | RPC `delete_with_audit` | `evento` |
| Câmera | RPC `delete_with_audit` | `camera` |
| Objetivo | RPC `delete_with_audit` | `objetivo` |
| Perfil de acesso | RPC `delete_with_audit` | `perfil` |
| Usuário | Edge Function (auditoria antes, desfaz se falhar) | `usuario` |
| Produto do estoque | `logDeletion` grava no banco **antes** de remover do navegador | `produto_estoque` |

Remoções internas de vínculos (`paciente_usuarios`, `evento_terapeutas`, `camera_usuarios`) **não** são auditadas — são sincronizações automáticas, não exclusões do usuário.

### 9.3 Regras da tabela `audit_logs`

- **Autor não pode ser forjado:** um trigger preenche quem excluiu (id, nome, e-mail, perfil) a partir da sessão. Pela Edge Function (sem sessão) os campos enviados são mantidos.
- **Somente Admin Master lê.**
- **Ninguém altera nem apaga** registros (não há políticas de UPDATE/DELETE).
- **Senhas e credenciais nunca são gravadas** na cópia (`senha`, `password`, `usuario` são removidos).
- `delete_with_audit` é `SECURITY INVOKER`: a exclusão respeita o RLS da tabela — se o usuário não pode excluir, recebe "Registro não encontrado ou sem permissão para excluir".
- Só aceita tipos da lista (clinica, paciente, evento, camera, objetivo, perfil); outros → "Tipo de registro não suportado".

### 9.4 Tela de Auditoria

Painel administrativo → Auditoria: busca, filtro por tipo, tabela (data, tipo, item, motivo, autor, clínica). Clique na linha abre o detalhe com motivo em destaque, dados do autor e a cópia completa do registro excluído.

---

## 10. Módulos: Pacientes, Agenda, Estoque, Câmeras

| Módulo | Situação / regras |
|---|---|
| **Pacientes** | Cadastro, detalhe, sessões, objetivos, relatório. Familiar vê só os vinculados. ⚠️ Usa tabelas em português (`pacientes`, `sessoes`, `objetivos`...) que **não existiam** no banco auditado — ver seção 11.3 |
| **Agenda** | Eventos com terapeutas. Exclusão de evento com motivo. ⚠️ Tabela `eventos` pode não existir no banco |
| **Estoque** | Cadastro de produtos em popup (nome, categoria, unidade, quantidade, estoque mínimo, custo, observações), busca, alerta de estoque baixo. **Salvo no navegador (localStorage), por clínica** (`kareon:estoque:<clinica>`) — limpar dados do navegador ou trocar de computador **perde** o estoque. Exclusão auditada no banco |
| **Câmeras** | Aparece como "Indisponível" no menu. Exige senha de novo (área sensível). Exclusão com motivo |

---

## 11. Banco de dados (Supabase)

### 11.1 Tabelas principais (esquema real)

| Tabela | Conteúdo / colunas importantes |
|---|---|
| `profiles` | `id` (= id do login), `name`, `email`, `role` (**obrigatório**, com CHECK dos 6 tipos), `clinic_id`, `status`, `must_change_password`, `permissions text[]`, `perfil_id` |
| `clinics` | `id`, `nome`, `cnpj` (imutável), `telefone`, `email`, `endereco`, `status`, `created_at` |
| `perfis_acesso` | `id`, `nome`, `descricao`, `base_role`, `abas text[]`, `is_system`, `ordem` |
| `audit_logs` | `created_at`, `action`, `entity_type`, `entity_id`, `entity_label`, `clinic_id`, `reason`, `snapshot jsonb`, `actor_*` |
| `paciente_usuarios` | vínculo paciente ↔ usuário (familiar/terapeuta) |
| `gestor_clinicas` | vínculo Gestor ↔ clínicas (`profile_id`, `clinic_id`). Lê: o próprio Gestor e o Admin Master. Grava: só Admin Master (ou a Edge Function) |

> O arquivo `src/integrations/supabase/types.ts` está **desatualizado** em relação ao banco real; por isso o código usa `as any` em vários pontos.

### 11.2 Migrations criadas nesta fase (rodar no SQL Editor, nesta ordem)

| Ordem | Arquivo | O que faz |
|---|---|---|
| 1 | `20261009120000_profiles_permissions.sql` | Coluna `profiles.permissions`; trigger: só Admin Master (ou a Edge Function) altera `permissions`; inserção por não-admin grava `NULL` |
| 2 | `20261009130000_audit_logs.sql` | Tabela `audit_logs`, trigger do autor, políticas, função `delete_with_audit` |
| 3 | `20261009140000_clinics_cnpj_imutavel.sql` | Trigger que impede alterar CNPJ já preenchido |
| 4 | `20261009150000_perfis_acesso.sql` | Tabela `perfis_acesso` com os 6 pré-cadastrados, `profiles.perfil_id`, proteções, políticas e `delete_with_audit` com o tipo `perfil` |
| 5 | `20261009160000_profiles_role_check_gestor.sql` | Permite o tipo Gestor (`supervisor_plataforma`) em `profiles.role`. Só altera a regra de valores; não mexe em RLS |
| 6 | `20261009170000_gestor_clinicas.sql` | Tabela `gestor_clinicas`, função `gestor_clinic_ids()`, políticas para o Gestor ver/editar suas clínicas e ver os perfis delas, trigger que deixa só o Admin Master mudar o status da clínica. Políticas **adicionais** (não remove nenhuma existente) |

> ⚠️ **Não rode** migrations antigas (anteriores a 09/10/2026) sem conferir antes: várias dependem de funções do schema `private` e de tabelas em português que não existem no banco atual (ex.: `20260924190000_supervisor_plataforma.sql`).

Todas podem ser rodadas de novo sem estragar nada (usam `IF NOT EXISTS` / `CREATE OR REPLACE`). Cada uma termina com `NOTIFY pgrst, 'reload schema'` para o Supabase enxergar as mudanças.

**Depois de mudar a Edge Function, é preciso publicá-la de novo** (`manage-clinic-user`).

### 11.3 ⚠️ Divergência conhecida entre código e banco

A auditoria somente-leitura (FASE 0) mostrou que o banco real tem tabelas em **inglês** (`patients`, `sessions`, `appointments`...) e **não** tem `pacientes`, `paciente_usuarios`, `eventos`, `objetivos`, `sessoes`. O código ainda usa os nomes em português. Consequências possíveis:
- Telas de Pacientes/Agenda vazias ou com erro "relation ... does not exist".
- Cadastro de Familiar falhando no vínculo de pacientes.
- Exclusão de paciente/evento/objetivo falhando.

Para resolver é preciso rodar `auditoria-kareon/01-fotografia-banco.sql` (somente leitura) e alinhar código e banco. A remoção das regras de RLS baseadas em papel também depende dessa fotografia.

### 11.4 Gatilho `handle_new_user`

Ao criar um login, o Supabase executa `handle_new_user`, que tenta criar a linha em `profiles` **sem `role`**. Como `role` é obrigatório no banco real, esse insert pode falhar — o gatilho **engole o erro** e o login fica sem perfil. Por isso a Edge Function grava o perfil com `upsert` completo. Logins criados por fora da Edge Function (ex.: Google) podem ficar **sem perfil**.

### 11.5 Script de limpeza

`auditoria-kareon/02-excluir-usuarios-exceto-super-admin.sql` — remove todos os usuários exceto `admin@kareon.com` (mostra prévia, executa em bloco atômico). **Irreversível.**

---

## 12. Edge Function `manage-clinic-user`

Arquivo: `supabase/functions/manage-clinic-user/index.ts`. Usa service_role **só no servidor**.

**Autorização (toda chamada):** precisa estar logado; precisa ser Admin Master **ou** ter a aba `clinica_usuarios`. O escopo de um não-admin é: Gestor → clínicas em `gestor_clinicas`; demais → a própria clínica. Escopo vazio → "Sua conta não está vinculada a uma clínica. Entre em contato com o suporte".

Versão atual (`FN_VERSION`): **`2026-10-09.familiar-sem-vinculo`**.

| Ação (`action`) | O que faz |
|---|---|
| `list` | Lista perfis. Não-admin: só das clínicas do escopo, sem Admin Master/Gestor. Admin: oculta Gestores, salvo `include_hidden`; cada linha traz `gestor_clinic_ids` |
| `create` | Cria login + perfil (regras da seção 7.3) |
| `update` | Altera nome, senha, perfil/tipo, abas, telefone, clínica (admin: qualquer; Gestor: entre as suas), clínicas do Gestor (`clinica_ids`, só admin), status, troca de senha |
| `delete` | Exige `reason`; grava auditoria e exclui login + perfil |
| `list_pending` | Só Admin Master. Cadastros em modo visita, incluindo logins sem perfil (seção 7.3.1) |
| `approve` | Só Admin Master. Grava o perfil completo com `status = ativo` + clínicas do Gestor; se o vínculo falhar, volta para `pendente` |
| `reject` | Só Admin Master. Exige `reason`; auditoria antes, depois exclui login + perfil |

No front, toda chamada passa por `src/lib/manage-user.ts`, que mostra **a mensagem real** do erro (em vez de "Edge Function returned a non-2xx status code").

---

## 13. Solução de problemas (erros conhecidos)

| Erro / sintoma | Causa provável | Como resolver |
|---|---|---|
| `Could not find the function public.delete_with_audit(...) in the schema cache` | Migration de auditoria não rodada (ou cache) | Rodar `20261009130000_audit_logs.sql`; se persistir, `NOTIFY pgrst, 'reload schema';` |
| "Não foi possível registrar a auditoria: ..." | Tabela `audit_logs` não existe | Rodar `20261009130000_audit_logs.sql` |
| `Edge Function returned a non-2xx status code` | Mensagem genérica (versão antiga do front) | Atualizar o front; o erro real passa a aparecer |
| `Failed to send a request...` | Edge Function não publicada / fora do ar | Publicar `manage-clinic-user` |
| `null value in column "role" of relation "profiles" violates not-null constraint` | Edge Function **antiga** publicada no Supabase (a atual nunca grava perfil sem tipo) | Publicar a versão atual da Edge Function |
| Erro seguido de "A Edge Function ... está desatualizada" | A função publicada não responde com a versão esperada (`FN_VERSION` na função = `EXPECTED_FN_VERSION` em `src/lib/manage-user.ts`) | Publicar a função de novo. Ao mudar a função, atualize a versão **nos dois arquivos** |
| `... violates check constraint "profiles_role_check"` | Banco não aceita o tipo (ex.: `supervisor_plataforma`) | Rodar `20261009160000_profiles_role_check_gestor.sql` |
| `function private.current_profile_role() does not exist` | Tentativa de rodar a migration antiga `20260924190000_supervisor_plataforma.sql`, que depende de funções/tabelas inexistentes no banco atual | **Não rodar essa migration.** Usar `20261009160000_profiles_role_check_gestor.sql` |
| `column "permissions" does not exist` / `Could not find the 'permissions' column of 'profiles' in the schema cache` | Migration de permissões não rodada | Rodar `20261009120000_profiles_permissions.sql` |
| `column "perfil_id" does not exist` / aba Perfis com aviso | Migration de perfis não rodada | Rodar `20261009150000_perfis_acesso.sql` |
| "O CNPJ da clínica não pode ser alterado..." | Regra proposital | Suporte (Admin Master) corrige direto no banco, se for erro de digitação |
| "Perfis pré-cadastrados não podem ser excluídos" | Regra proposital | Apenas renomeie |
| "Este perfil está em uso por usuários..." | Regra proposital | Troque o perfil dos usuários e exclua de novo |
| "Você não pode liberar abas que não possui..." | Regra proposital | Suporte (Admin Master) libera a aba |
| "Registro não encontrado ou sem permissão para excluir" | RLS da tabela não permite ao usuário excluir, ou o item já foi excluído | Verificar políticas da tabela / perfil do usuário |
| `relation "pacientes" does not exist` (ou eventos, objetivos...) | Divergência código × banco (seção 11.3) | Alinhar tabelas |
| Google: `Unsupported provider: provider is not enabled` | Login com Google desativado no Supabase | Authentication → Sign In / Providers → Google: ativar com Client ID/Secret do Google Cloud; configurar Site URL e Redirect URLs (`http://localhost:8080/**` e domínio publicado) |
| Usuário entra com Google e não vê nada | Login criado sem perfil/clínica (seção 11.4) ou status pendente (modo visita) | Admin define perfil, clínica e status `ativo` |
| Usuário cai em "modo visita" | `status` diferente de `ativo` | Painel → Usuários → "Aguardando aprovação" → Aprovar |
| Usuário aprovado continua em modo visita | A tela dele carregou o perfil antes da aprovação | Recarregar a página (F5) ou sair e entrar de novo |
| Seção "Aguardando aprovação" mostra erro com aviso de função desatualizada | Edge Function antiga publicada (não tem `list_pending`) | Publicar `manage-clinic-user` (versão `2026-10-09.aprovacao`) |
| Usuário vê "conta desativada" | `status = inativo` | Ativar o usuário |
| Usuário é jogado para "Alterar senha" | `must_change_password = true` | Comportamento esperado no primeiro login |
| Usuário não vê uma aba | Aba não está em `permissions` | Editar usuário → Acessos |
| Clínica some da aba Clínicas mas aparece na lista de clínicas da tela de Usuários | (a) A clínica foi excluída e a outra tela mostrava cache antigo — conferir em Painel → Auditoria; (b) erro ao carregar a lista (agora a mensagem aparece na tela) | Recarregar com Ctrl+F5. As listas de clínicas agora recarregam sempre ao abrir e após criar/editar/excluir |
| "Vincule o gestor a pelo menos uma clínica" | Cadastro/edição de Gestor sem clínicas marcadas | Marcar ao menos uma em "Clínicas do gestor" |
| "Escolha a clínica do usuário" | Gestor com várias clínicas criou usuário sem escolher a clínica | Escolher a clínica no cadastro |
| "Somente o suporte pode ativar ou desativar clínicas..." | Gestor/usuário de clínica tentou mudar o status | Regra proposital |
| "Somente o suporte altera as clínicas do gestor..." | Não-admin tentou mudar os vínculos de um Gestor | Regra proposital |
| Gestor não vê nenhuma clínica / dados | Sem vínculos em `gestor_clinicas`, ou migration 6 não rodada | Admin Master edita o Gestor e marca as clínicas; rodar `20261009170000_gestor_clinicas.sql` |
| `relation "gestor_clinicas" does not exist` | Migration 6 não rodada | Rodar `20261009170000_gestor_clinicas.sql` |
| Tela branca ao abrir uma página | Erro de execução na tela. Desde 09/10 aparece o aviso "Não foi possível carregar esta tela" com a mensagem do erro (`ErrorBoundary` em `AppLayout`), e o menu continua funcionando | Ler a mensagem exibida / console do navegador (F12). Caso conhecido corrigido: usuário com `role` fora dos 6 tipos (ex.: `therapist`) e sem abas salvas quebrava a tela de Usuários |
| Estoque sumiu | Estoque é salvo no navegador | Mesmo navegador/computador; limpar dados apaga |
| Pede senha ao abrir Painel/Câmeras | Área sensível (15 min) | Comportamento esperado |
| Deslogou sozinho | 10 min sem atividade | Comportamento esperado |

---

## 14. Pendências e histórico de mudanças

### 14.1 Pendências (ações do responsável pelo banco)

- [ ] Rodar as migrations da seção 11.2, na ordem.
- [ ] Publicar a Edge Function `manage-clinic-user`.
- [ ] Editar cada Gestor já existente e marcar as clínicas dele (sem isso ele não vê nada).
- [ ] Ativar o Google no Supabase (se for usar).
- [ ] Rodar `auditoria-kareon/01-fotografia-banco.sql` para alinhar tabelas e RLS (seção 11.3).
- [ ] Estoque: criar tabela no banco (hoje é local no navegador).
- [ ] Página legada `AdminUsuarioDetalhe` usa a tabela inexistente `user_roles` e `confirm()` do navegador para remover papel.

### 14.2 Histórico (09/10/2026)

- Aba Anamnese substituída por **Estoque** (popup de cadastro de produto).
- Cadastro de **Gestor** (antigo "Acesso plataforma"/supervisor) movido para o cadastro normal de usuários.
- **Acessos por usuário**: o perfil pré-marca as abas; quem cadastra ajusta livremente. Perfil escolhido em lista suspensa; abas aparecem só após escolher.
- **Familiar** vinculado a um ou mais pacientes; vê só esses.
- Card "Modelos de perfil" recolhido por padrão.
- **Exclusão com motivo + Auditoria** em todo o sistema; sub-aba Auditoria no Painel administrativo.
- **CNPJ** da clínica imutável após preenchido.
- Erros da Edge Function passam a mostrar a mensagem real.
- Correção do cadastro com e-mail reutilizado / perfil sem `role`.
- Sub-aba **Perfis**: renomear pré-cadastrados e criar perfis personalizados.
- **Gestor = dono de várias clínicas**: Admin Master vincula as clínicas no cadastro/edição; o Gestor gerencia só elas (dados, usuários, pacientes, agenda, câmeras). Tela "Minhas clínicas". Migration `20261009170000_gestor_clinicas.sql`; Edge Function versão `2026-10-09.gestor-clinicas`.
- Mensagens para clientes (todos menos o Admin Master) passam a dizer **"entre em contato com o suporte"** em vez de "Admin Master" (seção 3.1). Edge Function versão `2026-10-09.suporte`.
- Seção **"Aguardando aprovação"** em Painel → Usuários: cadastros em modo visita ficam separados até o Admin Master aprovar (perfil/clínica/acessos) ou recusar (com motivo, auditado). Edge Function versão `2026-10-09.aprovacao`.
- Cadastro de **Familiar sem vincular pacientes** (no cadastro e na aprovação). A regra de visibilidade continua: familiar só vê os pacientes vinculados. Edge Function versão `2026-10-09.familiar-sem-vinculo`.
- Correção: tela branca em Usuários (`resolveTabs` com `role` desconhecido). Adicionado `ErrorBoundary`: erro numa tela mostra aviso em vez de tela branca.
- Correção: lista "Usuários vinculados" no painel lateral da clínica usava colunas inexistentes (`nome`/`clinica_id`).
