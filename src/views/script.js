/**
 * Frontend do Sistema de Controle de Ponto
 * Utiliza Bootstrap 5, jQuery (para Select2 e conveniência), Select2.
 * Organizado em uma classe PontoApp para encapsular estado e lógica.
 */

class PontoApp {
  constructor() {
    console.log("[PontoApp] Constructor - Inicializando...");
    // Inicializa o estado da aplicação (ex: token, usuário logado)
    this._initializeState();
    // Mapeia elementos HTML importantes para acesso rápido (cache)
    this._cacheDOMElements();
    // Não inicializar modais ou listeners pesados aqui ainda.

    this.handleLogin = this.handleLogin.bind(this);
    this.handleLogout = this.handleLogout.bind(this);
    this.setView = this.setView.bind(this);
    this._updateView = this._updateView.bind(this);
    this.fetchAndUpdateDashboard = this.fetchAndUpdateDashboard.bind(this);
    this.registrarPonto = this.registrarPonto.bind(this);
    this.showProfileModal = this.showProfileModal.bind(this);
    this.showLoginModal = this.showLoginModal.bind(this);
    this.showEmployeeFormModal = this.showEmployeeFormModal.bind(this);
    this.handleSaveEmployeeForm = this.handleSaveEmployeeForm.bind(this);
    this.handleDeleteRecord = this.handleDeleteRecord.bind(this);
  }

  /**
    * Define o estado inicial da aplicação, lendo dados do localStorage se disponíveis.
    */
  _initializeState() {
    this.state = {
      token: localStorage.getItem('authToken') || null, // Token JWT
      currentUser: JSON.parse(localStorage.getItem('currentUser')) || null, // Dados do usuário logado
      selectedEmployeeId: null, // ID do funcionário sendo visualizado no dashboard (pode ser o próprio ou outro se admin)
      viewingEmployeeId: null, // ID do funcionário sendo visualizado no modal de perfil
      todayRecord: null, // Registro de ponto do dia para o funcionário selecionado
      employeeList: [], // Lista de funcionários (para admin)
      currentView: 'login' // Visão atual da UI ('login', 'dashboard', 'admin')
    };
    console.log("[State] Estado inicial:", this.state);
  }

  /**
 * Seleciona e armazena referências para os elementos HTML frequentemente usados.
 * Melhora a performance evitando seleções repetidas do DOM.
 */

  _cacheDOMElements() {
    console.log("[PontoApp] Cacheando elementos DOM...");

    this.ui = {
      // Elementos de Modais
      loginModalElement: document.getElementById('loginModal'),
      employeeFormModalElement: document.getElementById('employeeFormModal'),
      profileModalElement: document.getElementById('profileModal'),

      // Instâncias de Modais (serão inicializadas depois)
      loginModal: null,
      employeeFormModal: null,
      profileModal: null,

      // Elementos de Navegação
      authArea: document.getElementById('authArea'),
      mainOffcanvasElement: document.getElementById('mainOffcanvas'),
      mainOffcanvas: null,
      navLinksOffcanvas: document.getElementById('navLinksOffcanvas'),
      navAdminLinksOffcanvas: document.getElementById('navAdminLinksOffcanvas'),
      navAdminSeparatorOffcanvas: document.getElementById('navAdminSeparatorOffcanvas'),
      navLogoutOffcanvas: document.getElementById('navLogoutOffcanvas'),

      // Áreas Principais
      dashboardArea: document.getElementById('dashboardArea'),
      adminArea: document.getElementById('adminArea'),
      loginPrompt: document.getElementById('loginPrompt'),
      alertPlaceholder: document.getElementById('alertPlaceholder'),

      // Elementos do Dashboard Mobile
      employeeSelectMobile: $('#employeeSelectMobile'),
      employeeSelectContainerMobile: document.getElementById('employeeSelectContainerMobile'),
      actionUserName: document.getElementById('actionUserName'),
      btnEntradaMobile: document.getElementById('btnEntradaMobile'),
      btnSaidaAlmocoMobile: document.getElementById('btnSaidaAlmocoMobile'),
      btnRetornoAlmocoMobile: document.getElementById('btnRetornoAlmocoMobile'),
      btnSaidaMobile: document.getElementById('btnSaidaMobile'),

      // Elementos de Status
      statusDateMobile: document.getElementById('statusDateMobile'),
      statusPlaceholderMobile: document.getElementById('statusPlaceholderMobile'),
      statusDetailsMobile: document.getElementById('statusDetailsMobile'),
      statusEntradaMobile: document.getElementById('statusEntradaMobile'),
      statusSaidaAlmocoMobile: document.getElementById('statusSaidaAlmocoMobile'),
      statusRetornoAlmocoMobile: document.getElementById('statusRetornoAlmocoMobile'),
      statusSaidaMobile: document.getElementById('statusSaidaMobile'),
      statusTotalHorasMobile: document.getElementById('statusTotalHorasMobile'),

      // Elementos do Resumo
      summaryLoadingMobile: document.getElementById('summaryLoadingMobile'),
      summaryContent: document.getElementById('summaryContent'),
      summaryBalanceMobile: document.getElementById('summaryBalanceMobile'),

      // Links e Botões
      linkMeuPerfilRapido: document.getElementById('linkMeuPerfilRapido'),
      employeeListTableBody: document.getElementById('employeeListTableBody'),
      btnLoginTrigger: document.getElementById('btnLoginTrigger'),
      btnLoginPromptTrigger: document.getElementById('btnLoginPromptTrigger'),
      btnNovoFuncAdminArea: document.getElementById('btnNovoFuncAdminArea'),
      linkNovoFuncionarioOffcanvas: document.getElementById('linkNovoFuncionarioOffcanvas')
    };

    // Verifica se todos os elementos essenciais foram encontrados
    // (Adicionar verificações aqui se necessário para depuração)
    console.log("[DOM Cache] Cache finalizado.");
  }

  /**
   * Inicializa componentes não-modais e estado geral da aplicação.
   * Chamado após o DOM estar pronto.
   */

  _initializeComponents() {
    console.log("[InitComp] Initializing state and non-modal components...");
    const canInitOffcanvas = typeof bootstrap !== 'undefined' && bootstrap.Offcanvas;
    if (this.ui.mainOffcanvasElement && canInitOffcanvas) { this.ui.mainOffcanvas = new bootstrap.Offcanvas(this.ui.mainOffcanvasElement); }
    else { console.warn("[InitComp] Offcanvas init failed."); }
    // NÃO inicializa modais aqui
    this.state = { token: localStorage.getItem('authToken') || null, currentUser: JSON.parse(localStorage.getItem('currentUser')) || null, selectedEmployeeId: null, viewingEmployeeId: null, todayRecord: null, employeeList: [], currentView: 'login' };
    console.log("[InitComp] State and non-modal components initialized.");
  }

  /**
  * Garante que uma instância de modal Bootstrap exista para um dado nome de modal.
  * Cria a instância se ela não existir e adiciona um listener para limpar
  * o estado do modal (erros, formulários) quando ele é fechado ('hidden.bs.modal').
  *
  * @param {string} modalName - O nome da chave do modal no objeto `this.ui` (ex: 'loginModal', 'profileModal').
  * @returns {bootstrap.Modal|null} A instância do modal Bootstrap ou null se falhar.
  */

  _ensureModalInstance(modalName) {
    const element = this.ui[modalName + 'Element'];
    if (!element) { console.error(`[Modal] Elemento DOM para ${modalName} não encontrado.`); return null; }
    if (!this.ui[modalName]) {
      console.log(`[Modal] Criando instância Bootstrap para ${modalName}...`);
      if (typeof bootstrap !== 'undefined' && bootstrap.Modal) {
        try {
          this.ui[modalName] = new bootstrap.Modal(element);
          // Adiciona listener para limpar erros/forms quando o modal é FECHADO
          element.addEventListener('hidden.bs.modal', () => {
            console.log(`[Modal] ${modalName} fechado (hidden.bs.modal). Cleaning up...`);
            // Busca elementos internos APENAS quando for limpar
            const loginErrorElement = element.querySelector('#loginError');
            if (loginErrorElement) loginErrorElement.style.display = 'none';
            const loginFormElement = element.querySelector('#loginForm');
            if (loginFormElement) loginFormElement.reset();

            const employeeFormElement = element.querySelector('#employeeForm');
            if (employeeFormElement) { employeeFormElement.reset(); employeeFormElement.classList.remove('was-validated'); }
            const employeeFormErrorElement = element.querySelector('#employeeFormError');
            if (employeeFormErrorElement) employeeFormErrorElement.style.display = 'none';
          });
          console.log(`[Modal] Instância para ${modalName} criada com sucesso.`);
        } catch (error) { console.error(`[Modal] Erro ao criar instância Bootstrap para ${modalName}:`, error); return null; }
      } else { console.error(`[Modal] Bootstrap indisponível para criar ${modalName}.`); return null; }
    }
    return this.ui[modalName];
  }


  /**
   * Ponto de entrada principal da aplicação, chamado após o DOM carregar.
   * Inicializa componentes, configura listeners estáticos, e atualiza a visão inicial.
   */

  _init() {
    console.log("[PontoApp Init] Iniciando aplicação completa...");
    this._initializeComponents(); // Estado, Offcanvas
    this._setupStaticEventListeners(); // Listeners para botões fora de modais
    this._initSelect2(); // Configura o Select2 (se presente)
    this._updateView(); // Define a visão inicial (login ou dashboard/admin)
    this._setupAllModalEventListeners(); // Configura listeners DENTRO dos modais (forms, etc.)
    console.log("[PontoApp Init] Aplicação pronta.");
  }

  // Listeners para elementos estáticos fora dos modais
  _setupStaticEventListeners() {
    console.log("[Listeners] Setting up static event listeners...");
    // --- Triggers para abrir modais ---
    if (this.ui.btnLoginPromptTrigger) {
      this.ui.btnLoginPromptTrigger.addEventListener('click', () => {
        console.log("[Listeners] Botão Login (Prompt) clicado.");
        this.showLoginModal(); // Chama a função wrapper
      });
    } else { console.warn("[Listeners] Static Warning: btnLoginPromptTrigger not found."); }

    if (this.ui.btnNovoFuncAdminArea) {
      this.ui.btnNovoFuncAdminArea.addEventListener('click', () => {
        console.log("[Listeners] Botão Novo Func (Admin Area) clicado.");
        this.showEmployeeFormModal(); // Chama wrapper (sem ID = novo)
      });
    } else { console.warn("[Listeners] Static Warning: btnNovoFuncAdminArea not found."); }

    // --- Botões de Ponto ---
    if (this.ui.btnEntradaMobile) this.ui.btnEntradaMobile.addEventListener('click', () => this.registrarPonto('check-in')); else console.error("[Listeners] Static Error: btnEntradaMobile not found");
    if (this.ui.btnSaidaAlmocoMobile) this.ui.btnSaidaAlmocoMobile.addEventListener('click', () => this.registrarPonto('lunch-start')); else console.error("[Listeners] Static Error: btnSaidaAlmocoMobile not found");
    if (this.ui.btnRetornoAlmocoMobile) this.ui.btnRetornoAlmocoMobile.addEventListener('click', () => this.registrarPonto('lunch-end')); else console.error("[Listeners] Static Error: btnRetornoAlmocoMobile not found");
    if (this.ui.btnSaidaMobile) this.ui.btnSaidaMobile.addEventListener('click', () => this.registrarPonto('check-out')); else console.error("[Listeners] Static Error: btnSaidaMobile not found");
    // --- Select2 Admin ---
    if (this.ui.employeeSelectMobile?.length > 0) { this.ui.employeeSelectMobile.on('change', (e) => { const sv = $(e.target).val(); this.state.selectedEmployeeId = sv ? parseInt(sv, 10) : this.state.currentUser?.id; this.handleEmployeeSelectionChange(); }); } else { console.error("[Listeners] Static Error: employeeSelectMobile not found.") }
    // --- Botão Ver Perfil Rápido ---
    if (this.ui.linkMeuPerfilRapido) { this.ui.linkMeuPerfilRapido.addEventListener('click', (e) => { e.preventDefault(); const tid = this.state.currentUser?.id; console.log("[Listeners] Link 'Meu Perfil Rápido' clicado. Target ID:", tid); if (tid) { this.showProfileModal(tid); } else { this.showAlert('info', 'Faça login.'); } }); } else { console.error("[Listeners] Static Error: linkMeuPerfilRapido not found"); }
    // --- Listener para o EVENTO 'show' do modal de formulário (para preparar o form) ---
    if (this.ui.employeeFormModalElement) { this.ui.employeeFormModalElement.addEventListener('show.bs.modal', (e) => { const btn = e.relatedTarget; const empId = btn?.dataset.employeeId; this.prepareEmployeeForm(empId ? parseInt(empId, 10) : null); }); } else { console.error("[Listeners] Static Error: employeeFormModalElement not found."); }

    console.log("[Listeners] Static event listeners set up completed.");
  }

  // Configura listeners para elementos DENTRO de todos os modais (chamado uma vez no _init)
  _setupAllModalEventListeners() {
    console.log("[Listeners] Setting up ALL modal event listeners (forms, specific buttons)...");
    // --- Login Modal Listeners ---
    const loginModalElement = this.ui.loginModalElement;
    if (loginModalElement) {
      const loginForm = loginModalElement.querySelector('#loginForm');
      const btnSubmit = loginModalElement.querySelector('#btnLoginSubmit');
      if (loginForm && !loginForm.listenerAttached) { loginForm.addEventListener('submit', (e) => { e.preventDefault(); this.handleLogin(); }); loginForm.listenerAttached = true; }
      else if (!loginForm) { console.error("[Listeners] loginForm not found inside loginModal."); }
      if (btnSubmit && !btnSubmit.listenerAttached) { btnSubmit.addEventListener('click', () => this.handleLogin()); btnSubmit.listenerAttached = true; }
      else if (!btnSubmit) { console.error("[Listeners] btnLoginSubmit not found inside loginModal."); }
    } else { console.error("[Listeners] loginModalElement not found."); }
    // --- Employee Form Modal Listeners ---
    const employeeModalElement = this.ui.employeeFormModalElement;
    if (employeeModalElement) {
      const employeeForm = employeeModalElement.querySelector('#employeeForm');
      const btnSave = employeeModalElement.querySelector('#btnSaveChangesEmployee');
      if (employeeForm && !employeeForm.listenerAttached) { employeeForm.addEventListener('submit', (e) => { e.preventDefault(); this.handleSaveEmployeeForm(); }); employeeForm.listenerAttached = true; }
      else if (!employeeForm) { console.error("[Listeners] employeeForm not found in employeeModal."); }
      if (btnSave && !btnSave.listenerAttached) { btnSave.addEventListener('click', () => this.handleSaveEmployeeForm()); btnSave.listenerAttached = true; }
      else if (!btnSave) { console.error("[Listeners] btnSaveChangesEmployee not found in employeeModal."); }
      employeeModalElement.querySelectorAll('input, select').forEach(input => { if (!input.listenerAttached) { input.addEventListener('input', () => { if (employeeForm?.classList.contains('was-validated')) { this._validateEmployeeForm(); } }); input.listenerAttached = true; } });
    } else { console.error("[Listeners] employeeFormModalElement not found."); }
    // --- Profile Modal Listeners ---
    const profileModalElement = this.ui.profileModalElement;
    if (profileModalElement) {
      const btnEdit = profileModalElement.querySelector('#btnEditProfile');
      const btnToggle = profileModalElement.querySelector('#btnToggleActiveStatus');
      if (btnEdit && !btnEdit.listenerAttached) { btnEdit.addEventListener('click', () => this.editProfileFromModal()); btnEdit.listenerAttached = true; }
      else if (!btnEdit) { console.error("[Listeners] btnEditProfile not found in profileModal."); }
      if (btnToggle && !btnToggle.listenerAttached) { btnToggle.addEventListener('click', () => this.toggleActiveStatusFromModal()); btnToggle.listenerAttached = true; }
      else if (!btnToggle) { console.error("[Listeners] btnToggleActiveStatus not found in profileModal."); }
      // Listeners para botões delete na tabela são adicionados em renderProfileModalContent
    } else { console.error("[Listeners] profileModalElement not found."); }
    console.log("[Listeners] All modal event listeners set up.");
  }


  /**
   * Configura listeners para elementos que podem ser recriados dinamicamente,
   * como os links no Offcanvas ou o botão de login na Navbar.
   * Chamado após `_updateView` garantir que os elementos corretos estão visíveis.
   */

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
    const linkNovoFunc = document.getElementById('linkNovoFuncionarioOffcanvas');
    if (linkNovoFunc) { if (!linkNovoFunc.onclick) { linkNovoFunc.onclick = (e) => { e.preventDefault(); console.log("[Listeners] Link Novo Funcionário (Offcanvas) clicado."); if (this.ui.mainOffcanvas) this.ui.mainOffcanvas.hide(); this.showEmployeeFormModal(); }; console.log("[Listeners] Dynamic Listener: Novo Funcionário (Offcanvas) attached."); } } else { if (this.ui.navAdminLinksOffcanvas?.style.display !== 'none') console.warn("[Listeners] Dynamic Warning: linkNovoFuncionarioOffcanvas not found."); }
    if (!this.state.token) {
      const btnLoginTriggerNavbar = document.getElementById('btnLoginTrigger');
      if (btnLoginTriggerNavbar) { if (!btnLoginTriggerNavbar.onclick) { btnLoginTriggerNavbar.onclick = () => { console.log("[Listeners] Botão Login (Navbar) clicado."); this.showLoginModal(); }; console.log("[Listeners] Dynamic Listener: Login (Navbar) attached."); } } else { console.warn("[Listeners] Dynamic Warning: btnLoginTrigger (Navbar) not found."); }
    }
    console.log("[Listeners] Dynamic event listeners for Navbar/Offcanvas set up completed.");
  }

  // --- Wrappers para Mostrar Modais ---
  /** Mostra o modal de Login, garantindo que a instância exista. */


  showLoginModal() {
    const modal = this._ensureModalInstance('loginModal');
    if (modal) {
      // this._setupAllModalEventListeners(); // Chamado no _init, não precisa mais aqui
      modal.show();
    } else {
      this.showAlert('danger', 'Erro ao abrir formulário de login.');
    }
  }

  /** Mostra o modal de Formulário de Funcionário (novo ou edição). */
  showEmployeeFormModal(employeeId = null) {
    const modal = this._ensureModalInstance('employeeFormModal');
    if (modal) {
      // A preparação do form já é feita pelo listener 'show.bs.modal'
      // this.prepareEmployeeForm(employeeId); // Pode ser redundante
      // this._setupAllModalEventListeners(); // Chamado no _init
      modal.show(); // Mostra após preparação (feita pelo evento)
    } else {
      this.showAlert('danger', 'Erro ao preparar formulário de funcionário.');
    }
  }


  /** Mostra o modal de Perfil, carrega os dados e trata erros. */
  async showProfileModal(employeeId) {
    console.log(`[ProfileModal] Abrindo perfil para ID: ${employeeId}`);

    if (!employeeId) {
      console.warn("[ProfileModal] ID do funcionário não fornecido");
      this.showAlert('danger', 'ID do funcionário inválido');
      return;
    }

    // Garante que a instância do modal existe
    const profileModalInstance = this._ensureModalInstance('profileModal');
    if (!profileModalInstance) {
      console.error("[ProfileModal] Não foi possível inicializar o modal");
      this.showAlert('danger', 'Erro ao abrir perfil');
      return;
    }

    // Configura o estado inicial
    this.state.viewingEmployeeId = employeeId;

    // Busca os elementos internos do modal
    const modalElement = this.ui.profileModalElement;
    if (!modalElement) {
      console.error("[ProfileModal] Elemento do modal não encontrado");
      return;
    }

    // Configura elementos internos
    const modalLabel = modalElement.querySelector('#profileModalLabel');
    const modalBody = modalElement.querySelector('#profileModalBody');
    const adminActions = modalElement.querySelector('#profileAdminActions');

    if (!modalLabel || !modalBody) {
      console.error("[ProfileModal] Elementos internos não encontrados");
      this.showAlert('danger', 'Erro ao configurar perfil');
      return;
    }

    // Estado inicial do modal
    modalLabel.textContent = "Carregando perfil...";
    modalBody.innerHTML = `
      <div class="text-center p-5">
          <span class="spinner-border spinner-border-lg"></span>
          <p class="mt-2">Carregando dados do funcionário...</p>
      </div>
  `;

    if (adminActions) {
      adminActions.style.display = 'none';
    }

    try {
      console.log("[ProfileModal] Exibindo modal...");
      profileModalInstance.show();

      // Carrega os dados após abrir o modal
      await this._loadProfileData(employeeId);
    } catch (error) {
      console.error("[ProfileModal] Erro ao abrir modal:", error);
      modalBody.innerHTML = `
          <div class="alert alert-danger m-3">
              Erro ao carregar perfil: ${error.message}
          </div>
      `;
    }
  }


  /** Carrega dados básicos e histórico recente para o modal de perfil. */
  async _loadProfileData(employeeId) {
    console.log(`[ProfileModal] Carregando dados para ID: ${employeeId}`);
    console.log("Resposta da API /employees:", empResponse, await empResponse.json());
    console.log("Resposta da API /balance-history:", histResponse, histResponse ? await histResponse.json() : null);

    const modalElement = this.ui.profileModalElement;
    if (!modalElement) return;

    const modalBody = modalElement.querySelector('#profileModalBody');
    const adminActions = modalElement.querySelector('#profileAdminActions');

    try {
      // 1. Busca dados básicos do funcionário
      const empResponse = await this.fetchWithAuth(`/api/employees/${employeeId}`);

      if (!empResponse || !empResponse.ok) {
        throw new Error(empResponse?.statusText || 'Falha na requisição');
      }

      const empResult = await empResponse.json();
      if (!empResult.success) {
        throw new Error(empResult.message || 'Erro ao obter dados');
      }

      const employee = empResult.data;
      if (!employee) {
        throw new Error("Dados do funcionário não encontrados");
      }

      // 2. Busca histórico (últimos 7 dias)
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - 7);

      const histUrl = `/api/time-records/employee/${employeeId}/balance-history?startDate=${this.formatDateISO(startDate)}&endDate=${this.formatDateISO(endDate)}`;
      const histResponse = await this.fetchWithAuth(histUrl);

      let history = [];
      if (histResponse && histResponse.ok) {
        const histResult = await histResponse.json();
        if (histResult.success) {
          history = histResult.data || [];
        }
      }

      // 3. Renderiza o conteúdo
      this.renderProfileModalContent(employee, history);

    } catch (error) {
      console.error("[ProfileModal] Erro ao carregar dados:", error);

      if (modalBody) {
        modalBody.innerHTML = `
              <div class="alert alert-danger m-3">
                  Erro ao carregar perfil: ${error.message}
              </div>
          `;
      }
    }
  }

  _initSelect2() { const targetSelect = this.ui.employeeSelectMobile; if (targetSelect && targetSelect.length > 0 && typeof $.fn.select2 === 'function') { try { targetSelect.select2({ placeholder: "Visualizar outro...", allowClear: true, width: '100%', dropdownParent: targetSelect.parent() }); targetSelect.prop('disabled', true); console.log("Select2 initialized for mobile."); } catch (error) { console.error("Erro ao inicializar Select2:", error); this.showAlert('warning', 'Erro seletor func.') } } else if (!(typeof $.fn.select2 === 'function')) { console.error("Select2 function not available."); } else { console.error("Select2 element (mobile) not found."); } }


  // --- Lógica de Visão e Atualização da UI ---
  /**
   * Altera a visão principal da aplicação (login, dashboard, admin).
   * Controla a visibilidade das áreas principais e dispara atualizações de dados se necessário.
   * @param {'login' | 'dashboard' | 'admin'} viewName - O nome da visão a ser exibida.
   */
  setView(viewName) { console.log(`Setting view to: ${viewName}`); this.state.currentView = viewName; if (this.ui.loginPrompt) this.ui.loginPrompt.style.display = viewName === 'login' ? 'block' : 'none'; if (this.ui.dashboardArea) this.ui.dashboardArea.style.display = viewName === 'dashboard' ? 'block' : 'none'; if (this.ui.adminArea) this.ui.adminArea.style.display = viewName === 'admin' ? 'block' : 'none'; if (viewName === 'admin') { this.loadAndDisplayAdminEmployeeList(); } else if (viewName === 'dashboard') { this.fetchAndUpdateDashboard(); } this._updateNavLinks(); }


  /**
 * Atualiza a interface do usuário (Navbar, Offcanvas, Visão Principal)
 * com base no estado de autenticação (token e currentUser).
 * Chamado após login, logout ou na inicialização.
 */
  _updateView() { console.log("Updating view based on auth state..."); if (this.state.token && this.state.currentUser) { if (this.ui.navLinksOffcanvas) this.ui.navLinksOffcanvas.style.display = 'block'; else console.error("navLinksOffcanvas missing"); if (this.ui.navLogoutOffcanvas) this.ui.navLogoutOffcanvas.style.display = 'block'; else console.error("navLogoutOffcanvas missing"); if (this.ui.authArea) { this.ui.authArea.innerHTML = `<span class="navbar-text me-3 small text-white-50">Olá, ${this.state.currentUser.fullName.split(' ')[0]}</span>`; } else { console.error("authArea missing"); } if (this.state.currentUser.role === 'admin') { if (this.ui.navAdminLinksOffcanvas) this.ui.navAdminLinksOffcanvas.style.display = 'block'; else console.error("navAdminLinksOffcanvas missing"); if (this.ui.navAdminSeparatorOffcanvas) this.ui.navAdminSeparatorOffcanvas.style.display = 'block'; else console.error("navAdminSeparatorOffcanvas missing"); if (this.ui.employeeSelectContainerMobile) this.ui.employeeSelectContainerMobile.style.display = 'block'; if (this.ui.employeeSelectMobile?.length > 0) this.ui.employeeSelectMobile.prop('disabled', false); this.setView(this.state.currentView !== 'login' ? this.state.currentView : 'dashboard'); } else { if (this.ui.navAdminLinksOffcanvas) this.ui.navAdminLinksOffcanvas.style.display = 'none'; if (this.ui.navAdminSeparatorOffcanvas) this.ui.navAdminSeparatorOffcanvas.style.display = 'none'; if (this.ui.employeeSelectContainerMobile) this.ui.employeeSelectContainerMobile.style.display = 'none'; if (this.ui.employeeSelectMobile?.length > 0) this.ui.employeeSelectMobile.prop('disabled', true); this.setView('dashboard'); } setTimeout(() => this._setupDynamicEventListeners(), 0); } else { if (this.ui.navLinksOffcanvas) this.ui.navLinksOffcanvas.style.display = 'none'; if (this.ui.navAdminLinksOffcanvas) this.ui.navAdminLinksOffcanvas.style.display = 'none'; if (this.ui.navAdminSeparatorOffcanvas) this.ui.navAdminSeparatorOffcanvas.style.display = 'none'; if (this.ui.navLogoutOffcanvas) this.ui.navLogoutOffcanvas.style.display = 'none'; if (this.ui.authArea) { this.ui.authArea.innerHTML = `<button class="btn btn-primary btn-sm" id="btnLoginTrigger">Login</button>`; } this.setView('login'); setTimeout(() => this._setupDynamicEventListeners(), 0); } console.log("View update process finished."); }


  /** Atualiza a classe 'active' nos links de navegação do Offcanvas. */
  _updateNavLinks() { document.querySelectorAll('#mainOffcanvas .nav-link').forEach(link => link.classList.remove('active')); if (this.state.currentView === 'admin') { document.getElementById('linkGerenciarFuncionariosOffcanvas')?.classList.add('active'); } }




  // --- Lógica de Autenticação ---
  /** Manipula o envio do formulário de login. */
  async handleLogin() { console.log("Handling login logic..."); const loginModal = this.ui.loginModal; if (!loginModal) { console.error("Login Modal not initialized."); return; } const loginForm = this.ui.loginModalElement?.querySelector('#loginForm'); const btnSubmit = this.ui.loginModalElement?.querySelector('#btnLoginSubmit'); const loginError = this.ui.loginModalElement?.querySelector('#loginError'); if (!loginForm || !btnSubmit || !loginError) { console.error("Elementos internos login modal não encontrados."); return; } const email = loginForm.email.value; const password = loginForm.password.value; loginError.style.display = 'none'; if (!email || !password) { loginError.textContent = 'E-mail/senha obrigatórios.'; loginError.style.display = 'block'; return; } btnSubmit.disabled = true; btnSubmit.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Entrando...'; try { const response = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) }); if (!response) throw new Error("Falha na requisição."); const result = await response.json(); if (!response.ok || !result.success) throw new Error(result.message || `Erro ${response.status}`); this.state.token = result.data.token; this.state.currentUser = result.data.user; localStorage.setItem('authToken', this.state.token); localStorage.setItem('currentUser', JSON.stringify(this.state.currentUser)); console.log("Login successful."); loginModal.hide(); this._updateView(); } catch (error) { console.error("Login failed:", error); loginError.textContent = `Falha: ${error.message}`; loginError.style.display = 'block'; } finally { btnSubmit.disabled = false; btnSubmit.innerHTML = 'Entrar'; } }




  /** Manipula o logout do usuário. */
  handleLogout() { console.log("Handling logout..."); this.state.token = null; this.state.currentUser = null; localStorage.removeItem('authToken'); localStorage.removeItem('currentUser'); if (this.ui.employeeSelectMobile?.length > 0) { this.ui.employeeSelectMobile.val(null).trigger('change'); this.ui.employeeSelectMobile.prop('disabled', true); } this._updateView(); this.resetDashboardState(); console.log("Logout complete."); }




  // --- Lógica do Dashboard ---
  /** Reseta o estado visual do dashboard (status, saldo, botões). */
  resetDashboardState() {
    console.log("Resetting dashboard state (mobile)..."); this.state.selectedEmployeeId = null; this.state.todayRecord = null; if (this.ui.employeeSelectMobile?.length > 0) { this.ui.employeeSelectMobile.val(null).trigger('change'); } if (this.ui.statusPlaceholderMobile) { this.ui.statusPlaceholderMobile.textContent = 'Carregando...'; this.ui.statusPlaceholderMobile.style.display = 'block'; } if (this.ui.statusDetailsMobile) this.ui.statusDetailsMobile.style.display = 'none'; if (this.ui.statusEntradaMobile) this.ui.statusEntradaMobile.textContent = '--:--'; if (this.ui.statusSaidaAlmocoMobile) this.ui.statusSaidaAlmocoMobile.textContent = '--:--'; if (this.ui.statusRetornoAlmocoMobile) this.ui.statusRetornoAlmocoMobile.textContent = '--:--'; if (this.ui.statusSaidaMobile) this.ui.statusSaidaMobile.textContent = '--:--'; if (this.ui.statusTotalHorasMobile) this.ui.statusTotalHorasMobile.textContent = '-.-- h'; if (this.ui.statusDateMobile) this.ui.statusDateMobile.textContent = '--/--'; if (this.ui.summaryLoadingMobile) { this.ui.summaryLoadingMobile.style.display = 'block'; this.ui.summaryLoadingMobile.innerHTML = `<span class="spinner-border spinner-border-sm"></span>`; }
    if (this.ui.summaryContent) this.ui.summaryContent.style.display = 'none'; // Usa a referência cacheada correta
    const summaryContentElement = document.getElementById('summaryContent');
    if (summaryContentElement) summaryContentElement.style.display = 'none';
    if (this.ui.summaryContentMobile) this.ui.summaryContentMobile.style.display = 'none'; if (this.ui.summaryBalanceMobile) this.ui.summaryBalanceMobile.textContent = '--:--'; this._setPointButtonsDisabled(true);
  }




  /** Ponto de entrada para atualizar todo o dashboard (status e resumo). */
  async fetchAndUpdateDashboard() { if (!this.state.currentUser) { console.warn("fetchAndUpdateDashboard: currentUser is null."); return; } console.log("Updating Dashboard..."); this.resetDashboardState(); let initialEmployeeId = this.state.currentUser.id; if (this.state.currentUser.role === 'admin') { if (this.ui.employeeSelectContainerMobile) this.ui.employeeSelectContainerMobile.style.display = 'block'; if (this.ui.employeeSelectMobile?.length > 0) this.ui.employeeSelectMobile.prop('disabled', false); await this.loadEmployeeListForAdmin(); initialEmployeeId = this.ui.employeeSelectMobile?.length > 0 ? (parseInt(this.ui.employeeSelectMobile.val(), 10) || this.state.currentUser.id) : this.state.currentUser.id; } else { if (this.ui.employeeSelectContainerMobile) this.ui.employeeSelectContainerMobile.style.display = 'none'; if (this.ui.employeeSelectMobile?.length > 0) this.ui.employeeSelectMobile.prop('disabled', true); initialEmployeeId = this.state.currentUser.id; } this.state.selectedEmployeeId = initialEmployeeId; if (this.ui.employeeSelectMobile?.length > 0) { this.ui.employeeSelectMobile.val(this.state.selectedEmployeeId).trigger('change.select2'); } if (this.ui.actionUserName) { this.ui.actionUserName.textContent = `Para: ${this.state.currentUser.id === this.state.selectedEmployeeId ? 'Você' : (this.state.employeeList.find(e => e.id === this.state.selectedEmployeeId)?.fullName || 'Desconhecido')}`; } await this.fetchAndUpdateStatus(); await this.fetchAndUpdateSummary(); }




  /** Manipula a mudança de seleção no dropdown de funcionários (admin). */
  handleEmployeeSelectionChange() { if (!this.state.selectedEmployeeId) { this.state.selectedEmployeeId = this.state.currentUser?.id; if (this.ui.employeeSelectMobile?.length > 0) { this.ui.employeeSelectMobile.val(this.state.selectedEmployeeId).trigger('change.select2'); } } if (!this.state.selectedEmployeeId) { this.resetDashboardState(); return; } console.log("Selection changed to employeeId:", this.state.selectedEmployeeId); if (this.ui.actionUserName) { this.ui.actionUserName.textContent = `Para: ${this.state.currentUser.id === this.state.selectedEmployeeId ? 'Você' : (this.state.employeeList.find(e => e.id === this.state.selectedEmployeeId)?.fullName || 'Desconhecido')}`; } this.fetchAndUpdateStatus(); this.fetchAndUpdateSummary(); }




  /** Busca o registro de ponto do dia para o funcionário selecionado. */
  async fetchAndUpdateStatus() { const targetEmployeeId = this.state.selectedEmployeeId; if (!targetEmployeeId) { console.warn("fetchAndUpdateStatus: targetId missing."); if (this.ui.statusPlaceholderMobile) { /*...*/ } this.updateActionButtons(); return; } console.log(`Fetching status for ${targetEmployeeId}`); if (this.ui.statusPlaceholderMobile) { /*...*/ } if (this.ui.statusDetailsMobile) this.ui.statusDetailsMobile.style.display = 'none'; this._setPointButtonsDisabled(true); try { let url = ''; if (targetEmployeeId === this.state.currentUser?.id) { url = '/api/time-records/today'; } else if (this.state.currentUser?.role === 'admin') { await this.fetchHistoryAndFindToday(targetEmployeeId); this.updateStatusUI(); this.updateActionButtons(); return; } else { throw new Error("Unauthorized."); } const response = await this.fetchWithAuth(url); if (!response) return; const result = await response.json(); if (!response.ok) { if (response.status === 404) { this.state.todayRecord = null; } else { throw new Error(result.message || `Err ${response.status}`); } } else { this.state.todayRecord = result.data; } this.updateStatusUI(); this.updateActionButtons(); } catch (error) { if (error.message !== 'Não autorizado') { console.error(`Err fetch status ${targetEmployeeId}:`, error); this.showAlert('danger', `Falha status: ${error.message}`); if (this.ui.statusPlaceholderMobile) this.ui.statusPlaceholderMobile.textContent = 'Erro status.'; } if (this.ui.statusPlaceholderMobile) this.ui.statusPlaceholderMobile.style.display = 'block'; if (this.ui.statusDetailsMobile) this.ui.statusDetailsMobile.style.display = 'none'; this.updateActionButtons(); } }




  /** Busca o histórico via API se o admin selecionar outro funcionário. */
  async fetchHistoryAndFindToday(employeeId) { this.state.todayRecord = null; try { const response = await this.fetchWithAuth(`/api/time-records/employee/${employeeId}`); if (!response) return; const result = await response.json(); if (!response.ok) throw new Error(result.message || `Err ${response.status}`); const todayStr = new Date().toISOString().split('T')[0]; this.state.todayRecord = result.data?.find(r => r.startTime?.startsWith(todayStr)) || null; } catch (error) { if (error.message !== 'Não autorizado') { console.error(`Err fetch history ${employeeId}:`, error); this.showAlert('danger', `Falha histórico: ${error.message}`); } } }



  /** Atualiza a seção de status da UI com os dados do `this.state.todayRecord`. */
  updateStatusUI() { const record = this.state.todayRecord; if (!this.ui.statusPlaceholderMobile || !this.ui.statusDetailsMobile || !this.ui.statusEntradaMobile || !this.ui.statusSaidaAlmocoMobile || !this.ui.statusRetornoAlmocoMobile || !this.ui.statusSaidaMobile || !this.ui.statusTotalHorasMobile || !this.ui.statusDateMobile) { console.error("Mobile status UI elements missing."); return; } if (this.ui.statusDateMobile) this.ui.statusDateMobile.textContent = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }); if (!record) { this.ui.statusPlaceholderMobile.textContent = 'Nenhum registro hoje.'; this.ui.statusPlaceholderMobile.style.display = 'block'; this.ui.statusDetailsMobile.style.display = 'none'; } else { this.ui.statusPlaceholderMobile.style.display = 'none'; this.ui.statusDetailsMobile.style.display = 'block'; this.ui.statusEntradaMobile.textContent = this.formatTime(record.startTime); this.ui.statusSaidaAlmocoMobile.textContent = this.formatTime(record.lunchStartTime); this.ui.statusRetornoAlmocoMobile.textContent = this.formatTime(record.lunchEndTime); this.ui.statusSaidaMobile.textContent = this.formatTime(record.endTime); this.ui.statusTotalHorasMobile.textContent = record.totalHours ? `${parseFloat(record.totalHours).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} h` : '-.-- h'; } }




  /** Habilita/Desabilita os botões de ponto com base no registro atual e se é o usuário logado. */
  updateActionButtons() { console.log("[UpdateButtons] Updating action buttons (Mobile)..."); const record = this.state.todayRecord; const canPerformActions = this.state.currentUser?.id === this.state.selectedEmployeeId; console.log(`[UpdateButtons] canPerformActions: ${canPerformActions}, todayRecord:`, record ? 'Exists' : 'null'); if (!this.ui.btnEntradaMobile || !this.ui.btnSaidaAlmocoMobile || !this.ui.btnRetornoAlmocoMobile || !this.ui.btnSaidaMobile) { console.error("[UpdateButtons] Mobile action buttons not found."); return; } const btnEntradaDisabled = !canPerformActions || !!record; const btnSaidaAlmocoDisabled = !canPerformActions || !record || !!record?.lunchStartTime || !!record?.endTime; const btnRetornoAlmocoDisabled = !canPerformActions || !record || !record?.lunchStartTime || !!record?.lunchEndTime || !!record?.endTime; const btnSaidaDisabled = !canPerformActions || !record || !!record?.endTime; this.ui.btnEntradaMobile.disabled = btnEntradaDisabled; this.ui.btnSaidaAlmocoMobile.disabled = btnSaidaAlmocoDisabled; this.ui.btnRetornoAlmocoMobile.disabled = btnRetornoAlmocoDisabled; this.ui.btnSaidaMobile.disabled = btnSaidaDisabled; console.log(`[UpdateButtons] Final state (Mobile): Entrada(${!btnEntradaDisabled}), SaidaAlmoco(${!btnSaidaAlmocoDisabled}), RetornoAlmoco(${!btnRetornoAlmocoDisabled}), Saida(${!btnSaidaDisabled})`); }



  /** Envia a requisição para registrar um ponto (check-in, lunch-start, etc.). */
  async registrarPonto(tipoAcao) { if (this.state.selectedEmployeeId !== this.state.currentUser?.id) { this.showAlert('warning', 'Só pode registrar seu ponto.'); return; } console.log(`Registrando ${tipoAcao} para ${this.state.currentUser.id}`); let url = ''; const options = { method: 'POST' }; switch (tipoAcao) { case 'check-in': url = '/api/time-records/check-in'; break; case 'lunch-start': url = '/api/time-records/lunch-start'; break; case 'lunch-end': url = '/api/time-records/lunch-end'; break; case 'check-out': url = '/api/time-records/check-out'; break; default: this.showAlert('danger', 'Ação desconhecida.'); return; } this._setPointButtonsDisabled(true); try { const response = await this.fetchWithAuth(url, options); if (!response) return; const result = await response.json(); if (!response.ok || !result.success) throw new Error(result.message || `Erro ${response.status}`); this.showAlert('success', `${this.getTipoNome(tipoAcao)} registrado!`); await this.fetchAndUpdateStatus(); } catch (error) { if (error.message !== 'Não autorizado') { console.error(`Erro ${tipoAcao}:`, error); this.showAlert('danger', `Falha ${tipoAcao}: ${error.message}`); } await this.fetchAndUpdateStatus(); } }




  /** Helper para desabilitar/habilitar todos os botões de ponto de uma vez. */




  /** Busca e atualiza a seção de resumo do saldo de horas. */
  _setPointButtonsDisabled(isDisabled) { if (this.ui.btnEntradaMobile) this.ui.btnEntradaMobile.disabled = isDisabled; if (this.ui.btnSaidaAlmocoMobile) this.ui.btnSaidaAlmocoMobile.disabled = isDisabled; if (this.ui.btnRetornoAlmocoMobile) this.ui.btnRetornoAlmocoMobile.disabled = isDisabled; if (this.ui.btnSaidaMobile) this.ui.btnSaidaMobile.disabled = isDisabled; }
  async fetchAndUpdateSummary() {
    console.log("[PontoApp] Atualizando resumo do saldo...");

    // Verificação robusta dos elementos
    if (!this.ui.summaryLoadingMobile || !this.ui.summaryContent || !this.ui.summaryBalanceMobile) {
      console.error("[PontoApp] Elementos do resumo não encontrados:", {
        loading: !!this.ui.summaryLoadingMobile,
        content: !!this.ui.summaryContent,
        balance: !!this.ui.summaryBalanceMobile
      });
      return;
    }

    try {
      // Mostra o loading e esconde o conteúdo
      this.ui.summaryLoadingMobile.style.display = 'block';
      this.ui.summaryContent.style.display = 'none';

      // Verifica se há um funcionário selecionado
      if (!this.state.selectedEmployeeId) {
        this.ui.summaryLoadingMobile.innerHTML = '<span class="text-warning">Selecione um funcionário</span>';
        return;
      }

      // Determina a URL da API
      const isCurrentUser = this.state.selectedEmployeeId === this.state.currentUser?.id;
      const url = `/api/employees/${isCurrentUser ? 'me' : this.state.selectedEmployeeId}`;

      // Faz a requisição
      const response = await this.fetchWithAuth(url);

      if (!response.ok) {
        throw new Error(response.statusText || 'Erro ao buscar saldo');
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Erro na resposta da API');
      }

      // Processa o saldo
      const balance = parseFloat(result.data?.hourBalance || 0);
      const formattedBalance = balance.toFixed(2);
      const balanceClass = balance > 0 ? 'balance-positive' :
        balance < 0 ? 'balance-negative' : 'balance-zero';

      // Atualiza a UI
      this.ui.summaryBalanceMobile.textContent = `${formattedBalance}h`;
      this.ui.summaryBalanceMobile.className = `fw-bold ${balanceClass}`;

      // Esconde o loading e mostra o conteúdo
      this.ui.summaryLoadingMobile.style.display = 'none';
      this.ui.summaryContent.style.display = 'block';

    } catch (error) {
      console.error("[PontoApp] Erro ao atualizar resumo:", error);

      // Mostra mensagem de erro no elemento de loading
      if (this.ui.summaryLoadingMobile) {
        this.ui.summaryLoadingMobile.innerHTML =
          `<span class="text-danger">Erro: ${error.message}</span>`;
      }

      // Garante que o conteúdo fique escondido em caso de erro
      if (this.ui.summaryContent) {
        this.ui.summaryContent.style.display = 'none';
      }
    }
  }

  async showProfileModal(employeeId) { console.log(`[ProfileModal] Attempting show for ID: ${employeeId}`); if (!employeeId) { console.warn("showProfileModal: employeeId missing."); return; } const profileModalInstance = this._ensureModalInstance('profileModal'); if (!profileModalInstance) { console.error("Profile Modal could not be initialized."); this.showAlert('danger', 'Erro perfil.'); return; } this.state.viewingEmployeeId = employeeId; if (this.ui.profileModalLabel) this.ui.profileModalLabel.textContent = "Carregando..."; if (this.ui.profileModalBody) this.ui.profileModalBody.innerHTML = `<div class="text-center p-5"><span class="spinner-border"></span></div>`; if (this.ui.profileAdminActions) this.ui.profileAdminActions.style.display = 'none'; this._setupAllModalEventListeners(); console.log("[ProfileModal] Calling .show()"); try { profileModalInstance.show(); } catch (e) { console.error("Error calling .show():", e); this.showAlert('danger', 'Erro abrir perfil.'); return; } await this._loadProfileData(employeeId); }


  /** Renderiza o conteúdo HTML dentro do modal de perfil com base nos dados carregados. */

  renderProfileModalContent(employee, history = []) {
    console.log("[ProfileModal] Renderizando conteúdo...");

    const modalElement = this.ui.profileModalElement;
    if (!modalElement) return;

    const modalLabel = modalElement.querySelector('#profileModalLabel');
    const modalBody = modalElement.querySelector('#profileModalBody');
    const adminActions = modalElement.querySelector('#profileAdminActions'); // Ações do perfil do funcionário

    if (!modalLabel || !modalBody) {
      console.error("[ProfileModal] Elementos para renderização não encontrados");
      return;
    }

    // Verifica se o usuário logado é admin (para mostrar botões de ação no histórico)
    const isAdmin = this.state.currentUser?.role === 'admin';

    try {
      // ... (cálculo de idade, formatação de saldo como antes) ...
      let age = 'N/A';
      if (employee.birthDate) { /* ... cálculo idade ... */ }
      const balance = parseFloat(employee.hourBalance || 0);
      const formattedBalance = balance.toLocaleString('pt-BR', { /*...*/ });
      let balanceText = `${formattedBalance}h`;
      let balanceClass = 'balance-zero';
      if (balance > 0.01) { balanceText = `+${balanceText}`; balanceClass = 'balance-positive'; }
      else if (balance < -0.01) { balanceClass = 'balance-negative'; }


      // Prepara histórico - AGORA INCLUINDO AÇÕES PARA ADMIN
      let historyHtml = `
          <p class="text-muted text-center small my-3">
              Nenhum registro finalizado nos últimos 7 dias.
          </p>
      `;

      if (history.length > 0) {
        historyHtml = `
              <div class="table-responsive">
                  <table class="table table-sm table-striped" id="balanceHistoryTable">
                      <thead>
                          <tr>
                              <th>Data</th>
                              <th>Trabalhado</th>
                              <th>Meta</th>
                              <th>Saldo Dia</th>
                              ${isAdmin ? '<th>Ações</th>' : ''}  <!-- Coluna Ações para Admin -->
                          </tr>
                      </thead>
                      <tbody>
                          ${history.map(h => `
                              <tr>
                                  <td>${new Date(h.date).toLocaleDateString('pt-BR')}</td>
                                  <td>${h.workedHours}h</td>
                                  <td>${h.dailyGoal}h</td>
                                  <td class="${parseFloat(h.dailyBalance) > 0.01 ? 'balance-positive' : (parseFloat(h.dailyBalance) < -0.01 ? 'balance-negative' : '')}">
                                      ${parseFloat(h.dailyBalance) > 0.01 ? '+' : ''}${h.dailyBalance}h
                                  </td>
                                  ${isAdmin ? `
                                  <td class="text-end">
                                      <button class="btn btn-outline-danger btn-sm delete-record-btn"
                                              data-record-id="${h.id}"
                                              data-employee-id="${employee.id}"
                                              title="Excluir Registro">
                                          <i class="fas fa-trash-alt"></i>
                                      </button>
                                      <!-- Adicionar botão de Editar aqui se necessário -->
                                      <!-- <button class="btn btn-outline-primary btn-sm edit-record-btn" data-record-id="${h.id}" title="Editar Registro"><i class="fas fa-edit"></i></button> -->
                                  </td>
                                  ` : ''}
                              </tr>
                          `).join('')}
                      </tbody>
                  </table>
              </div>
          `;
      }

      // --- Monta o HTML completo (igual antes) ---
      modalLabel.textContent = `Perfil de ${employee.fullName}`;
      modalBody.innerHTML = `
           <div class="row mb-4">
               <div class="col-md-4 text-center">
                   <img src="${employee.photoUrl || 'assets/default-avatar.png'}" alt="Foto" class="img-fluid rounded-circle mb-3 profile-photo" onerror="this.src='assets/default-avatar.png'">
                   <span class="badge bg-${employee.isActive ? 'success' : 'danger'}">
                       ${employee.isActive ? 'Ativo' : 'Inativo'}
                   </span>
               </div>
               <div class="col-md-8">
                   <h3>${employee.fullName}</h3>
                   <p class="text-muted">${employee.role}</p>
                   <div class="mb-3">
                       <p><i class="fas fa-envelope me-2"></i> ${employee.email}</p>
                       <p><i class="fas fa-birthday-cake me-2"></i> ${age} anos</p>
                       <p><i class="fas fa-calendar-alt me-2"></i> Admitido em: ${employee.hireDate ? new Date(employee.hireDate).toLocaleDateString('pt-BR') : 'N/A'}</p>
                       <p><i class="fas fa-clock me-2"></i> Carga horária: ${employee.weeklyHours}h/semana</p>
                   </div>
                   <hr>
                   <div class="mb-4">
                       <h5>Saldo Banco de Horas</h5>
                       <h2 class="${balanceClass}">${balanceText}</h2>
                   </div>
               </div>
           </div>
           <h5>Histórico Recente (Últimos 7 dias)</h5>
           ${historyHtml}
       `; // Fim do innerHTML

      // --- Configura ações administrativas do PERFIL (Ativar/Desativar, Editar Perfil) ---
      if (adminActions && isAdmin) {
        adminActions.style.display = 'block';
        const toggleBtn = adminActions.querySelector('#btnToggleActiveStatus');
        // ... (lógica do botão toggle como antes) ...
        if (toggleBtn) { /* ... */ }
      } else if (adminActions) {
        adminActions.style.display = 'none';
      }

      // --- ADICIONA LISTENERS AOS BOTÕES DE EXCLUIR NO HISTÓRICO ---
      if (isAdmin) {
        modalBody.querySelectorAll('.delete-record-btn').forEach(button => {
          // Verifica se já tem listener para evitar duplicidade
          if (!button.listenerAttached) {
            button.addEventListener('click', (e) => {
              const recordId = e.currentTarget.dataset.recordId;
              const employeeId = e.currentTarget.dataset.employeeId;
              if (confirm(`Tem certeza que deseja excluir o registro de ponto ID ${recordId}? Esta ação ajustará o saldo acumulado.`)) {
                this.handleDeleteRecord(recordId, employeeId); // Chama a função de exclusão
              }
            });
            button.listenerAttached = true; // Marca que o listener foi adicionado
          }
        });
        // Adicionar listeners para botões de edição aqui se implementados
      }

    } catch (error) {
      console.error("[ProfileModal] Erro ao renderizar:", error);
      modalBody.innerHTML = `<div class="alert alert-danger">Erro ao exibir perfil: ${error.message}</div>`;
    }
  }
  async _loadProfileData(employeeId) { try { const empResponse = await this.fetchWithAuth(`/api/employees/${employeeId}`); if (!empResponse) return; const empResult = await empResponse.json(); if (!empResponse.ok || !empResult.success) throw new Error(`Erro Perfil: ${empResult.message || empResponse.statusText}`); const employee = empResult.data; if (!employee) throw new Error("Dados funcionário API vazios."); const endDate = new Date(); const startDate = new Date(); startDate.setDate(endDate.getDate() - 7); const histUrl = `/api/time-records/employee/${employeeId}/balance-history?startDate=${this.formatDateISO(startDate)}&endDate=${this.formatDateISO(endDate)}`; const histResponse = await this.fetchWithAuth(histUrl); let history = []; if (histResponse) { const histResult = await histResponse.json(); if (histResponse.ok && histResult.success) { history = histResult.data; } else { console.warn(`Falha histórico saldo: ${histResult?.message}`); } } this.renderProfileModalContent(employee, history); } catch (error) { if (error.message !== 'Não autorizado') { console.error("Erro carregar dados perfil:", error); if (this.ui.profileModalBody) { this.ui.profileModalBody.innerHTML = `<div class="alert alert-danger m-3">Erro: ${error.message}</div>`; } } } }



  /** (Admin) Edita o perfil a partir do botão no modal de perfil. */
  editProfileFromModal() { if (!this.state.viewingEmployeeId) return; const profileModal = this.ui.profileModal; const employeeFormModal = this.ui.employeeFormModal; if (!profileModal || !employeeFormModal) { console.error("Modal instances missing."); this.showAlert('danger', 'Erro ao editar.'); return; } profileModal.hide(); const editButton = document.createElement('button'); editButton.dataset.employeeId = this.state.viewingEmployeeId; setTimeout(() => { employeeFormModal.show(editButton); }, 200); }



  /** (Admin) Ativa/Desativa um funcionário a partir do botão no modal de perfil. */
  async toggleActiveStatusFromModal() { const employeeId = this.state.viewingEmployeeId; if (!employeeId || this.state.currentUser?.role !== 'admin') return; const profileStatusBadge = this.ui.profileModalBody?.querySelector('.badge'); const currentIsActive = profileStatusBadge?.classList.contains('bg-success'); const newStatus = !currentIsActive; const actionText = newStatus ? 'ativar' : 'desativar'; if (!confirm(`Confirmar ${actionText} ${employeeId}?`)) return; try { const response = await this.fetchWithAuth(`/api/employees/${employeeId}/status`, { method: 'PATCH', body: JSON.stringify({ isActive: newStatus }) }); if (!response) return; const result = await response.json(); if (!response.ok || !result.success) throw new Error(result.message || `Erro ${response.status}`); this.showAlert('success', `Funcionário ${actionText}do.`); this.showProfileModal(employeeId); if (this.state.currentView === 'admin') { this.loadAndDisplayAdminEmployeeList(); } } catch (error) { if (error.message !== 'Não autorizado') { console.error(`Erro ${actionText}:`, error); this.showAlert('danger', `Falha ${actionText}: ${error.message}`); } } }
  async loadAndDisplayAdminEmployeeList() {
    if (this.state.currentUser?.role !== 'admin') return;
    if (!this.ui.employeeListTableBody) {
      console.error("Admin table body missing.");
      return;
    }

    this.ui.employeeListTableBody.innerHTML = `<tr><td colspan="6" class="text-center"><span class="spinner-border spinner-border-sm"></span> Carregando funcionários...</td></tr>`;

    try {
      // URL SEM paginação
      const url = '/api/employees?active=all'; // Ou apenas /api/employees se não precisar do filtro 'all'
      const response = await this.fetchWithAuth(url);
      if (!response) return;

      const result = await response.json();
      if (!response.ok || !result.success) {
        // Se a resposta paginada foi mantida no backend por engano, pode dar erro aqui
        if (result.data && result.data.pagination) {
          throw new Error("API ainda está retornando dados paginados inesperadamente.");
        }
        throw new Error(result.message || `Erro ${response.status}`);
      }

      // Assume que result.data é a lista direta de funcionários agora
      this.state.employeeList = result.data;

      this.renderAdminEmployeeTable(); // Renderiza a tabela com todos
      // NÃO renderiza controles de paginação


    } catch (error) {
      if (error.message !== 'Não autorizado') {
        console.error("Error loading admin list:", error);
        this.ui.employeeListTableBody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">Erro ao carregar funcionários: ${error.message}</td></tr>`;
      }
    }
  }


  /** (Admin) Deleta um registro de ponto a partir do botão no modal de perfil (histórico). */
  async handleDeleteRecord(recordId, employeeIdToRefresh) { console.log(`[Admin] Deleting record ID: ${recordId}`); if (!this.state.currentUser || this.state.currentUser.role !== 'admin') { this.showAlert('danger', 'Permissão negada.'); return; } try { const response = await this.fetchWithAuth(`/api/time-records/${recordId}`, { method: 'DELETE' }); if (!response) return; const result = await response.json(); if (!response.ok || !result.success) { throw new Error(result.message || `Erro ${response.status}`); } this.showAlert('success', 'Registro removido.'); if (this.ui.profileModalElement?.classList.contains('show')) { this.showProfileModal(employeeIdToRefresh); } if (this.state.currentView === 'admin') { this.loadAndDisplayAdminEmployeeList(); } if (this.state.currentView === 'dashboard' && this.state.selectedEmployeeId === employeeIdToRefresh) { this.fetchAndUpdateSummary(); } } catch (error) { if (error.message !== 'Não autorizado') { console.error(`Error deleting record ${recordId}:`, error); this.showAlert('danger', `Falha ao remover: ${error.message}`); } } }



  /** Renderiza a tabela de funcionários na área de administração. */
  renderAdminEmployeeTable() { if (!this.ui.employeeListTableBody) return; if (this.state.employeeList.length === 0) { this.ui.employeeListTableBody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">Nenhum funcionário.</td></tr>`; return; } this.ui.employeeListTableBody.innerHTML = this.state.employeeList.map(emp => `<tr><td><a href="#" class="link-primary view-profile" data-employee-id="${emp.id}">${emp.fullName || 'N/A'}</a></td><td>${emp.email || '-'}</td><td>${emp.role || '-'}</td><td><span class="badge bg-${emp.isActive ? 'success' : 'secondary'}">${emp.isActive ? 'Ativo' : 'Inativo'}</span></td><td>${parseFloat(emp.hourBalance || 0).toLocaleString('pt-BR', { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 })}h</td><td><div class="btn-group btn-group-sm">${/* Botões Ações */''}</div></td></tr>`).join(''); console.log("[AdminTable] Attaching listeners..."); this.ui.employeeListTableBody.querySelectorAll('.view-profile').forEach(btn => { btn.addEventListener('click', (e) => { e.preventDefault(); this.showProfileModal(parseInt(e.currentTarget.dataset.employeeId, 10)); }); }); this.ui.employeeListTableBody.querySelectorAll('tr').forEach((row, index) => { const emp = this.state.employeeList[index]; const actionsCell = row.querySelector('td:last-child .btn-group'); if (actionsCell) { actionsCell.innerHTML = `<button type="button" class="btn btn-outline-secondary view-profile-btn" title="Ver Perfil"><i class="fas fa-eye"></i></button><button type="button" class="btn btn-outline-primary edit-employee" title="Editar" data-bs-toggle="modal" data-bs-target="#employeeFormModal" data-employee-id="${emp.id}"><i class="fas fa-edit"></i></button><button type="button" class="btn ${emp.isActive ? 'btn-outline-danger' : 'btn-outline-success'} toggle-status" title="${emp.isActive ? 'Desativar' : 'Ativar'}" data-current-status="${emp.isActive}"><i class="fas fa-power-off"></i></button>`; actionsCell.querySelector('.view-profile-btn').addEventListener('click', () => this.showProfileModal(emp.id)); actionsCell.querySelector('.toggle-status').addEventListener('click', async () => { const newStatus = !emp.isActive; const actionText = newStatus ? 'ativar' : 'desativar'; if (!confirm(`Confirmar ${actionText} ${emp.fullName}?`)) return; try { const response = await this.fetchWithAuth(`/api/employees/${emp.id}/status`, { method: 'PATCH', body: JSON.stringify({ isActive: newStatus }) }); if (!response) return; const result = await response.json(); if (!response.ok || !result.success) throw new Error(result.message || `Erro ${response.status}`); this.showAlert('success', `Funcionário ${actionText}do.`); this.loadAndDisplayAdminEmployeeList(); } catch (error) { if (error.message !== 'Não autorizado') this.showAlert('danger', `Erro ao ${actionText}: ${error.message}`); } }); } }); }



  /** Prepara o formulário no modal de funcionário (para criar ou editar). */
  prepareEmployeeForm(employeeId = null) { const employeeFormModal = this.ui.employeeFormModal; if (!employeeFormModal) { console.error("Modal form func. não init."); return; } this._setupAllModalEventListeners(); if (!this.ui.employeeForm || !this.ui.employeeFormModalLabel || !this.ui.btnSaveChangesEmployee || !this.ui.passwordFieldContainer || !this.ui.employeePassword || !this.ui.passwordHelp || !this.ui.employeeEmail || !this.ui.employeeFormError) { console.error("Elementos form func. não encontrados."); return; } this.ui.employeeForm.reset(); this.ui.employeeForm.classList.remove('was-validated'); this.ui.employeeFormError.style.display = 'none'; this.ui.employeeId.value = employeeId || ''; if (employeeId) { this.ui.employeeFormModalLabel.textContent = "Editar Funcionário"; this.ui.btnSaveChangesEmployee.textContent = "Salvar Alterações"; this.ui.passwordFieldContainer.style.display = 'block'; this.ui.employeePassword.required = false; this.ui.passwordHelp.textContent = 'Deixe em branco para não alterar.'; this.ui.employeeEmail.disabled = true; const employee = this.state.employeeList.find(emp => emp.id === employeeId); if (employee) { Object.keys(employee).forEach(key => { const input = this.ui.employeeForm.elements[key]; if (input) { if (input.type === 'date') input.value = this.formatDateISO(employee[key]); else input.value = employee[key]; } }); } } else { this.ui.employeeFormModalLabel.textContent = "Cadastrar Novo Funcionário"; this.ui.btnSaveChangesEmployee.textContent = "Cadastrar Funcionário"; this.ui.passwordFieldContainer.style.display = 'block'; this.ui.employeePassword.required = true; this.ui.passwordHelp.textContent = 'Mínimo 6 caracteres.'; this.ui.employeeEmail.disabled = false; } }



  /** Manipula o salvamento (criação ou atualização) do formulário de funcionário. */
  async handleSaveEmployeeForm() { const employeeFormModal = this.ui.employeeFormModal; if (!employeeFormModal) { console.error("Modal form func. não init."); return; } this._setupAllModalEventListeners(); if (!this._validateEmployeeForm()) { if (this.ui.employeeFormError) { this.ui.employeeFormError.textContent = 'Corrija os campos inválidos.'; this.ui.employeeFormError.style.display = 'block'; } return; } if (this.ui.employeeFormError) this.ui.employeeFormError.style.display = 'none'; const employeeId = this.ui.employeeId.value; const isEditing = !!employeeId; const formData = new FormData(this.ui.employeeForm); const data = Object.fromEntries(formData.entries()); if (isEditing && !data.password) { delete data.password; } if (!data.birthDate) { delete data.birthDate; } else { data.birthDate = this.formatDateISO(new Date(data.birthDate + 'T00:00:00')); } if (!data.hireDate) { delete data.hireDate; } else { data.hireDate = this.formatDateISO(new Date(data.hireDate + 'T00:00:00')); } if (!data.photoUrl) delete data.photoUrl; const url = isEditing ? `/api/employees/${employeeId}` : '/api/employees'; const method = isEditing ? 'PUT' : 'POST'; console.log(`Salvando (${method}):`, data); if (!this.ui.btnSaveChangesEmployee) { console.error("Botão Salvar não encontrado."); return; } this.ui.btnSaveChangesEmployee.disabled = true; this.ui.btnSaveChangesEmployee.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Salvando...'; try { if (isEditing) delete data.email; delete data.id; const response = await this.fetchWithAuth(url, { method: method, body: JSON.stringify(data) }); if (!response) return; const result = await response.json(); if (!response.ok || !result.success) { const fieldError = result.error?.field ? ` (Campo: ${result.error.field})` : ''; throw new Error((result.message || `Erro ${response.status}`) + fieldError); } this.showAlert('success', `Funcionário ${isEditing ? 'atualizado' : 'cadastrado'}!`); if (this.ui.employeeFormModal) this.ui.employeeFormModal.hide(); else console.warn("employeeFormModal instance unavailable."); if (this.state.currentView === 'admin') { this.loadAndDisplayAdminEmployeeList(); } } catch (error) { if (error.message !== 'Não autorizado') { console.error("Erro salvar func:", error); if (this.ui.employeeFormError) { this.ui.employeeFormError.textContent = `Erro: ${error.message}`; this.ui.employeeFormError.style.display = 'block'; } } } finally { if (this.ui.btnSaveChangesEmployee) { this.ui.btnSaveChangesEmployee.disabled = false; this.ui.btnSaveChangesEmployee.innerHTML = isEditing ? 'Salvar Alterações' : 'Cadastrar Funcionário'; } } }



  /** Valida o formulário de funcionário usando validação HTML5 e customizada. */
  _validateEmployeeForm() { const form = this.ui.employeeForm; if (!form) return false; form.classList.add('was-validated'); let isValid = form.checkValidity(); if (!this.ui.employeeId?.value && !this.ui.employeePassword?.value) { if (this.ui.employeePassword) { this.ui.employeePassword.classList.add('is-invalid'); this.ui.employeePassword.setCustomValidity("Senha obrigatória."); } isValid = false; } else { if (this.ui.employeePassword) { this.ui.employeePassword.setCustomValidity(""); if (!this.ui.employeeId?.value && this.ui.employeePassword.value && !this.ui.employeePassword.checkValidity()) { isValid = false; } else if (this.ui.employeeId?.value && this.ui.employeePassword.value && !this.ui.employeePassword.checkValidity()) { isValid = false; } else { if (this.ui.employeePassword.value === '' || this.ui.employeePassword.checkValidity()) { this.ui.employeePassword.classList.remove('is-invalid'); } } } } return isValid; }




  // --- Utilitários ---
  /**
   * Wrapper para a API `fetch` que:
   * 1. Adiciona automaticamente o header 'Content-Type: application/json'.
   * 2. Adiciona o header 'Authorization: Bearer <token>' se um token existir no localStorage.
   * 3. Detecta respostas 401 (Não Autorizado), dispara logout e rejeita a promessa.
   * 4. Retorna a resposta para tratamento posterior ou rejeita em caso de erro de rede.
   *
   * @param {string} url - A URL da API a ser chamada.
   * @param {object} options - Opções do Fetch (method, body, etc.).
   * @returns {Promise<Response>} A resposta do fetch ou uma promessa rejeitada.
   */


  async fetchWithAuth(url, options = {}) {
    console.log(`fetchWithAuth: ${options.method || 'GET'} ${url}`);
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    // Lê o token DIRETAMENTE do localStorage a cada chamada
    const token = localStorage.getItem('authToken');

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      console.log(`[fetchWithAuth] Token Bearer encontrado e sendo enviado para ${url}`);
    } else {
      console.warn(`[fetchWithAuth] Token não encontrado no localStorage para ${url}. A requisição falhará se for protegida.`);
      // Não rejeita a promessa aqui, deixa a API retornar 401 se necessário.
    }

    try {
      const response = await fetch(url, { ...options, headers });
      // Tratamento global para erro 401 (Não Autorizado)
      if (response.status === 401) {
        console.error("fetchWithAuth: Erro 401 - Não autorizado detectado. Deslogando...");
        this.showAlert('danger', 'Sessão inválida ou expirada. Faça login novamente.');
        this.handleLogout(); // Força o logout
        return Promise.reject(new Error('Não autorizado')); // Rejeita a promessa para interromper
      }
      // Retorna a resposta para tratamento posterior (incluindo outros erros como 403, 404, 500)
      return response;
    } catch (networkError) {
      console.error(`fetchWithAuth: Erro de rede ou fetch para ${url}:`, networkError);
      this.showAlert('danger', `Erro de conexão ao tentar acessar a API. Verifique sua rede.`);
      return Promise.reject(networkError); // Rejeita a promessa
    }
  }



  /** Mostra um alerta Bootstrap auto-dispensável no topo da página. */
  showAlert(type, message) { if (!this.ui.alertPlaceholder) { console.error("Placeholder de alerta não encontrado."); return; } const wrapper = document.createElement('div'); const alertId = `alert-${Date.now()}`; wrapper.innerHTML = `<div id="${alertId}" class="alert alert-${type} alert-dismissible fade show" role="alert">${message}<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button></div>`; this.ui.alertPlaceholder.append(wrapper); const alertElement = document.getElementById(alertId); if (alertElement && typeof bootstrap !== 'undefined' && bootstrap.Alert) { const bsAlert = bootstrap.Alert.getOrCreateInstance(alertElement); const timeoutId = setTimeout(() => { if (document.getElementById(alertId)) { bsAlert.close(); } }, 5000); alertElement.addEventListener('closed.bs.alert', () => { clearTimeout(timeoutId); wrapper.remove(); }, { once: true }); } else { console.error("Não foi possível encontrar o elemento do alerta ou bootstrap.Alert para auto-fechamento."); setTimeout(() => wrapper.remove(), 5500); } }



  /** Formata um timestamp (ou string de data) para HH:MM. */
  formatTime(timestamp) { if (!timestamp) return '--:--'; try { const date = new Date(timestamp); if (isNaN(date.getTime())) return 'Inválido'; return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false }); } catch (e) { console.error("Erro ao formatar data:", timestamp, e); return 'Erro'; } }



  /** Retorna o nome legível para um tipo de ação de ponto. */
  getTipoNome(tipo) { const nomes = { 'check-in': 'Entrada', 'lunch-start': 'Saída Almoço', 'lunch-end': 'Retorno Almoço', 'check-out': 'Saída' }; return nomes[tipo] || tipo; }



  /** Formata um objeto Date ou string para 'YYYY-MM-DD'. */
  formatDateISO(date) { if (!date) return ''; try { if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) { return date; } if (date instanceof Date) { return date.toISOString().split('T')[0]; } const d = new Date(date); if (isNaN(d.getTime())) return ''; return d.toISOString().split('T')[0]; } catch { return ''; } }
}


// Inicializa a aplicação quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  console.log("[PontoApp] DOM carregado, iniciando aplicação...");

  if (typeof bootstrap === 'undefined') {
    console.error("[PontoApp] Bootstrap não carregado!");
    document.body.innerHTML = '<div class="alert alert-danger m-5">Erro: Bootstrap não carregado!</div>';
    return;
  }

  window.pontoApp = new PontoApp();

  if (window.pontoApp && typeof window.pontoApp._init === 'function') {
    window.pontoApp._init();
  } else {
    console.error("[PontoApp] Falha na inicialização!");
  }
});