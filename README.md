# Banco de Horas - Sistema de Controle de Ponto e Saldo

<div align="center">

[![wakatime](https://wakatime.com/badge/user/bdeb95f3-d0ba-450e-bb85-f5c3aa2006a7/project/a4e95214-73e5-46f3-8758-00d8969e5f21.svg)](https://wakatime.com/badge/user/bdeb95f3-d0ba-450e-bb85-f5c3aa2006a7/project/a4e95214-73e5-46f3-8758-00d8969e5f21)

</div>

Aplicação web desenvolvida para o registro eficiente de ponto e gerenciamento automatizado de banco de horas para equipes internas.

## Visão Geral

Este projeto visa substituir processos manuais de controle de jornada de trabalho, oferecendo uma interface digital para que funcionários registrem suas entradas, saídas e intervalos. O sistema calcula automaticamente as horas trabalhadas e atualiza o saldo individual no banco de horas, proporcionando transparência e precisão tanto para o colaborador quanto para a gestão. Focado inicialmente em equipes pequenas, o sistema prioriza uma experiência de usuário otimizada para dispositivos móveis.

## Problema Solucionado

Empresas, especialmente as de pequeno e médio porte, frequentemente enfrentam desafios com o controle manual de ponto, como:

*   Planilhas propensas a erros.
*   Dificuldade no cálculo exato das horas trabalhadas e extras.
*   Falta de visibilidade imediata do saldo do banco de horas.
*   Processo demorado para consolidar informações de ponto.

Este sistema automatiza essas tarefas, centraliza as informações e fornece dados em tempo real sobre a jornada e o saldo de horas de cada funcionário.

## Funcionalidades Principais

*   **Autenticação Segura:** Login baseado em e-mail e senha com tokens JWT (JSON Web Tokens) para proteger as rotas da API.
*   **Controle de Acesso por Papel (Role):** Distinção entre usuários `employee` (funcionários) e `admin` (administradores), com permissões específicas para cada papel.
*   **Registro de Ponto Simplificado:** Interface intuitiva (mobile-first) para registrar:
    *   Entrada (Check-in)
    *   Saída para Almoço
    *   Retorno do Almoço
    *   Saída Final (Check-out)
*   **Cálculo Automático de Horas Trabalhadas:** O sistema calcula as horas totais trabalhadas no dia, descontando o intervalo de almoço, no momento do check-out.
*   **Gerenciamento de Banco de Horas:**
    *   Cálculo automático do saldo diário (horas trabalhadas vs. meta diária baseada na carga horária semanal).
    *   Atualização incremental do saldo acumulado (`hour_balance`) no perfil do funcionário após check-out, adição ou remoção manual de registros.
    *   (Opcional/Implementado) Job agendado (`node-cron`) para recálculo diário do saldo como backup ou principal mecanismo.
*   **Visualização de Perfil e Saldo:**
    *   Funcionários podem visualizar seu saldo atualizado do banco de horas.
    *   Modal de perfil exibe informações pessoais (nome, cargo, email, etc.), status (ativo/inativo) e um histórico recente de saldos diários.
*   **Gerenciamento de Funcionários (Admin):**
    *   Interface administrativa para listar todos os funcionários (ativos e inativos).
    *   Funcionalidade para adicionar novos funcionários.
    *   Funcionalidade para editar informações de funcionários existentes.
    *   Funcionalidade para ativar/desativar funcionários.
*   **Ações Administrativas de Ponto (Admin):**
    *   Remoção de registros de ponto existentes (com ajuste automático do saldo acumulado).
    *   Criação manual de registros de ponto para dias específicos (com ajuste automático do saldo acumulado).
*   **Interface Responsiva:** Layout adaptado para funcionar primariamente em dispositivos móveis, mas também funcional em desktops.

## Tecnologias Utilizadas

**Backend:**

*   **Plataforma:** Node.js
*   **Framework:** Express.js
*   **ORM (Object-Relational Mapper):** Sequelize
*   **Banco de Dados:** PostgreSQL
*   **Autenticação:** JSON Web Tokens (jsonwebtoken)
*   **Hashing de Senha:** bcryptjs
*   **Validação:** Middlewares customizados (ex: `validation.middleware.js`)
*   **Segurança:** Helmet (Cabeçalhos de segurança, CSP), Express Rate Limit
*   **Agendamento de Tarefas:** node-cron (para atualização de saldo)
*   **Logging:** Winston
*   **Outros:** CORS, Dotenv

**Frontend:**

*   **Estrutura:** HTML5, CSS3, JavaScript (ES6+)
*   **Framework CSS:** Bootstrap 5
*   **Bibliotecas JS:** jQuery (principalmente para Select2), Select2.js
*   **Requisições API:** Fetch API (nativa do navegador)

**Ambiente & Deploy:**

*   **Gerenciador de Pacotes:** npm
*   **Plataforma de Deploy:** Render


## Conceitos Chave e Lógica

*   **Autenticação JWT:** O login gera um token assinado contendo ID e `role` do usuário. Esse token é enviado no cabeçalho `Authorization: Bearer <token>` em requisições subsequentes e validado pelo middleware `authenticate`.
*   **Autorização Baseada em Papel:** O middleware `authorize(['role'])` restringe o acesso a determinadas rotas com base no `role` presente no token JWT decodificado.
*   **Modelo `TimeRecord`:** Armazena os momentos de entrada/saída e almoço. O campo `totalHours` é calculado automaticamente via hook `beforeSave` do Sequelize quando `endTime` é definido.
*   **Modelo `Employee`:** Contém informações do funcionário, incluindo `weeklyHours` (carga horária semanal contratada) e `hour_balance` (saldo acumulado do banco de horas).
*   **Cálculo de Saldo (`BalanceService`):**
    *   A meta diária é derivada da `weeklyHours` (geralmente dividido por 5).
    *   O saldo diário é `totalHours` do registro menos a `dailyGoal`.
    *   O saldo acumulado (`hour_balance`) é atualizado incrementalmente:
        *   No **check-out**, o saldo do dia é calculado e **somado** ao `hour_balance`.
        *   Na **deleção** de um registro, o saldo que ele representava é calculado e **subtraído** do `hour_balance`.
        *   Na **criação manual** de um registro, o saldo do novo registro é calculado e **somado** ao `hour_balance`.
    *   As atualizações no `hour_balance` são feitas usando `Employee.increment()` para garantir atomicidade.
    *   Um job diário (opcionalmente habilitado) pode recalcular o saldo para garantir consistência.