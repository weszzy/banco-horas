// src/views/script.js
/**
 * Sistema de Controle de Ponto v1.3.0 [CORRIGIDO v1.3.2]
 * Gerencia autenticação, registro de ponto, perfil e administração.
 */

class PontoApp {
  constructor() {
    this._cacheDOMElements(); // Separa o cache dos elementos
    // Estado será inicializado em _initializeComponents
  }

  // Separa o cache de elementos para melhor organização
  _cacheDOMElements() {
    console.log("Caching DOM Elements...");
    this.ui = {
      // Modals (Guardar referência ao elemento DOM primeiro)
      loginModalElement: document.getElementById('loginModal'),
      employeeFormModalElement: document.getElementById('employeeFormModal'),
      profileModalElement: document.getElementById('profileModal'),
      // Instâncias Modal (serão inicializadas depois)
      loginModal: null,
      employeeFormModal: null,
      profileModal: null,
      // Formulário Login
      loginForm: document.getElementById('loginForm'),
      loginError: document.getElementById('loginError'),
      btnLoginSubmit: document.getElementById('btnLoginSubmit'),
      // Navbar
      authArea: document.getElementById('authArea'),
      navLinks: document.getElementById('navLinks'), // Container dos links comuns
      navAdminLinks: document.getElementById('navAdminLinks'), // Container dos links admin
      // Áreas Principais
      dashboardArea: document.getElementById('dashboardArea'),
      adminArea: document.getElementById('adminArea'),
      loginPrompt: document.getElementById('loginPrompt'),
      alertPlaceholder: document.getElementById('alertPlaceholder'),
      // Dashboard: Ponto & Status
      employeeSelect: $('#employeeSelect'), // jQuery para Select2
      employeeSelectContainer: document.getElementById('employeeSelectContainer'),
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
      // Dashboard: Resumo/Saldo
      summaryLoading: document.getElementById('summaryLoading'),
      summaryContent: document.getElementById('summaryContent'),
      summaryBalance: document.getElementById('summaryBalance'),
      summaryBalanceHint: document.getElementById('summaryBalanceHint'),
      btnVerPerfilCompleto: document.getElementById('btnVerPerfilCompleto'),
      // Admin: Tabela
      employeeListTableBody: document.getElementById('employeeListTableBody'),
      // Modal Cadastro/Edição Funcionário
      employeeFormModalLabel: document.getElementById('employeeFormModalLabel'),
      employeeForm: document.getElementById('employeeForm'),
      employeeFormError: document.getElementById('employeeFormError'),
      employeeId: document.getElementById('employeeId'), // Hidden input
      employeeFullName: document.getElementById('employeeFullName'),
      employeeEmail: document.getElementById('employeeEmail'),
      employeePassword: document.getElementById('employeePassword'),
      passwordFieldContainer: document.getElementById('passwordFieldContainer'),
      passwordHelp: document.getElementById('passwordHelp'),
      employeeRole: document.getElementById('employeeRole'),
      employeeWeeklyHours: document.getElementById('employeeWeeklyHours'),
      employeeBirthDate: document.getElementById('employeeBirthDate'),
      employeeHireDate: document.getElementById('employeeHireDate'),
      employeePhotoUrl: document.getElementById('employeePhotoUrl'),
      btnSaveChangesEmployee: document.getElementById('btnSaveChangesEmployee'),
      // Modal Perfil Funcionário
      profileModalLabel: document.getElementById('profileModalLabel'),
      profileModalBody: document.getElementById('profileModalBody'),
      profileAdminActions: document.getElementById('profileAdminActions'),
      btnEditProfile: document.getElementById('btnEditProfile'),
      btnToggleActiveStatus: document.getElementById('btnToggleActiveStatus')
    };
    console.log("DOM Elements cached (references stored).");
  }

  // Inicializa instâncias de Modal e estado (CHAMADO APÓS VERIFICAÇÃO DO BOOTSTRAP)
  _initializeComponents() {
    console.log("Initializing components (Modals, State)...");
    // Inicializa instâncias de Modal
    if (this.ui.loginModalElement && typeof bootstrap !== 'undefined' && bootstrap.Modal) {
      this.ui.loginModal = new bootstrap.Modal(this.ui.loginModalElement);
    } else if (!this.ui.loginModalElement) { console.error("Login Modal element not found during component initialization."); }
    else { console.error("Bootstrap Modal class not available for Login Modal."); }

    if (this.ui.employeeFormModalElement && typeof bootstrap !== 'undefined' && bootstrap.Modal) {
      this.ui.employeeFormModal = new bootstrap.Modal(this.ui.employeeFormModalElement);
    } else if (!this.ui.employeeFormModalElement) { console.error("Employee Form Modal element not found during component initialization."); }
    else { console.error("Bootstrap Modal class not available for Employee Form Modal."); }

    if (this.ui.profileModalElement && typeof bootstrap !== 'undefined' && bootstrap.Modal) {
      this.ui.profileModal = new bootstrap.Modal(this.ui.profileModalElement);
    } else if (!this.ui.profileModalElement) { console.error("Profile Modal element not found during component initialization."); }
    else { console.error("Bootstrap Modal class not available for Profile Modal."); }

    // Reseta o estado da aplicação
    this.state = {
      token: localStorage.getItem('authToken') || null,
      currentUser: JSON.parse(localStorage.getItem('currentUser')) || null,
      selectedEmployeeId: null,
      viewingEmployeeId: null,
      todayRecord: null,
      employeeList: [],
      currentView: 'login'
    };
    console.log("Components initialized.");
  }

  // Método chamado após a instância ser criada e o Bootstrap verificado
  _init() {
    console.log("PontoApp v1.3.1 _init called...");
    this._initializeComponents(); // Inicializa estado e modais
    this._setupStaticEventListeners(); // Configura listeners estáticos
    this._initSelect2();
    this._updateView(); // Define a visão inicial e adiciona listeners dinâmicos
  }

  // Listeners para elementos que SEMPRE existem no HTML inicial
  _setupStaticEventListeners() {
    console.log("Setting up static event listeners...");
    // Adiciona verificação para cada elemento antes de adicionar o listener
    if (this.ui.loginForm) {
      this.ui.loginForm.addEventListener('submit', (e) => { e.preventDefault(); this.handleLogin(); });
    } else { console.error("Static Listener Error: loginForm not found."); }

    if (this.ui.btnLoginSubmit) {
      this.ui.btnLoginSubmit.addEventListener('click', () => this.handleLogin());
    } else { console.error("Static Listener Error: btnLoginSubmit not found."); }

    if (this.ui.btnEntrada) this.ui.btnEntrada.addEventListener('click', () => this.registrarPonto('check-in')); else console.error("Static Listener Error: btnEntrada not found");
    if (this.ui.btnSaidaAlmoco) this.ui.btnSaidaAlmoco.addEventListener('click', () => this.registrarPonto('lunch-start')); else console.error("Static Listener Error: btnSaidaAlmoco not found");
    if (this.ui.btnRetornoAlmoco) this.ui.btnRetornoAlmoco.addEventListener('click', () => this.registrarPonto('lunch-end')); else console.error("Static Listener Error: btnRetornoAlmoco not found");
    if (this.ui.btnSaida) this.ui.btnSaida.addEventListener('click', () => this.registrarPonto('check-out')); else console.error("Static Listener Error: btnSaida not found");

    // Select2 (jQuery listener)
    if (this.ui.employeeSelect && this.ui.employeeSelect.length > 0) { // Verifica se o elemento jQuery existe
      this.ui.employeeSelect.on('change', (e) => {
        const selectedValue = $(e.target).val();
        // Se admin limpar, seleciona o próprio admin. Se não-admin, não deveria acontecer.
        this.state.selectedEmployeeId = selectedValue ? parseInt(selectedValue, 10) : this.state.currentUser?.id;
        this.handleEmployeeSelectionChange();
      });
    } else { console.error("Static Listener Error: employeeSelect jQuery object not found or empty.") }

    // Botão Ver Perfil no Dashboard
    if (this.ui.btnVerPerfilCompleto) {
      this.ui.btnVerPerfilCompleto.addEventListener('click', () => {
        // Garante que temos um ID para visualizar
        const targetId = this.state.selectedEmployeeId || this.state.currentUser?.id;
        if (targetId) {
          this.showProfileModal(targetId);
        } else {
          console.warn("Tentativa de ver perfil sem ID selecionado ou usuário logado.");
          this.showAlert('info', 'Selecione um funcionário ou faça login para ver o perfil.');
        }
      });
    } else { console.error("Static Listener Error: btnVerPerfilCompleto not found"); }

    // Modal Formulário Funcionário: Botão Salvar e Evento 'show'
    if (this.ui.employeeForm) this.ui.employeeForm.addEventListener('submit', (e) => { e.preventDefault(); this.handleSaveEmployeeForm(); }); else console.error("Static Listener Error: employeeForm not found.");
    if (this.ui.btnSaveChangesEmployee) this.ui.btnSaveChangesEmployee.addEventListener('click', () => this.handleSaveEmployeeForm()); else console.error("Static Listener Error: btnSaveChangesEmployee not found.");

    // Listener para o evento 'show' do modal de funcionário
    if (this.ui.employeeFormModalElement) { // Usa o elemento DOM para o listener
      this.ui.employeeFormModalElement.addEventListener('show.bs.modal', (e) => {
        const button = e.relatedTarget; // Botão que acionou o modal
        const employeeId = button?.dataset.employeeId; // Pega o ID do data attribute do botão
        this.prepareEmployeeForm(employeeId ? parseInt(employeeId, 10) : null);
      });
    } else { console.error("Static Listener Error: employeeFormModalElement not found."); }

    // Listeners para botões DENTRO do modal de perfil
    if (this.ui.btnEditProfile) this.ui.btnEditProfile.addEventListener('click', () => this.editProfileFromModal()); else console.error("Static Listener Error: btnEditProfile not found.");
    if (this.ui.btnToggleActiveStatus) this.ui.btnToggleActiveStatus.addEventListener('click', () => this.toggleActiveStatusFromModal()); else console.error("Static Listener Error: btnToggleActiveStatus not found.");

    console.log("Static event listeners set up completed.");
  }

  // Adiciona listeners para elementos que são criados/exibidos dinamicamente NA NAVBAR
  _setupDynamicEventListeners() {
    console.log("Setting up dynamic event listeners for Navbar...");
    // Botão Logout
    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) {
      // Técnica simples para evitar múltiplos listeners: atribuição direta ao onclick
      btnLogout.onclick = () => this.handleLogout();
      console.log("Dynamic Listener: Logout attached.");
    } else {
      // Só loga aviso se o usuário estiver logado (quando o botão deveria existir)
      if (this.state.currentUser) console.warn("Dynamic Listener Warning: btnLogout not found after login.");
    }

    // Links da Navbar (buscando dentro dos containers corretos)
    const linkMeuPerfil = this.ui.navLinks?.querySelector('#linkMeuPerfil'); // Busca dentro de #navLinks
    if (linkMeuPerfil) {
      linkMeuPerfil.onclick = (e) => { e.preventDefault(); this.showProfileModal(this.state.currentUser.id); };
      console.log("Dynamic Listener: Meu Perfil attached.");
    } else {
      // Só loga aviso se navLinks estiver visível
      if (this.ui.navLinks?.style.display !== 'none') console.warn("Dynamic Listener Warning: linkMeuPerfil not found when expected.");
    }

    const linkGerenciar = this.ui.navAdminLinks?.querySelector('#linkGerenciarFuncionarios'); // Busca dentro de #navAdminLinks
    if (linkGerenciar) {
      linkGerenciar.onclick = (e) => { e.preventDefault(); this.setView('admin'); };
      console.log("Dynamic Listener: Gerenciar Funcionários attached.");
    } else {
      // Só loga aviso se navAdminLinks estiver visível
      if (this.ui.navAdminLinks?.style.display !== 'none') console.warn("Dynamic Listener Warning: linkGerenciarFuncionarios not found when expected.");
    }

    // Link Novo Funcionário (já usa data-bs-toggle, mas verificamos se existe)
    const linkNovoFunc = this.ui.navAdminLinks?.querySelector('#linkNovoFuncionario');
    if (!linkNovoFunc && this.ui.navAdminLinks?.style.display !== 'none') {
      console.warn("Dynamic Listener Warning: linkNovoFuncionario not found for admin.");
    }

    console.log("Dynamic event listeners for Navbar set up.");
  }


  _initSelect2() {
    // Verifica se jQuery e select2 estão carregados e se o elemento existe
    if (this.ui.employeeSelect && this.ui.employeeSelect.length > 0 && typeof $.fn.select2 === 'function') {
      try {
        this.ui.employeeSelect.select2({
          placeholder: "Selecione para ver status",
          allowClear: true,
          width: '100%',
        });
        this.ui.employeeSelect.prop('disabled', true); // Começa desabilitado
        console.log("Select2 initialized.");
      } catch (error) {
        console.error("Erro ao inicializar Select2:", error);
        this.showAlert('warning', 'Erro ao inicializar o seletor de funcionários.')
      }
    } else if (!(typeof $.fn.select2 === 'function')) {
      console.error("Select2 function not available. Check jQuery and Select2 script order/loading.");
    }
    else {
      console.error("Select2 element not found during initialization.");
    }
  }

  // ================ CONTROLE DE VISÃO (Views) ================

  setView(viewName) {
    console.log(`Setting view to: ${viewName}`);
    this.state.currentView = viewName;
    // Garante que os elementos UI existam antes de tentar mudar display
    if (this.ui.loginPrompt) this.ui.loginPrompt.style.display = viewName === 'login' ? 'block' : 'none';
    if (this.ui.dashboardArea) this.ui.dashboardArea.style.display = viewName === 'dashboard' ? 'block' : 'none';
    if (this.ui.adminArea) this.ui.adminArea.style.display = viewName === 'admin' ? 'block' : 'none';

    if (viewName === 'admin') {
      this.loadAndDisplayAdminEmployeeList();
    } else if (viewName === 'dashboard') {
      this.fetchAndUpdateDashboard();
    }
    this._updateNavLinks();
  }

  _updateView() {
    console.log("Updating view based on auth state...");
    if (this.state.token && this.state.currentUser) {
      // Logado
      if (this.ui.navLinks) this.ui.navLinks.style.display = 'block'; else console.error("navLinks container not found");
      if (this.ui.authArea) {
        this.ui.authArea.innerHTML = `
                 <span class="navbar-text me-3">Olá, ${this.state.currentUser.fullName}</span>
                 <button class="btn btn-outline-secondary btn-sm" id="btnLogout">Sair</button>`;
      } else { console.error("authArea not found"); }


      if (this.state.currentUser.role === 'admin') {
        if (this.ui.navAdminLinks) this.ui.navAdminLinks.style.display = 'block'; else console.error("navAdminLinks container not found");
        // Mantém a view atual se já estiver logado, senão vai para dashboard
        this.setView(this.state.currentView !== 'login' ? this.state.currentView : 'dashboard');
      } else {
        if (this.ui.navAdminLinks) this.ui.navAdminLinks.style.display = 'none';
        this.setView('dashboard');
      }
      // Adiciona listeners dinâmicos APÓS o innerHTML ser definido
      // Usar setTimeout 0 para garantir que o DOM seja atualizado antes de buscar os elementos
      setTimeout(() => this._setupDynamicEventListeners(), 0);

    } else {
      // Deslogado
      if (this.ui.navLinks) this.ui.navLinks.style.display = 'none';
      if (this.ui.navAdminLinks) this.ui.navAdminLinks.style.display = 'none';
      if (this.ui.authArea) {
        this.ui.authArea.innerHTML = `<button class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#loginModal">Login</button>`;
      }
      this.setView('login');
    }
    console.log("View update process finished.");
  }

  _updateNavLinks() {
    // Remove classe 'active' de todos os links nos containers da navbar
    document.querySelectorAll('#navLinks .nav-link, #navAdminLinks .nav-link').forEach(link => link.classList.remove('active'));

    // Adiciona 'active' ao link correspondente à view atual
    if (this.state.currentView === 'dashboard') {
      // Ex: Se tivesse um link para Dashboard: document.getElementById('linkDashboard')?.classList.add('active');
    } else if (this.state.currentView === 'admin') {
      // Busca o link específico pelo ID dentro do container correto
      this.ui.navAdminLinks?.querySelector('#linkGerenciarFuncionarios')?.classList.add('active');
    }
    // O link "Meu Perfil" não precisa de 'active' pois abre um modal
  }


  // ================ AUTENTICAÇÃO ================

  async handleLogin() {
    console.log("Handling login...");
    if (!this.ui.loginForm || !this.ui.btnLoginSubmit || !this.ui.loginError) {
      console.error("Elementos do formulário de login não encontrados.");
      return;
    }
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
      // Verifica se o fetch em si falhou (raro, mas possível)
      if (!response) throw new Error("Falha na requisição de login.");

      const result = await response.json(); // Tenta parsear JSON mesmo se não for OK

      if (!response.ok || !result.success) {
        throw new Error(result.message || `Erro ${response.status}`);
      }

      this.state.token = result.data.token;
      this.state.currentUser = result.data.user;
      localStorage.setItem('authToken', this.state.token);
      localStorage.setItem('currentUser', JSON.stringify(this.state.currentUser));

      console.log("Login bem-sucedido:", this.state.currentUser.email, "Role:", this.state.currentUser.role);
      if (this.ui.loginModal) this.ui.loginModal.hide(); // Fecha o modal se a instância existe
      this._updateView(); // Atualiza toda a UI com base no novo estado

    } catch (error) {
      console.error("Login failed:", error);
      this.ui.loginError.textContent = `Falha no login: ${error.message}`;
      this.ui.loginError.style.display = 'block';
    } finally {
      // Garante que o botão seja reabilitado
      if (this.ui.btnLoginSubmit) {
        this.ui.btnLoginSubmit.disabled = false;
        this.ui.btnLoginSubmit.innerHTML = 'Entrar';
      }
    }
  }

  handleLogout() {
    console.log("Handling logout...");
    this.state.token = null;
    this.state.currentUser = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');

    // Limpa select2 e desabilita
    if (this.ui.employeeSelect && this.ui.employeeSelect.length > 0) {
      this.ui.employeeSelect.val(null).trigger('change');
      this.ui.employeeSelect.prop('disabled', true);
    }

    this._updateView(); // << Atualiza UI para login
    this.resetDashboardState();
    console.log("Logout complete.");
  }

  resetDashboardState() {
    console.log("Resetting dashboard state...");
    // Limpa estado interno
    this.state.selectedEmployeeId = null;
    this.state.todayRecord = null;

    // Limpa/reseta UI do Dashboard
    if (this.ui.employeeSelect && this.ui.employeeSelect.length > 0) {
      this.ui.employeeSelect.val(null).trigger('change');
    }
    if (this.ui.statusPlaceholder) {
      this.ui.statusPlaceholder.textContent = 'Carregando...';
      this.ui.statusPlaceholder.style.display = 'block';
    }
    if (this.ui.statusDetails) this.ui.statusDetails.style.display = 'none';
    // Resetar textos de status individualmente (opcional, pois statusDetails está escondido)
    if (this.ui.statusEntrada) this.ui.statusEntrada.textContent = '--:--';
    if (this.ui.statusSaidaAlmoco) this.ui.statusSaidaAlmoco.textContent = '--:--';
    if (this.ui.statusRetornoAlmoco) this.ui.statusRetornoAlmoco.textContent = '--:--';
    if (this.ui.statusSaida) this.ui.statusSaida.textContent = '--:--';
    if (this.ui.statusTotalHoras) this.ui.statusTotalHoras.textContent = '-.-- h';
    if (this.ui.statusDate) this.ui.statusDate.textContent = '--/--/----';


    if (this.ui.summaryLoading) this.ui.summaryLoading.style.display = 'block';
    if (this.ui.summaryContent) this.ui.summaryContent.style.display = 'none';
    if (this.ui.summaryBalance) this.ui.summaryBalance.textContent = '--:--';

    // Desabilita botões de ponto
    this._setPointButtonsDisabled(true);
  }

  // ================ DASHBOARD (Ponto, Status, Saldo) ================

  async fetchAndUpdateDashboard() {
    if (!this.state.currentUser) {
      console.warn("fetchAndUpdateDashboard chamado sem currentUser.");
      return;
    }
    console.log("Atualizando Dashboard...");
    this.resetDashboardState(); // Limpa antes de carregar

    // Define o ID inicial a ser visualizado
    let initialEmployeeId = this.state.currentUser.id;

    if (this.state.currentUser.role === 'admin') {
      if (this.ui.employeeSelectContainer) this.ui.employeeSelectContainer.style.display = 'block';
      if (this.ui.employeeSelect && this.ui.employeeSelect.length > 0) this.ui.employeeSelect.prop('disabled', false);
      await this.loadEmployeeListForAdmin(); // Carrega lista para admin
      // Mantém a seleção atual do dropdown se existir, senão usa o admin logado
      initialEmployeeId = this.ui.employeeSelect && this.ui.employeeSelect.length > 0 ? (parseInt(this.ui.employeeSelect.val(), 10) || this.state.currentUser.id) : this.state.currentUser.id;
      console.log(`Admin view: Initial employee ID set to ${initialEmployeeId}`);
    } else {
      if (this.ui.employeeSelectContainer) this.ui.employeeSelectContainer.style.display = 'none';
      if (this.ui.employeeSelect && this.ui.employeeSelect.length > 0) this.ui.employeeSelect.prop('disabled', true);
      initialEmployeeId = this.state.currentUser.id; // Não-admin sempre vê a si mesmo
      console.log(`Non-admin view: Employee ID set to ${initialEmployeeId}`);
    }

    this.state.selectedEmployeeId = initialEmployeeId;
    // Atualiza o select visualmente
    if (this.ui.employeeSelect && this.ui.employeeSelect.length > 0) {
      this.ui.employeeSelect.val(this.state.selectedEmployeeId).trigger('change.select2');
    }

    // Busca status e saldo para o funcionário selecionado
    await this.fetchAndUpdateStatus();
    await this.fetchAndUpdateSummary();
  }

  handleEmployeeSelectionChange() {
    // selectedEmployeeId já foi atualizado pelo listener 'change'
    if (!this.state.selectedEmployeeId) {
      console.warn("Seleção de funcionário limpa, voltando para usuário logado.");
      this.state.selectedEmployeeId = this.state.currentUser?.id;
      if (this.ui.employeeSelect && this.ui.employeeSelect.length > 0) {
        this.ui.employeeSelect.val(this.state.selectedEmployeeId).trigger('change.select2');
      }
      // Se mesmo assim não tiver ID, reseta
      if (!this.state.selectedEmployeeId) {
        this.resetDashboardState();
        return;
      }
    }
    console.log("Seleção dashboard mudou para employeeId:", this.state.selectedEmployeeId);
    this.fetchAndUpdateStatus(); // Busca status
    this.fetchAndUpdateSummary(); // Busca resumo/saldo
  }

  async fetchAndUpdateStatus() {
    const targetEmployeeId = this.state.selectedEmployeeId;
    if (!targetEmployeeId) {
      console.warn("fetchAndUpdateStatus: targetEmployeeId não definido.");
      if (this.ui.statusPlaceholder) {
        this.ui.statusPlaceholder.textContent = 'Selecione um funcionário (Admin) ou faça login.';
        this.ui.statusPlaceholder.style.display = 'block';
      }
      if (this.ui.statusDetails) this.ui.statusDetails.style.display = 'none';
      this.updateActionButtons(); // Desabilita botões
      return;
    }

    console.log(`Buscando status para employeeId: ${targetEmployeeId}`);
    if (this.ui.statusPlaceholder) {
      this.ui.statusPlaceholder.textContent = 'Carregando status...';
      this.ui.statusPlaceholder.style.display = 'block';
    }
    if (this.ui.statusDetails) this.ui.statusDetails.style.display = 'none';
    this._setPointButtonsDisabled(true); // Desabilita botões enquanto carrega

    try {
      let url = '';
      if (targetEmployeeId === this.state.currentUser?.id) {
        url = '/api/time-records/today';
      } else if (this.state.currentUser?.role === 'admin') {
        console.log(`Admin buscando histórico de ${targetEmployeeId} para status de hoje.`);
        await this.fetchHistoryAndFindToday(targetEmployeeId);
        this.updateStatusUI();
        this.updateActionButtons();
        return;
      } else {
        throw new Error("Não autorizado a ver status de outro funcionário.");
      }

      const response = await this.fetchWithAuth(url);
      // Se fetchWithAuth rejeitar (ex: 401), o catch abaixo pegará
      if (!response) return; // fetchWithAuth pode retornar undefined em caso de erro tratado (logout)

      const result = await response.json();
      if (!response.ok) {
        if (response.status === 404) {
          console.log(`Nenhum registro encontrado hoje para ${targetEmployeeId}`);
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
      // Não mostra alerta se for erro de não autorizado, pois fetchWithAuth já mostrou
      if (error.message !== 'Não autorizado') {
        console.error(`Erro ao buscar status para employeeId ${targetEmployeeId}:`, error);
        this.showAlert('danger', `Falha ao carregar status: ${error.message}`);
        if (this.ui.statusPlaceholder) this.ui.statusPlaceholder.textContent = 'Erro ao carregar status.';
      } else {
        // Se foi 401, a UI já foi resetada pelo handleLogout
      }
      if (this.ui.statusPlaceholder) this.ui.statusPlaceholder.style.display = 'block';
      if (this.ui.statusDetails) this.ui.statusDetails.style.display = 'none';
      this.updateActionButtons(); // Garante que botões fiquem desabilitados
    }
  }

  async fetchHistoryAndFindToday(employeeId) {
    this.state.todayRecord = null;
    try {
      const response = await this.fetchWithAuth(`/api/time-records/employee/${employeeId}`);
      if (!response) return; // Erro tratado em fetchWithAuth
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || `Erro ${response.status}`);

      const todayStr = new Date().toISOString().split('T')[0];
      this.state.todayRecord = result.data?.find(record => record.startTime && record.startTime.startsWith(todayStr)) || null;
      console.log(`Registro de hoje (ID: ${employeeId}) encontrado no histórico:`, this.state.todayRecord);
    } catch (error) {
      if (error.message !== 'Não autorizado') {
        console.error(`Erro ao buscar histórico (employeeId ${employeeId}):`, error);
        this.showAlert('danger', `Falha ao buscar histórico: ${error.message}`);
      }
      // Mantém todayRecord como null
    }
  }

  updateStatusUI() {
    const record = this.state.todayRecord;
    if (!this.ui.statusPlaceholder || !this.ui.statusDetails || !this.ui.statusEntrada ||
      !this.ui.statusSaidaAlmoco || !this.ui.statusRetornoAlmoco || !this.ui.statusSaida ||
      !this.ui.statusTotalHoras) {
      console.error("Elementos da UI de status não encontrados para atualização.");
      return;
    }

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
    // Ações são permitidas SOMENTE se o ID selecionado é o do usuário logado.
    const canPerformActions = this.state.currentUser?.id === this.state.selectedEmployeeId;

    // Garante que os botões existam antes de tentar acessá-los
    if (!this.ui.btnEntrada || !this.ui.btnSaidaAlmoco || !this.ui.btnRetornoAlmoco || !this.ui.btnSaida) {
      console.error("Botões de ação não encontrados para atualização de estado.");
      return;
    }

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
    if (this.state.selectedEmployeeId !== this.state.currentUser?.id) {
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
      if (!response) return; // Erro tratado em fetchWithAuth
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || `Erro ${response.status}`);

      this.showAlert('success', `${this.getTipoNome(tipoAcao)} registrado com sucesso!`);
      await this.fetchAndUpdateStatus(); // Re-busca status para atualizar UI e botões

    } catch (error) {
      // Não mostra alerta se for 401, fetchWithAuth já tratou
      if (error.message !== 'Não autorizado') {
        console.error(`Erro ao registrar ${tipoAcao}:`, error);
        this.showAlert('danger', `Falha ao registrar ${this.getTipoNome(tipoAcao)}: ${error.message}`);
      }
      // Re-busca status mesmo em caso de erro para garantir que os botões reflitam o estado real
      await this.fetchAndUpdateStatus();
    }
    // finally não é estritamente necessário aqui pois updateActionButtons é chamado no fetchAndUpdateStatus
  }

  _setPointButtonsDisabled(isDisabled) {
    if (this.ui.btnEntrada) this.ui.btnEntrada.disabled = isDisabled;
    if (this.ui.btnSaidaAlmoco) this.ui.btnSaidaAlmoco.disabled = isDisabled;
    if (this.ui.btnRetornoAlmoco) this.ui.btnRetornoAlmoco.disabled = isDisabled;
    if (this.ui.btnSaida) this.ui.btnSaida.disabled = isDisabled;
  }

  // ================ PERFIL DO FUNCIONÁRIO (Modal) ================
  async fetchAndUpdateSummary() { /* ... (como antes) ... */ }
  async showProfileModal(employeeId) { /* ... (como antes, com verificação de this.ui.profileModal) ... */ }
  renderProfileModalContent(employee, history) { /* ... (como antes) ... */ }
  editProfileFromModal() { /* ... (como antes, com verificação dos modais) ... */ }
  async toggleActiveStatusFromModal() { /* ... (como antes) ... */ }

  // ================ GERENCIAMENTO (ADMIN) ================
  async loadAndDisplayAdminEmployeeList() { /* ... (como antes) ... */ }
  renderAdminEmployeeTable() { /* ... (como antes, adiciona listeners da tabela) ... */ }
  prepareEmployeeForm(employeeId = null) { /* ... (como antes) ... */ }
  async handleSaveEmployeeForm() { /* ... (como antes, com verificação this.ui.employeeFormModal) ... */ }
  _validateEmployeeForm() { /* ... (como antes) ... */ }

  // ================ UTILITÁRIOS ================
  async fetchWithAuth(url, options = {}) {
    console.log(`fetchWithAuth: ${options.method || 'GET'} ${url}`);
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (this.state.token) { headers['Authorization'] = `Bearer ${this.state.token}`; }
    else { console.warn("fetchWithAuth chamado sem token."); }

    try {
      const response = await fetch(url, { ...options, headers });
      if (response.status === 401) {
        console.error("fetchWithAuth: Erro 401 - Não autorizado. Deslogando...");
        this.showAlert('danger', 'Sessão inválida ou expirada. Faça login novamente.');
        this.handleLogout();
        return Promise.reject(new Error('Não autorizado')); // Rejeita a promessa
      }
      // Retorna a resposta para tratamento posterior, mesmo que não seja 2xx OK
      return response;
    } catch (networkError) {
      console.error(`fetchWithAuth: Erro de rede ou fetch para ${url}:`, networkError);
      this.showAlert('danger', `Erro de conexão ao tentar acessar a API. Verifique sua rede.`);
      return Promise.reject(networkError); // Rejeita a promessa
    }
  }
  showAlert(type, message) {
    if (!this.ui.alertPlaceholder) { console.error("Placeholder de alerta não encontrado."); return; }
    const wrapper = document.createElement('div');
    const alertId = `alert-${Date.now()}`;
    wrapper.innerHTML = `
          <div id="${alertId}" class="alert alert-${type} alert-dismissible fade show" role="alert">
              ${message}
              <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
          </div>
      `;
    this.ui.alertPlaceholder.append(wrapper);
    const alertElement = document.getElementById(alertId);
    if (alertElement && typeof bootstrap !== 'undefined' && bootstrap.Alert) {
      const bsAlert = bootstrap.Alert.getOrCreateInstance(alertElement);
      const timeoutId = setTimeout(() => {
        if (document.getElementById(alertId)) { // Verifica se ainda existe antes de fechar
          bsAlert.close();
        }
      }, 5000);
      // Limpa timeout se o usuário fechar manualmente
      alertElement.addEventListener('closed.bs.alert', () => {
        clearTimeout(timeoutId);
        wrapper.remove(); // Remove o wrapper do DOM
      }, { once: true }); // Listener é executado apenas uma vez
    } else {
      console.error("Não foi possível encontrar o elemento do alerta ou bootstrap.Alert para auto-fechamento.");
      setTimeout(() => wrapper.remove(), 5500);
    }
  }
  formatTime(timestamp) { /* ... (como antes) ... */ }
  getTipoNome(tipo) { /* ... (como antes) ... */ }
  formatDateISO(date) { /* ... (como antes) ... */ }
}

// Inicializa a aplicação no DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  console.log("DOMContentLoaded event fired.");
  // Verifica se Bootstrap e Modal estão carregados ANTES de inicializar
  if (typeof bootstrap === 'undefined' || typeof bootstrap.Modal === 'undefined') {
    console.error('Bootstrap Bundle não carregado ou incompleto! Verifique a ordem dos scripts ou a URL do CDN.');
    const body = document.querySelector('body');
    if (body) body.innerHTML = '<div class="alert alert-danger m-5">Erro crítico: Falha ao carregar componentes essenciais da página (Bootstrap). Verifique a conexão ou contate o suporte.</div>' + (body.innerHTML || '');
  } else {
    console.log("Bootstrap carregado, inicializando PontoApp...");
    // Cria a instância apenas se Bootstrap estiver OK
    window.pontoApp = new PontoApp();
    // Chama _init para configurar estado, listeners e visão inicial
    if (window.pontoApp) {
      window.pontoApp._init();
    } else {
      console.error("Falha ao criar instância de PontoApp.");
    }
  }
});