// src/views/script.js
/**
 * Sistema de Controle de Ponto v1.3.10
 * Abre modais programaticamente via JS e corrige listeners.
 */

class PontoApp {
  constructor() {
    // Apenas cacheia referências DOM aqui. Instâncias e estado vêm depois.
    this._cacheDOMElements();
    // _init() será chamado após verificação do Bootstrap no DOMContentLoaded
  }

  // Cacheia elementos DOM principais que sempre existem
  _cacheDOMElements() {
    console.log("[CacheDOM v1.3.10] Caching DOM Elements...");
    this.ui = {
      // Referências aos elementos dos Modais (para criar instância depois)
      loginModalElement: document.getElementById('loginModal'),
      employeeFormModalElement: document.getElementById('employeeFormModal'),
      profileModalElement: document.getElementById('profileModal'),
      // Instâncias Modal (inicializadas como null)
      loginModal: null, employeeFormModal: null, profileModal: null,
      // Navbar & Áreas principais
      authArea: document.getElementById('authArea'),
      navLinksOffcanvas: document.getElementById('navLinksOffcanvas'), // Assumindo Offcanvas
      navAdminLinksOffcanvas: document.getElementById('navAdminLinksOffcanvas'),
      navAdminSeparatorOffcanvas: document.getElementById('navAdminSeparatorOffcanvas'),
      navLogoutOffcanvas: document.getElementById('navLogoutOffcanvas'),
      mainOffcanvasElement: document.getElementById('mainOffcanvas'), // Elemento Offcanvas
      mainOffcanvas: null, // Instância Offcanvas
      dashboardArea: document.getElementById('dashboardArea'),
      adminArea: document.getElementById('adminArea'),
      loginPrompt: document.getElementById('loginPrompt'),
      alertPlaceholder: document.getElementById('alertPlaceholder'),
      // Botões que abrem modais (precisam de listeners)
      btnLoginTrigger: document.getElementById('btnLoginTrigger'), // Navbar
      btnLoginPromptTrigger: document.getElementById('btnLoginPromptTrigger'), // Prompt
      btnNovoFuncAdminArea: document.getElementById('btnNovoFuncAdminArea'), // Área Admin
      // Dashboard (IDs Mobile)
      employeeSelectMobile: $('#employeeSelectMobile'), // jQuery
      employeeSelectContainerMobile: document.getElementById('employeeSelectContainerMobile'),
      actionUserName: document.getElementById('actionUserName'),
      btnEntradaMobile: document.getElementById('btnEntradaMobile'),
      btnSaidaAlmocoMobile: document.getElementById('btnSaidaAlmocoMobile'),
      btnRetornoAlmocoMobile: document.getElementById('btnRetornoAlmocoMobile'),
      btnSaidaMobile: document.getElementById('btnSaidaMobile'),
      statusDateMobile: document.getElementById('statusDateMobile'),
      statusPlaceholderMobile: document.getElementById('statusPlaceholderMobile'),
      statusDetailsMobile: document.getElementById('statusDetailsMobile'),
      statusEntradaMobile: document.getElementById('statusEntradaMobile'),
      statusSaidaAlmocoMobile: document.getElementById('statusSaidaAlmocoMobile'),
      statusRetornoAlmocoMobile: document.getElementById('statusRetornoAlmocoMobile'),
      statusSaidaMobile: document.getElementById('statusSaidaMobile'),
      statusTotalHorasMobile: document.getElementById('statusTotalHorasMobile'),
      summaryLoadingMobile: document.getElementById('summaryLoadingMobile'),
      summaryContentMobile: document.getElementById('summaryContent'), // Confere ID HTML
      summaryBalanceMobile: document.getElementById('summaryBalanceMobile'),
      linkMeuPerfilRapido: document.getElementById('linkMeuPerfilRapido'),
      // Admin: Tabela
      employeeListTableBody: document.getElementById('employeeListTableBody'),
      // Referências a elementos DENTRO dos modais são buscadas quando necessário
    };
    console.log("[CacheDOM] Main DOM Elements cached.");
  }

  // Inicializa estado e componentes (como Offcanvas) que precisam existir cedo
  _initializeComponents() {
    console.log("[InitComp] Initializing state and non-modal components...");
    // Cria instância do Offcanvas se existir
    if (this.ui.mainOffcanvasElement && typeof bootstrap !== 'undefined' && bootstrap.Offcanvas) {
      this.ui.mainOffcanvas = new bootstrap.Offcanvas(this.ui.mainOffcanvasElement);
    } else { console.warn("[InitComp] Offcanvas element or Bootstrap Offcanvas component not found.") }
    // Cria instâncias de Modal aqui também, APÓS verificação Bootstrap
    const canInitModals = typeof bootstrap !== 'undefined' && bootstrap.Modal;
    if (!canInitModals) { console.error("FATAL: Bootstrap Modal component not found."); }
    if (this.ui.loginModalElement && canInitModals) { this.ui.loginModal = new bootstrap.Modal(this.ui.loginModalElement); }
    else { console.warn("[InitComp] Login Modal instance could not be created."); }
    if (this.ui.employeeFormModalElement && canInitModals) { this.ui.employeeFormModal = new bootstrap.Modal(this.ui.employeeFormModalElement); }
    else { console.warn("[InitComp] Employee Form Modal instance could not be created."); }
    if (this.ui.profileModalElement && canInitModals) { this.ui.profileModal = new bootstrap.Modal(this.ui.profileModalElement); }
    else { console.warn("[InitComp] Profile Modal instance could not be created."); }

    // Reseta estado
    this.state = { token: localStorage.getItem('authToken') || null, currentUser: JSON.parse(localStorage.getItem('currentUser')) || null, selectedEmployeeId: null, viewingEmployeeId: null, todayRecord: null, employeeList: [], currentView: 'login' };
    console.log("[InitComp] State and non-modal components initialized.");
  }

  // Método chamado após a instância ser criada e o Bootstrap verificado
  _init() {
    console.log("PontoApp v1.3.10 _init called...");
    this._initializeComponents(); // Inicializa estado, Offcanvas e Modais
    this._setupStaticEventListeners(); // Configura listeners estáticos (fora dos modais)
    this._initSelect2();
    this._updateView(); // Define visão inicial e adiciona listeners dinâmicos (navbar)
    this._setupAllModalEventListeners(); // Configura listeners internos dos modais uma vez
  }

  // Listeners para elementos estáticos fora dos modais
  _setupStaticEventListeners() {
    console.log("[Listeners] Setting up static event listeners...");
    // --- Login Triggers ---
    if (this.ui.btnLoginPromptTrigger) {
      this.ui.btnLoginPromptTrigger.addEventListener('click', () => {
        console.log("[Listeners] Botão Login (Prompt) clicado.");
        const modal = this.ui.loginModal || this._ensureModalInstance('loginModal'); // Usa _ensure (REMOVIDO, INSTÂNCIA CRIADA NO INITCOMP)
        if (this.ui.loginModal) this.ui.loginModal.show(); else { console.error("Login modal instance not ready."); this.showAlert('danger', 'Erro ao abrir login.'); }
      });
    } else { console.error("[Listeners] Static Error: btnLoginPromptTrigger not found."); }

    // --- Botões de Ponto ---
    if (this.ui.btnEntradaMobile) this.ui.btnEntradaMobile.addEventListener('click', () => this.registrarPonto('check-in')); else console.error("[Listeners] Static Error: btnEntradaMobile not found");
    if (this.ui.btnSaidaAlmocoMobile) this.ui.btnSaidaAlmocoMobile.addEventListener('click', () => this.registrarPonto('lunch-start')); else console.error("[Listeners] Static Error: btnSaidaAlmocoMobile not found");
    if (this.ui.btnRetornoAlmocoMobile) this.ui.btnRetornoAlmocoMobile.addEventListener('click', () => this.registrarPonto('lunch-end')); else console.error("[Listeners] Static Error: btnRetornoAlmocoMobile not found");
    if (this.ui.btnSaidaMobile) this.ui.btnSaidaMobile.addEventListener('click', () => this.registrarPonto('check-out')); else console.error("[Listeners] Static Error: btnSaidaMobile not found");
    // --- Select2 Admin ---
    if (this.ui.employeeSelectMobile?.length > 0) { this.ui.employeeSelectMobile.on('change', (e) => { const sv = $(e.target).val(); this.state.selectedEmployeeId = sv ? parseInt(sv, 10) : this.state.currentUser?.id; this.handleEmployeeSelectionChange(); }); } else { console.error("[Listeners] Static Error: employeeSelectMobile not found.") }
    // --- Botão Ver Perfil Rápido ---
    if (this.ui.linkMeuPerfilRapido) { this.ui.linkMeuPerfilRapido.addEventListener('click', (e) => { e.preventDefault(); const tid = this.state.currentUser?.id; console.log("[Listeners] Link 'Meu Perfil Rápido' clicado. Target ID:", tid); if (tid) { this.showProfileModal(tid); } else { this.showAlert('info', 'Faça login.'); } }); } else { console.error("[Listeners] Static Error: linkMeuPerfilRapido not found"); }
    // --- Listener para o EVENTO 'show' do modal de formulário ---
    if (this.ui.employeeFormModalElement) { this.ui.employeeFormModalElement.addEventListener('show.bs.modal', (e) => { const btn = e.relatedTarget; const empId = btn?.dataset.employeeId; this.prepareEmployeeForm(empId ? parseInt(empId, 10) : null); }); } else { console.error("[Listeners] Static Error: employeeFormModalElement not found."); }
    // --- Botão Novo Funcionário (Área Admin) ---
    if (this.ui.btnNovoFuncAdminArea) {
      this.ui.btnNovoFuncAdminArea.addEventListener('click', () => {
        console.log("[Listeners] Botão Novo Func (Admin Area) clicado.");
        this.prepareEmployeeForm(null); // Prepara o form para cadastro
        if (this.ui.employeeFormModal) this.ui.employeeFormModal.show(); else { console.error("Employee form modal instance not ready."); this.showAlert('danger', 'Erro ao abrir formulário.'); }
      });
    } else { console.error("[Listeners] Static Error: btnNovoFuncAdminArea not found."); }

    console.log("[Listeners] Static event listeners set up completed.");
  }

  // Configura listeners para elementos DENTRO de todos os modais (chamado uma vez no _init)
  _setupAllModalEventListeners() {
    console.log("[Listeners] Setting up ALL modal event listeners...");
    // --- Login Modal Listeners ---
    const loginModalElement = this.ui.loginModalElement;
    if (loginModalElement) {
      const loginForm = loginModalElement.querySelector('#loginForm');
      const btnSubmit = loginModalElement.querySelector('#btnLoginSubmit');
      const loginError = loginModalElement.querySelector('#loginError'); // Guarda ref
      if (loginForm && !loginForm.listenerAttached) { loginForm.addEventListener('submit', (e) => { e.preventDefault(); this.handleLogin(); }); loginForm.listenerAttached = true; console.log("[Listeners] Submit listener attached to loginForm."); }
      else if (!loginForm) { console.error("[Listeners] loginForm not found inside modal."); }
      if (btnSubmit && !btnSubmit.listenerAttached) { btnSubmit.addEventListener('click', () => this.handleLogin()); btnSubmit.listenerAttached = true; console.log("[Listeners] Click listener attached to btnLoginSubmit."); }
      else if (!btnSubmit) { console.error("[Listeners] btnLoginSubmit not found inside modal."); }
      loginModalElement.addEventListener('hidden.bs.modal', () => { if (loginError) loginError.style.display = 'none'; loginForm?.reset(); });
    } else { console.error("[Listeners] loginModalElement not found for modal listeners."); }
    // --- Employee Form Modal Listeners ---
    const employeeModalElement = this.ui.employeeFormModalElement;
    if (employeeModalElement) {
      const employeeForm = employeeModalElement.querySelector('#employeeForm');
      const btnSave = employeeModalElement.querySelector('#btnSaveChangesEmployee');
      const formError = employeeModalElement.querySelector('#employeeFormError');
      if (employeeForm && !employeeForm.listenerAttached) { employeeForm.addEventListener('submit', (e) => { e.preventDefault(); this.handleSaveEmployeeForm(); }); employeeForm.listenerAttached = true; console.log("[Listeners] Submit listener attached to employeeForm."); }
      else if (!employeeForm) { console.error("[Listeners] employeeForm not found inside modal."); }
      if (btnSave && !btnSave.listenerAttached) { btnSave.addEventListener('click', () => this.handleSaveEmployeeForm()); btnSave.listenerAttached = true; console.log("[Listeners] Click listener attached to btnSaveChangesEmployee."); }
      else if (!btnSave) { console.error("[Listeners] btnSaveChangesEmployee not found inside modal."); }
      employeeModalElement.querySelectorAll('input, select').forEach(input => { if (!input.listenerAttached) { input.addEventListener('input', () => { if (employeeForm?.classList.contains('was-validated')) { this._validateEmployeeForm(); } }); input.listenerAttached = true; } });
      employeeModalElement.addEventListener('hidden.bs.modal', () => { employeeForm?.reset(); employeeForm?.classList.remove('was-validated'); if (formError) formError.style.display = 'none'; });
    } else { console.error("[Listeners] employeeFormModalElement not found for modal listeners."); }
    // --- Profile Modal Listeners ---
    const profileModalElement = this.ui.profileModalElement;
    if (profileModalElement) {
      const btnEdit = profileModalElement.querySelector('#btnEditProfile');
      const btnToggle = profileModalElement.querySelector('#btnToggleActiveStatus');
      if (btnEdit && !btnEdit.listenerAttached) { btnEdit.addEventListener('click', () => this.editProfileFromModal()); btnEdit.listenerAttached = true; console.log("[Listeners] Click listener attached to btnEditProfile."); }
      else if (!btnEdit) { console.error("[Listeners] btnEditProfile not found inside modal."); }
      if (btnToggle && !btnToggle.listenerAttached) { btnToggle.addEventListener('click', () => this.toggleActiveStatusFromModal()); btnToggle.listenerAttached = true; console.log("[Listeners] Click listener attached to btnToggleActiveStatus."); }
      else if (!btnToggle) { console.error("[Listeners] btnToggleActiveStatus not found inside modal."); }
    } else { console.error("[Listeners] profileModalElement not found for modal listeners."); }
    console.log("[Listeners] All modal event listeners set up.");
  }

  // Adiciona listeners para elementos que são criados/exibidos dinamicamente NA NAVBAR/OFFCANVAS
  _setupDynamicEventListeners() {
    console.log("[Listeners] Setting up dynamic event listeners for Offcanvas/Navbar...");
    const btnLogout = document.getElementById('btnLogoutOffcanvas');
    if (btnLogout) { if (!btnLogout.onclick) { btnLogout.onclick = (e) => { e.preventDefault(); this.ui.mainOffcanvas?.hide(); this.handleLogout(); }; console.log("[Listeners] Dynamic Listener: Logout (Offcanvas) attached."); } }
    else { if (this.state.currentUser) console.warn("[Listeners] Dynamic Warning: btnLogoutOffcanvas not found."); }
    const linkMeuPerfil = document.getElementById('linkMeuPerfilOffcanvas');
    if (linkMeuPerfil) { if (!linkMeuPerfil.onclick) { linkMeuPerfil.onclick = (e) => { e.preventDefault(); this.ui.mainOffcanvas?.hide(); if (this.state.currentUser?.id) { this.showProfileModal(this.state.currentUser.id); } else { this.showAlert('danger', 'Erro: Usuário não logado.'); } }; console.log("[Listeners] Dynamic Listener: Meu Perfil (Offcanvas) attached."); } }
    else { if (this.ui.navLinksOffcanvas?.style.display !== 'none') console.warn("[Listeners] Dynamic Warning: linkMeuPerfilOffcanvas not found."); }
    const linkGerenciar = document.getElementById('linkGerenciarFuncionariosOffcanvas');
    if (linkGerenciar) { if (!linkGerenciar.onclick) { linkGerenciar.onclick = (e) => { e.preventDefault(); this.ui.mainOffcanvas?.hide(); this.setView('admin'); }; console.log("[Listeners] Dynamic Listener: Gerenciar (Offcanvas) attached."); } }
    else { if (this.ui.navAdminLinksOffcanvas?.style.display !== 'none') console.warn("[Listeners] Dynamic Warning: linkGerenciarFuncionariosOffcanvas not found."); }
    // Link Novo Funcionário (Offcanvas)
    const linkNovoFunc = document.getElementById('linkNovoFuncionarioOffcanvas');
    if (linkNovoFunc) {
      if (!linkNovoFunc.onclick) {
        linkNovoFunc.onclick = (e) => { e.preventDefault(); console.log("[Listeners] Link Novo Funcionário (Offcanvas) clicado."); if (this.ui.mainOffcanvas) this.ui.mainOffcanvas.hide(); this.prepareEmployeeForm(null); const modal = this.ui.employeeFormModal || this._ensureModalInstance('employeeFormModal'); if (modal) modal.show(); else this.showAlert('danger', 'Erro ao abrir formulário.'); };
        console.log("[Listeners] Dynamic Listener: Novo Funcionário (Offcanvas) attached.");
      }
    } else { if (this.ui.navAdminLinksOffcanvas?.style.display !== 'none') console.warn("[Listeners] Dynamic Warning: linkNovoFuncionarioOffcanvas not found."); }
    // Botão de Login na Navbar (quando deslogado)
    if (!this.state.token) {
      const btnLoginTriggerNavbar = document.getElementById('btnLoginTrigger');
      if (btnLoginTriggerNavbar) {
        if (!btnLoginTriggerNavbar.onclick) {
          btnLoginTriggerNavbar.onclick = () => { console.log("[Listeners] Botão Login (Navbar) clicado."); const modal = this.ui.loginModal || this._ensureModalInstance('loginModal'); if (modal) modal.show(); else this.showAlert('danger', 'Erro ao abrir login.'); };
          console.log("[Listeners] Dynamic Listener: Login (Navbar) attached.");
        }
      } else { console.warn("[Listeners] Dynamic Warning: btnLoginTrigger (Navbar) not found."); }
    }
    console.log("[Listeners] Dynamic event listeners for Navbar/Offcanvas set up completed.");
  }

  // ================ MÉTODOS RESTANTES (PRESERVADOS) ================
  _initSelect2() { const targetSelect = this.ui.employeeSelectMobile; if (targetSelect && targetSelect.length > 0 && typeof $.fn.select2 === 'function') { try { targetSelect.select2({ placeholder: "Visualizar outro...", allowClear: true, width: '100%', dropdownParent: targetSelect.parent() }); targetSelect.prop('disabled', true); console.log("Select2 initialized for mobile."); } catch (error) { console.error("Erro ao inicializar Select2:", error); this.showAlert('warning', 'Erro seletor func.') } } else if (!(typeof $.fn.select2 === 'function')) { console.error("Select2 function not available."); } else { console.error("Select2 element (mobile) not found."); } }
  setView(viewName) { console.log(`Setting view to: ${viewName}`); this.state.currentView = viewName; if (this.ui.loginPrompt) this.ui.loginPrompt.style.display = viewName === 'login' ? 'block' : 'none'; if (this.ui.dashboardArea) this.ui.dashboardArea.style.display = viewName === 'dashboard' ? 'block' : 'none'; if (this.ui.adminArea) this.ui.adminArea.style.display = viewName === 'admin' ? 'block' : 'none'; if (viewName === 'admin') { this.loadAndDisplayAdminEmployeeList(); } else if (viewName === 'dashboard') { this.fetchAndUpdateDashboard(); } this._updateNavLinks(); }
  _updateView() { console.log("Updating view based on auth state..."); if (this.state.token && this.state.currentUser) { if (this.ui.navLinksOffcanvas) this.ui.navLinksOffcanvas.style.display = 'block'; else console.error("navLinksOffcanvas missing"); if (this.ui.navLogoutOffcanvas) this.ui.navLogoutOffcanvas.style.display = 'block'; else console.error("navLogoutOffcanvas missing"); if (this.ui.authArea) { this.ui.authArea.innerHTML = `<span class="navbar-text me-3 small text-white-50">Olá, ${this.state.currentUser.fullName.split(' ')[0]}</span>`; } else { console.error("authArea missing"); } if (this.state.currentUser.role === 'admin') { if (this.ui.navAdminLinksOffcanvas) this.ui.navAdminLinksOffcanvas.style.display = 'block'; else console.error("navAdminLinksOffcanvas missing"); if (this.ui.navAdminSeparatorOffcanvas) this.ui.navAdminSeparatorOffcanvas.style.display = 'block'; else console.error("navAdminSeparatorOffcanvas missing"); if (this.ui.employeeSelectContainerMobile) this.ui.employeeSelectContainerMobile.style.display = 'block'; if (this.ui.employeeSelectMobile?.length > 0) this.ui.employeeSelectMobile.prop('disabled', false); this.setView(this.state.currentView !== 'login' ? this.state.currentView : 'dashboard'); } else { if (this.ui.navAdminLinksOffcanvas) this.ui.navAdminLinksOffcanvas.style.display = 'none'; if (this.ui.navAdminSeparatorOffcanvas) this.ui.navAdminSeparatorOffcanvas.style.display = 'none'; if (this.ui.employeeSelectContainerMobile) this.ui.employeeSelectContainerMobile.style.display = 'none'; if (this.ui.employeeSelectMobile?.length > 0) this.ui.employeeSelectMobile.prop('disabled', true); this.setView('dashboard'); } setTimeout(() => this._setupDynamicEventListeners(), 0); } else { if (this.ui.navLinksOffcanvas) this.ui.navLinksOffcanvas.style.display = 'none'; if (this.ui.navAdminLinksOffcanvas) this.ui.navAdminLinksOffcanvas.style.display = 'none'; if (this.ui.navAdminSeparatorOffcanvas) this.ui.navAdminSeparatorOffcanvas.style.display = 'none'; if (this.ui.navLogoutOffcanvas) this.ui.navLogoutOffcanvas.style.display = 'none'; if (this.ui.authArea) { this.ui.authArea.innerHTML = `<button class="btn btn-primary btn-sm" id="btnLoginTrigger">Login</button>`; } this.setView('login'); setTimeout(() => this._setupDynamicEventListeners(), 0); } console.log("View update process finished."); }
  _updateNavLinks() { document.querySelectorAll('#mainOffcanvas .nav-link').forEach(link => link.classList.remove('active')); if (this.state.currentView === 'admin') { document.getElementById('linkGerenciarFuncionariosOffcanvas')?.classList.add('active'); } }

  async handleLogin() {
    console.log("Handling login...");
    const loginModal = this.ui.loginModal || this._ensureModalInstance('loginModal'); // Garante instância
    if (!loginModal) { console.error("Login Modal not initialized."); return; }
    const loginForm = this.ui.loginModalElement?.querySelector('#loginForm');
    const btnSubmit = this.ui.loginModalElement?.querySelector('#btnLoginSubmit');
    const loginError = this.ui.loginModalElement?.querySelector('#loginError');
    if (!loginForm || !btnSubmit || !loginError) { console.error("Elementos internos do modal de login não encontrados."); return; }
    this._setupModalEventListeners('loginModal'); // Garante listeners internos
    const email = loginForm.email.value; const password = loginForm.password.value; loginError.style.display = 'none';
    if (!email || !password) { loginError.textContent = 'E-mail e senha obrigatórios.'; loginError.style.display = 'block'; return; }
    btnSubmit.disabled = true; btnSubmit.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Entrando...';
    try {
      const response = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) }); if (!response) throw new Error("Falha na requisição."); const result = await response.json(); if (!response.ok || !result.success) throw new Error(result.message || `Erro ${response.status}`);
      this.state.token = result.data.token; this.state.currentUser = result.data.user; localStorage.setItem('authToken', this.state.token); localStorage.setItem('currentUser', JSON.stringify(this.state.currentUser)); console.log("Login successful.");
      loginModal.hide(); this._updateView();
    } catch (error) { console.error("Login failed:", error); loginError.textContent = `Falha: ${error.message}`; loginError.style.display = 'block'; }
    finally { btnSubmit.disabled = false; btnSubmit.innerHTML = 'Entrar'; }
  }

  handleLogout() {
    console.log("Handling logout..."); this.state.token = null; this.state.currentUser = null; localStorage.removeItem('authToken'); localStorage.removeItem('currentUser');
    if (this.ui.employeeSelectMobile?.length > 0) { this.ui.employeeSelectMobile.val(null).trigger('change'); this.ui.employeeSelectMobile.prop('disabled', true); }
    this._updateView(); this.resetDashboardState(); console.log("Logout complete.");
  }

  resetDashboardState() {
    console.log("Resetting dashboard state (mobile)..."); this.state.selectedEmployeeId = null; this.state.todayRecord = null;
    if (this.ui.employeeSelectMobile?.length > 0) { this.ui.employeeSelectMobile.val(null).trigger('change'); }
    if (this.ui.statusPlaceholderMobile) { this.ui.statusPlaceholderMobile.textContent = 'Carregando...'; this.ui.statusPlaceholderMobile.style.display = 'block'; }
    if (this.ui.statusDetailsMobile) this.ui.statusDetailsMobile.style.display = 'none';
    if (this.ui.statusEntradaMobile) this.ui.statusEntradaMobile.textContent = '--:--'; if (this.ui.statusSaidaAlmocoMobile) this.ui.statusSaidaAlmocoMobile.textContent = '--:--'; if (this.ui.statusRetornoAlmocoMobile) this.ui.statusRetornoAlmocoMobile.textContent = '--:--'; if (this.ui.statusSaidaMobile) this.ui.statusSaidaMobile.textContent = '--:--'; if (this.ui.statusTotalHorasMobile) this.ui.statusTotalHorasMobile.textContent = '-.-- h'; if (this.ui.statusDateMobile) this.ui.statusDateMobile.textContent = '--/--';
    if (this.ui.summaryLoadingMobile) { this.ui.summaryLoadingMobile.style.display = 'block'; this.ui.summaryLoadingMobile.innerHTML = `<span class="spinner-border spinner-border-sm"></span>`; }
    if (this.ui.summaryContentMobile) this.ui.summaryContentMobile.style.display = 'none'; if (this.ui.summaryBalanceMobile) this.ui.summaryBalanceMobile.textContent = '--:--';
    this._setPointButtonsDisabled(true);
  }

  async fetchAndUpdateDashboard() {
    if (!this.state.currentUser) { console.warn("fetchAndUpdateDashboard: currentUser is null."); return; }
    console.log("Updating Dashboard..."); this.resetDashboardState(); let initialEmployeeId = this.state.currentUser.id;
    if (this.state.currentUser.role === 'admin') {
      if (this.ui.employeeSelectContainerMobile) this.ui.employeeSelectContainerMobile.style.display = 'block';
      if (this.ui.employeeSelectMobile?.length > 0) this.ui.employeeSelectMobile.prop('disabled', false);
      await this.loadEmployeeListForAdmin();
      initialEmployeeId = this.ui.employeeSelectMobile?.length > 0 ? (parseInt(this.ui.employeeSelectMobile.val(), 10) || this.state.currentUser.id) : this.state.currentUser.id;
    } else {
      if (this.ui.employeeSelectContainerMobile) this.ui.employeeSelectContainerMobile.style.display = 'none';
      if (this.ui.employeeSelectMobile?.length > 0) this.ui.employeeSelectMobile.prop('disabled', true);
      initialEmployeeId = this.state.currentUser.id;
    }
    this.state.selectedEmployeeId = initialEmployeeId;
    if (this.ui.employeeSelectMobile?.length > 0) { this.ui.employeeSelectMobile.val(this.state.selectedEmployeeId).trigger('change.select2'); }
    if (this.ui.actionUserName) { this.ui.actionUserName.textContent = `Para: ${this.state.currentUser.id === this.state.selectedEmployeeId ? 'Você' : (this.state.employeeList.find(e => e.id === this.state.selectedEmployeeId)?.fullName || 'Desconhecido')}`; }
    await this.fetchAndUpdateStatus(); await this.fetchAndUpdateSummary();
  }

  handleEmployeeSelectionChange() {
    if (!this.state.selectedEmployeeId) { this.state.selectedEmployeeId = this.state.currentUser?.id; if (this.ui.employeeSelectMobile?.length > 0) { this.ui.employeeSelectMobile.val(this.state.selectedEmployeeId).trigger('change.select2'); } }
    if (!this.state.selectedEmployeeId) { this.resetDashboardState(); return; }
    console.log("Selection changed to employeeId:", this.state.selectedEmployeeId);
    if (this.ui.actionUserName) { this.ui.actionUserName.textContent = `Para: ${this.state.currentUser.id === this.state.selectedEmployeeId ? 'Você' : (this.state.employeeList.find(e => e.id === this.state.selectedEmployeeId)?.fullName || 'Desconhecido')}`; }
    this.fetchAndUpdateStatus(); this.fetchAndUpdateSummary();
  }

  async fetchAndUpdateStatus() {
    const targetEmployeeId = this.state.selectedEmployeeId; if (!targetEmployeeId) { console.warn("fetchAndUpdateStatus: targetId missing."); if (this.ui.statusPlaceholderMobile) { /*...*/ } this.updateActionButtons(); return; }
    console.log(`Fetching status for ${targetEmployeeId}`); if (this.ui.statusPlaceholderMobile) { /*...*/ } if (this.ui.statusDetailsMobile) this.ui.statusDetailsMobile.style.display = 'none'; this._setPointButtonsDisabled(true);
    try {
      let url = ''; if (targetEmployeeId === this.state.currentUser?.id) { url = '/api/time-records/today'; } else if (this.state.currentUser?.role === 'admin') { await this.fetchHistoryAndFindToday(targetEmployeeId); this.updateStatusUI(); this.updateActionButtons(); return; } else { throw new Error("Unauthorized."); }
      const response = await this.fetchWithAuth(url); if (!response) return; const result = await response.json(); if (!response.ok) { if (response.status === 404) { this.state.todayRecord = null; } else { throw new Error(result.message || `Err ${response.status}`); } } else { this.state.todayRecord = result.data; }
      this.updateStatusUI(); this.updateActionButtons();
    } catch (error) { if (error.message !== 'Não autorizado') { console.error(`Err fetch status ${targetEmployeeId}:`, error); this.showAlert('danger', `Falha status: ${error.message}`); if (this.ui.statusPlaceholderMobile) this.ui.statusPlaceholderMobile.textContent = 'Erro status.'; } if (this.ui.statusPlaceholderMobile) this.ui.statusPlaceholderMobile.style.display = 'block'; if (this.ui.statusDetailsMobile) this.ui.statusDetailsMobile.style.display = 'none'; this.updateActionButtons(); }
  }

  async fetchHistoryAndFindToday(employeeId) {
    this.state.todayRecord = null; try { const response = await this.fetchWithAuth(`/api/time-records/employee/${employeeId}`); if (!response) return; const result = await response.json(); if (!response.ok) throw new Error(result.message || `Err ${response.status}`); const todayStr = new Date().toISOString().split('T')[0]; this.state.todayRecord = result.data?.find(r => r.startTime?.startsWith(todayStr)) || null; } catch (error) { if (error.message !== 'Não autorizado') { console.error(`Err fetch history ${employeeId}:`, error); this.showAlert('danger', `Falha histórico: ${error.message}`); } }
  }

  updateStatusUI() {
    const record = this.state.todayRecord; if (!this.ui.statusPlaceholderMobile || !this.ui.statusDetailsMobile || !this.ui.statusEntradaMobile || !this.ui.statusSaidaAlmocoMobile || !this.ui.statusRetornoAlmocoMobile || !this.ui.statusSaidaMobile || !this.ui.statusTotalHorasMobile || !this.ui.statusDateMobile) { console.error("Mobile status UI elements missing."); return; }
    if (this.ui.statusDateMobile) this.ui.statusDateMobile.textContent = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    if (!record) { this.ui.statusPlaceholderMobile.textContent = 'Nenhum registro hoje.'; this.ui.statusPlaceholderMobile.style.display = 'block'; this.ui.statusDetailsMobile.style.display = 'none'; }
    else { this.ui.statusPlaceholderMobile.style.display = 'none'; this.ui.statusDetailsMobile.style.display = 'block'; this.ui.statusEntradaMobile.textContent = this.formatTime(record.startTime); this.ui.statusSaidaAlmocoMobile.textContent = this.formatTime(record.lunchStartTime); this.ui.statusRetornoAlmocoMobile.textContent = this.formatTime(record.lunchEndTime); this.ui.statusSaidaMobile.textContent = this.formatTime(record.endTime); this.ui.statusTotalHorasMobile.textContent = record.totalHours ? `${parseFloat(record.totalHours).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} h` : '-.-- h'; }
  }

  updateActionButtons() {
    console.log("[UpdateButtons] Updating action buttons (Mobile)..."); const record = this.state.todayRecord; const canPerformActions = this.state.currentUser?.id === this.state.selectedEmployeeId; console.log(`[UpdateButtons] canPerformActions: ${canPerformActions}, todayRecord:`, record ? 'Exists' : 'null');
    if (!this.ui.btnEntradaMobile || !this.ui.btnSaidaAlmocoMobile || !this.ui.btnRetornoAlmocoMobile || !this.ui.btnSaidaMobile) { console.error("[UpdateButtons] Mobile action buttons not found."); return; }
    const btnEntradaDisabled = !canPerformActions || !!record; const btnSaidaAlmocoDisabled = !canPerformActions || !record || !!record?.lunchStartTime || !!record?.endTime; const btnRetornoAlmocoDisabled = !canPerformActions || !record || !record?.lunchStartTime || !!record?.lunchEndTime || !!record?.endTime; const btnSaidaDisabled = !canPerformActions || !record || !!record?.endTime;
    this.ui.btnEntradaMobile.disabled = btnEntradaDisabled; this.ui.btnSaidaAlmocoMobile.disabled = btnSaidaAlmocoDisabled; this.ui.btnRetornoAlmocoMobile.disabled = btnRetornoAlmocoDisabled; this.ui.btnSaidaMobile.disabled = btnSaidaDisabled;
    console.log(`[UpdateButtons] Final state (Mobile): Entrada(${!btnEntradaDisabled}), SaidaAlmoco(${!btnSaidaAlmocoDisabled}), RetornoAlmoco(${!btnRetornoAlmocoDisabled}), Saida(${!btnSaidaDisabled})`);
  }

  async registrarPonto(tipoAcao) {
    if (this.state.selectedEmployeeId !== this.state.currentUser?.id) { this.showAlert('warning', 'Você só pode registrar seu próprio ponto.'); return; }
    console.log(`Registrando ${tipoAcao} para ${this.state.currentUser.id}`); let url = ''; const options = { method: 'POST' };
    switch (tipoAcao) { case 'check-in': url = '/api/time-records/check-in'; break; case 'lunch-start': url = '/api/time-records/lunch-start'; break; case 'lunch-end': url = '/api/time-records/lunch-end'; break; case 'check-out': url = '/api/time-records/check-out'; break; default: this.showAlert('danger', 'Ação desconhecida.'); return; }
    this._setPointButtonsDisabled(true);
    try { const response = await this.fetchWithAuth(url, options); if (!response) return; const result = await response.json(); if (!response.ok || !result.success) throw new Error(result.message || `Erro ${response.status}`); this.showAlert('success', `${this.getTipoNome(tipoAcao)} registrado!`); await this.fetchAndUpdateStatus(); }
    catch (error) { if (error.message !== 'Não autorizado') { console.error(`Erro ${tipoAcao}:`, error); this.showAlert('danger', `Falha ${tipoAcao}: ${error.message}`); } await this.fetchAndUpdateStatus(); }
  }

  _setPointButtonsDisabled(isDisabled) {
    if (this.ui.btnEntradaMobile) this.ui.btnEntradaMobile.disabled = isDisabled; if (this.ui.btnSaidaAlmocoMobile) this.ui.btnSaidaAlmocoMobile.disabled = isDisabled; if (this.ui.btnRetornoAlmocoMobile) this.ui.btnRetornoAlmocoMobile.disabled = isDisabled; if (this.ui.btnSaidaMobile) this.ui.btnSaidaMobile.disabled = isDisabled;
  }

  async fetchAndUpdateSummary() {
    if (!this.state.selectedEmployeeId) { console.warn("fetchAndUpdateSummary: selectedId missing."); if (this.ui.summaryLoadingMobile) this.ui.summaryLoadingMobile.innerHTML = `<span class="text-warning">Selecione.</span>`; return; }
    if (!this.ui.summaryLoadingMobile || !this.ui.summaryContentMobile || !this.ui.summaryBalanceMobile) { console.error("Mobile summary UI elements missing."); return; }
    console.log(`Fetching summary for ${this.state.selectedEmployeeId}`); this.ui.summaryLoadingMobile.style.display = 'block'; this.ui.summaryContentMobile.style.display = 'none';
    try {
      const url = (this.state.selectedEmployeeId === this.state.currentUser?.id) ? '/api/employees/me' : `/api/employees/${this.state.selectedEmployeeId}`; const response = await this.fetchWithAuth(url); if (!response) return; const result = await response.json(); if (!response.ok || !result.success) throw new Error(result.message || `Erro ${response.status}`); const employeeData = result.data; if (!employeeData) throw new Error("No employee data received."); const balance = parseFloat(employeeData.hourBalance || 0); const formattedBalance = balance.toLocaleString('pt-BR', { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 }); let balanceText = formattedBalance + "h"; let balanceClass = 'balance-zero'; if (balance > 0.01) { balanceText = "+" + balanceText; balanceClass = 'balance-positive'; } else if (balance < -0.01) { balanceClass = 'balance-negative'; } this.ui.summaryBalanceMobile.textContent = balanceText; this.ui.summaryBalanceMobile.className = `fw-bold ${balanceClass}`; this.ui.summaryLoadingMobile.style.display = 'none'; this.ui.summaryContentMobile.style.display = 'block';
    } catch (error) { if (error.message !== 'Não autorizado') { console.error("Error fetching summary:", error); if (this.ui.summaryLoadingMobile) { this.ui.summaryLoadingMobile.innerHTML = `<span class="text-danger small">Erro saldo</span>`; this.ui.summaryLoadingMobile.style.display = 'block'; } if (this.ui.summaryContentMobile) this.ui.summaryContentMobile.style.display = 'none'; } }
  }

  async showProfileModal(employeeId) {
    console.log(`[ProfileModal] Attempting show for ID: ${employeeId}`); if (!employeeId) { console.warn("showProfileModal: employeeId is missing."); return; }
    const profileModalInstance = this.ui.profileModal || this._ensureModalInstance('profileModal'); // Garante/Cria instância
    if (!profileModalInstance) { console.error("Profile Modal could not be initialized."); this.showAlert('danger', 'Erro perfil.'); return; }
    this.state.viewingEmployeeId = employeeId; if (this.ui.profileModalLabel) this.ui.profileModalLabel.textContent = "Carregando..."; if (this.ui.profileModalBody) this.ui.profileModalBody.innerHTML = `<div class="text-center p-5"><span class="spinner-border"></span></div>`; if (this.ui.profileAdminActions) this.ui.profileAdminActions.style.display = 'none';
    this._setupModalEventListeners('profileModal'); // Garante listeners internos
    console.log("[ProfileModal] Calling .show()"); try { profileModalInstance.show(); } catch (e) { console.error("Error calling .show():", e); this.showAlert('danger', 'Erro abrir perfil.'); return; }
    try {
      const empResponse = await this.fetchWithAuth(`/api/employees/${employeeId}`); if (!empResponse) return; const empResult = await empResponse.json(); if (!empResponse.ok || !empResult.success) throw new Error(`Erro Perfil: ${empResult.message || empResponse.statusText}`); const employee = empResult.data; if (!employee) throw new Error("Dados funcionário API vazios.");
      const endDate = new Date(); const startDate = new Date(); startDate.setDate(endDate.getDate() - 7); const histUrl = `/api/time-records/employee/${employeeId}/balance-history?startDate=${this.formatDateISO(startDate)}&endDate=${this.formatDateISO(endDate)}`; const histResponse = await this.fetchWithAuth(histUrl); let history = []; if (histResponse) { const histResult = await histResponse.json(); if (histResponse.ok && histResult.success) { history = histResult.data; } else { console.warn(`Falha histórico saldo: ${histResult?.message}`); } }
      this.renderProfileModalContent(employee, history);
    } catch (error) { if (error.message !== 'Não autorizado') { console.error("Erro carregar perfil:", error); if (this.ui.profileModalBody) { this.ui.profileModalBody.innerHTML = `<div class="alert alert-danger m-3">Erro: ${error.message}</div>`; } } }
  }

  renderProfileModalContent(employee, history) {
    if (!this.ui.profileModalLabel || !this.ui.profileModalBody || !this.ui.profileAdminActions) { console.error("Profile modal inner elements missing."); return; } this.ui.profileModalLabel.textContent = `Perfil de ${employee.fullName}`; let age = 'N/A'; if (employee.birthDate) { try { const bd = new Date(employee.birthDate); const today = new Date(); age = today.getFullYear() - bd.getFullYear(); const m = today.getMonth() - bd.getMonth(); if (m < 0 || (m === 0 && today.getDate() < bd.getDate())) { age--; } } catch { age = 'Inválida'; } } const balance = parseFloat(employee.hourBalance || 0); const fb = balance.toLocaleString('pt-BR', { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 }); let bt = fb + "h"; let bc = 'balance-zero'; if (balance > 0.01) { bt = "+" + bt; bc = 'balance-positive'; } else if (balance < -0.01) { bc = 'balance-negative'; } let historyHtml = '<p class="text-muted text-center small my-3">Nenhum registro finalizado nos últimos 7 dias.</p>'; if (history && history.length > 0) { historyHtml = `<table class="table table-sm table-striped" id="balanceHistoryTable"><thead><tr><th>Data</th><th>Trab.</th><th>Meta</th><th>Saldo</th><th></th></tr></thead><tbody>${history.map(h => `<tr><td>${new Date(h.date).toLocaleDateString('pt-BR')}</td><td>${h.workedHours}h</td><td>${h.dailyGoal}h</td><td class="${parseFloat(h.dailyBalance) > 0.01 ? 'balance-positive' : (parseFloat(h.dailyBalance) < -0.01 ? 'balance-negative' : '')}">${parseFloat(h.dailyBalance) > 0 ? '+' : ''}${h.dailyBalance}h</td><td>${this.state.currentUser?.role === 'admin' ? `<button class="btn btn-outline-danger btn-sm delete-record-btn" data-record-id="${h.id}" title="Remover"><i class="fas fa-trash-alt"></i></button>` : ''}</td></tr>`).join('')}</tbody></table>`; }
    this.ui.profileModalBody.innerHTML = `<div class="row mb-4"><div class="col-md-4 text-center"><img src="${employee.photoUrl || 'assets/default-avatar.png'}" alt="Foto" class="img-fluid profile-photo mb-2" onerror="this.onerror=null; this.src='assets/default-avatar.png';"><span class="badge bg-${employee.isActive ? 'success' : 'danger'}">${employee.isActive ? 'Ativo' : 'Inativo'}</span></div><div class="col-md-8"><h4>${employee.fullName}</h4><p class="text-muted mb-1">${employee.role}</p><p><i class="fas fa-envelope fa-fw me-2"></i>${employee.email}</p><p><i class="fas fa-birthday-cake fa-fw me-2"></i>${age} anos ${employee.birthDate ? '(' + new Date(employee.birthDate).toLocaleDateString('pt-BR') + ')' : ''}</p><p><i class="fas fa-calendar-alt fa-fw me-2"></i>Admissão: ${employee.hireDate ? new Date(employee.hireDate).toLocaleDateString('pt-BR') : 'N/A'}</p><p><i class="fas fa-briefcase fa-fw me-2"></i>Carga: ${employee.weeklyHours}h/sem</p><hr><p class="mb-1"><strong>Saldo Banco de Horas:</strong></p><h3 class="fw-bold ${bc}">${bt}</h3></div></div><h5>Histórico Recente (7 dias)</h5>${historyHtml}`;
    if (this.state.currentUser?.role === 'admin') { this.ui.profileAdminActions.style.display = 'block'; const btnToggle = this.ui.profileAdminActions.querySelector('#btnToggleActiveStatus'); if (btnToggle) { if (employee.isActive) { btnToggle.innerHTML = '<i class="fas fa-power-off me-1"></i> Desativar'; btnToggle.classList.remove('btn-success'); btnToggle.classList.add('btn-danger'); } else { btnToggle.innerHTML = '<i class="fas fa-power-off me-1"></i> Ativar'; btnToggle.classList.remove('btn-danger'); btnToggle.classList.add('btn-success'); } } else { console.error("Btn Toggle Status missing."); } } else { if (this.ui.profileAdminActions) this.ui.profileAdminActions.style.display = 'none'; }
    // Adiciona listeners aos botões de deletar APÓS renderizar a tabela
    this.ui.profileModalBody.querySelectorAll('.delete-record-btn').forEach(btn => {
      if (btn.onclick) { btn.onclick = null; } // Evita duplicar
      btn.addEventListener('click', async (e) => {
        const recordId = e.currentTarget.dataset.recordId;
        const employeeName = employee.fullName;
        if (confirm(`Remover registro #${recordId} de ${employeeName}?`)) {
          await this.handleDeleteRecord(recordId, employee.id);
        }
      });
    });
  }

  editProfileFromModal() {
    if (!this.state.viewingEmployeeId) return;
    const profileModal = this.ui.profileModal || this._ensureModalInstance('profileModal'); // Garante instância
    const employeeFormModal = this.ui.employeeFormModal || this._ensureModalInstance('employeeFormModal'); // Garante instância
    if (!profileModal || !employeeFormModal) { console.error("Modal instances missing."); this.showAlert('danger', 'Erro ao editar.'); return; }
    profileModal.hide(); const editButton = document.createElement('button'); editButton.dataset.employeeId = this.state.viewingEmployeeId;
    setTimeout(() => { employeeFormModal.show(editButton); }, 200);
  }

  async toggleActiveStatusFromModal() {
    const employeeId = this.state.viewingEmployeeId; if (!employeeId || this.state.currentUser?.role !== 'admin') return; const profileStatusBadge = this.ui.profileModalBody?.querySelector('.badge'); const currentIsActive = profileStatusBadge?.classList.contains('bg-success'); const newStatus = !currentIsActive; const actionText = newStatus ? 'ativar' : 'desativar'; if (!confirm(`Confirmar ${actionText} ${employeeId}?`)) return;
    try {
      const response = await this.fetchWithAuth(`/api/employees/${employeeId}/status`, { method: 'PATCH', body: JSON.stringify({ isActive: newStatus }) }); if (!response) return; const result = await response.json(); if (!response.ok || !result.success) throw new Error(result.message || `Erro ${response.status}`); this.showAlert('success', `Funcionário ${actionText}do.`); this.showProfileModal(employeeId); if (this.state.currentView === 'admin') { this.loadAndDisplayAdminEmployeeList(); }
    } catch (error) { if (error.message !== 'Não autorizado') { console.error(`Erro ${actionText}:`, error); this.showAlert('danger', `Falha ${actionText}: ${error.message}`); } }
  }

  async loadAndDisplayAdminEmployeeList() {
    if (this.state.currentUser?.role !== 'admin') return; if (!this.ui.employeeListTableBody) { console.error("Admin table body missing."); return; } this.ui.employeeListTableBody.innerHTML = `<tr><td colspan="6" class="text-center"><span class="spinner-border spinner-border-sm"></span> Carregando...</td></tr>`;
    try {
      const response = await this.fetchWithAuth('/api/employees?active=all'); if (!response) return; const result = await response.json(); if (!response.ok || !result.success) throw new Error(result.message || `Erro ${response.status}`); this.state.employeeList = result.data; this.renderAdminEmployeeTable();
    } catch (error) { if (error.message !== 'Não autorizado') { console.error("Error loading admin list:", error); this.ui.employeeListTableBody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">Erro: ${error.message}</td></tr>`; } }
  }

  async handleDeleteRecord(recordId, employeeIdToRefresh) {
    console.log(`[Admin] Deleting record ID: ${recordId}`); if (!this.state.currentUser || this.state.currentUser.role !== 'admin') { this.showAlert('danger', 'Permissão negada.'); return; }
    try {
      const response = await this.fetchWithAuth(`/api/time-records/${recordId}`, { method: 'DELETE' }); if (!response) return; const result = await response.json(); if (!response.ok || !result.success) { throw new Error(result.message || `Erro ${response.status}`); } this.showAlert('success', 'Registro removido.');
      if (this.ui.profileModalElement?.classList.contains('show')) { this.showProfileModal(employeeIdToRefresh); } if (this.state.currentView === 'admin') { this.loadAndDisplayAdminEmployeeList(); } if (this.state.currentView === 'dashboard' && this.state.selectedEmployeeId === employeeIdToRefresh) { this.fetchAndUpdateSummary(); }
    } catch (error) { if (error.message !== 'Não autorizado') { console.error(`Error deleting record ${recordId}:`, error); this.showAlert('danger', `Falha ao remover: ${error.message}`); } }
  }

  renderAdminEmployeeTable() {
    if (!this.ui.employeeListTableBody) return; if (this.state.employeeList.length === 0) { this.ui.employeeListTableBody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">Nenhum funcionário.</td></tr>`; return; }
    this.ui.employeeListTableBody.innerHTML = this.state.employeeList.map(emp => `<tr><td><a href="#" class="link-primary view-profile" data-employee-id="${emp.id}">${emp.fullName || 'N/A'}</a></td><td>${emp.email || '-'}</td><td>${emp.role || '-'}</td><td><span class="badge bg-${emp.isActive ? 'success' : 'secondary'}">${emp.isActive ? 'Ativo' : 'Inativo'}</span></td><td>${parseFloat(emp.hourBalance || 0).toLocaleString('pt-BR', { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 })}h</td><td><div class="btn-group btn-group-sm">${/* Botões Ações */''}</div></td></tr>`).join('');
    // Adiciona Listeners Dinâmicos para a tabela
    console.log("[AdminTable] Attaching listeners...");
    this.ui.employeeListTableBody.querySelectorAll('.view-profile').forEach(btn => { btn.addEventListener('click', (e) => { e.preventDefault(); this.showProfileModal(parseInt(e.currentTarget.dataset.employeeId, 10)); }); });
    this.ui.employeeListTableBody.querySelectorAll('tr').forEach((row, index) => { // Encontra os botões pelo contexto da linha
      const emp = this.state.employeeList[index]; // Pega o funcionário correspondente
      const actionsCell = row.querySelector('td:last-child .btn-group');
      if (actionsCell) {
        actionsCell.innerHTML = `
                <button type="button" class="btn btn-outline-secondary view-profile-btn" title="Ver Perfil"><i class="fas fa-eye"></i></button>
                <button type="button" class="btn btn-outline-primary edit-employee" title="Editar" data-bs-toggle="modal" data-bs-target="#employeeFormModal" data-employee-id="${emp.id}"><i class="fas fa-edit"></i></button>
                <button type="button" class="btn ${emp.isActive ? 'btn-outline-danger' : 'btn-outline-success'} toggle-status" title="${emp.isActive ? 'Desativar' : 'Ativar'}" data-current-status="${emp.isActive}"><i class="fas fa-power-off"></i></button>`;
        // Adiciona listeners aos botões recém-criados DENTRO do loop
        actionsCell.querySelector('.view-profile-btn').addEventListener('click', () => this.showProfileModal(emp.id));
        actionsCell.querySelector('.toggle-status').addEventListener('click', async () => { /* ... lógica toggle ... */
          const newStatus = !emp.isActive; const actionText = newStatus ? 'ativar' : 'desativar'; if (!confirm(`Confirmar ${actionText} ${emp.fullName}?`)) return;
          try { const response = await this.fetchWithAuth(`/api/employees/${emp.id}/status`, { method: 'PATCH', body: JSON.stringify({ isActive: newStatus }) }); if (!response) return; const result = await response.json(); if (!response.ok || !result.success) throw new Error(result.message || `Erro ${response.status}`); this.showAlert('success', `Funcionário ${actionText}do.`); this.loadAndDisplayAdminEmployeeList(); } catch (error) { if (error.message !== 'Não autorizado') this.showAlert('danger', `Erro ao ${actionText}: ${error.message}`); }
        });
      }
    });
  }

  prepareEmployeeForm(employeeId = null) {
    // Garante que modal de formulário exista e adiciona listeners internos
    this._ensureModalInstance('employeeFormModal');
    this._setupModalEventListeners('employeeFormModal');
    // Lógica original de preparar o formulário
    if (!this.ui.employeeForm || !this.ui.employeeFormModalLabel || !this.ui.btnSaveChangesEmployee || !this.ui.passwordFieldContainer || !this.ui.employeePassword || !this.ui.passwordHelp || !this.ui.employeeEmail || !this.ui.employeeFormError) { console.error("Elementos form func. não encontrados."); return; }
    this.ui.employeeForm.reset(); this.ui.employeeForm.classList.remove('was-validated'); this.ui.employeeFormError.style.display = 'none'; this.ui.employeeId.value = employeeId || '';
    if (employeeId) { /* ... (lógica modo edição) ... */ } else { /* ... (lógica modo cadastro) ... */ }
  }

  async handleSaveEmployeeForm() {
    const employeeFormModal = this._ensureModalInstance('employeeFormModal'); if (!employeeFormModal) { console.error("Modal form func. não init."); return; }
    this._setupModalEventListeners('employeeFormModal'); // Garante listeners
    if (!this._validateEmployeeForm()) { if (this.ui.employeeFormError) { this.ui.employeeFormError.textContent = 'Corrija os campos inválidos.'; this.ui.employeeFormError.style.display = 'block'; } return; }
    if (this.ui.employeeFormError) this.ui.employeeFormError.style.display = 'none'; const employeeId = this.ui.employeeId.value; const isEditing = !!employeeId; const formData = new FormData(this.ui.employeeForm); const data = Object.fromEntries(formData.entries()); if (isEditing && !data.password) { delete data.password; } if (!data.birthDate) { delete data.birthDate; } else { data.birthDate = this.formatDateISO(new Date(data.birthDate + 'T00:00:00')); } if (!data.hireDate) { delete data.hireDate; } else { data.hireDate = this.formatDateISO(new Date(data.hireDate + 'T00:00:00')); } if (!data.photoUrl) delete data.photoUrl; const url = isEditing ? `/api/employees/${employeeId}` : '/api/employees'; const method = isEditing ? 'PUT' : 'POST'; console.log(`Salvando (${method}):`, data); if (!this.ui.btnSaveChangesEmployee) { console.error("Botão Salvar não encontrado."); return; } this.ui.btnSaveChangesEmployee.disabled = true; this.ui.btnSaveChangesEmployee.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Salvando...';
    try {
      if (isEditing) delete data.email; delete data.id; const response = await this.fetchWithAuth(url, { method: method, body: JSON.stringify(data) }); if (!response) return; const result = await response.json(); if (!response.ok || !result.success) { const fieldError = result.error?.field ? ` (Campo: ${result.error.field})` : ''; throw new Error((result.message || `Erro ${response.status}`) + fieldError); } this.showAlert('success', `Funcionário ${isEditing ? 'atualizado' : 'cadastrado'}!`); if (this.ui.employeeFormModal) this.ui.employeeFormModal.hide(); else console.warn("employeeFormModal instance unavailable."); if (this.state.currentView === 'admin') { this.loadAndDisplayAdminEmployeeList(); }
    } catch (error) {
      if (error.message !== 'Não autorizado') { console.error("Erro salvar func:", error); if (this.ui.employeeFormError) { this.ui.employeeFormError.textContent = `Erro: ${error.message}`; this.ui.employeeFormError.style.display = 'block'; } }
    } finally { if (this.ui.btnSaveChangesEmployee) { this.ui.btnSaveChangesEmployee.disabled = false; this.ui.btnSaveChangesEmployee.innerHTML = isEditing ? 'Salvar Alterações' : 'Cadastrar Funcionário'; } }
  }

  _validateEmployeeForm() {
    const form = this.ui.employeeForm; if (!form) return false; form.classList.add('was-validated'); let isValid = form.checkValidity();
    if (!this.ui.employeeId?.value && !this.ui.employeePassword?.value) { if (this.ui.employeePassword) { this.ui.employeePassword.classList.add('is-invalid'); this.ui.employeePassword.setCustomValidity("Senha obrigatória."); } isValid = false; }
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
    if (!date) return ''; try { if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) { return date; } if (date instanceof Date) { return date.toISOString().split('T')[0]; } const d = new Date(date); if (isNaN(d.getTime())) return ''; return d.toISOString().split('T')[0]; } catch { return ''; }
  }
}

// Inicializa a aplicação no DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  console.log("DOMContentLoaded event fired.");
  if (typeof bootstrap === 'undefined' || typeof bootstrap.Modal === 'undefined') { console.error('Bootstrap Bundle não carregado ou incompleto!'); const body = document.querySelector('body'); if (body) body.innerHTML = '<div class="alert alert-danger m-5">Erro: Falha ao carregar Bootstrap.</div>' + (body.innerHTML || ''); }
  else { console.log("Bootstrap carregado, inicializando PontoApp..."); window.pontoApp = new PontoApp(); if (window.pontoApp && typeof window.pontoApp._init === 'function') { window.pontoApp._init(); } else { console.error("Falha ao criar/inicializar PontoApp."); } }
});