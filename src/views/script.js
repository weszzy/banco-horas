// src/views/script.js
/**
 * Sistema de Controle de Ponto v1.3.6 (Baseado no original de ~768 linhas)
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
    console.log("[CacheDOM v1.3.6] Caching DOM Elements...");
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
    // Verifica se elementos essenciais foram encontrados
    for (const key in this.ui) {
      if (key === 'employeeSelect' || key.endsWith('Modal') || key.endsWith('Element')) continue;
      if (!this.ui[key]) {
        console.warn(`[CacheDOM] Elemento UI '${key}' não encontrado no HTML inicial.`);
      }
    }
    console.log("[CacheDOM] DOM Elements cached.");
  }

  // Inicializa instâncias de Modal e estado (CHAMADO APÓS VERIFICAÇÃO DO BOOTSTRAP)
  _initializeComponents() {
    console.log("[InitComp] Initializing components (Modals, State)...");
    const canInitModals = typeof bootstrap !== 'undefined' && bootstrap.Modal;
    if (!canInitModals) { console.error("FATAL: Bootstrap Modal component not found."); }
    if (this.ui.loginModalElement && canInitModals) { this.ui.loginModal = new bootstrap.Modal(this.ui.loginModalElement); }
    else if (!this.ui.loginModalElement) { console.error("[InitComp] Login Modal element reference not found."); }
    else { console.error("[InitComp] Bootstrap Modal class not available for Login Modal."); }
    if (this.ui.employeeFormModalElement && canInitModals) { this.ui.employeeFormModal = new bootstrap.Modal(this.ui.employeeFormModalElement); }
    else if (!this.ui.employeeFormModalElement) { console.error("[InitComp] Employee Form Modal element reference not found."); }
    else { console.error("[InitComp] Bootstrap Modal class not available for Employee Form Modal."); }
    if (this.ui.profileModalElement && canInitModals) { this.ui.profileModal = new bootstrap.Modal(this.ui.profileModalElement); }
    else if (!this.ui.profileModalElement) { console.error("[InitComp] Profile Modal element reference not found."); }
    else { console.error("[InitComp] Bootstrap Modal class not available for Profile Modal."); }
    if (!this.ui.loginModal) console.warn("[InitComp] Login Modal instance could not be created.");
    if (!this.ui.employeeFormModal) console.warn("[InitComp] Employee Form Modal instance could not be created.");
    if (!this.ui.profileModal) console.warn("[InitComp] Profile Modal instance could not be created.");
    this.state = { token: localStorage.getItem('authToken') || null, currentUser: JSON.parse(localStorage.getItem('currentUser')) || null, selectedEmployeeId: null, viewingEmployeeId: null, todayRecord: null, employeeList: [], currentView: 'login' };
    console.log("[InitComp] Components initialized.");
  }

  // Método chamado após a instância ser criada e o Bootstrap verificado
  _init() {
    console.log("PontoApp v1.3.6 _init called...");
    this._initializeComponents(); // Inicializa estado e modais
    this._setupStaticEventListeners(); // Configura listeners estáticos
    this._initSelect2();
    this._updateView(); // Define a visão inicial e adiciona listeners dinâmicos
  }

  // Listeners para elementos que SEMPRE existem no HTML inicial
  _setupStaticEventListeners() {
    console.log("[Listeners] Setting up static event listeners...");
    if (this.ui.loginForm) { this.ui.loginForm.addEventListener('submit', (e) => { e.preventDefault(); this.handleLogin(); }); } else { console.error("[Listeners] Static Error: loginForm not found."); }
    if (this.ui.btnLoginSubmit) { this.ui.btnLoginSubmit.addEventListener('click', () => this.handleLogin()); } else { console.error("[Listeners] Static Error: btnLoginSubmit not found."); }
    if (this.ui.btnEntrada) this.ui.btnEntrada.addEventListener('click', () => this.registrarPonto('check-in')); else console.error("[Listeners] Static Error: btnEntrada not found");
    if (this.ui.btnSaidaAlmoco) this.ui.btnSaidaAlmoco.addEventListener('click', () => this.registrarPonto('lunch-start')); else console.error("[Listeners] Static Error: btnSaidaAlmoco not found");
    if (this.ui.btnRetornoAlmoco) this.ui.btnRetornoAlmoco.addEventListener('click', () => this.registrarPonto('lunch-end')); else console.error("[Listeners] Static Error: btnRetornoAlmoco not found");
    if (this.ui.btnSaida) this.ui.btnSaida.addEventListener('click', () => this.registrarPonto('check-out')); else console.error("[Listeners] Static Error: btnSaida not found");
    if (this.ui.employeeSelect && this.ui.employeeSelect.length > 0) { this.ui.employeeSelect.on('change', (e) => { const selectedValue = $(e.target).val(); this.state.selectedEmployeeId = selectedValue ? parseInt(selectedValue, 10) : this.state.currentUser?.id; this.handleEmployeeSelectionChange(); }); } else { console.error("[Listeners] Static Error: employeeSelect jQuery object not found or empty.") }
    if (this.ui.btnVerPerfilCompleto) { this.ui.btnVerPerfilCompleto.addEventListener('click', () => { const targetId = this.state.selectedEmployeeId || this.state.currentUser?.id; console.log("[Listeners] Botão 'Ver Perfil Completo' clicado. Target ID:", targetId); if (targetId) { this.showProfileModal(targetId); } else { console.warn("[Listeners] Tentativa de ver perfil sem ID."); this.showAlert('info', 'Selecione um funcionário ou faça login.'); } }); } else { console.error("[Listeners] Static Error: btnVerPerfilCompleto not found"); }
    if (this.ui.employeeForm) this.ui.employeeForm.addEventListener('submit', (e) => { e.preventDefault(); this.handleSaveEmployeeForm(); }); else console.error("[Listeners] Static Error: employeeForm not found.");
    if (this.ui.btnSaveChangesEmployee) this.ui.btnSaveChangesEmployee.addEventListener('click', () => this.handleSaveEmployeeForm()); else console.error("[Listeners] Static Error: btnSaveChangesEmployee not found.");
    if (this.ui.employeeFormModalElement) { this.ui.employeeFormModalElement.addEventListener('show.bs.modal', (e) => { console.log("[Listeners] Evento 'show.bs.modal' disparado para employeeFormModal"); const button = e.relatedTarget; const employeeId = button?.dataset.employeeId; this.prepareEmployeeForm(employeeId ? parseInt(employeeId, 10) : null); }); } else { console.error("[Listeners] Static Error: employeeFormModalElement not found."); }
    if (this.ui.btnEditProfile) this.ui.btnEditProfile.addEventListener('click', () => this.editProfileFromModal()); else console.error("[Listeners] Static Error: btnEditProfile not found.");
    if (this.ui.btnToggleActiveStatus) this.ui.btnToggleActiveStatus.addEventListener('click', () => this.toggleActiveStatusFromModal()); else console.error("[Listeners] Static Error: btnToggleActiveStatus not found.");
    console.log("[Listeners] Static event listeners set up completed.");
  }

  // Adiciona listeners para elementos que são criados/exibidos dinamicamente NA NAVBAR
  _setupDynamicEventListeners() {
    console.log("[Listeners] Setting up dynamic event listeners for Navbar...");
    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) { if (!btnLogout.onclick) { btnLogout.onclick = () => this.handleLogout(); console.log("[Listeners] Dynamic Listener: Logout attached."); } }
    else { if (this.state.currentUser) console.warn("[Listeners] Dynamic Warning: btnLogout not found after login."); }
    const linkMeuPerfil = document.getElementById('linkMeuPerfil');
    if (linkMeuPerfil) { if (!linkMeuPerfil.onclick) { linkMeuPerfil.onclick = (e) => { e.preventDefault(); console.log("[Listeners] Link 'Meu Perfil' clicked."); if (this.state.currentUser?.id) { this.showProfileModal(this.state.currentUser.id); } else { console.error("[Listeners] Usuário não definido ao clicar em Meu Perfil."); this.showAlert('danger', 'Erro: Informação do usuário não encontrada.'); } }; console.log("[Listeners] Dynamic Listener: Meu Perfil attached."); } }
    else { if (this.ui.navLinks && this.ui.navLinks.style.display !== 'none') console.warn("[Listeners] Dynamic Warning: linkMeuPerfil not found when expected."); }
    const linkGerenciar = document.getElementById('linkGerenciarFuncionarios');
    if (linkGerenciar) { if (!linkGerenciar.onclick) { linkGerenciar.onclick = (e) => { e.preventDefault(); this.setView('admin'); }; console.log("[Listeners] Dynamic Listener: Gerenciar Funcionários attached."); } }
    else { if (this.ui.navAdminLinks && this.ui.navAdminLinks.style.display !== 'none') console.warn("[Listeners] Dynamic Warning: linkGerenciarFuncionarios not found for admin."); }
    const linkNovoFunc = document.getElementById('linkNovoFuncionario');
    if (!linkNovoFunc && this.ui.navAdminLinks && this.ui.navAdminLinks.style.display !== 'none') { console.warn("[Listeners] Dynamic Warning: linkNovoFuncionario not found for admin."); }
    console.log("[Listeners] Dynamic event listeners for Navbar set up completed.");
  }

  // ================ MÉTODOS RESTANTES (PRESERVADOS DO SEU ORIGINAL) ================

  _initSelect2() {
    if (this.ui.employeeSelect && this.ui.employeeSelect.length > 0 && typeof $.fn.select2 === 'function') {
      try { this.ui.employeeSelect.select2({ placeholder: "Selecione para ver status", allowClear: true, width: '100%', }); this.ui.employeeSelect.prop('disabled', true); console.log("Select2 initialized."); }
      catch (error) { console.error("Erro ao inicializar Select2:", error); this.showAlert('warning', 'Erro ao inicializar o seletor de funcionários.') }
    } else if (!(typeof $.fn.select2 === 'function')) { console.error("Select2 function not available."); }
    else { console.error("Select2 element not found during initialization."); }
  }

  setView(viewName) {
    console.log(`Setting view to: ${viewName}`); this.state.currentView = viewName;
    if (this.ui.loginPrompt) this.ui.loginPrompt.style.display = viewName === 'login' ? 'block' : 'none';
    if (this.ui.dashboardArea) this.ui.dashboardArea.style.display = viewName === 'dashboard' ? 'block' : 'none';
    if (this.ui.adminArea) this.ui.adminArea.style.display = viewName === 'admin' ? 'block' : 'none';
    if (viewName === 'admin') { this.loadAndDisplayAdminEmployeeList(); } else if (viewName === 'dashboard') { this.fetchAndUpdateDashboard(); }
    this._updateNavLinks();
  }

  _updateView() {
    console.log("Updating view based on auth state...");
    if (this.state.token && this.state.currentUser) { // Logado
      if (this.ui.navLinks) this.ui.navLinks.style.display = 'block'; else console.error("_updateView Error: navLinks container not found");
      if (this.ui.authArea) { this.ui.authArea.innerHTML = `<span class="navbar-text me-3">Olá, ${this.state.currentUser.fullName}</span><button class="btn btn-outline-secondary btn-sm" id="btnLogout">Sair</button>`; }
      else { console.error("_updateView Error: authArea not found"); }
      if (this.state.currentUser.role === 'admin') {
        if (this.ui.navAdminLinks) this.ui.navAdminLinks.style.display = 'block'; else console.error("_updateView Error: navAdminLinks container not found");
        this.setView(this.state.currentView !== 'login' ? this.state.currentView : 'dashboard');
      } else {
        if (this.ui.navAdminLinks) this.ui.navAdminLinks.style.display = 'none';
        this.setView('dashboard');
      }
      setTimeout(() => this._setupDynamicEventListeners(), 0); // Adiciona listeners após renderizar
    } else { // Deslogado
      if (this.ui.navLinks) this.ui.navLinks.style.display = 'none';
      if (this.ui.navAdminLinks) this.ui.navAdminLinks.style.display = 'none';
      if (this.ui.authArea) { this.ui.authArea.innerHTML = `<button class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#loginModal">Login</button>`; }
      this.setView('login');
    }
    console.log("View update process finished.");
  }

  _updateNavLinks() {
    document.querySelectorAll('#navLinks .nav-link, #navAdminLinks .nav-link').forEach(link => link.classList.remove('active'));
    if (this.state.currentView === 'admin' && this.ui.navAdminLinks) { this.ui.navAdminLinks.querySelector('#linkGerenciarFuncionarios')?.classList.add('active'); }
  }

  async handleLogin() {
    console.log("Handling login...");
    if (!this.ui.loginForm || !this.ui.btnLoginSubmit || !this.ui.loginError) { console.error("Login form elements missing."); return; }
    const email = this.ui.loginForm.email.value;
    const password = this.ui.loginForm.password.value;
    this.ui.loginError.style.display = 'none';
    if (!email || !password) { this.ui.loginError.textContent = 'E-mail e senha são obrigatórios.'; this.ui.loginError.style.display = 'block'; return; }
    this.ui.btnLoginSubmit.disabled = true; this.ui.btnLoginSubmit.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Entrando...';
    try {
      const response = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
      if (!response) throw new Error("Falha na requisição de login.");
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || `Erro ${response.status}`);
      this.state.token = result.data.token; this.state.currentUser = result.data.user;
      localStorage.setItem('authToken', this.state.token); localStorage.setItem('currentUser', JSON.stringify(this.state.currentUser));
      console.log("Login successful, updating view...");
      if (this.ui.loginModal) this.ui.loginModal.hide(); else console.warn("Login Modal instance not available to hide.");
      this._updateView();
    } catch (error) {
      console.error("Login failed:", error); this.ui.loginError.textContent = `Falha no login: ${error.message}`; this.ui.loginError.style.display = 'block';
    } finally { if (this.ui.btnLoginSubmit) { this.ui.btnLoginSubmit.disabled = false; this.ui.btnLoginSubmit.innerHTML = 'Entrar'; } }
  }

  handleLogout() {
    console.log("Handling logout..."); this.state.token = null; this.state.currentUser = null;
    localStorage.removeItem('authToken'); localStorage.removeItem('currentUser');
    if (this.ui.employeeSelect && this.ui.employeeSelect.length > 0) { this.ui.employeeSelect.val(null).trigger('change'); this.ui.employeeSelect.prop('disabled', true); }
    this._updateView(); this.resetDashboardState(); console.log("Logout complete.");
  }

  resetDashboardState() {
    console.log("Resetting dashboard state..."); this.state.selectedEmployeeId = null; this.state.todayRecord = null;
    if (this.ui.employeeSelect && this.ui.employeeSelect.length > 0) { this.ui.employeeSelect.val(null).trigger('change'); }
    if (this.ui.statusPlaceholder) { this.ui.statusPlaceholder.textContent = 'Carregando...'; this.ui.statusPlaceholder.style.display = 'block'; }
    if (this.ui.statusDetails) this.ui.statusDetails.style.display = 'none';
    if (this.ui.statusEntrada) this.ui.statusEntrada.textContent = '--:--'; if (this.ui.statusSaidaAlmoco) this.ui.statusSaidaAlmoco.textContent = '--:--'; if (this.ui.statusRetornoAlmoco) this.ui.statusRetornoAlmoco.textContent = '--:--'; if (this.ui.statusSaida) this.ui.statusSaida.textContent = '--:--'; if (this.ui.statusTotalHoras) this.ui.statusTotalHoras.textContent = '-.-- h'; if (this.ui.statusDate) this.ui.statusDate.textContent = '--/--/----';
    if (this.ui.summaryLoading) this.ui.summaryLoading.style.display = 'block'; if (this.ui.summaryContent) this.ui.summaryContent.style.display = 'none'; if (this.ui.summaryBalance) this.ui.summaryBalance.textContent = '--:--';
    this._setPointButtonsDisabled(true);
  }

  async fetchAndUpdateDashboard() {
    if (!this.state.currentUser) { console.warn("fetchAndUpdateDashboard chamado sem currentUser."); return; }
    console.log("Atualizando Dashboard..."); this.resetDashboardState(); let initialEmployeeId = this.state.currentUser.id;
    if (this.state.currentUser.role === 'admin') {
      if (this.ui.employeeSelectContainer) this.ui.employeeSelectContainer.style.display = 'block'; if (this.ui.employeeSelect && this.ui.employeeSelect.length > 0) this.ui.employeeSelect.prop('disabled', false);
      await this.loadEmployeeListForAdmin();
      initialEmployeeId = this.ui.employeeSelect && this.ui.employeeSelect.length > 0 ? (parseInt(this.ui.employeeSelect.val(), 10) || this.state.currentUser.id) : this.state.currentUser.id;
      console.log(`Admin view: Initial employee ID set to ${initialEmployeeId}`);
    } else {
      if (this.ui.employeeSelectContainer) this.ui.employeeSelectContainer.style.display = 'none'; if (this.ui.employeeSelect && this.ui.employeeSelect.length > 0) this.ui.employeeSelect.prop('disabled', true);
      initialEmployeeId = this.state.currentUser.id; console.log(`Non-admin view: Employee ID set to ${initialEmployeeId}`);
    }
    this.state.selectedEmployeeId = initialEmployeeId; if (this.ui.employeeSelect && this.ui.employeeSelect.length > 0) { this.ui.employeeSelect.val(this.state.selectedEmployeeId).trigger('change.select2'); }
    await this.fetchAndUpdateStatus(); await this.fetchAndUpdateSummary();
  }

  handleEmployeeSelectionChange() {
    if (!this.state.selectedEmployeeId) { console.warn("Seleção de funcionário limpa, voltando para usuário logado."); this.state.selectedEmployeeId = this.state.currentUser?.id; if (this.ui.employeeSelect && this.ui.employeeSelect.length > 0) { this.ui.employeeSelect.val(this.state.selectedEmployeeId).trigger('change.select2'); } if (!this.state.selectedEmployeeId) { this.resetDashboardState(); return; } }
    console.log("Seleção dashboard mudou para employeeId:", this.state.selectedEmployeeId); this.fetchAndUpdateStatus(); this.fetchAndUpdateSummary();
  }

  async fetchAndUpdateStatus() {
    const targetEmployeeId = this.state.selectedEmployeeId; if (!targetEmployeeId) { console.warn("fetchAndUpdateStatus: targetEmployeeId não definido."); if (this.ui.statusPlaceholder) { this.ui.statusPlaceholder.textContent = 'Selecione um funcionário (Admin) ou faça login.'; this.ui.statusPlaceholder.style.display = 'block'; } if (this.ui.statusDetails) this.ui.statusDetails.style.display = 'none'; this.updateActionButtons(); return; }
    console.log(`Buscando status para employeeId: ${targetEmployeeId}`); if (this.ui.statusPlaceholder) { this.ui.statusPlaceholder.textContent = 'Carregando status...'; this.ui.statusPlaceholder.style.display = 'block'; } if (this.ui.statusDetails) this.ui.statusDetails.style.display = 'none'; this._setPointButtonsDisabled(true);
    try {
      let url = ''; if (targetEmployeeId === this.state.currentUser?.id) { url = '/api/time-records/today'; } else if (this.state.currentUser?.role === 'admin') { console.log(`Admin buscando histórico de ${targetEmployeeId} para status de hoje.`); await this.fetchHistoryAndFindToday(targetEmployeeId); this.updateStatusUI(); this.updateActionButtons(); return; } else { throw new Error("Não autorizado a ver status de outro funcionário."); }
      const response = await this.fetchWithAuth(url); if (!response) return; const result = await response.json(); if (!response.ok) { if (response.status === 404) { console.log(`Nenhum registro encontrado hoje para ${targetEmployeeId}`); this.state.todayRecord = null; } else { throw new Error(result.message || `Erro ${response.status}`); } } else { this.state.todayRecord = result.data; }
      this.updateStatusUI(); this.updateActionButtons();
    } catch (error) { if (error.message !== 'Não autorizado') { console.error(`Erro ao buscar status para employeeId ${targetEmployeeId}:`, error); this.showAlert('danger', `Falha ao carregar status: ${error.message}`); if (this.ui.statusPlaceholder) this.ui.statusPlaceholder.textContent = 'Erro ao carregar status.'; } if (this.ui.statusPlaceholder) this.ui.statusPlaceholder.style.display = 'block'; if (this.ui.statusDetails) this.ui.statusDetails.style.display = 'none'; this.updateActionButtons(); }
  }

  async fetchHistoryAndFindToday(employeeId) {
    this.state.todayRecord = null; try { const response = await this.fetchWithAuth(`/api/time-records/employee/${employeeId}`); if (!response) return; const result = await response.json(); if (!response.ok) throw new Error(result.message || `Erro ${response.status}`); const todayStr = new Date().toISOString().split('T')[0]; this.state.todayRecord = result.data?.find(record => record.startTime && record.startTime.startsWith(todayStr)) || null; console.log(`Registro de hoje (ID: ${employeeId}) encontrado no histórico:`, this.state.todayRecord); } catch (error) { if (error.message !== 'Não autorizado') { console.error(`Erro ao buscar histórico (employeeId ${employeeId}):`, error); this.showAlert('danger', `Falha ao buscar histórico: ${error.message}`); } }
  }

  updateStatusUI() {
    const record = this.state.todayRecord; if (!this.ui.statusPlaceholder || !this.ui.statusDetails || !this.ui.statusEntrada || !this.ui.statusSaidaAlmoco || !this.ui.statusRetornoAlmoco || !this.ui.statusSaida || !this.ui.statusTotalHoras) { console.error("Elementos da UI de status não encontrados."); return; }
    if (!record) { this.ui.statusPlaceholder.textContent = 'Nenhum registro encontrado para hoje.'; this.ui.statusPlaceholder.style.display = 'block'; this.ui.statusDetails.style.display = 'none'; }
    else { this.ui.statusPlaceholder.style.display = 'none'; this.ui.statusDetails.style.display = 'block'; this.ui.statusEntrada.textContent = this.formatTime(record.startTime); this.ui.statusSaidaAlmoco.textContent = this.formatTime(record.lunchStartTime); this.ui.statusRetornoAlmoco.textContent = this.formatTime(record.lunchEndTime); this.ui.statusSaida.textContent = this.formatTime(record.endTime); this.ui.statusTotalHoras.textContent = record.totalHours ? `${parseFloat(record.totalHours).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} h` : '-.-- h'; }
  }

  updateActionButtons() {
    console.log("[UpdateButtons] Atualizando botões de ação..."); const record = this.state.todayRecord; const canPerformActions = this.state.currentUser?.id === this.state.selectedEmployeeId; console.log(`[UpdateButtons] canPerformActions: ${canPerformActions} (currentUser: ${this.state.currentUser?.id}, selected: ${this.state.selectedEmployeeId})`); console.log("[UpdateButtons] todayRecord:", record);
    if (!this.ui.btnEntrada || !this.ui.btnSaidaAlmoco || !this.ui.btnRetornoAlmoco || !this.ui.btnSaida) { console.error("[UpdateButtons] Botões de ação não encontrados no DOM."); return; }
    const btnEntradaDisabled = !canPerformActions || !!record; const btnSaidaAlmocoDisabled = !canPerformActions || !record || !!record?.lunchStartTime || !!record?.endTime; const btnRetornoAlmocoDisabled = !canPerformActions || !record || !record?.lunchStartTime || !!record?.lunchEndTime || !!record?.endTime; const btnSaidaDisabled = !canPerformActions || !record || !!record?.endTime;
    this.ui.btnEntrada.disabled = btnEntradaDisabled; this.ui.btnSaidaAlmoco.disabled = btnSaidaAlmocoDisabled; this.ui.btnRetornoAlmoco.disabled = btnRetornoAlmocoDisabled; this.ui.btnSaida.disabled = btnSaidaDisabled;
    console.log(`[UpdateButtons] Estado final: Entrada(${!btnEntradaDisabled}), SaidaAlmoco(${!btnSaidaAlmocoDisabled}), RetornoAlmoco(${!btnRetornoAlmocoDisabled}), Saida(${!btnSaidaDisabled})`);
  }

  async registrarPonto(tipoAcao) {
    if (this.state.selectedEmployeeId !== this.state.currentUser?.id) { this.showAlert('warning', 'Você só pode registrar seu próprio ponto.'); return; }
    console.log(`Registrando ${tipoAcao} para usuário logado (ID: ${this.state.currentUser.id})`); let url = ''; const options = { method: 'POST' };
    switch (tipoAcao) { case 'check-in': url = '/api/time-records/check-in'; break; case 'lunch-start': url = '/api/time-records/lunch-start'; break; case 'lunch-end': url = '/api/time-records/lunch-end'; break; case 'check-out': url = '/api/time-records/check-out'; break; default: this.showAlert('danger', 'Ação desconhecida.'); return; }
    this._setPointButtonsDisabled(true);
    try { const response = await this.fetchWithAuth(url, options); if (!response) return; const result = await response.json(); if (!response.ok || !result.success) throw new Error(result.message || `Erro ${response.status}`); this.showAlert('success', `${this.getTipoNome(tipoAcao)} registrado com sucesso!`); await this.fetchAndUpdateStatus(); }
    catch (error) { if (error.message !== 'Não autorizado') { console.error(`Erro ao registrar ${tipoAcao}:`, error); this.showAlert('danger', `Falha ao registrar ${this.getTipoNome(tipoAcao)}: ${error.message}`); } await this.fetchAndUpdateStatus(); }
  }

  _setPointButtonsDisabled(isDisabled) {
    if (this.ui.btnEntrada) this.ui.btnEntrada.disabled = isDisabled; if (this.ui.btnSaidaAlmoco) this.ui.btnSaidaAlmoco.disabled = isDisabled; if (this.ui.btnRetornoAlmoco) this.ui.btnRetornoAlmoco.disabled = isDisabled; if (this.ui.btnSaida) this.ui.btnSaida.disabled = isDisabled;
  }

  async fetchAndUpdateSummary() {
    if (!this.state.selectedEmployeeId) { console.warn("fetchAndUpdateSummary chamado sem selectedEmployeeId"); if (this.ui.summaryLoading) this.ui.summaryLoading.innerHTML = `<span class="text-warning">Selecione um funcionário.</span>`; return; }
    if (!this.ui.summaryLoading || !this.ui.summaryContent || !this.ui.summaryBalance) { console.error("Elementos UI do resumo não encontrados."); return; }
    console.log(`Fetching summary for employee: ${this.state.selectedEmployeeId}`); this.ui.summaryLoading.style.display = 'block'; this.ui.summaryContent.style.display = 'none';
    try {
      const url = (this.state.selectedEmployeeId === this.state.currentUser?.id) ? '/api/employees/me' : `/api/employees/${this.state.selectedEmployeeId}`; const response = await this.fetchWithAuth(url); if (!response) return; const result = await response.json(); if (!response.ok || !result.success) throw new Error(result.message || `Erro ${response.status}`); const employeeData = result.data; if (!employeeData) throw new Error("Dados do funcionário não recebidos da API."); const balance = parseFloat(employeeData.hourBalance || 0); const formattedBalance = balance.toLocaleString('pt-BR', { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 }); let balanceText = formattedBalance + "h"; let balanceClass = 'balance-zero'; if (balance > 0.01) { balanceText = "+" + balanceText; balanceClass = 'balance-positive'; } else if (balance < -0.01) { balanceClass = 'balance-negative'; } this.ui.summaryBalance.textContent = balanceText; this.ui.summaryBalance.className = `display-4 fw-bold ${balanceClass}`; this.ui.summaryLoading.style.display = 'none'; this.ui.summaryContent.style.display = 'block';
    } catch (error) { if (error.message !== 'Não autorizado') { console.error("Erro ao buscar resumo/saldo:", error); if (this.ui.summaryLoading) { this.ui.summaryLoading.innerHTML = `<span class="text-danger">Erro ao carregar saldo.</span>`; this.ui.summaryLoading.style.display = 'block'; } if (this.ui.summaryContent) this.ui.summaryContent.style.display = 'none'; } }
  }

  async showProfileModal(employeeId) {
    console.log(`[ProfileModal] Tentando abrir para ID: ${employeeId}`); if (!employeeId) { console.warn("showProfileModal: employeeId is missing."); return; } if (!this.ui.profileModal) { console.error("[ProfileModal] Profile Modal instance not available! Cannot show."); this.showAlert('danger', 'Erro ao inicializar o modal de perfil.'); return; }
    this.state.viewingEmployeeId = employeeId; if (this.ui.profileModalLabel) this.ui.profileModalLabel.textContent = "Carregando Perfil..."; else console.error("[ProfileModal] profileModalLabel not found"); if (this.ui.profileModalBody) this.ui.profileModalBody.innerHTML = `<div class="text-center p-5"><span class="spinner-border spinner-border-sm"></span> Carregando...</div>`; else console.error("[ProfileModal] profileModalBody not found"); if (this.ui.profileAdminActions) this.ui.profileAdminActions.style.display = 'none'; else console.error("[ProfileModal] profileAdminActions not found");
    console.log("[ProfileModal] Chamando profileModal.show()"); try { this.ui.profileModal.show(); } catch (e) { console.error("[ProfileModal] Erro ao chamar profileModal.show():", e); this.showAlert('danger', 'Erro ao abrir o modal de perfil.'); return; }
    try {
      console.log(`[ProfileModal] Buscando dados do funcionário: /api/employees/${employeeId}`); const empResponse = await this.fetchWithAuth(`/api/employees/${employeeId}`); if (!empResponse) return; const empResult = await empResponse.json(); if (!empResponse.ok || !empResult.success) throw new Error(`Erro (Perfil): ${empResult.message || empResponse.statusText || empResponse.status}`); const employee = empResult.data; if (!employee) throw new Error("Dados do funcionário não retornados pela API."); console.log("[ProfileModal] Dados do funcionário recebidos:", employee);
      console.log(`[ProfileModal] Buscando histórico de saldo para ID: ${employeeId}`); const endDate = new Date(); const startDate = new Date(); startDate.setDate(endDate.getDate() - 7); const histUrl = `/api/time-records/employee/${employeeId}/balance-history?startDate=${this.formatDateISO(startDate)}&endDate=${this.formatDateISO(endDate)}`; console.log(`[ProfileModal] URL Histórico: ${histUrl}`); const histResponse = await this.fetchWithAuth(histUrl); let history = []; if (histResponse) { const histResult = await histResponse.json(); if (histResponse.ok && histResult.success) { history = histResult.data; console.log("[ProfileModal] Histórico de saldo recebido:", history); } else { console.warn(`[ProfileModal] Falha ao buscar histórico de saldo: ${histResult?.message || histResponse.statusText || histResponse.status}`); } } else { console.warn("[ProfileModal] Requisição de histórico de saldo falhou ou foi interrompida."); }
      console.log("[ProfileModal] Renderizando conteúdo do modal..."); this.renderProfileModalContent(employee, history); console.log("[ProfileModal] Conteúdo renderizado.");
    } catch (error) { if (error.message !== 'Não autorizado') { console.error("[ProfileModal] Erro ao carregar dados do perfil:", error); if (this.ui.profileModalBody) { this.ui.profileModalBody.innerHTML = `<div class="alert alert-danger m-3">Erro ao carregar perfil: ${error.message}</div>`; } else { console.error("[ProfileModal] profileModalBody não disponível para mostrar erro."); } } }
  }

  renderProfileModalContent(employee, history) {
    if (!this.ui.profileModalLabel || !this.ui.profileModalBody || !this.ui.profileAdminActions) { console.error("Elementos internos do Modal de Perfil não encontrados para renderizar."); return; }
    this.ui.profileModalLabel.textContent = `Perfil de ${employee.fullName}`; let age = 'N/A'; if (employee.birthDate) { try { const birthDate = new Date(employee.birthDate); const today = new Date(); age = today.getFullYear() - birthDate.getFullYear(); const m = today.getMonth() - birthDate.getMonth(); if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) { age--; } } catch { age = 'Inválida'; } } const balance = parseFloat(employee.hourBalance || 0); const formattedBalance = balance.toLocaleString('pt-BR', { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 }); let balanceText = formattedBalance + "h"; let balanceClass = 'balance-zero'; if (balance > 0.01) { balanceText = "+" + balanceText; balanceClass = 'balance-positive'; } else if (balance < -0.01) { balanceClass = 'balance-negative'; } let historyHtml = '<p class="text-muted text-center">Nenhum registro finalizado nos últimos 7 dias.</p>'; if (history && history.length > 0) { historyHtml = `<table class="table table-sm table-striped" id="balanceHistoryTable"><thead><tr><th>Data</th><th>Trabalhado</th><th>Meta</th><th>Saldo Dia</th><th>Ações Admin</th></tr></thead><tbody>${history.map(h => `<tr><td>${new Date(h.date).toLocaleDateString('pt-BR')}</td><td>${h.workedHours}h</td><td>${h.dailyGoal}h</td><td class="${parseFloat(h.dailyBalance) > 0.01 ? 'balance-positive' : (parseFloat(h.dailyBalance) < -0.01 ? 'balance-negative' : '')}">${parseFloat(h.dailyBalance) > 0 ? '+' : ''}${h.dailyBalance}h</td><td><button class="btn btn-outline-danger btn-sm ms-2 delete-record-btn" data-record-id="${h.id /* PRECISA GARANTIR QUE O ID VENHA DA API */}" style="display: ${this.state.currentUser?.role === 'admin' ? 'inline-block' : 'none'};" title="Remover este registro"><i class="fas fa-trash-alt"></i></button></td></tr>`).join('')}</tbody></table>`; } // ADICIONADO O BOTÃO AQUI (COM VERIFICAÇÃO ADMIN) E COLUNA EXTRA
    this.ui.profileModalBody.innerHTML = `<div class="row mb-4"><div class="col-md-4 text-center"><img src="${employee.photoUrl || 'assets/default-avatar.png'}" alt="Foto de ${employee.fullName}" class="img-fluid profile-photo mb-2" onerror="this.onerror=null; this.src='assets/default-avatar.png';"><span class="badge bg-${employee.isActive ? 'success' : 'danger'}">${employee.isActive ? 'Ativo' : 'Inativo'}</span></div><div class="col-md-8"><h4>${employee.fullName}</h4><p class="text-muted mb-1">${employee.role}</p><p><i class="fas fa-envelope fa-fw me-2"></i>${employee.email}</p><p><i class="fas fa-birthday-cake fa-fw me-2"></i>${age} anos ${employee.birthDate ? '(' + new Date(employee.birthDate).toLocaleDateString('pt-BR') + ')' : ''}</p><p><i class="fas fa-calendar-alt fa-fw me-2"></i>Admissão: ${employee.hireDate ? new Date(employee.hireDate).toLocaleDateString('pt-BR') : 'N/A'}</p><p><i class="fas fa-briefcase fa-fw me-2"></i>Carga Semanal: ${employee.weeklyHours} horas</p><hr><p class="mb-1"><strong>Saldo Banco de Horas:</strong></p><h3 class="fw-bold ${balanceClass}">${balanceText}</h3></div></div><h5>Histórico Recente (Últimos 7 dias)</h5>${historyHtml}`;
    if (this.state.currentUser?.role === 'admin') { this.ui.profileAdminActions.style.display = 'block'; const btnToggle = this.ui.btnToggleActiveStatus; if (btnToggle) { if (employee.isActive) { btnToggle.innerHTML = '<i class="fas fa-power-off me-1"></i> Desativar'; btnToggle.classList.remove('btn-success'); btnToggle.classList.add('btn-danger'); } else { btnToggle.innerHTML = '<i class="fas fa-power-off me-1"></i> Ativar'; btnToggle.classList.remove('btn-danger'); btnToggle.classList.add('btn-success'); } } else { console.error("Botão Toggle Status não encontrado no modal de perfil"); } } else { if (this.ui.profileAdminActions) this.ui.profileAdminActions.style.display = 'none'; }

    // Adiciona listeners aos botões de deletar APÓS renderizar a tabela
    this.ui.profileModalBody.querySelectorAll('.delete-record-btn').forEach(btn => {
      // Remove listener antigo para evitar duplicação se re-renderizar
      if (btn.onclick) { btn.onclick = null; }
      btn.addEventListener('click', async (e) => { // Usa addEventListener para mais flexibilidade
        const recordId = e.currentTarget.dataset.recordId;
        const employeeName = employee.fullName;
        if (confirm(`Tem certeza que deseja remover o registro #${recordId} de ${employeeName}?`)) {
          await this.handleDeleteRecord(recordId, employee.id);
        }
      });
    });
  }

  editProfileFromModal() {
    if (!this.state.viewingEmployeeId) return; if (!this.ui.profileModal || !this.ui.employeeFormModal) { console.error("Modal instance(s) missing for edit profile action."); this.showAlert('danger', 'Erro ao tentar editar perfil.'); return; }
    this.ui.profileModal.hide(); const editButton = document.createElement('button'); editButton.dataset.employeeId = this.state.viewingEmployeeId; setTimeout(() => { if (this.ui.employeeFormModal) this.ui.employeeFormModal.show(editButton); }, 200);
  }

  async toggleActiveStatusFromModal() {
    const employeeId = this.state.viewingEmployeeId; if (!employeeId || this.state.currentUser?.role !== 'admin') return;
    const profileStatusBadge = this.ui.profileModalBody?.querySelector('.badge'); const currentStatusIsActive = profileStatusBadge?.classList.contains('bg-success'); const newStatus = !currentStatusIsActive; const actionText = newStatus ? 'ativar' : 'desativar'; if (!confirm(`Tem certeza que deseja ${actionText} este funcionário?`)) { return; }
    try {
      const response = await this.fetchWithAuth(`/api/employees/${employeeId}/status`, { method: 'PATCH', body: JSON.stringify({ isActive: newStatus }) }); if (!response) return; const result = await response.json(); if (!response.ok || !result.success) throw new Error(result.message || `Erro ${response.status}`); this.showAlert('success', `Funcionário ${actionText}do com sucesso.`); this.showProfileModal(employeeId); if (this.state.currentView === 'admin') { this.loadAndDisplayAdminEmployeeList(); }
    } catch (error) { if (error.message !== 'Não autorizado') { console.error(`Erro ao ${actionText} funcionário:`, error); this.showAlert('danger', `Falha ao ${actionText} funcionário: ${error.message}`); } }
  }

  async loadAndDisplayAdminEmployeeList() {
    if (this.state.currentUser?.role !== 'admin') return; if (!this.ui.employeeListTableBody) { console.error("Admin table body not found."); return; } this.ui.employeeListTableBody.innerHTML = `<tr><td colspan="6" class="text-center"><span class="spinner-border spinner-border-sm"></span> Carregando...</td></tr>`;
    try {
      const response = await this.fetchWithAuth('/api/employees?active=all'); if (!response) return; const result = await response.json(); if (!response.ok || !result.success) throw new Error(result.message || `Erro ${response.status}`); this.state.employeeList = result.data; this.renderAdminEmployeeTable();
    } catch (error) { if (error.message !== 'Não autorizado') { console.error("Erro ao carregar lista admin:", error); this.ui.employeeListTableBody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">Erro ao carregar funcionários: ${error.message}</td></tr>`; } }
  }

  // Adicionado Método handleDeleteRecord
  async handleDeleteRecord(recordId, employeeIdToRefresh) {
    console.log(`[Admin] Deletando registro ID: ${recordId}`);
    if (!this.state.currentUser || this.state.currentUser.role !== 'admin') {
      this.showAlert('danger', 'Apenas administradores podem remover registros.');
      return;
    }
    try {
      const response = await this.fetchWithAuth(`/api/time-records/${recordId}`, { method: 'DELETE' });
      if (!response) return; // Erro tratado em fetchWithAuth

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || `Erro ${response.status}`);
      }
      this.showAlert('success', 'Registro removido com sucesso!');
      // Recarrega o modal do perfil para mostrar o histórico atualizado
      if (this.ui.profileModalElement?.classList.contains('show')) { // Recarrega só se estiver aberto
        this.showProfileModal(employeeIdToRefresh);
      }
      // Se a visão admin estiver ativa, recarrega a lista também
      if (this.state.currentView === 'admin') {
        this.loadAndDisplayAdminEmployeeList();
      }
      // Atualiza o resumo do dashboard se estiver visível e for o usuário atual
      if (this.state.currentView === 'dashboard' && this.state.selectedEmployeeId === employeeIdToRefresh) {
        this.fetchAndUpdateSummary();
      }

    } catch (error) {
      if (error.message !== 'Não autorizado') {
        console.error(`Erro ao remover registro ${recordId}:`, error);
        this.showAlert('danger', `Falha ao remover registro: ${error.message}`);
      }
    }
  }


  renderAdminEmployeeTable() {
    if (!this.ui.employeeListTableBody) return; if (this.state.employeeList.length === 0) { this.ui.employeeListTableBody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">Nenhum funcionário cadastrado.</td></tr>`; return; }
    this.ui.employeeListTableBody.innerHTML = this.state.employeeList.map(emp => `<tr><td><a href="#" class="link-primary view-profile" data-employee-id="${emp.id}">${emp.fullName || 'Nome não definido'}</a></td><td>${emp.email || '-'}</td><td>${emp.role || '-'}</td><td><span class="badge bg-${emp.isActive ? 'success' : 'secondary'}">${emp.isActive ? 'Ativo' : 'Inativo'}</span></td><td>${parseFloat(emp.hourBalance || 0).toLocaleString('pt-BR', { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 })}h</td><td><div class="btn-group btn-group-sm" role="group"><button type="button" class="btn btn-outline-secondary view-profile" title="Ver Perfil" data-employee-id="${emp.id}"><i class="fas fa-eye"></i></button><button type="button" class="btn btn-outline-primary edit-employee" title="Editar" data-bs-toggle="modal" data-bs-target="#employeeFormModal" data-employee-id="${emp.id}"><i class="fas fa-edit"></i></button><button type="button" class="btn ${emp.isActive ? 'btn-outline-danger' : 'btn-outline-success'} toggle-status" title="${emp.isActive ? 'Desativar' : 'Ativar'}" data-employee-id="${emp.id}" data-current-status="${emp.isActive}"><i class="fas fa-power-off"></i></button></div></td></tr>`).join('');
    // Adiciona listeners dinamicamente APÓS renderizar a tabela
    console.log("[AdminTable] Attaching listeners to admin table buttons...");
    this.ui.employeeListTableBody.querySelectorAll('.view-profile').forEach(btn => { btn.addEventListener('click', (e) => { e.preventDefault(); this.showProfileModal(parseInt(e.currentTarget.dataset.employeeId, 10)); }); });
    this.ui.employeeListTableBody.querySelectorAll('.toggle-status').forEach(btn => { btn.addEventListener('click', async (e) => { const button = e.currentTarget; const employeeId = parseInt(button.dataset.employeeId, 10); const currentStatus = button.dataset.currentStatus === 'true'; const newStatus = !currentStatus; const actionText = newStatus ? 'ativar' : 'desativar'; if (!confirm(`Tem certeza que deseja ${actionText} ${this.state.employeeList.find(em => em.id === employeeId)?.fullName || 'este funcionário'}?`)) return; try { const response = await this.fetchWithAuth(`/api/employees/${employeeId}/status`, { method: 'PATCH', body: JSON.stringify({ isActive: newStatus }) }); if (!response) return; const result = await response.json(); if (!response.ok || !result.success) throw new Error(result.message || `Erro ${response.status}`); this.showAlert('success', `Funcionário ${actionText}do.`); this.loadAndDisplayAdminEmployeeList(); } catch (error) { if (error.message !== 'Não autorizado') this.showAlert('danger', `Erro ao ${actionText}: ${error.message}`); } }); });
  }

  prepareEmployeeForm(employeeId = null) {
    if (!this.ui.employeeForm || !this.ui.employeeFormModalLabel || !this.ui.btnSaveChangesEmployee || !this.ui.passwordFieldContainer || !this.ui.employeePassword || !this.ui.passwordHelp || !this.ui.employeeEmail || !this.ui.employeeFormError) { console.error("Elementos do formulário de funcionário não encontrados para preparar."); return; }
    this.ui.employeeForm.reset(); this.ui.employeeForm.classList.remove('was-validated'); this.ui.employeeFormError.style.display = 'none'; this.ui.employeeId.value = employeeId || '';
    if (employeeId) {
      this.ui.employeeFormModalLabel.textContent = "Editar Funcionário"; this.ui.btnSaveChangesEmployee.textContent = "Salvar Alterações"; this.ui.passwordFieldContainer.style.display = 'block'; this.ui.employeePassword.required = false; this.ui.passwordHelp.textContent = 'Deixe em branco para não alterar a senha.'; this.ui.employeeEmail.disabled = true; const employee = this.state.employeeList.find(emp => emp.id === employeeId); if (employee) { this.ui.employeeFullName.value = employee.fullName || ''; this.ui.employeeEmail.value = employee.email || ''; this.ui.employeeRole.value = employee.role || 'employee'; this.ui.employeeWeeklyHours.value = employee.weeklyHours || ''; this.ui.employeeBirthDate.value = this.formatDateISO(employee.birthDate); this.ui.employeeHireDate.value = this.formatDateISO(employee.hireDate); this.ui.employeePhotoUrl.value = employee.photoUrl || ''; } else { console.error("Funcionário para edição não encontrado no cache local."); this.ui.employeeFormError.textContent = 'Erro: Funcionário não encontrado para edição.'; this.ui.employeeFormError.style.display = 'block'; }
    } else { this.ui.employeeFormModalLabel.textContent = "Cadastrar Novo Funcionário"; this.ui.btnSaveChangesEmployee.textContent = "Cadastrar Funcionário"; this.ui.passwordFieldContainer.style.display = 'block'; this.ui.employeePassword.required = true; this.ui.passwordHelp.textContent = 'Obrigatório para novos funcionários (mínimo 6 caracteres).'; this.ui.employeeEmail.disabled = false; }
  }

  async handleSaveEmployeeForm() {
    if (!this._validateEmployeeForm()) { if (this.ui.employeeFormError) { this.ui.employeeFormError.textContent = 'Por favor, corrija os campos inválidos.'; this.ui.employeeFormError.style.display = 'block'; } return; }
    if (this.ui.employeeFormError) this.ui.employeeFormError.style.display = 'none'; const employeeId = this.ui.employeeId.value; const isEditing = !!employeeId; const formData = new FormData(this.ui.employeeForm); const data = Object.fromEntries(formData.entries()); if (isEditing && !data.password) { delete data.password; } if (!data.birthDate) { delete data.birthDate; } else { data.birthDate = this.formatDateISO(new Date(data.birthDate + 'T00:00:00')); } // Garante formato YYYY-MM-DD
    if (!data.hireDate) { delete data.hireDate; } else { data.hireDate = this.formatDateISO(new Date(data.hireDate + 'T00:00:00')); } // Garante formato YYYY-MM-DD
    if (!data.photoUrl) delete data.photoUrl; const url = isEditing ? `/api/employees/${employeeId}` : '/api/employees'; const method = isEditing ? 'PUT' : 'POST'; console.log(`Salvando funcionário (${method}):`, data); if (!this.ui.btnSaveChangesEmployee) { console.error("Botão Salvar não encontrado."); return; } this.ui.btnSaveChangesEmployee.disabled = true; this.ui.btnSaveChangesEmployee.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Salvando...';
    try {
      if (isEditing) delete data.email; delete data.id; const response = await this.fetchWithAuth(url, { method: method, body: JSON.stringify(data) }); if (!response) return; const result = await response.json(); if (!response.ok || !result.success) { const fieldError = result.error?.field ? ` (Campo: ${result.error.field})` : ''; throw new Error((result.message || `Erro ${response.status}`) + fieldError); } this.showAlert('success', `Funcionário ${isEditing ? 'atualizado' : 'cadastrado'} com sucesso!`); if (this.ui.employeeFormModal) this.ui.employeeFormModal.hide(); else console.warn("employeeFormModal instance not available to hide."); if (this.state.currentView === 'admin') { this.loadAndDisplayAdminEmployeeList(); } // Recarrega a lista admin se estiver nela
    } catch (error) {
      if (error.message !== 'Não autorizado') { console.error("Erro ao salvar funcionário:", error); if (this.ui.employeeFormError) { this.ui.employeeFormError.textContent = `Erro: ${error.message}`; this.ui.employeeFormError.style.display = 'block'; } }
    } finally { if (this.ui.btnSaveChangesEmployee) { this.ui.btnSaveChangesEmployee.disabled = false; this.ui.btnSaveChangesEmployee.innerHTML = isEditing ? 'Salvar Alterações' : 'Cadastrar Funcionário'; } }
  }

  _validateEmployeeForm() {
    const form = this.ui.employeeForm; if (!form) return false; form.classList.add('was-validated'); let isValid = form.checkValidity();
    if (!this.ui.employeeId?.value && !this.ui.employeePassword?.value) { if (this.ui.employeePassword) { this.ui.employeePassword.classList.add('is-invalid'); this.ui.employeePassword.setCustomValidity("Senha é obrigatória para novo funcionário."); } isValid = false; }
    else { if (this.ui.employeePassword) { this.ui.employeePassword.setCustomValidity(""); if (!this.ui.employeeId?.value && this.ui.employeePassword.value && !this.ui.employeePassword.checkValidity()) { isValid = false; } else if (this.ui.employeeId?.value && this.ui.employeePassword.value && !this.ui.employeePassword.checkValidity()) { isValid = false; } else { if (this.ui.employeePassword.value === '' || this.ui.employeePassword.checkValidity()) { this.ui.employeePassword.classList.remove('is-invalid'); } } } } return isValid;
  }

  async fetchWithAuth(url, options = {}) {
    console.log(`fetchWithAuth: ${options.method || 'GET'} ${url}`); const headers = { 'Content-Type': 'application/json', ...options.headers }; if (this.state.token) { headers['Authorization'] = `Bearer ${this.state.token}`; } else { console.warn("fetchWithAuth chamado sem token."); }
    try { const response = await fetch(url, { ...options, headers }); if (response.status === 401) { console.error("fetchWithAuth: Erro 401 - Não autorizado. Deslogando..."); this.showAlert('danger', 'Sessão inválida ou expirada. Faça login novamente.'); this.handleLogout(); return Promise.reject(new Error('Não autorizado')); } return response; } catch (networkError) { console.error(`fetchWithAuth: Erro de rede ou fetch para ${url}:`, networkError); this.showAlert('danger', `Erro de conexão ao tentar acessar a API. Verifique sua rede.`); return Promise.reject(networkError); }
  }
  showAlert(type, message) {
    if (!this.ui.alertPlaceholder) { console.error("Placeholder de alerta não encontrado."); return; } const wrapper = document.createElement('div'); const alertId = `alert-${Date.now()}`; wrapper.innerHTML = `<div id="${alertId}" class="alert alert-${type} alert-dismissible fade show" role="alert">${message}<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button></div>`; this.ui.alertPlaceholder.append(wrapper); const alertElement = document.getElementById(alertId); if (alertElement && typeof bootstrap !== 'undefined' && bootstrap.Alert) { const bsAlert = bootstrap.Alert.getOrCreateInstance(alertElement); const timeoutId = setTimeout(() => { if (document.getElementById(alertId)) { bsAlert.close(); } }, 5000); alertElement.addEventListener('closed.bs.alert', () => { clearTimeout(timeoutId); wrapper.remove(); }, { once: true }); } else { console.error("Não foi possível encontrar o elemento do alerta ou bootstrap.Alert para auto-fechamento."); setTimeout(() => wrapper.remove(), 5500); }
  }
  formatTime(timestamp) {
    if (!timestamp) return '--:--'; try { const date = new Date(timestamp); if (isNaN(date.getTime())) return 'Inválido'; return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false }); } catch (e) { console.error("Erro ao formatar data:", timestamp, e); return 'Erro'; }
  }
  getTipoNome(tipo) {
    const nomes = { 'check-in': 'Entrada', 'lunch-start': 'Saída Almoço', 'lunch-end': 'Retorno Almoço', 'check-out': 'Saída' }; return nomes[tipo] || tipo;
  }
  formatDateISO(date) {
    if (!date) return ''; try {
      // Se já for string no formato YYYY-MM-DD, retorna
      if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return date;
      }
      // Se for objeto Date, formata
      if (date instanceof Date) {
        return date.toISOString().split('T')[0];
      }
      // Tenta converter se for string em outro formato (pode falhar)
      const d = new Date(date);
      if (isNaN(d.getTime())) return ''; // Retorna vazio se inválido
      return d.toISOString().split('T')[0];
    } catch { return ''; }
  }
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
      window.pontoApp._init();
    } else {
      console.error("Falha ao criar instância de PontoApp ou método _init não encontrado.");
    }
  }
});