// src/views/script.js
/**
 * Sistema de Controle de Ponto v1.3.1
 * Gerencia autenticação, registro de ponto, perfil e administração.
 */

class PontoApp {
  constructor() {
    this._cacheDOMElements(); // Separa o cache dos elementos
    // Estado inicializado em _initializeComponents, chamado após verificação do Bootstrap
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
    if (this.ui.btnVerPerfilCompleto) this.ui.btnVerPerfilCompleto.addEventListener('click', () => {
      // Garante que temos um ID para visualizar
      const targetId = this.state.selectedEmployeeId || this.state.currentUser?.id;
      if (targetId) {
        this.showProfileModal(targetId);
      } else {
        console.warn("Tentativa de ver perfil sem ID selecionado ou usuário logado.");
      }
    }); else console.error("Static Listener Error: btnVerPerfilCompleto not found");

    // Modal Formulário Funcionário: Botão Salvar e Evento 'show'
    if (this.ui.employeeForm) this.ui.employeeForm.addEventListener('submit', (e) => { e.preventDefault(); this.handleSaveEmployeeForm(); }); else console.error("Static Listener Error: employeeForm not found.");
    if (this.ui.btnSaveChangesEmployee) this.ui.btnSaveChangesEmployee.addEventListener('click', () => this.handleSaveEmployeeForm()); else console.error("Static Listener Error: btnSaveChangesEmployee not found.");

    // Listener para o evento 'show' do modal de funcionário
    if (this.ui.employeeFormModalElement) { // Usa o elemento DOM para o listener
      this.ui.employeeFormModalElement.addEventListener('show.bs.modal', (e) => {
        // A instância do modal (this.ui.employeeFormModal) pode não estar pronta aqui ainda
        // A lógica foi movida para prepareEmployeeForm que é chamado por este listener
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

    // Links da Navbar
    const linkMeuPerfil = document.getElementById('linkMeuPerfil');
    if (linkMeuPerfil) {
      // Verifica se já tem listener para não duplicar (embora onclick sobrescreva)
      if (!linkMeuPerfil.onclick) {
        linkMeuPerfil.onclick = (e) => { e.preventDefault(); this.showProfileModal(this.state.currentUser.id); };
        console.log("Dynamic Listener: Meu Perfil attached.");
      }
    } else {
      if (this.state.currentUser) console.warn("Dynamic Listener Warning: linkMeuPerfil not found after login.");
    }

    const linkGerenciar = document.getElementById('linkGerenciarFuncionarios');
    if (linkGerenciar) {
      if (!linkGerenciar.onclick) {
        linkGerenciar.onclick = (e) => { e.preventDefault(); this.setView('admin'); };
        console.log("Dynamic Listener: Gerenciar Funcionários attached.");
      }
    } else {
      // Só loga aviso se for admin (quando o link deveria existir)
      if (this.state.currentUser?.role === 'admin') console.warn("Dynamic Listener Warning: linkGerenciarFuncionarios not found for admin.");
    }

    // Link Novo Funcionário (já usa data-bs-toggle, mas verificamos se existe)
    const linkNovoFunc = document.getElementById('linkNovoFuncionario');
    if (!linkNovoFunc && this.state.currentUser?.role === 'admin') {
      console.warn("Dynamic Listener Warning: linkNovoFuncionario not found for admin.");
    }

    console.log("Dynamic event listeners for Navbar set up completed.");
  }


  _initSelect2() {
    if (this.ui.employeeSelect && this.ui.employeeSelect.length > 0 && typeof $.fn.select2 === 'function') { // Verifica se jQuery e Select2 estão carregados
      try {
        this.ui.employeeSelect.select2({
          placeholder: "Selecione para ver status",
          allowClear: true,
          width: '100%',
        });
        this.ui.employeeSelect.prop('disabled', true);
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

  // ================ CONTROLE DE VISÃO ================
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
      if (this.ui.navLinks) this.ui.navLinks.style.display = 'block'; else console.error("navLinks not found");
      if (this.ui.authArea) {
        this.ui.authArea.innerHTML = `
                  <span class="navbar-text me-3">Olá, ${this.state.currentUser.fullName}</span>
                  <button class="btn btn-outline-secondary btn-sm" id="btnLogout">Sair</button>`;
      } else { console.error("authArea not found"); }


      if (this.state.currentUser.role === 'admin') {
        if (this.ui.navAdminLinks) this.ui.navAdminLinks.style.display = 'block'; else console.error("navAdminLinks not found");
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

  _updateNavLinks() { /* ... (como na versão 1.3.1) ... */ }
  async handleLogin() { /* ... (como na versão 1.3.1) ... */ }
  handleLogout() { /* ... (como na versão 1.3.1) ... */ }
  resetDashboardState() { /* ... (como na versão 1.3.1) ... */ }
  async fetchAndUpdateDashboard() { /* ... (como na versão 1.3.1) ... */ }
  handleEmployeeSelectionChange() { /* ... (como na versão 1.3.1) ... */ }
  async fetchAndUpdateStatus() { /* ... (como na versão 1.3.1) ... */ }
  async fetchHistoryAndFindToday(employeeId) { /* ... (como na versão 1.3.1) ... */ }
  updateStatusUI() { /* ... (como na versão 1.3.1) ... */ }
  updateActionButtons() { /* ... (como na versão 1.3.1) ... */ }
  async registrarPonto(tipoAcao) { /* ... (como na versão 1.3.1) ... */ }
  _setPointButtonsDisabled(isDisabled) { /* ... (como na versão 1.3.1) ... */ }
  async fetchAndUpdateSummary() { /* ... (como na versão 1.3.1) ... */ }
  async showProfileModal(employeeId) { /* ... (como na versão 1.3.1, com verificação de this.ui.profileModal) ... */
    if (!employeeId) return;
    if (!this.ui.profileModal) { console.error("Profile Modal instance not available!"); return; }
    // ... restante da função
    this.ui.profileModal.show();
    // ... fetch e render
  }
  renderProfileModalContent(employee, history) { /* ... (como na versão 1.3.1) ... */ }
  editProfileFromModal() { /* ... (como na versão 1.3.1, com verificação dos modais) ... */
    if (!this.state.viewingEmployeeId) return;
    if (!this.ui.profileModal || !this.ui.employeeFormModal) { console.error("Modal instance missing for edit profile action."); return; }
    this.ui.profileModal.hide();
    const editButton = document.createElement('button');
    editButton.dataset.employeeId = this.state.viewingEmployeeId;
    setTimeout(() => {
      if (this.ui.employeeFormModal) this.ui.employeeFormModal.show(editButton);
    }, 200);
  }
  async toggleActiveStatusFromModal() { /* ... (como na versão 1.3.1) ... */ }
  async loadAndDisplayAdminEmployeeList() { /* ... (como na versão 1.3.1) ... */ }
  renderAdminEmployeeTable() { /* ... (como na versão 1.3.1, adiciona listeners da tabela) ... */ }
  prepareEmployeeForm(employeeId = null) { /* ... (como na versão 1.3.1) ... */ }
  async handleSaveEmployeeForm() { /* ... (como na versão 1.3.1, com verificação this.ui.employeeFormModal) ... */
    // ... validação
    try {
      //... fetch
      if (this.ui.employeeFormModal) this.ui.employeeFormModal.hide();
      //...
    } catch (error) { /*...*/ }
    finally { /*...*/ }
  }
  _validateEmployeeForm() { /* ... (como na versão 1.3.1) ... */ }
  async fetchWithAuth(url, options = {}) { /* ... (como na versão 1.3.1, com try/catch no fetch) ... */ }
  showAlert(type, message) { /* ... (como na versão 1.3.1, com verificação Bootstrap Alert) ... */
    const wrapper = document.createElement('div');
    const alertId = `alert-${Date.now()}`;
    wrapper.innerHTML = `...`; // como antes
    this.ui.alertPlaceholder.append(wrapper);
    const alertElement = document.getElementById(alertId);
    if (alertElement && typeof bootstrap !== 'undefined' && bootstrap.Alert) { // Verifica se bootstrap.Alert existe
      const bsAlert = bootstrap.Alert.getOrCreateInstance(alertElement);
      setTimeout(() => { /*...*/ }, 5000);
    } else {
      console.error("Não foi possível encontrar o elemento do alerta ou bootstrap.Alert para auto-fechamento.");
      setTimeout(() => wrapper.remove(), 5500);
    }
  }
  formatTime(timestamp) { /* ... (como na versão 1.3.1) ... */ }
  getTipoNome(tipo) { /* ... (como na versão 1.3.1) ... */ }
  formatDateISO(date) { /* ... (como na versão 1.3.1) ... */ }
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
    window.pontoApp = new PontoApp(); // Cria a instância GLOBAL
    // Chama _init manualmente aqui, pois a instância já foi criada
    // A verificação do bootstrap garante que os componentes podem ser inicializados
    if (window.pontoApp) {
      // Adiciona um pequeno delay para garantir que tudo esteja pronto (opcional)
      // setTimeout(() => {
      window.pontoApp._init();
      // }, 0);
    }
  }
});