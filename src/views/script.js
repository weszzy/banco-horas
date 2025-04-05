/**
 * Sistema de Controle de Ponto v1.2.0
 * Gerencia autenticação, registro de ponto e cadastro de funcionários.
 */

// Encapsula toda a lógica em uma classe para evitar variáveis globais
class PontoApp {
  constructor() {
    // Elementos da UI (cache para performance)
    this.ui = {
      loginModal: new bootstrap.Modal(document.getElementById('loginModal')),
      loginForm: document.getElementById('loginForm'),
      loginError: document.getElementById('loginError'),
      btnLoginSubmit: document.getElementById('btnLoginSubmit'),
      authArea: document.getElementById('authArea'),
      contentArea: document.getElementById('contentArea'),
      loginPrompt: document.getElementById('loginPrompt'),
      alertPlaceholder: document.getElementById('alertPlaceholder'),
      employeeSelect: $('#employeeSelect'), // jQuery para Select2
      employeeSelectContainer: document.getElementById('employeeSelect').parentElement, // Container do select
      employeeSelectHelp: document.getElementById('employeeSelectHelp'),
      btnEntrada: document.getElementById('btnEntrada'),
      btnSaidaAlmoco: document.getElementById('btnSaidaAlmoco'),
      btnRetornoAlmoco: document.getElementById('btnRetornoAlmoco'),
      btnSaida: document.getElementById('btnSaida'),
      statusContainer: document.getElementById('statusContainer'),
      statusDate: document.getElementById('statusDate'),
      statusPlaceholder: document.getElementById('statusPlaceholder'),
      statusDetails: document.getElementById('statusDetails'),
      statusEntrada: document.getElementById('statusEntrada'),
      statusSaidaAlmoco: document.getElementById('statusSaidaAlmoco'),
      statusRetornoAlmoco: document.getElementById('statusRetornoAlmoco'),
      statusSaida: document.getElementById('statusSaida'),
      statusTotalHoras: document.getElementById('statusTotalHoras'),
      // Modal Novo Funcionário
      novoFuncionarioModal: new bootstrap.Modal(document.getElementById('novoFuncionarioModal')),
      btnShowNovoFuncionarioModal: document.getElementById('btnShowNovoFuncionarioModal'),
      formNovoFuncionario: document.getElementById('formNovoFuncionario'),
      btnSalvarFuncionario: document.getElementById('btnSalvarFuncionario'),
      novoFuncError: document.getElementById('novoFuncError'),
    };

    // Estado da aplicação
    this.state = {
      token: localStorage.getItem('authToken') || null,
      currentUser: JSON.parse(localStorage.getItem('currentUser')) || null,
      selectedEmployeeId: null, // ID selecionado no dropdown (para admins)
      todayRecord: null, // Registro do dia para o usuário sendo visualizado
      employeeList: [] // Cache da lista de funcionários (para admins)
    };

    this._init();
  }

  // ================ INICIALIZAÇÃO ================
  _init() {
    console.log("PontoApp inicializando...");
    this._setupEventListeners();
    this._initSelect2();
    this._checkInitialAuth(); // Verifica se já está logado ao carregar
  }

  _setupEventListeners() {
    // Login
    this.ui.loginForm.addEventListener('submit', (e) => e.preventDefault()); // Previne submit padrão
    this.ui.btnLoginSubmit.addEventListener('click', () => this.handleLogin());

    // Logout (adicionado dinamicamente)

    // Ações de Ponto
    this.ui.btnEntrada.addEventListener('click', () => this.registrarPonto('check-in'));
    this.ui.btnSaidaAlmoco.addEventListener('click', () => this.registrarPonto('lunch-start'));
    this.ui.btnRetornoAlmoco.addEventListener('click', () => this.registrarPonto('lunch-end'));
    this.ui.btnSaida.addEventListener('click', () => this.registrarPonto('check-out'));

    // Seleção de Funcionário (Admin)
    this.ui.employeeSelect.on('change', (e) => {
      this.state.selectedEmployeeId = e.target.value ? parseInt(e.target.value, 10) : null;
      this.handleEmployeeSelectionChange();
    });


    // Cadastro de Novo Funcionário
    this.ui.formNovoFuncionario.addEventListener('submit', (e) => e.preventDefault());
    this.ui.btnSalvarFuncionario.addEventListener('click', () => this.handleSaveNewEmployee());
    // Limpa erros ao abrir o modal
    document.getElementById('novoFuncionarioModal').addEventListener('show.bs.modal', () => {
      this.ui.formNovoFuncionario.reset();
      this.ui.formNovoFuncionario.classList.remove('was-validated');
      this.ui.novoFuncError.style.display = 'none';
      this.ui.novoFuncError.textContent = '';
    });
    // Validação Bootstrap em tempo real (opcional)
    this.ui.formNovoFuncionario.querySelectorAll('input, select').forEach(input => {
      input.addEventListener('input', () => {
        if (this.ui.formNovoFuncionario.classList.contains('was-validated')) {
          this._validateNewEmployeeForm(); // Revalida ao digitar se já tentou salvar
        }
      });
    });

  }

  _initSelect2() {
    this.ui.employeeSelect.select2({
      placeholder: "Selecione um funcionário para ver/registrar",
      allowClear: true,
      width: '100%',
      dropdownParent: this.ui.employeeSelectContainer // Ajuda com modais ou layouts complexos
    });
    // Inicialmente desabilitado, habilitar para admin após login
    this.ui.employeeSelect.prop('disabled', true);
    this.ui.employeeSelectContainer.style.display = 'none';
    this.ui.employeeSelectHelp.style.display = 'none';
  }


  // ================ AUTENTICAÇÃO ================

  _checkInitialAuth() {
    if (this.state.token && this.state.currentUser) {
      console.log("Usuário já logado:", this.state.currentUser.email);
      this._updateUIAfterLogin();
    } else {
      console.log("Nenhum usuário logado.");
      this._showLoginView();
    }
  }

  async handleLogin() {
    const email = this.ui.loginForm.email.value;
    const password = this.ui.loginForm.password.value;
    this.ui.loginError.style.display = 'none'; // Esconde erro anterior

    if (!email || !password) {
      this.ui.loginError.textContent = 'E-mail e senha são obrigatórios.';
      this.ui.loginError.style.display = 'block';
      return;
    }

    try {
      this.ui.btnLoginSubmit.disabled = true; // Desabilita botão durante request
      this.ui.btnLoginSubmit.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Entrando...'; // Feedback visual

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || `Erro ${response.status}`);
      }

      // Sucesso no Login
      this.state.token = result.data.token;
      this.state.currentUser = result.data.user;
      localStorage.setItem('authToken', this.state.token);
      localStorage.setItem('currentUser', JSON.stringify(this.state.currentUser));

      console.log("Login bem-sucedido:", this.state.currentUser.email);
      this.ui.loginModal.hide(); // Fecha o modal
      this._updateUIAfterLogin(); // Atualiza a UI principal

    } catch (error) {
      console.error("Erro no login:", error);
      this.ui.loginError.textContent = `Falha no login: ${error.message}`;
      this.ui.loginError.style.display = 'block';
    } finally {
      // Reabilita o botão e restaura texto
      this.ui.btnLoginSubmit.disabled = false;
      this.ui.btnLoginSubmit.innerHTML = 'Entrar';
    }
  }

  _updateUIAfterLogin() {
    // Mostra conteúdo principal, esconde prompt de login
    this.ui.contentArea.style.display = 'block';
    this.ui.loginPrompt.style.display = 'none';

    // Atualiza área de autenticação na Navbar
    this.ui.authArea.innerHTML = `
          <span class="navbar-text me-3">
              Bem-vindo, ${this.state.currentUser.fullName}! (${this.state.currentUser.role})
          </span>
          <button class="btn btn-outline-secondary" id="btnLogout">Sair</button>
      `;
    // Adiciona listener para o botão Logout recém-criado
    document.getElementById('btnLogout').addEventListener('click', () => this.handleLogout());


    // Lógica específica para Admin
    if (this.state.currentUser.role === 'admin') {
      this.ui.employeeSelectContainer.style.display = 'block'; // Mostra dropdown
      this.ui.employeeSelectHelp.style.display = 'block';
      this.ui.employeeSelect.prop('disabled', false);         // Habilita dropdown
      this.ui.btnShowNovoFuncionarioModal.style.display = 'inline-block'; // Mostra botão de cadastrar
      this.loadEmployeeListForAdmin(); // Carrega lista para o dropdown
    } else {
      // Usuário não-admin: esconde e desabilita o select, esconde botão de cadastro
      this.ui.employeeSelectContainer.style.display = 'none';
      this.ui.employeeSelectHelp.style.display = 'none';
      this.ui.employeeSelect.prop('disabled', true);
      this.ui.btnShowNovoFuncionarioModal.style.display = 'none';
      // Define o funcionário selecionado como o próprio usuário logado
      this.state.selectedEmployeeId = this.state.currentUser.id;
      this.handleEmployeeSelectionChange(); // Carrega dados do próprio usuário
    }

    // Define a data atual no card de status
    this.ui.statusDate.textContent = new Date().toLocaleDateString('pt-BR');

    // Carrega o status inicial (do próprio usuário ou do primeiro da lista se admin)
    this.fetchAndUpdateStatus();
  }

  handleLogout() {
    this.state.token = null;
    this.state.currentUser = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    console.log("Usuário deslogado.");

    // Limpa select2 (se existir)
    this.ui.employeeSelect.empty().trigger('change');
    this.ui.employeeSelect.prop('disabled', true);

    this._showLoginView(); // Mostra a tela de login
    this.resetUIState(); // Limpa o estado da UI (status, botões)
  }


  _showLoginView() {
    this.ui.contentArea.style.display = 'none'; // Esconde conteúdo principal
    this.ui.loginPrompt.style.display = 'block'; // Mostra prompt de login

    // Reseta a área de autenticação na Navbar para o botão de Login
    this.ui.authArea.innerHTML = `
             <button class="btn btn-primary" id="btnLoginView" data-bs-toggle="modal" data-bs-target="#loginModal">Login</button>
         `;
    // Adiciona listener para o novo botão (se necessário, mas o modal já tem)
    // document.getElementById('btnLoginView').addEventListener('click', () => this.ui.loginModal.show());
  }

  resetUIState() {
    // Limpa card de status
    this.ui.statusPlaceholder.style.display = 'block';
    this.ui.statusDetails.style.display = 'none';
    this.ui.statusEntrada.textContent = '--:--';
    this.ui.statusSaidaAlmoco.textContent = '--:--';
    this.ui.statusRetornoAlmoco.textContent = '--:--';
    this.ui.statusSaida.textContent = '--:--';
    this.ui.statusTotalHoras.textContent = '-.-- h';
    this.ui.statusDate.textContent = '--/--/----';


    // Desabilita todos os botões de ponto
    this.ui.btnEntrada.disabled = true;
    this.ui.btnSaidaAlmoco.disabled = true;
    this.ui.btnRetornoAlmoco.disabled = true;
    this.ui.btnSaida.disabled = true;

    // Limpa estado interno
    this.state.selectedEmployeeId = null;
    this.state.todayRecord = null;
  }

  // ================ LÓGICA DE NEGÓCIO (PONTO) ================

  async handleEmployeeSelectionChange() {
    if (!this.state.selectedEmployeeId) {
      this.resetUIState(); // Limpa a UI se nenhum funcionário for selecionado
      return;
    }
    console.log("Funcionário selecionado:", this.state.selectedEmployeeId);
    await this.fetchAndUpdateStatus(); // Busca e atualiza o status para o selecionado
  }


  async fetchAndUpdateStatus() {
    // Determina de quem buscar o status: o selecionado (admin) ou o logado (não-admin)
    const targetEmployeeId = (this.state.currentUser.role === 'admin' && this.state.selectedEmployeeId)
      ? this.state.selectedEmployeeId
      : this.state.currentUser.id;

    if (!targetEmployeeId) {
      console.warn("fetchAndUpdateStatus chamado sem targetEmployeeId.");
      this.resetUIState();
      return;
    }

    try {
      // Busca o registro de hoje para o funcionário alvo
      // Usamos a rota /api/time-records/today se for o usuário logado,
      // ou /api/time-records/employee/:id/today (precisa criar essa rota?)
      // Por simplicidade, vamos buscar o histórico e filtrar o de hoje.
      // Se for só para o usuário logado, /today é mais eficiente.

      // Usando a rota /today (só funciona para o próprio usuário logado)
      // Ajuste se admin precisar ver o /today de outro usuário
      let url = '/api/time-records/today';
      // Se admin selecionou outro user, precisa de outra rota ou buscar histórico
      // Vamos buscar o histórico neste caso para simplificar
      if (this.state.currentUser.role === 'admin' && targetEmployeeId !== this.state.currentUser.id) {
        // Buscar o histórico e pegar o registro de hoje manualmente
        // (Melhor seria ter uma rota /api/time-records/employee/:id/today no backend)
        console.log(`Admin buscando status de ${targetEmployeeId}. Usando histórico.`);
        await this.fetchHistoryAndFindToday(targetEmployeeId);

      } else {
        // Busca o registro de hoje do usuário logado
        const response = await this.fetchWithAuth(url);
        const result = await response.json();

        if (!response.ok) {
          if (response.status === 404) { // 404 significa que não há registro hoje
            this.state.todayRecord = null;
          } else {
            throw new Error(result.message || `Erro ${response.status}`);
          }
        } else {
          this.state.todayRecord = result.data; // Armazena o registro de hoje
        }
      }


      this.updateStatusUI(); // Atualiza o card de status
      this.updateActionButtons(); // Atualiza o estado dos botões de ponto

    } catch (error) {
      console.error(`Erro ao buscar status para employeeId ${targetEmployeeId}:`, error);
      this.showAlert('danger', `Falha ao carregar status: ${error.message}`);
      this.resetUIState(); // Limpa em caso de erro
    }
  }

  // Função auxiliar para admin buscar histórico e extrair o registro de hoje
  async fetchHistoryAndFindToday(employeeId) {
    try {
      const response = await this.fetchWithAuth(`/api/time-records/employee/${employeeId}`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || `Erro ${response.status}`);

      const todayStr = new Date().toISOString().split('T')[0];
      this.state.todayRecord = result.data.find(record => record.startTime.startsWith(todayStr)) || null;
      console.log("Registro de hoje encontrado no histórico:", this.state.todayRecord);

    } catch (error) {
      console.error(`Erro ao buscar histórico para encontrar registro de hoje (employeeId ${employeeId}):`, error);
      this.showAlert('danger', `Falha ao buscar histórico: ${error.message}`);
      this.state.todayRecord = null; // Garante que está nulo em caso de erro
    }
  }

  updateStatusUI() {
    const record = this.state.todayRecord;

    if (!record) {
      this.ui.statusPlaceholder.textContent = 'Nenhum registro encontrado para hoje.';
      this.ui.statusPlaceholder.style.display = 'block';
      this.ui.statusDetails.style.display = 'none';
    } else {
      this.ui.statusPlaceholder.style.display = 'none';
      this.ui.statusDetails.style.display = 'block';

      this.ui.statusEntrada.textContent = this.formatTime(record.startTime);
      this.ui.statusSaidaAlmoco.textContent = this.formatTime(record.lunchStartTime);
      this.ui.statusRetornoAlmoco.textContent = this.formatTime(record.lunchEndTime);
      this.ui.statusSaida.textContent = this.formatTime(record.endTime);
      // Usa toLocaleString para formatar o número decimal de horas
      this.ui.statusTotalHoras.textContent = record.totalHours
        ? `${parseFloat(record.totalHours).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} h`
        : '-.-- h';
    }
  }

  updateActionButtons() {
    const record = this.state.todayRecord;
    const canPerformActions = this.state.currentUser.role === 'admin' || this.state.selectedEmployeeId === this.state.currentUser.id;

    // Habilita/desabilita botões baseado no estado do registro ATUAL
    // Só permite ações se for admin ou o próprio usuário
    this.ui.btnEntrada.disabled = !canPerformActions || !!record; // Desabilita se não pode agir ou se já tem registro hoje
    this.ui.btnSaidaAlmoco.disabled = !canPerformActions || !record || !!record.lunchStartTime || !!record.endTime; // Desabilita se não pode agir, não tem registro, já saiu pro almoço, ou já fez checkout
    this.ui.btnRetornoAlmoco.disabled = !canPerformActions || !record || !record.lunchStartTime || !!record.lunchEndTime || !!record.endTime; // Desabilita se ..., não saiu pro almoço, já retornou do almoço, ou já fez checkout
    this.ui.btnSaida.disabled = !canPerformActions || !record || !!record.endTime; // Desabilita se ..., ou já fez checkout

    // Opcional: Requerer retorno do almoço para poder sair
    // if (record && record.lunchStartTime && !record.lunchEndTime) {
    //     this.ui.btnSaida.disabled = true;
    // }
  }


  async registrarPonto(tipoAcao) {
    // A ação é sempre para o funcionário selecionado (ou o próprio usuário se não for admin)
    const targetEmployeeId = this.state.selectedEmployeeId || this.state.currentUser.id;

    // Verifica se o usuário logado pode registrar ponto para o targetEmployeeId
    if (this.state.currentUser.role !== 'admin' && this.state.currentUser.id !== targetEmployeeId) {
      this.showAlert('warning', 'Você não tem permissão para registrar ponto para este funcionário.');
      return;
    }


    console.log(`Tentando registrar ${tipoAcao} para employeeId ${targetEmployeeId}`);

    let url = '';
    const options = { method: 'POST' }; // Body é tratado no backend usando req.user.id

    switch (tipoAcao) {
      case 'check-in': url = '/api/time-records/check-in'; break;
      case 'lunch-start': url = '/api/time-records/lunch-start'; break;
      case 'lunch-end': url = '/api/time-records/lunch-end'; break;
      case 'check-out': url = '/api/time-records/check-out'; break;
      default:
        console.error("Tipo de ação inválida:", tipoAcao);
        this.showAlert('danger', 'Ação desconhecida.');
        return;
    }

    // Desabilitar todos os botões durante a requisição para evitar cliques duplos
    this._setPointButtonsDisabled(true);

    try {
      // IMPORTANTE: A API agora usa o token para identificar o usuário.
      // Se um admin estiver registrando para OUTRO usuário, a API precisa ser ajustada
      // para aceitar um `employeeId` no corpo E verificar se o requisitante é admin.
      // Assumindo por enquanto que a API SÓ registra para o usuário do TOKEN.
      // *** SE ADMIN PRECISA REGISTRAR PARA OUTROS, O BACKEND PRECISA MUDAR ***
      if (this.state.currentUser.role === 'admin' && targetEmployeeId !== this.state.currentUser.id) {
        // **ALERTA:** A API atual (checkIn, checkOut, etc.) usa req.user.id.
        // Para um admin registrar por outro, o backend precisaria:
        // 1. Aceitar `employeeId` no corpo da requisição POST.
        // 2. Verificar se `req.user.role === 'admin'`.
        // 3. Usar o `employeeId` do corpo em vez de `req.user.id`.
        // COMO ISSO NÃO FOI IMPLEMENTADO NO BACKEND, mostraremos um erro por enquanto.
        throw new Error("Funcionalidade de registrar ponto para outro usuário não implementada no backend.");
        // Se fosse implementar, seria algo como:
        // options.headers = { 'Content-Type': 'application/json' };
        // options.body = JSON.stringify({ employeeId: targetEmployeeId });
      }


      const response = await this.fetchWithAuth(url, options);
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || `Erro ${response.status}`);
      }

      this.showAlert('success', `${this.getTipoNome(tipoAcao)} registrado com sucesso!`);
      // Atualiza o estado e a UI após o sucesso
      await this.fetchAndUpdateStatus(); // Re-busca o status atualizado

    } catch (error) {
      console.error(`Erro ao registrar ${tipoAcao}:`, error);
      // Mostra o erro da API ou um erro genérico
      const displayError = error.message.includes("não implementada no backend")
        ? error.message // Mostra o erro específico de admin
        : `Falha ao registrar ${this.getTipoNome(tipoAcao)}: ${error.message}`;
      this.showAlert('danger', displayError);
      // Reabilita os botões em caso de erro para permitir nova tentativa
      this.updateActionButtons(); // Reavalia o estado dos botões baseado no último estado conhecido
    } finally {
      // Garante que os botões sejam reavaliados mesmo se a requisição falhar
      this._setPointButtonsDisabled(false); // Reabilita interação geral
      this.updateActionButtons(); // Ajusta habilitação baseada no estado atual
    }
  }

  _setPointButtonsDisabled(isDisabled) {
    this.ui.btnEntrada.disabled = isDisabled;
    this.ui.btnSaidaAlmoco.disabled = isDisabled;
    this.ui.btnRetornoAlmoco.disabled = isDisabled;
    this.ui.btnSaida.disabled = isDisabled;
  }

  // ================ GERENCIAMENTO DE FUNCIONÁRIOS (ADMIN) ================

  async loadEmployeeListForAdmin() {
    if (this.state.currentUser.role !== 'admin') return; // Só para admins

    try {
      const response = await this.fetchWithAuth('/api/employees');
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || `Erro ${response.status}`);
      }

      this.state.employeeList = result.data;

      // Limpa opções existentes (exceto a placeholder)
      this.ui.employeeSelect.find('option:not([value=""])').remove();

      // Adiciona funcionários ao dropdown Select2
      this.state.employeeList.forEach(emp => {
        const option = new Option(
          `${emp.fullName} (${emp.role})`, // Texto da opção
          emp.id,                           // Valor da opção
          false,                            // Default selected
          false                             // Selected
        );
        // Adicionar dados extras se necessário (ex: foto)
        // option.dataset.foto = emp.foto_url || 'assets/default-avatar.jpg';
        this.ui.employeeSelect.append(option);
      });

      // Dispara o evento change para atualizar o Select2
      this.ui.employeeSelect.trigger('change');

      // Seleciona o próprio admin por padrão, se desejar
      // this.ui.employeeSelect.val(this.state.currentUser.id).trigger('change');


    } catch (error) {
      console.error("Erro ao carregar lista de funcionários:", error);
      this.showAlert('danger', `Falha ao carregar funcionários: ${error.message}`);
    }
  }

  _validateNewEmployeeForm() {
    const form = this.ui.formNovoFuncionario;
    let isValid = true;

    // Nome Completo
    if (!form.fullName.checkValidity()) {
      form.fullName.classList.add('is-invalid'); // Adiciona classe do Bootstrap
      isValid = false;
    } else {
      form.fullName.classList.remove('is-invalid');
    }

    // Email
    if (!form.email.checkValidity()) {
      form.email.classList.add('is-invalid');
      isValid = false;
    } else {
      form.email.classList.remove('is-invalid');
    }

    // Senha
    if (!form.password.checkValidity()) {
      form.password.classList.add('is-invalid');
      isValid = false;
    } else {
      form.password.classList.remove('is-invalid');
    }

    // Cargo (Role)
    if (!form.role.checkValidity()) {
      form.role.classList.add('is-invalid');
      isValid = false;
    } else {
      form.role.classList.remove('is-invalid');
    }

    // Carga Horária (opcional, mas valida se preenchido)
    if (form.weeklyHours.value && !form.weeklyHours.checkValidity()) {
      form.weeklyHours.classList.add('is-invalid');
      isValid = false;
    } else {
      form.weeklyHours.classList.remove('is-invalid');
    }


    return isValid;
  }


  async handleSaveNewEmployee() {
    // Adiciona classe para mostrar feedback de validação do Bootstrap
    this.ui.formNovoFuncionario.classList.add('was-validated');

    if (!this._validateNewEmployeeForm()) {
      this.ui.novoFuncError.textContent = 'Por favor, corrija os campos inválidos.';
      this.ui.novoFuncError.style.display = 'block';
      return;
    }

    // Limpa erro anterior
    this.ui.novoFuncError.style.display = 'none';


    const formData = new FormData(this.ui.formNovoFuncionario);
    const data = Object.fromEntries(formData.entries());

    // Converte weeklyHours para número ou remove se vazio
    if (data.weeklyHours) {
      data.weeklyHours = parseFloat(data.weeklyHours);
    } else {
      delete data.weeklyHours; // Deixa o backend usar o default
    }


    console.log("Salvando novo funcionário:", data);

    // Desabilitar botão durante a requisição
    this.ui.btnSalvarFuncionario.disabled = true;
    this.ui.btnSalvarFuncionario.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Salvando...';

    try {
      const response = await this.fetchWithAuth('/api/employees', {
        method: 'POST',
        body: JSON.stringify(data) // Envia os dados corretos
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        // Tenta pegar o campo específico do erro (se o backend enviar)
        const fieldError = result.error?.field ? ` (Campo: ${result.error.field})` : '';
        throw new Error((result.message || `Erro ${response.status}`) + fieldError);
      }

      this.showAlert('success', 'Funcionário cadastrado com sucesso!');
      this.ui.novoFuncionarioModal.hide(); // Fecha o modal
      this.loadEmployeeListForAdmin(); // Recarrega a lista no dropdown

    } catch (error) {
      console.error("Erro ao cadastrar funcionário:", error);
      this.ui.novoFuncError.textContent = `Erro: ${error.message}`;
      this.ui.novoFuncError.style.display = 'block';
    } finally {
      // Reabilitar botão
      this.ui.btnSalvarFuncionario.disabled = false;
      this.ui.btnSalvarFuncionario.innerHTML = 'Salvar Funcionário';
    }
  }


  // ================ UTILITÁRIOS ================

  /**
   * Função wrapper para fetch que inclui o token JWT automaticamente.
   */
  async fetchWithAuth(url, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.state.token) {
      headers['Authorization'] = `Bearer ${this.state.token}`;
    } else {
      console.warn("fetchWithAuth chamado sem token.");
      // Poderia redirecionar para login aqui ou lançar erro específico
      // throw new Error("Usuário não autenticado.");
    }

    const response = await fetch(url, { ...options, headers });

    // Tratamento global para erros de autenticação/autorização
    if (response.status === 401) { // Não autorizado (token inválido, expirado ou ausente)
      console.error("Erro 401 - Não autorizado. Deslogando...");
      this.showAlert('danger', 'Sessão inválida ou expirada. Por favor, faça login novamente.');
      this.handleLogout(); // Força o logout
      throw new Error('Não autorizado'); // Interrompe a execução da chamada original
    }
    if (response.status === 403) { // Proibido (autenticado mas sem permissão)
      console.error("Erro 403 - Acesso Proibido.");
      // Não desloga, mas informa o usuário
      throw new Error('Acesso proibido para esta operação.');
    }


    return response;
  }

  /**
   * Mostra um alerta temporário na tela.
   * @param {'primary'|'secondary'|'success'|'danger'|'warning'|'info'|'light'|'dark'} type
   * @param {string} message
   */
  showAlert(type, message) {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = `
          <div class="alert alert-${type} alert-dismissible fade show" role="alert">
              ${message}
              <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
          </div>
      `;
    this.ui.alertPlaceholder.append(wrapper);

    // Auto-fecha após 5 segundos
    setTimeout(() => {
      const alert = wrapper.querySelector('.alert');
      if (alert) {
        bootstrap.Alert.getOrCreateInstance(alert).close();
      }
      // Remove o wrapper após o fechamento para não acumular divs vazias
      setTimeout(() => wrapper.remove(), 500); // Espera a animação de fade out
    }, 5000);
  }

  /** Formata timestamp (Date ou string ISO) para HH:MM */
  formatTime(timestamp) {
    if (!timestamp) return '--:--';
    try {
      const date = new Date(timestamp);
      // Verifica se a data é válida
      if (isNaN(date.getTime())) return 'Inválido';
      return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false });
    } catch (e) {
      console.error("Erro ao formatar data:", timestamp, e);
      return 'Erro';
    }
  }

  /** Retorna nome amigável para o tipo de ação */
  getTipoNome(tipo) {
    const nomes = {
      'check-in': 'Entrada',
      'lunch-start': 'Saída Almoço',
      'lunch-end': 'Retorno Almoço',
      'check-out': 'Saída'
    };
    return nomes[tipo] || tipo;
  }
}

// Inicializa a aplicação quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  window.pontoApp = new PontoApp(); // Cria a instância global (ou local se preferir)
});