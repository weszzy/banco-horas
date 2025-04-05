/**
 * Sistema de Controle de Ponto v1.2.1
 * Gerencia autenticação, registro de ponto e cadastro de funcionários.
 */

class PontoApp {
  constructor() {
    // Cache de Elementos da UI
    this.ui = {
      loginModal: new bootstrap.Modal(document.getElementById('loginModal')),
      loginForm: document.getElementById('loginForm'),
      loginError: document.getElementById('loginError'),
      btnLoginSubmit: document.getElementById('btnLoginSubmit'),
      authArea: document.getElementById('authArea'),
      adminTools: document.getElementById('adminTools'),
      btnShowNovoFuncionarioModal: document.getElementById('btnShowNovoFuncionarioModal'),
      contentArea: document.getElementById('contentArea'),
      loginPrompt: document.getElementById('loginPrompt'),
      alertPlaceholder: document.getElementById('alertPlaceholder'),
      employeeSelect: $('#employeeSelect'),
      employeeSelectContainer: document.getElementById('employeeSelectContainer'),
      // Status elements
      statusContainer: document.getElementById('statusContainer'),
      statusDate: document.getElementById('statusDate'),
      statusPlaceholder: document.getElementById('statusPlaceholder'),
      statusDetails: document.getElementById('statusDetails'),
      statusEntrada: document.getElementById('statusEntrada'),
      statusSaidaAlmoco: document.getElementById('statusSaidaAlmoco'),
      statusRetornoAlmoco: document.getElementById('statusRetornoAlmoco'),
      statusSaida: document.getElementById('statusSaida'),
      statusTotalHoras: document.getElementById('statusTotalHoras'),
      // Action buttons
      btnEntrada: document.getElementById('btnEntrada'),
      btnSaidaAlmoco: document.getElementById('btnSaidaAlmoco'),
      btnRetornoAlmoco: document.getElementById('btnRetornoAlmoco'),
      btnSaida: document.getElementById('btnSaida'),
      // Modal Novo Funcionário
      novoFuncionarioModal: new bootstrap.Modal(document.getElementById('novoFuncionarioModal')),
      formNovoFuncionario: document.getElementById('formNovoFuncionario'),
      btnSalvarFuncionario: document.getElementById('btnSalvarFuncionario'),
      novoFuncError: document.getElementById('novoFuncError'),
    };

    // Estado da Aplicação
    this.state = {
      token: localStorage.getItem('authToken') || null,
      currentUser: JSON.parse(localStorage.getItem('currentUser')) || null,
      selectedEmployeeId: null,
      todayRecord: null,
      employeeList: []
    };

    // Inicialização
    this._init();
  }

  // ================ INICIALIZAÇÃO ================
  _init() {
    console.log("PontoApp inicializando...");
    this._setupEventListeners();
    this._initSelect2();
    // Define a UI inicial baseada na autenticação
    if (this.state.token && this.state.currentUser) {
      this._checkInitialAuth();
    } else {
      this._showLoginView();
    }
  }

  _setupEventListeners() {
    // Login
    this.ui.loginForm.addEventListener('submit', (e) => {
      e.preventDefault(); // Previne submit padrão
      this.handleLogin(); // Chama o login ao pressionar Enter no form
    });
    this.ui.btnLoginSubmit.addEventListener('click', () => this.handleLogin());

    // Ações de Ponto
    this.ui.btnEntrada.addEventListener('click', () => this.registrarPonto('check-in'));
    this.ui.btnSaidaAlmoco.addEventListener('click', () => this.registrarPonto('lunch-start'));
    this.ui.btnRetornoAlmoco.addEventListener('click', () => this.registrarPonto('lunch-end'));
    this.ui.btnSaida.addEventListener('click', () => this.registrarPonto('check-out'));

    // Seleção de Funcionário (Admin)
    this.ui.employeeSelect.on('change', (e) => {
      // Usar o valor diretamente, já é string ou null
      const selectedValue = $(e.target).val();
      this.state.selectedEmployeeId = selectedValue ? parseInt(selectedValue, 10) : null;
      this.handleEmployeeSelectionChange();
    });

    // Cadastro de Novo Funcionário
    this.ui.formNovoFuncionario.addEventListener('submit', (e) => {
      e.preventDefault(); // Previne submit padrão
      this.handleSaveNewEmployee(); // Chama ao pressionar Enter no form
    });
    this.ui.btnSalvarFuncionario.addEventListener('click', () => this.handleSaveNewEmployee());

    // Limpa erros e validação ao ABRIR o modal de novo funcionário
    document.getElementById('novoFuncionarioModal').addEventListener('show.bs.modal', () => {
      this.ui.formNovoFuncionario.reset();
      this.ui.formNovoFuncionario.classList.remove('was-validated');
      this.ui.novoFuncError.style.display = 'none';
      this.ui.novoFuncError.textContent = '';
      // Remove classes 'is-invalid' de todos os inputs/selects dentro do form
      this.ui.formNovoFuncionario.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
    });
    // Validação Bootstrap em tempo real (opcional, mas útil)
    this.ui.formNovoFuncionario.querySelectorAll('input, select').forEach(input => {
      input.addEventListener('input', () => {
        // Só revalida se o usuário JÁ tentou submeter uma vez
        if (this.ui.formNovoFuncionario.classList.contains('was-validated')) {
          this._validateNewEmployeeForm(); // Revalida ao digitar
        }
      });
    });
  }

  _initSelect2() {
    this.ui.employeeSelect.select2({
      placeholder: "Selecione para ver status",
      allowClear: true,
      width: '100%',
      // dropdownParent: $('#employeeSelect').parent() // Pode ser necessário se houver problemas de z-index
    });
    this.ui.employeeSelect.prop('disabled', true); // Começa desabilitado
  }

  // ================ AUTENTICAÇÃO ================

  _checkInitialAuth() {
    console.log("Verificando autenticação existente...");
    // Se temos token e usuário, tentamos atualizar a UI como se tivéssemos acabado de logar
    this._updateUIAfterLogin();
  }

  async handleLogin() {
    const email = this.ui.loginForm.email.value;
    const password = this.ui.loginForm.password.value;
    this.ui.loginError.style.display = 'none';

    if (!email || !password) {
      this.ui.loginError.textContent = 'E-mail e senha são obrigatórios.';
      this.ui.loginError.style.display = 'block';
      return;
    }

    this.ui.btnLoginSubmit.disabled = true;
    this.ui.btnLoginSubmit.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Entrando...';

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || `Erro ${response.status}`);
      }

      this.state.token = result.data.token;
      this.state.currentUser = result.data.user;
      localStorage.setItem('authToken', this.state.token);
      localStorage.setItem('currentUser', JSON.stringify(this.state.currentUser));

      console.log("Login bem-sucedido:", this.state.currentUser.email, "Role:", this.state.currentUser.role);
      this.ui.loginModal.hide();
      this._updateUIAfterLogin();

    } catch (error) {
      console.error("Erro no login:", error);
      this.ui.loginError.textContent = `Falha no login: ${error.message}`;
      this.ui.loginError.style.display = 'block';
    } finally {
      this.ui.btnLoginSubmit.disabled = false;
      this.ui.btnLoginSubmit.innerHTML = 'Entrar';
    }
  }

  _updateUIAfterLogin() {
    if (!this.state.currentUser) {
      console.error("Tentando atualizar UI sem currentUser.");
      this.handleLogout();
      return;
    }

    this.ui.loginPrompt.style.display = 'none';
    this.ui.contentArea.style.display = 'block';

    // Atualiza Navbar
    this.ui.authArea.innerHTML = `
          <span class="navbar-text me-3">
              Olá, ${this.state.currentUser.fullName}
          </span>
          <button class="btn btn-outline-secondary btn-sm" id="btnLogout">Sair</button>
      `;
    // Garante que o listener de logout seja adicionado apenas uma vez ou removido e readicionado
    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) { // Verifica se o botão existe antes de adicionar listener
      btnLogout.removeEventListener('click', this.handleLogout); // Remove listener antigo se existir
      btnLogout.addEventListener('click', () => this.handleLogout()); // Adiciona novo listener
    } else {
      console.error("Botão de logout não encontrado após atualizar a UI.");
    }


    // Verifica se é Admin
    console.log(`Verificando role para UI: '${this.state.currentUser.role}'`);
    if (this.state.currentUser.role === 'admin') {
      console.log("Usuário é admin. Mostrando ferramentas.");
      this.ui.adminTools.style.display = 'list-item'; // Mostra item da lista na navbar
      this.ui.employeeSelectContainer.style.display = 'block';
      this.ui.employeeSelect.prop('disabled', false);
      this.loadEmployeeListForAdmin();
    } else {
      console.log("Usuário não é admin.");
      this.ui.adminTools.style.display = 'none';
      this.ui.employeeSelectContainer.style.display = 'none';
      this.ui.employeeSelect.prop('disabled', true);
      this.state.selectedEmployeeId = this.state.currentUser.id;
    }

    this.ui.statusDate.textContent = new Date().toLocaleDateString('pt-BR');
    this.fetchAndUpdateStatus();
  }

  handleLogout() {
    // Limpa estado e localStorage
    this.state.token = null;
    this.state.currentUser = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    console.log("Usuário deslogado.");

    // Limpa select2 (importante fazer antes de desabilitar/esconder)
    this.ui.employeeSelect.val(null).trigger('change');
    this.ui.employeeSelect.prop('disabled', true);

    // Mostra a view de login e reseta a UI
    this._showLoginView();
    this.resetUIState();
  }

  _showLoginView() {
    this.ui.contentArea.style.display = 'none';
    this.ui.loginPrompt.style.display = 'block';
    // Reseta a área de autenticação na Navbar
    this.ui.authArea.innerHTML = `
            <button class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#loginModal">Login</button>
        `;
    // Garante que as ferramentas de admin e select estejam ocultos
    this.ui.adminTools.style.display = 'none';
    this.ui.employeeSelectContainer.style.display = 'none';
  }

  resetUIState() {
    // Limpa status
    this.ui.statusPlaceholder.style.display = 'block';
    this.ui.statusPlaceholder.textContent = 'Faça login para ver seu status.';
    this.ui.statusDetails.style.display = 'none';
    this.ui.statusEntrada.textContent = '--:--';
    this.ui.statusSaidaAlmoco.textContent = '--:--';
    this.ui.statusRetornoAlmoco.textContent = '--:--';
    this.ui.statusSaida.textContent = '--:--';
    this.ui.statusTotalHoras.textContent = '-.-- h';
    this.ui.statusDate.textContent = '--/--/----';
    // Desabilita botões de ponto
    this.ui.btnEntrada.disabled = true;
    this.ui.btnSaidaAlmoco.disabled = true;
    this.ui.btnRetornoAlmoco.disabled = true;
    this.ui.btnSaida.disabled = true;
    // Limpa estado interno relacionado à visualização
    this.state.selectedEmployeeId = null;
    this.state.todayRecord = null;
    // Não limpa a lista de funcionários aqui, pois ela pode ser reutilizada se o admin logar novamente
  }

  // ================ LÓGICA DE NEGÓCIO (PONTO) ================

  handleEmployeeSelectionChange() {
    // O valor de selectedEmployeeId já foi atualizado pelo listener 'change'
    // Se admin limpou a seleção (valor null), volta a mostrar o status do próprio admin
    if (this.state.currentUser.role === 'admin' && !this.state.selectedEmployeeId) {
      console.log("Admin limpou seleção, mostrando status próprio.");
      // Define o ID do admin como selecionado para buscar status
      this.state.selectedEmployeeId = this.state.currentUser.id;
      // Não precisa atualizar o select visualmente aqui, o 'allowClear' já fez isso
    } else if (!this.state.selectedEmployeeId) {
      // Situação estranha: não-admin limpou seleção (não deveria ser possível)
      console.warn("Seleção limpa por não-admin?");
      this.resetUIState(); // Reseta a UI como segurança
      return;
    }

    console.log("Seleção mudou para employeeId:", this.state.selectedEmployeeId);
    this.fetchAndUpdateStatus(); // Busca e atualiza o status para o ID selecionado
  }

  async fetchAndUpdateStatus() {
    // Garante que temos um usuário logado
    if (!this.state.currentUser) {
      console.warn("fetchAndUpdateStatus chamado sem usuário logado.");
      return;
    }

    // Define o ID alvo: o selecionado pelo admin ou o próprio usuário logado
    let targetEmployeeId = this.state.selectedEmployeeId;
    if (this.state.currentUser.role !== 'admin' || !targetEmployeeId) {
      targetEmployeeId = this.state.currentUser.id;
    }
    // Atualiza o estado interno para garantir consistência
    this.state.selectedEmployeeId = targetEmployeeId;


    // Feedback inicial de carregamento
    console.log(`Buscando status para employeeId: ${targetEmployeeId}`);
    this.ui.statusPlaceholder.textContent = 'Carregando status...';
    this.ui.statusPlaceholder.style.display = 'block';
    this.ui.statusDetails.style.display = 'none';
    // Desabilita botões enquanto carrega
    this._setPointButtonsDisabled(true);

    try {
      let url = '';
      // Decide qual endpoint usar
      if (targetEmployeeId === this.state.currentUser.id) {
        url = '/api/time-records/today'; // Usuário logado buscando próprio status
      } else if (this.state.currentUser.role === 'admin') {
        // Admin buscando status de outro: usa o histórico e filtra
        console.log(`Admin buscando histórico de ${targetEmployeeId} para status.`);
        await this.fetchHistoryAndFindToday(targetEmployeeId);
        this.updateStatusUI();
        this.updateActionButtons(); // Atualiza botões após ter o status
        return; // Sai da função pois já atualizou a UI
      } else {
        throw new Error("Não autorizado a ver status de outro funcionário.");
      }

      // Se chegou aqui, está buscando /today para o usuário logado
      const response = await this.fetchWithAuth(url);
      const result = await response.json();

      if (!response.ok) {
        if (response.status === 404) {
          console.log(`Nenhum registro hoje para ${targetEmployeeId}`);
          this.state.todayRecord = null;
        } else {
          throw new Error(result.message || `Erro ${response.status}`);
        }
      } else {
        this.state.todayRecord = result.data;
      }

      this.updateStatusUI();
      this.updateActionButtons();

    } catch (error) {
      console.error(`Erro ao buscar status para employeeId ${targetEmployeeId}:`, error);
      this.showAlert('danger', `Falha ao carregar status: ${error.message}`);
      this.ui.statusPlaceholder.textContent = 'Erro ao carregar status.';
      this.ui.statusPlaceholder.style.display = 'block';
      this.ui.statusDetails.style.display = 'none';
      // Garante que botões fiquem desabilitados em caso de erro
      this._setPointButtonsDisabled(true);
    }
  }

  async fetchHistoryAndFindToday(employeeId) {
    this.state.todayRecord = null; // Reseta antes de buscar
    try {
      const response = await this.fetchWithAuth(`/api/time-records/employee/${employeeId}`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || `Erro ${response.status}`);

      const todayStr = new Date().toISOString().split('T')[0];
      // Encontra o primeiro registro que começa hoje (pode haver mais de um se houver erro)
      this.state.todayRecord = result.data.find(record => record.startTime && record.startTime.startsWith(todayStr)) || null;
      console.log(`Registro de hoje (ID: ${employeeId}) encontrado no histórico:`, this.state.todayRecord);

    } catch (error) {
      console.error(`Erro ao buscar histórico (employeeId ${employeeId}):`, error);
      this.showAlert('danger', `Falha ao buscar histórico: ${error.message}`);
      // Mantém todayRecord como null
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
      // Formata os horários
      this.ui.statusEntrada.textContent = this.formatTime(record.startTime);
      this.ui.statusSaidaAlmoco.textContent = this.formatTime(record.lunchStartTime);
      this.ui.statusRetornoAlmoco.textContent = this.formatTime(record.lunchEndTime);
      this.ui.statusSaida.textContent = this.formatTime(record.endTime);
      this.ui.statusTotalHoras.textContent = record.totalHours
        ? `${parseFloat(record.totalHours).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} h`
        : '-.-- h';
    }
  }

  updateActionButtons() {
    const record = this.state.todayRecord;
    // Ações são permitidas SOMENTE se o ID selecionado é o do usuário logado
    const canPerformActions = this.state.currentUser?.id === this.state.selectedEmployeeId;

    // Lógica de habilitação/desabilitação
    this.ui.btnEntrada.disabled = !canPerformActions || !!record;
    this.ui.btnSaidaAlmoco.disabled = !canPerformActions || !record || !!record.lunchStartTime || !!record.endTime;
    this.ui.btnRetornoAlmoco.disabled = !canPerformActions || !record || !record.lunchStartTime || !!record.lunchEndTime || !!record.endTime;
    this.ui.btnSaida.disabled = !canPerformActions || !record || !!record.endTime;

    // Opcional: Requerer retorno do almoço para poder fazer check-out
    // if (canPerformActions && record && record.lunchStartTime && !record.lunchEndTime && !record.endTime) {
    //     this.ui.btnSaida.disabled = true;
    // }
  }

  async registrarPonto(tipoAcao) {
    // Confirma novamente que a ação é para o usuário logado
    if (this.state.selectedEmployeeId !== this.state.currentUser.id) {
      this.showAlert('warning', 'Você só pode registrar seu próprio ponto.');
      return;
    }

    console.log(`Registrando ${tipoAcao} para usuário logado (ID: ${this.state.currentUser.id})`);

    let url = '';
    const options = { method: 'POST' }; // API usa o token, não precisa de body aqui

    switch (tipoAcao) {
      case 'check-in': url = '/api/time-records/check-in'; break;
      case 'lunch-start': url = '/api/time-records/lunch-start'; break;
      case 'lunch-end': url = '/api/time-records/lunch-end'; break;
      case 'check-out': url = '/api/time-records/check-out'; break;
      default: this.showAlert('danger', 'Ação desconhecida.'); return;
    }

    this._setPointButtonsDisabled(true);

    try {
      const response = await this.fetchWithAuth(url, options);
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || `Erro ${response.status}`);

      this.showAlert('success', `${this.getTipoNome(tipoAcao)} registrado com sucesso!`);
      await this.fetchAndUpdateStatus(); // Re-busca status para atualizar UI e botões

    } catch (error) {
      console.error(`Erro ao registrar ${tipoAcao}:`, error);
      this.showAlert('danger', `Falha ao registrar ${this.getTipoNome(tipoAcao)}: ${error.message}`);
      // Re-busca status mesmo em caso de erro para garantir que os botões reflitam o estado real
      await this.fetchAndUpdateStatus();
    }
    // finally { // O fetchAndUpdateStatus no try/catch já reavalia os botões
    //     this._setPointButtonsDisabled(false); // Reabilita interação geral
    // }
  }

  _setPointButtonsDisabled(isDisabled) {
    this.ui.btnEntrada.disabled = isDisabled;
    this.ui.btnSaidaAlmoco.disabled = isDisabled;
    this.ui.btnRetornoAlmoco.disabled = isDisabled;
    this.ui.btnSaida.disabled = isDisabled;
  }

  // ================ GERENCIAMENTO DE FUNCIONÁRIOS (ADMIN) ================

  async loadEmployeeListForAdmin() {
    if (this.state.currentUser?.role !== 'admin') return;

    try {
      const response = await this.fetchWithAuth('/api/employees');
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || `Erro ${response.status}`);

      this.state.employeeList = result.data;
      const select = this.ui.employeeSelect;
      const currentSelection = select.val(); // Salva seleção atual se houver

      select.empty().append(new Option('', '')); // Adiciona opção vazia para placeholder/clear

      this.state.employeeList.forEach(emp => {
        const optionText = `${emp.fullName} (${emp.role})`;
        const option = new Option(optionText, emp.id, false, false);
        select.append(option);
      });

      // Restaura seleção anterior ou seleciona o próprio admin
      if (currentSelection && this.state.employeeList.some(e => e.id == currentSelection)) {
        select.val(currentSelection);
      } else {
        // Seleciona o próprio admin por padrão após carregar a lista
        select.val(this.state.currentUser.id);
        this.state.selectedEmployeeId = this.state.currentUser.id; // Atualiza estado
      }
      select.trigger('change.select2'); // Notifica o select2 da mudança


    } catch (error) {
      console.error("Erro ao carregar lista de funcionários:", error);
      this.showAlert('danger', `Falha ao carregar funcionários: ${error.message}`);
    }
  }

  _validateNewEmployeeForm() {
    const form = this.ui.formNovoFuncionario;
    // Usa o método reportValidity() do form para mostrar feedback nativo/bootstrap
    // e retorna true/false indicando a validade geral.
    // A classe 'was-validated' precisa estar no form para o feedback aparecer.
    form.classList.add('was-validated'); // Garante que a validação visual seja mostrada
    return form.checkValidity();
  }

  async handleSaveNewEmployee() {
    if (!this._validateNewEmployeeForm()) {
      this.ui.novoFuncError.textContent = 'Por favor, corrija os campos inválidos.';
      this.ui.novoFuncError.style.display = 'block';
      return;
    }
    this.ui.novoFuncError.style.display = 'none';

    const formData = new FormData(this.ui.formNovoFuncionario);
    const data = Object.fromEntries(formData.entries());
    if (data.weeklyHours) { data.weeklyHours = parseFloat(data.weeklyHours); }
    else { delete data.weeklyHours; }

    this.ui.btnSalvarFuncionario.disabled = true;
    this.ui.btnSalvarFuncionario.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Salvando...';

    try {
      const response = await this.fetchWithAuth('/api/employees', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        const fieldError = result.error?.field ? ` (Campo: ${result.error.field})` : '';
        throw new Error((result.message || `Erro ${response.status}`) + fieldError);
      }

      this.showAlert('success', 'Funcionário cadastrado com sucesso!');
      this.ui.novoFuncionarioModal.hide();
      this.loadEmployeeListForAdmin(); // Recarrega lista

    } catch (error) {
      console.error("Erro ao cadastrar funcionário:", error);
      this.ui.novoFuncError.textContent = `Erro: ${error.message}`;
      this.ui.novoFuncError.style.display = 'block';
    } finally {
      this.ui.btnSalvarFuncionario.disabled = false;
      this.ui.btnSalvarFuncionario.innerHTML = 'Salvar Funcionário';
    }
  }

  // ================ UTILITÁRIOS ================

  async fetchWithAuth(url, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (this.state.token) { headers['Authorization'] = `Bearer ${this.state.token}`; }
    else { console.warn("fetchWithAuth chamado sem token."); /* Considerar lançar erro ou redirecionar */ }

    const response = await fetch(url, { ...options, headers });

    if (response.status === 401) {
      console.error("Erro 401 - Não autorizado detectado pelo fetchWithAuth. Deslogando...");
      this.showAlert('danger', 'Sessão inválida ou expirada. Faça login novamente.');
      this.handleLogout();
      // Lança um erro para interromper a promessa da chamada original
      return Promise.reject(new Error('Não autorizado'));
      // Alternativamente, retornar a resposta para tratamento local: return response;
    }
    // if (response.status === 403) { // Proibido
    //     console.error("Erro 403 - Acesso Proibido.");
    //     // Lança um erro ou retorna a resposta para tratamento específico
    //      return Promise.reject(new Error('Acesso proibido'));
    //     // Alternativamente: return response;
    // }
    return response; // Retorna a resposta para tratamento posterior
  }

  showAlert(type, message) {
    const wrapper = document.createElement('div');
    // Usa um ID único para poder remover o alerta específico se necessário
    const alertId = `alert-${Date.now()}`;
    wrapper.innerHTML = `
          <div id="${alertId}" class="alert alert-${type} alert-dismissible fade show" role="alert">
              ${message}
              <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
          </div>
      `;
    // Adiciona ao placeholder
    this.ui.alertPlaceholder.append(wrapper);

    // Tenta pegar a instância do Alerta Bootstrap recém-criado
    const alertElement = document.getElementById(alertId);
    if (alertElement) {
      const bsAlert = bootstrap.Alert.getOrCreateInstance(alertElement);
      // Auto-fecha após 5 segundos
      setTimeout(() => {
        bsAlert.close();
        // O evento 'closed.bs.alert' pode ser usado para remover o wrapper do DOM
        alertElement.addEventListener('closed.bs.alert', () => {
          wrapper.remove();
        });
      }, 5000);
    } else {
      console.error("Não foi possível encontrar o elemento do alerta para auto-fechamento.")
      // Fallback para remover o wrapper diretamente (sem animação de fade)
      setTimeout(() => wrapper.remove(), 5500);
    }
  }

  formatTime(timestamp) {
    if (!timestamp) return '--:--';
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return 'Inválido';
      return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false });
    } catch (e) { return 'Erro'; }
  }

  getTipoNome(tipo) {
    const nomes = { 'check-in': 'Entrada', 'lunch-start': 'Saída Almoço', 'lunch-end': 'Retorno Almoço', 'check-out': 'Saída' };
    return nomes[tipo] || tipo;
  }
}

// Inicializa a aplicação
document.addEventListener('DOMContentLoaded', () => {
  window.pontoApp = new PontoApp();
});