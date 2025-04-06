// src/views/script.js
/**
 * Sistema de Controle de Ponto v1.3.3 (Baseado no original de 768 linhas)
 * Correções aplicadas APENAS para inicialização de modais e adição de listeners.
 * Gerencia autenticação, registro de ponto, perfil e administração.
 */

class PontoApp {
  constructor() {
    // Apenas cacheia referências DOM aqui. Instâncias e estado vêm depois.
    this._cacheDOMElements();
    // _init() será chamado após verificação do Bootstrap no DOMContentLoaded
  }

  // Separa o cache de elementos para melhor organização
  _cacheDOMElements() {
    console.log("[CacheDOM] Caching DOM Elements...");
    this.ui = {
      // Modals (Guardar referência ao elemento DOM primeiro)
      loginModalElement: document.getElementById('loginModal'),
      employeeFormModalElement: document.getElementById('employeeFormModal'),
      profileModalElement: document.getElementById('profileModal'),
      // Instâncias Modal (serão inicializadas em _initializeComponents)
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
    // Verifica se elementos essenciais foram encontrados (exceto modais e jQuery)
    for (const key in this.ui) {
      // Pula o objeto jQuery employeeSelect e referências de elemento de modal
      if (key === 'employeeSelect' || key.endsWith('Modal') || key.endsWith('Element')) continue;
      if (!this.ui[key]) {
        console.warn(`[CacheDOM] Elemento UI '${key}' não encontrado no HTML inicial.`);
      }
    }
    console.log("[CacheDOM] DOM Elements cached (references stored).");
  }

  // Inicializa instâncias de Modal e estado (CHAMADO APÓS VERIFICAÇÃO DO BOOTSTRAP)
  _initializeComponents() {
    console.log("[InitComp] Initializing components (Modals, State)...");
    const canInitModals = typeof bootstrap !== 'undefined' && bootstrap.Modal;
    if (!canInitModals) {
      console.error("FATAL: Bootstrap Modal component not found. Modals will not work.");
    }

    // Cria instâncias de Modal usando as referências cacheadas
    if (this.ui.loginModalElement && canInitModals) { this.ui.loginModal = new bootstrap.Modal(this.ui.loginModalElement); }
    else if (!this.ui.loginModalElement) { console.error("[InitComp] Login Modal element reference not found."); }
    else { console.error("[InitComp] Bootstrap Modal class not available for Login Modal."); }

    if (this.ui.employeeFormModalElement && canInitModals) { this.ui.employeeFormModal = new bootstrap.Modal(this.ui.employeeFormModalElement); }
    else if (!this.ui.employeeFormModalElement) { console.error("[InitComp] Employee Form Modal element reference not found."); }
    else { console.error("[InitComp] Bootstrap Modal class not available for Employee Form Modal."); }

    if (this.ui.profileModalElement && canInitModals) { this.ui.profileModal = new bootstrap.Modal(this.ui.profileModalElement); }
    else if (!this.ui.profileModalElement) { console.error("[InitComp] Profile Modal element reference not found."); }
    else { console.error("[InitComp] Bootstrap Modal class not available for Profile Modal."); }

    // Verifica se as instâncias foram criadas
    if (!this.ui.loginModal) console.warn("[InitComp] Login Modal instance could not be created.");
    if (!this.ui.employeeFormModal) console.warn("[InitComp] Employee Form Modal instance could not be created.");
    if (!this.ui.profileModal) console.warn("[InitComp] Profile Modal instance could not be created.");

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
    console.log("[InitComp] Components initialized.");
  }

  // Método chamado após a instância ser criada e o Bootstrap verificado
  _init() {
    console.log("PontoApp v1.3.2 _init called...");
    this._initializeComponents(); // Inicializa estado e modais
    this._setupStaticEventListeners(); // Configura listeners estáticos
    this._initSelect2();
    this._updateView(); // Define a visão inicial e adiciona listeners dinâmicos
  }

  // Listeners para elementos que SEMPRE existem no HTML inicial
  _setupStaticEventListeners() {
    console.log("[Listeners] Setting up static event listeners...");
    // Adiciona verificação para cada elemento antes de adicionar o listener
    if (this.ui.loginForm) {
      this.ui.loginForm.addEventListener('submit', (e) => { e.preventDefault(); this.handleLogin(); });
    } else { console.error("[Listeners] Static Error: loginForm not found."); }

    if (this.ui.btnLoginSubmit) {
      this.ui.btnLoginSubmit.addEventListener('click', () => this.handleLogin());
    } else { console.error("[Listeners] Static Error: btnLoginSubmit not found."); }

    if (this.ui.btnEntrada) this.ui.btnEntrada.addEventListener('click', () => this.registrarPonto('check-in')); else console.error("[Listeners] Static Error: btnEntrada not found");
    if (this.ui.btnSaidaAlmoco) this.ui.btnSaidaAlmoco.addEventListener('click', () => this.registrarPonto('lunch-start')); else console.error("[Listeners] Static Error: btnSaidaAlmoco not found");
    if (this.ui.btnRetornoAlmoco) this.ui.btnRetornoAlmoco.addEventListener('click', () => this.registrarPonto('lunch-end')); else console.error("[Listeners] Static Error: btnRetornoAlmoco not found");
    if (this.ui.btnSaida) this.ui.btnSaida.addEventListener('click', () => this.registrarPonto('check-out')); else console.error("[Listeners] Static Error: btnSaida not found");

    // Select2 (jQuery listener)
    if (this.ui.employeeSelect && this.ui.employeeSelect.length > 0) {
      this.ui.employeeSelect.on('change', (e) => {
        const selectedValue = $(e.target).val();
        this.state.selectedEmployeeId = selectedValue ? parseInt(selectedValue, 10) : this.state.currentUser?.id;
        this.handleEmployeeSelectionChange();
      });
    } else { console.error("[Listeners] Static Error: employeeSelect jQuery object not found or empty.") }

    // Botão Ver Perfil no Dashboard
    if (this.ui.btnVerPerfilCompleto) {
      this.ui.btnVerPerfilCompleto.addEventListener('click', () => {
        const targetId = this.state.selectedEmployeeId || this.state.currentUser?.id;
        console.log("[Listeners] Botão 'Ver Perfil Completo' clicado. Target ID:", targetId); // Log adicionado
        if (targetId) {
          this.showProfileModal(targetId);
        } else {
          console.warn("[Listeners] Tentativa de ver perfil sem ID selecionado ou usuário logado.");
          this.showAlert('info', 'Selecione um funcionário ou faça login para ver o perfil.');
        }
      });
    } else { console.error("[Listeners] Static Error: btnVerPerfilCompleto not found"); }

    // Modal Formulário Funcionário: Botão Salvar e Evento 'show'
    if (this.ui.employeeForm) this.ui.employeeForm.addEventListener('submit', (e) => { e.preventDefault(); this.handleSaveEmployeeForm(); }); else console.error("[Listeners] Static Error: employeeForm not found.");
    if (this.ui.btnSaveChangesEmployee) this.ui.btnSaveChangesEmployee.addEventListener('click', () => this.handleSaveEmployeeForm()); else console.error("[Listeners] Static Error: btnSaveChangesEmployee not found.");

    // Listener para o evento 'show' do modal de funcionário
    if (this.ui.employeeFormModalElement) { // Usa o elemento DOM para o listener
      this.ui.employeeFormModalElement.addEventListener('show.bs.modal', (e) => {
        console.log("[Listeners] Evento 'show.bs.modal' disparado para employeeFormModal"); // Log
        const button = e.relatedTarget;
        const employeeId = button?.dataset.employeeId;
        this.prepareEmployeeForm(employeeId ? parseInt(employeeId, 10) : null);
      });
    } else { console.error("[Listeners] Static Error: employeeFormModalElement not found."); }

    // Listeners para botões DENTRO do modal de perfil
    if (this.ui.btnEditProfile) this.ui.btnEditProfile.addEventListener('click', () => this.editProfileFromModal()); else console.error("[Listeners] Static Error: btnEditProfile not found.");
    if (this.ui.btnToggleActiveStatus) this.ui.btnToggleActiveStatus.addEventListener('click', () => this.toggleActiveStatusFromModal()); else console.error("[Listeners] Static Error: btnToggleActiveStatus not found.");

    console.log("[Listeners] Static event listeners set up completed.");
  }

  // Adiciona listeners para elementos que são criados/exibidos dinamicamente NA NAVBAR
  _setupDynamicEventListeners() {
    console.log("[Listeners] Setting up dynamic event listeners for Navbar...");
    // Botão Logout
    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) {
      // Técnica simples para evitar múltiplos listeners: atribuição direta ao onclick
      // Verifica se já existe um handler para não sobrescrever acidentalmente
      if (!btnLogout.onclick) {
        btnLogout.onclick = () => this.handleLogout();
        console.log("[Listeners] Dynamic Listener: Logout attached.");
      }
    } else {
      if (this.state.currentUser) console.warn("[Listeners] Dynamic Warning: btnLogout not found after login.");
    }

    // Links da Navbar (buscando dentro dos containers corretos)
    const linkMeuPerfil = this.ui.navLinks?.querySelector('#linkMeuPerfil'); // Busca dentro de #navLinks
    if (linkMeuPerfil) {
      if (!linkMeuPerfil.onclick) {
        linkMeuPerfil.onclick = (e) => {
          e.preventDefault();
          console.log("[Listeners] Link 'Meu Perfil' clicked."); // Log adicionado
          if (this.state.currentUser?.id) {
            this.showProfileModal(this.state.currentUser.id);
          } else {
            console.error("[Listeners] Usuário não definido ao clicar em Meu Perfil.");
            this.showAlert('danger', 'Erro: Informação do usuário não encontrada.');
          }
        };
        console.log("[Listeners] Dynamic Listener: Meu Perfil attached.");
      }
    } else {
      if (this.ui.navLinks?.style.display !== 'none') console.warn("[Listeners] Dynamic Warning: linkMeuPerfil not found when expected.");
    }

    const linkGerenciar = this.ui.navAdminLinks?.querySelector('#linkGerenciarFuncionarios'); // Busca dentro de #navAdminLinks
    if (linkGerenciar) {
      if (!linkGerenciar.onclick) {
        linkGerenciar.onclick = (e) => { e.preventDefault(); this.setView('admin'); };
        console.log("[Listeners] Dynamic Listener: Gerenciar Funcionários attached.");
      }
    } else {
      if (this.ui.navAdminLinks?.style.display !== 'none') console.warn("[Listeners] Dynamic Warning: linkGerenciarFuncionarios not found for admin.");
    }

    // Link Novo Funcionário (Apenas verifica existência para log)
    // O listener é via data-bs-toggle, não precisa de JS aqui
    const linkNovoFunc = this.ui.navAdminLinks?.querySelector('#linkNovoFuncionario');
    if (!linkNovoFunc && this.ui.navAdminLinks?.style.display !== 'none') {
      console.warn("[Listeners] Dynamic Warning: linkNovoFuncionario not found for admin.");
    }

    console.log("[Listeners] Dynamic event listeners for Navbar set up completed.");
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
      if (this.ui.navLinks) this.ui.navLinks.style.display = 'block'; else console.error("_updateView Error: navLinks container not found");
      if (this.ui.authArea) {
        this.ui.authArea.innerHTML = `
                 <span class="navbar-text me-3">Olá, ${this.state.currentUser.fullName}</span>
                 <button class="btn btn-outline-secondary btn-sm" id="btnLogout">Sair</button>`;
      } else { console.error("_updateView Error: authArea not found"); }


      if (this.state.currentUser.role === 'admin') {
        if (this.ui.navAdminLinks) this.ui.navAdminLinks.style.display = 'block'; else console.error("_updateView Error: navAdminLinks container not found");
        // Mantém a view atual se já estiver logado, senão vai para dashboard
        this.setView(this.state.currentView !== 'login' ? this.state.currentView : 'dashboard');
      } else {
        if (this.ui.navAdminLinks) this.ui.navAdminLinks.style.display = 'none';
        this.setView('dashboard');
      }
      // Adiciona listeners dinâmicos APÓS o innerHTML ser definido
      // Usar setTimeout 0 para dar chance ao DOM de atualizar
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
    if (this.state.currentView === 'admin' && this.ui.navAdminLinks) {
      // Busca o link específico pelo ID dentro do container correto
      this.ui.navAdminLinks.querySelector('#linkGerenciarFuncionarios')?.classList.add('active');
    }
    // Nenhuma classe 'active' para dashboard ou perfil por enquanto
  }


  // ================ AUTENTICAÇÃO ================

  async handleLogin() {
    console.log("Handling login...");
    if (!this.ui.loginForm || !this.ui.btnLoginSubmit || !this.ui.loginError) { console.error("Login form elements missing."); return; }
    const email = this.ui.loginForm.email.value;
    const password = this.ui.loginForm.password.value;
    this.ui.loginError.style.display = 'none';
    if (!email || !password) {
      this.ui.loginError.textContent = 'E-mail e senha são obrigatórios.';
      this.ui.loginError.style.display = 'block';
      return;
    }
    this.ui.btnLoginSubmit.disabled = true;
    this.ui.btnLoginSubmit.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Entrando...';
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      if (!response) throw new Error("Falha na requisição de login (sem resposta).");
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || `Erro ${response.status}`);
      this.state.token = result.data.token;
      this.state.currentUser = result.data.user;
      localStorage.setItem('authToken', this.state.token);
      localStorage.setItem('currentUser', JSON.stringify(this.state.currentUser));
      console.log("Login successful, updating view...");
      if (this.ui.loginModal) this.ui.loginModal.hide(); // Usa instância cacheada
      this._updateView(); // << Atualiza a UI geral
    } catch (error) {
      console.error("Login failed:", error);
      this.ui.loginError.textContent = `Falha no login: ${error.message}`;
      this.ui.loginError.style.display = 'block';
    } finally {
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
    if (this.ui.employeeSelect && this.ui.employeeSelect.length > 0) {
      this.ui.employeeSelect.val(null).trigger('change');
      this.ui.employeeSelect.prop('disabled', true);
    }
    this._updateView(); // << Atualiza UI para login
    this.resetDashboardState();
    console.log("Logout complete.");
  }

  resetDashboardState() { /* ... (Mantido como na v1.3.1) ... */ }

  // ================ DASHBOARD (Ponto, Status, Saldo) ================
  async fetchAndUpdateDashboard() { /* ... (Mantido como na v1.3.1) ... */ }
  handleEmployeeSelectionChange() { /* ... (Mantido como na v1.3.1) ... */ }
  async fetchAndUpdateStatus() { /* ... (Mantido como na v1.3.1 com verificações de UI) ... */ }
  async fetchHistoryAndFindToday(employeeId) { /* ... (Mantido como na v1.3.1) ... */ }
  updateStatusUI() { /* ... (Mantido como na v1.3.1 com verificações de UI) ... */ }
  updateActionButtons() { /* ... (Mantido como na v1.3.1 com verificações de UI) ... */ }
  async registrarPonto(tipoAcao) { /* ... (Mantido como na v1.3.1) ... */ }
  _setPointButtonsDisabled(isDisabled) { /* ... (Mantido como na v1.3.1 com verificações de UI) ... */ }
  async fetchAndUpdateSummary() { /* ... (Mantido como na v1.3.1 com verificações extras de UI) ... */ }

  // ================ PERFIL DO FUNCIONÁRIO (Modal) ================
  async showProfileModal(employeeId) {
    console.log(`Attempting to show profile modal for ID: ${employeeId}`);
    if (!employeeId) { console.warn("showProfileModal: employeeId is missing."); return; }
    // *** CORREÇÃO: Verifica se a *instância* do modal foi criada ***
    if (!this.ui.profileModal) {
      console.error("Profile Modal instance not available! Cannot show.");
      this.showAlert('danger', 'Erro ao inicializar o modal de perfil.'); // Mensagem mais específica
      return;
    }

    this.state.viewingEmployeeId = employeeId;
    // Verifica se elementos do modal existem antes de modificar
    if (this.ui.profileModalLabel) this.ui.profileModalLabel.textContent = "Carregando Perfil..."; else console.error("profileModalLabel not found");
    if (this.ui.profileModalBody) this.ui.profileModalBody.innerHTML = `<div class="text-center p-5"><span class="spinner-border spinner-border-sm"></span> Carregando...</div>`; else console.error("profileModalBody not found");
    if (this.ui.profileAdminActions) this.ui.profileAdminActions.style.display = 'none'; else console.error("profileAdminActions not found");

    console.log("Calling profileModal.show()");
    try {
      this.ui.profileModal.show(); // Tenta mostrar o modal
    } catch (e) {
      console.error("Erro ao chamar profileModal.show():", e);
      this.showAlert('danger', 'Erro ao abrir o modal de perfil.')
      return; // Interrompe se não conseguir abrir o modal
    }


    try {
      console.log(`Fetching employee data for profile: /api/employees/${employeeId}`);
      const empResponse = await this.fetchWithAuth(`/api/employees/${employeeId}`);
      if (!empResponse) return;
      const empResult = await empResponse.json();
      if (!empResponse.ok || !empResult.success) throw new Error(`Erro (Perfil): ${empResult.message || empResponse.status}`);
      const employee = empResult.data;
      if (!employee) throw new Error("Dados do funcionário não retornados pela API.");

      console.log(`Fetching balance history for profile: ${employeeId}`);
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - 7);
      const histResponse = await this.fetchWithAuth(`/api/time-records/employee/${employeeId}/balance-history?startDate=${this.formatDateISO(startDate)}&endDate=${this.formatDateISO(endDate)}`);
      let history = []; // Default para array vazio
      if (histResponse) { // Só processa se a requisição não falhou (ex: 401)
        const histResult = await histResponse.json();
        if (histResponse.ok && histResult.success) {
          history = histResult.data;
        } else {
          console.warn(`Falha ao buscar histórico de saldo: ${histResult?.message || histResponse.status}`);
          // Não lança erro, o render trata history vazio
        }
      } else {
        console.warn("Requisição de histórico de saldo falhou ou foi interrompida.");
      }


      console.log("Rendering profile modal content...");
      this.renderProfileModalContent(employee, history);

    } catch (error) {
      // Não mostra alerta se for 401, fetchWithAuth já tratou
      if (error.message !== 'Não autorizado') {
        console.error("Erro ao carregar dados do perfil:", error);
        if (this.ui.profileModalBody) this.ui.profileModalBody.innerHTML = `<div class="alert alert-danger">Erro ao carregar perfil: ${error.message}</div>`;
        else console.error("profileModalBody not available to show error");
      }
    }
  }

  renderProfileModalContent(employee, history) { /* ... (Mantido como na v1.3.1) ... */ }
  editProfileFromModal() {
    if (!this.state.viewingEmployeeId) return;
    // *** CORREÇÃO: Verifica instâncias antes de usar ***
    if (!this.ui.profileModal || !this.ui.employeeFormModal) {
      console.error("Modal instance(s) missing for edit profile action.");
      this.showAlert('danger', 'Erro ao tentar editar perfil.');
      return;
    }
    this.ui.profileModal.hide();
    const editButton = document.createElement('button');
    editButton.dataset.employeeId = this.state.viewingEmployeeId;
    setTimeout(() => {
      if (this.ui.employeeFormModal) this.ui.employeeFormModal.show(editButton);
    }, 200);
  }
  async toggleActiveStatusFromModal() { /* ... (Mantido como na v1.3.1) ... */ }

  // ================ GERENCIAMENTO (ADMIN) ================
  async loadAndDisplayAdminEmployeeList() { /* ... (Mantido como na v1.3.1) ... */ }
  renderAdminEmployeeTable() { /* ... (Mantido como na v1.3.1, adiciona listeners da tabela) ... */ }
  prepareEmployeeForm(employeeId = null) { /* ... (Mantido como na v1.3.1) ... */ }
  async handleSaveEmployeeForm() {
    // ... validação ...
    try {
      //... fetch ...
      if (!response.ok || !result.success) throw new Error(/*...*/);
      // *** CORREÇÃO: Verifica instância antes de usar ***
      if (this.ui.employeeFormModal) this.ui.employeeFormModal.hide();
      else console.warn("employeeFormModal instance not available to hide.");
      // ... recarrega tabela ...
    } catch (error) { /*...*/ }
    finally { /*...*/ }
  }
  _validateEmployeeForm() { /* ... (Mantido como na v1.3.1) ... */ }

  // ================ UTILITÁRIOS ================
  async fetchWithAuth(url, options = {}) { /* ... (Mantido como na v1.3.1) ... */ }
  showAlert(type, message) { /* ... (Mantido como na v1.3.1 com verificação Bootstrap Alert) ... */ }
  formatTime(timestamp) { /* ... (Mantido como na v1.3.1) ... */ }
  getTipoNome(tipo) { /* ... (Mantido como na v1.3.1) ... */ }
  formatDateISO(date) { /* ... (Mantido como na v1.3.1) ... */ }
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
    if (window.pontoApp && typeof window.pontoApp._init === 'function') {
      // _init agora chama _initializeComponents que cria as instâncias do modal
      window.pontoApp._init();
    } else {
      console.error("Falha ao criar instância de PontoApp ou método _init não encontrado.");
    }
  }
});