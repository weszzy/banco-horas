// src/views/script.js
/**
 * Sistema de Controle de Ponto v1.3.0
 * Gerencia autenticação, registro de ponto, perfil e administração.
 */

class PontoApp {
  constructor() {
    this._cacheDOMElements(); // Separa o cache dos elementos
    this.state = { /* ... (estado como antes) ... */ };
    this._init();
  }

  // Separa o cache de elementos para melhor organização
  _cacheDOMElements() {
    this.ui = {
      // Navbar & Auth
      loginModal: new bootstrap.Modal(document.getElementById('loginModal')),
      loginForm: document.getElementById('loginForm'),
      loginError: document.getElementById('loginError'),
      btnLoginSubmit: document.getElementById('btnLoginSubmit'),
      authArea: document.getElementById('authArea'),
      navLinks: document.getElementById('navLinks'),
      navAdminLinks: document.getElementById('navAdminLinks'),
      linkMeuPerfil: document.getElementById('linkMeuPerfil'),
      linkGerenciarFuncionarios: document.getElementById('linkGerenciarFuncionarios'),
      // Áreas Principais
      dashboardArea: document.getElementById('dashboardArea'),
      adminArea: document.getElementById('adminArea'),
      loginPrompt: document.getElementById('loginPrompt'),
      alertPlaceholder: document.getElementById('alertPlaceholder'),
      // Dashboard: Ponto & Status
      employeeSelect: $('#employeeSelect'),
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
      employeeFormModal: new bootstrap.Modal(document.getElementById('employeeFormModal')),
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
      profileModal: new bootstrap.Modal(document.getElementById('profileModal')),
      profileModalLabel: document.getElementById('profileModalLabel'),
      profileModalBody: document.getElementById('profileModalBody'),
      profileAdminActions: document.getElementById('profileAdminActions'),
      btnEditProfile: document.getElementById('btnEditProfile'),
      btnToggleActiveStatus: document.getElementById('btnToggleActiveStatus')
    };
  }

  _init() {
    console.log("PontoApp v1.3.0 inicializando...");
    this.state = { // Reseta estado na inicialização
      token: localStorage.getItem('authToken') || null,
      currentUser: JSON.parse(localStorage.getItem('currentUser')) || null,
      selectedEmployeeId: null, // ID do funcionário sendo visualizado/registrado
      viewingEmployeeId: null, // ID do funcionário cujo perfil está aberto
      todayRecord: null,
      employeeList: [], // Cache da lista de funcionários (para admin)
      currentView: 'login' // 'login', 'dashboard', 'admin'
    };
    this._setupEventListeners();
    this._initSelect2();
    this._updateView(); // Define a visão inicial baseada na auth
  }

  _setupEventListeners() {
    // Autenticação
    this.ui.loginForm.addEventListener('submit', (e) => { e.preventDefault(); this.handleLogin(); });
    this.ui.btnLoginSubmit.addEventListener('click', () => this.handleLogin());
    // Listener de Logout é adicionado dinamicamente em _updateUIAfterLogin

    // Navegação (Links Navbar)
    this.ui.linkMeuPerfil?.addEventListener('click', (e) => { e.preventDefault(); this.showProfileModal(this.state.currentUser.id); });
    this.ui.linkGerenciarFuncionarios?.addEventListener('click', (e) => { e.preventDefault(); this.setView('admin'); });
    // Botão "+ Novo Funcionário" na navbar já tem data-bs-toggle

    // Dashboard: Registro de Ponto
    this.ui.btnEntrada.addEventListener('click', () => this.registrarPonto('check-in'));
    this.ui.btnSaidaAlmoco.addEventListener('click', () => this.registrarPonto('lunch-start'));
    this.ui.btnRetornoAlmoco.addEventListener('click', () => this.registrarPonto('lunch-end'));
    this.ui.btnSaida.addEventListener('click', () => this.registrarPonto('check-out'));
    this.ui.employeeSelect.on('change', (e) => {
      const selectedValue = $(e.target).val();
      this.state.selectedEmployeeId = selectedValue ? parseInt(selectedValue, 10) : this.state.currentUser?.id; // Volta pro user logado se limpar
      this.handleEmployeeSelectionChange();
    });
    this.ui.btnVerPerfilCompleto?.addEventListener('click', () => this.showProfileModal(this.state.selectedEmployeeId || this.state.currentUser?.id));


    // Modal Cadastro/Edição Funcionário
    this.ui.employeeForm.addEventListener('submit', (e) => { e.preventDefault(); this.handleSaveEmployeeForm(); });
    this.ui.btnSaveChangesEmployee.addEventListener('click', () => this.handleSaveEmployeeForm());
    document.getElementById('employeeFormModal').addEventListener('show.bs.modal', (e) => {
      // Verifica se veio de um botão de edição (que teria data-employee-id)
      const button = e.relatedTarget;
      const employeeId = button?.dataset.employeeId;
      this.prepareEmployeeForm(employeeId ? parseInt(employeeId, 10) : null);
    });

    // Modal Perfil
    this.ui.btnEditProfile?.addEventListener('click', () => this.editProfileFromModal());
    this.ui.btnToggleActiveStatus?.addEventListener('click', () => this.toggleActiveStatusFromModal());

    // Admin Area (Listeners adicionados dinamicamente na tabela)
  }

  _initSelect2() { /* ... (como antes) ... */ }

  // ================ CONTROLE DE VISÃO (Views) ================

  // Define qual área principal está visível
  setView(viewName) { // 'login', 'dashboard', 'admin'
    this.state.currentView = viewName;
    this.ui.loginPrompt.style.display = viewName === 'login' ? 'block' : 'none';
    this.ui.dashboardArea.style.display = viewName === 'dashboard' ? 'block' : 'none';
    this.ui.adminArea.style.display = viewName === 'admin' ? 'block' : 'none';

    // Ações específicas ao mudar de visão
    if (viewName === 'admin') {
      this.loadAndDisplayAdminEmployeeList(); // Carrega tabela admin
    } else if (viewName === 'dashboard') {
      this.fetchAndUpdateDashboard(); // Carrega dados do dashboard
    }
    // Atualiza links ativos na navbar (opcional)
    this._updateNavLinks();
  }

  _updateView() {
    if (this.state.token && this.state.currentUser) {
      this.ui.navLinks.style.display = 'block'; // Mostra links comuns
      this.ui.authArea.innerHTML = `
              <span class="navbar-text me-3">Olá, ${this.state.currentUser.fullName}</span>
              <button class="btn btn-outline-secondary btn-sm" id="btnLogout">Sair</button>`;
      document.getElementById('btnLogout')?.addEventListener('click', () => this.handleLogout());

      if (this.state.currentUser.role === 'admin') {
        this.ui.navAdminLinks.style.display = 'block'; // Mostra links admin
        // Decide a view inicial do admin (pode ser dashboard ou admin)
        this.setView(this.state.currentView === 'admin' ? 'admin' : 'dashboard');
      } else {
        this.ui.navAdminLinks.style.display = 'none'; // Esconde links admin
        this.setView('dashboard'); // Visão padrão para não-admins
      }
    } else {
      this.ui.navLinks.style.display = 'none';
      this.ui.navAdminLinks.style.display = 'none';
      this.ui.authArea.innerHTML = `<button class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#loginModal">Login</button>`;
      this.setView('login');
    }
  }

  _updateNavLinks() {
    // Remove classe 'active' de todos
    this.ui.navLinks.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
    this.ui.navAdminLinks.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
    // Adiciona 'active' ao link correspondente à view atual
    if (this.state.currentView === 'dashboard') {
      // Se houver um link específico para dashboard
    } else if (this.state.currentView === 'admin') {
      this.ui.linkGerenciarFuncionarios?.classList.add('active');
    }
    // O link "Meu Perfil" não ativa uma view principal, apenas abre modal
  }


  // ================ AUTENTICAÇÃO ================

  async handleLogin() { /* ... (como antes, mas chama _updateView() no final) ... */
    // ... (lógica de chamada API e armazenamento token/user) ...
    try {
      // ... (fetch /api/auth/login) ...
      if (!response.ok || !result.success) throw new Error(result.message || `Erro ${response.status}`);
      // ... (armazena token/user) ...
      this._updateView(); // Atualiza toda a UI com base no novo estado
    } catch (error) { /* ... (tratamento de erro) ... */ }
    finally { /* ... (reabilita botão) ... */ }
  }

  handleLogout() { /* ... (como antes, mas chama _updateView() no final) ... */
    // ... (limpa state/localStorage) ...
    this._updateView(); // Atualiza UI para o estado de login
    this.resetDashboardState(); // Limpa dados específicos do dashboard
  }

  resetDashboardState() { // Limpa apenas dados do dashboard
    this.state.selectedEmployeeId = null;
    this.state.todayRecord = null;
    this.ui.employeeSelect.val(null).trigger('change');
    // Limpa status UI
    this.ui.statusPlaceholder.textContent = 'Carregando...';
    this.ui.statusPlaceholder.style.display = 'block';
    this.ui.statusDetails.style.display = 'none';
    // Limpa resumo UI
    this.ui.summaryLoading.style.display = 'block';
    this.ui.summaryContent.style.display = 'none';
    this.ui.summaryBalance.textContent = '--:--';
    // Desabilita botões
    this._setPointButtonsDisabled(true);
  }

  // ================ DASHBOARD (Ponto, Status, Saldo) ================

  // Chamado quando a view do dashboard é carregada
  async fetchAndUpdateDashboard() {
    if (!this.state.currentUser) return;
    console.log("Atualizando Dashboard...");
    this.resetDashboardState(); // Limpa antes de carregar

    // Define o ID inicial a ser visualizado
    this.state.selectedEmployeeId = this.state.currentUser.id;
    if (this.state.currentUser.role === 'admin') {
      await this.loadEmployeeListForAdmin(); // Carrega lista para admin
      // O loadEmployeeListForAdmin pode selecionar o próprio admin por padrão
      this.state.selectedEmployeeId = parseInt(this.ui.employeeSelect.val(), 10) || this.state.currentUser.id;
    } else {
      // Garante que não-admin veja a si mesmo
      this.state.selectedEmployeeId = this.state.currentUser.id;
      this.ui.employeeSelectContainer.style.display = 'none'; // Esconde select
    }
    // Atualiza o select visualmente (caso admin)
    this.ui.employeeSelect.val(this.state.selectedEmployeeId).trigger('change.select2');


    // Busca status e saldo para o funcionário selecionado
    await this.fetchAndUpdateStatus();
    await this.fetchAndUpdateSummary();
  }


  handleEmployeeSelectionChange() { /* ... (como antes, chama fetchAndUpdateStatus e fetchAndUpdateSummary) ... */
    if (!this.state.selectedEmployeeId) {
      this.state.selectedEmployeeId = this.state.currentUser.id; // Volta para o user logado
      this.ui.employeeSelect.val(this.state.selectedEmployeeId).trigger('change.select2');
    }
    console.log("Seleção dashboard mudou para employeeId:", this.state.selectedEmployeeId);
    this.fetchAndUpdateStatus(); // Busca status
    this.fetchAndUpdateSummary(); // Busca resumo/saldo
  }

  async fetchAndUpdateStatus() { /* ... (lógica como antes para buscar /today ou histórico e chamar updateStatusUI/updateActionButtons) ... */ }
  async fetchHistoryAndFindToday(employeeId) { /* ... (como antes) ... */ }
  updateStatusUI() { /* ... (como antes) ... */ }
  updateActionButtons() { /* ... (como antes, baseada em selectedEmployeeId vs currentUser.id) ... */ }
  async registrarPonto(tipoAcao) { /* ... (como antes, agindo apenas sobre currentUser.id) ... */ }
  _setPointButtonsDisabled(isDisabled) { /* ... (como antes) ... */ }

  // Nova função para buscar e exibir o resumo/saldo
  async fetchAndUpdateSummary() {
    if (!this.state.selectedEmployeeId) return;

    this.ui.summaryLoading.style.display = 'block';
    this.ui.summaryContent.style.display = 'none';

    try {
      // A API /api/employees/me ou /api/employees/:id já retorna o hourBalance
      const url = (this.state.selectedEmployeeId === this.state.currentUser.id)
        ? '/api/employees/me'
        : `/api/employees/${this.state.selectedEmployeeId}`;

      const response = await this.fetchWithAuth(url);
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || `Erro ${response.status}`);

      const employeeData = result.data;
      const balance = parseFloat(employeeData.hourBalance || 0);
      const formattedBalance = balance.toLocaleString('pt-BR', { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 });

      // Formata com sinal e cor
      let balanceText = formattedBalance + "h";
      let balanceClass = 'balance-zero';
      if (balance > 0.01) { // Pequena margem para evitar +0.00
        balanceText = "+" + balanceText;
        balanceClass = 'balance-positive';
      } else if (balance < -0.01) {
        // O sinal negativo já está incluído por toLocaleString
        balanceClass = 'balance-negative';
      }

      this.ui.summaryBalance.textContent = balanceText;
      this.ui.summaryBalance.className = `display-4 fw-bold ${balanceClass}`; // Aplica a classe de cor

      this.ui.summaryLoading.style.display = 'none';
      this.ui.summaryContent.style.display = 'block';

    } catch (error) {
      console.error("Erro ao buscar resumo/saldo:", error);
      this.ui.summaryLoading.innerHTML = `<span class="text-danger">Erro ao carregar saldo.</span>`;
      this.ui.summaryLoading.style.display = 'block';
      this.ui.summaryContent.style.display = 'none';
      // this.showAlert('danger', `Falha ao carregar resumo: ${error.message}`);
    }
  }

  // ================ PERFIL DO FUNCIONÁRIO (Modal) ================

  async showProfileModal(employeeId) {
    if (!employeeId) return;
    this.state.viewingEmployeeId = employeeId; // Guarda ID do perfil aberto
    this.ui.profileModalLabel.textContent = "Carregando Perfil...";
    this.ui.profileModalBody.innerHTML = `<div class="text-center p-5"><span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Carregando...</div>`;
    this.ui.profileAdminActions.style.display = 'none'; // Esconde ações admin inicialmente
    this.ui.profileModal.show();

    try {
      // Busca dados completos do funcionário
      const empResponse = await this.fetchWithAuth(`/api/employees/${employeeId}`);
      const empResult = await empResponse.json();
      if (!empResponse.ok || !empResult.success) throw new Error(`Erro ao buscar dados do perfil: ${empResult.message}`);
      const employee = empResult.data;

      // Busca histórico recente de saldo (ex: últimos 7 dias)
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - 7);
      const histResponse = await this.fetchWithAuth(`/api/time-records/employee/${employeeId}/balance-history?startDate=${this.formatDateISO(startDate)}&endDate=${this.formatDateISO(endDate)}`);
      const histResult = await histResponse.json();
      if (!histResponse.ok || !histResult.success) throw new Error(`Erro ao buscar histórico de saldo: ${histResult.message}`);
      const history = histResult.data;

      // Renderiza o conteúdo do modal
      this.renderProfileModalContent(employee, history);

    } catch (error) {
      console.error("Erro ao carregar perfil:", error);
      this.ui.profileModalBody.innerHTML = `<div class="alert alert-danger">Erro ao carregar perfil: ${error.message}</div>`;
    }
  }

  renderProfileModalContent(employee, history) {
    this.ui.profileModalLabel.textContent = `Perfil de ${employee.fullName}`;

    // Calcula idade (simples)
    let age = 'N/A';
    if (employee.birthDate) {
      try {
        const birthDate = new Date(employee.birthDate);
        const today = new Date();
        age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) { age--; }
      } catch { age = 'Inválida'; }
    }

    // Formata saldo atual
    const balance = parseFloat(employee.hourBalance || 0);
    const formattedBalance = balance.toLocaleString('pt-BR', { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 });
    let balanceText = formattedBalance + "h";
    let balanceClass = 'balance-zero';
    if (balance > 0.01) { balanceText = "+" + balanceText; balanceClass = 'balance-positive'; }
    else if (balance < -0.01) { balanceClass = 'balance-negative'; }


    // Constrói HTML do Histórico
    let historyHtml = '<p class="text-muted text-center">Nenhum registro finalizado nos últimos 7 dias.</p>';
    if (history && history.length > 0) {
      historyHtml = `
               <table class="table table-sm table-striped" id="balanceHistoryTable">
                   <thead><tr><th>Data</th><th>Trabalhado</th><th>Meta</th><th>Saldo Dia</th></tr></thead>
                   <tbody>
                       ${history.map(h => `
                           <tr>
                               <td>${new Date(h.date).toLocaleDateString('pt-BR')}</td>
                               <td>${h.workedHours}h</td>
                               <td>${h.dailyGoal}h</td>
                               <td class="${parseFloat(h.dailyBalance) > 0.01 ? 'balance-positive' : (parseFloat(h.dailyBalance) < -0.01 ? 'balance-negative' : '')}">${parseFloat(h.dailyBalance) > 0 ? '+' : ''}${h.dailyBalance}h</td>
                           </tr>`).join('')}
                   </tbody>
               </table>`;
    }


    // Constrói HTML do Corpo do Modal
    this.ui.profileModalBody.innerHTML = `
          <div class="row mb-4">
               <div class="col-md-4 text-center">
                    <img src="${employee.photoUrl || 'assets/default-avatar.png'}" alt="Foto de ${employee.fullName}" class="img-fluid profile-photo mb-2" onerror="this.onerror=null; this.src='assets/default-avatar.png';">
                     <span class="badge bg-${employee.isActive ? 'success' : 'danger'}">${employee.isActive ? 'Ativo' : 'Inativo'}</span>
               </div>
               <div class="col-md-8">
                   <h4>${employee.fullName}</h4>
                   <p class="text-muted mb-1">${employee.role}</p>
                   <p><i class="fas fa-envelope fa-fw me-2"></i>${employee.email}</p>
                   <p><i class="fas fa-birthday-cake fa-fw me-2"></i>${age} anos ${employee.birthDate ? '(' + new Date(employee.birthDate).toLocaleDateString('pt-BR') + ')' : ''}</p>
                   <p><i class="fas fa-calendar-alt fa-fw me-2"></i>Admissão: ${employee.hireDate ? new Date(employee.hireDate).toLocaleDateString('pt-BR') : 'N/A'}</p>
                   <p><i class="fas fa-briefcase fa-fw me-2"></i>Carga Semanal: ${employee.weeklyHours} horas</p>
                   <hr>
                    <p class="mb-1"><strong>Saldo Banco de Horas:</strong></p>
                    <h3 class="fw-bold ${balanceClass}">${balanceText}</h3>
               </div>
          </div>

          <h5>Histórico Recente (Últimos 7 dias)</h5>
          ${historyHtml}
          <!-- TODO: Adicionar botão/link para histórico completo -->
      `;

    // Mostra/Esconde Ações de Admin no rodapé do modal
    if (this.state.currentUser.role === 'admin') {
      this.ui.profileAdminActions.style.display = 'block';
      // Atualiza o texto e a classe do botão ativar/desativar
      const btnToggle = this.ui.btnToggleActiveStatus;
      if (employee.isActive) {
        btnToggle.innerHTML = '<i class="fas fa-power-off me-1"></i> Desativar';
        btnToggle.classList.remove('btn-success');
        btnToggle.classList.add('btn-danger');
      } else {
        btnToggle.innerHTML = '<i class="fas fa-power-off me-1"></i> Ativar';
        btnToggle.classList.remove('btn-danger');
        btnToggle.classList.add('btn-success');
      }
    } else {
      this.ui.profileAdminActions.style.display = 'none';
    }
  }

  // Acionado pelo botão 'Editar Perfil' no modal de perfil
  editProfileFromModal() {
    if (!this.state.viewingEmployeeId) return;
    this.ui.profileModal.hide(); // Esconde modal de perfil
    // Abre o modal de formulário passando o ID
    // Precisamos simular o clique em um botão com o data attribute
    const editButton = document.createElement('button');
    editButton.dataset.employeeId = this.state.viewingEmployeeId;
    this.ui.employeeFormModal.show(editButton); // Passa o botão simulado
  }

  // Acionado pelo botão 'Ativar/Desativar' no modal de perfil
  async toggleActiveStatusFromModal() {
    const employeeId = this.state.viewingEmployeeId;
    if (!employeeId || this.state.currentUser.role !== 'admin') return;

    // Descobre o estado atual para inverter
    const profileStatusBadge = this.ui.profileModalBody.querySelector('.badge');
    const currentStatusIsActive = profileStatusBadge?.classList.contains('bg-success');
    const newStatus = !currentStatusIsActive;

    const actionText = newStatus ? 'ativar' : 'desativar';
    if (!confirm(`Tem certeza que deseja ${actionText} este funcionário?`)) {
      return;
    }


    try {
      const response = await this.fetchWithAuth(`/api/employees/${employeeId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: newStatus })
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || `Erro ${response.status}`);

      this.showAlert('success', `Funcionário ${actionText}do com sucesso.`);
      // Atualiza o perfil no modal após sucesso
      this.showProfileModal(employeeId);
      // Se a lista admin estiver visível, atualiza ela também
      if (this.state.currentView === 'admin') {
        this.loadAndDisplayAdminEmployeeList();
      }

    } catch (error) {
      console.error(`Erro ao ${actionText} funcionário:`, error);
      this.showAlert('danger', `Falha ao ${actionText} funcionário: ${error.message}`);
    }
  }


  // ================ GERENCIAMENTO (ADMIN) ================

  async loadAndDisplayAdminEmployeeList() {
    if (this.state.currentUser?.role !== 'admin') return;
    this.ui.employeeListTableBody.innerHTML = `<tr><td colspan="6" class="text-center"><span class="spinner-border spinner-border-sm"></span> Carregando...</td></tr>`;

    try {
      // Busca todos os funcionários (incluindo inativos)
      const response = await this.fetchWithAuth('/api/employees?active=all'); // Adicionar 'active=all' se quiser TUDO
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || `Erro ${response.status}`);

      this.state.employeeList = result.data; // Atualiza cache local
      this.renderAdminEmployeeTable();

    } catch (error) {
      console.error("Erro ao carregar lista admin:", error);
      this.ui.employeeListTableBody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">Erro ao carregar funcionários: ${error.message}</td></tr>`;
    }
  }

  renderAdminEmployeeTable() {
    if (this.state.employeeList.length === 0) {
      this.ui.employeeListTableBody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">Nenhum funcionário cadastrado.</td></tr>`;
      return;
    }

    this.ui.employeeListTableBody.innerHTML = this.state.employeeList.map(emp => `
           <tr>
               <td>
                    <a href="#" class="link-primary view-profile" data-employee-id="${emp.id}">
                        ${emp.fullName || 'Nome não definido'}
                    </a>
               </td>
               <td>${emp.email || '-'}</td>
               <td>${emp.role || '-'}</td>
               <td>
                   <span class="badge bg-${emp.isActive ? 'success' : 'secondary'}">
                       ${emp.isActive ? 'Ativo' : 'Inativo'}
                   </span>
               </td>
                <td>${parseFloat(emp.hourBalance || 0).toLocaleString('pt-BR', { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 })}h</td>
               <td>
                    <div class="btn-group btn-group-sm" role="group">
                         <button type="button" class="btn btn-outline-secondary view-profile" title="Ver Perfil" data-employee-id="${emp.id}">
                             <i class="fas fa-eye"></i>
                         </button>
                         <button type="button" class="btn btn-outline-primary edit-employee" title="Editar"
                                 data-bs-toggle="modal" data-bs-target="#employeeFormModal" data-employee-id="${emp.id}">
                             <i class="fas fa-edit"></i>
                         </button>
                           <button type="button" class="btn ${emp.isActive ? 'btn-outline-danger' : 'btn-outline-success'} toggle-status"
                                 title="${emp.isActive ? 'Desativar' : 'Ativar'}" data-employee-id="${emp.id}" data-current-status="${emp.isActive}">
                               <i class="fas fa-power-off"></i>
                          </button>
                    </div>
               </td>
           </tr>
       `).join('');

    // Adiciona listeners aos botões da tabela dinamicamente
    this.ui.employeeListTableBody.querySelectorAll('.view-profile').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        this.showProfileModal(parseInt(e.currentTarget.dataset.employeeId, 10));
      });
    });
    // Botão Editar já usa data-bs-toggle/target, o listener do modal 'show.bs.modal' cuidará de preencher o form.
    this.ui.employeeListTableBody.querySelectorAll('.toggle-status').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const button = e.currentTarget;
        const employeeId = parseInt(button.dataset.employeeId, 10);
        const currentStatus = button.dataset.currentStatus === 'true';
        const newStatus = !currentStatus;
        const actionText = newStatus ? 'ativar' : 'desativar';

        if (!confirm(`Tem certeza que deseja ${actionText} ${this.state.employeeList.find(em => em.id === employeeId)?.fullName || 'este funcionário'}?`)) return;

        try {
          // Reusa a chamada PATCH da função do modal de perfil
          const response = await this.fetchWithAuth(`/api/employees/${employeeId}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ isActive: newStatus })
          });
          const result = await response.json();
          if (!response.ok || !result.success) throw new Error(result.message || `Erro ${response.status}`);
          this.showAlert('success', `Funcionário ${actionText}do.`);
          this.loadAndDisplayAdminEmployeeList(); // Recarrega a tabela
        } catch (error) {
          this.showAlert('danger', `Erro ao ${actionText}: ${error.message}`);
        }
      });
    });
  }

  prepareEmployeeForm(employeeId = null) {
    this.ui.employeeForm.reset(); // Limpa o formulário
    this.ui.employeeForm.classList.remove('was-validated'); // Remove validação visual
    this.ui.employeeFormError.style.display = 'none'; // Esconde erro
    this.ui.employeeId.value = employeeId || ''; // Define ID oculto (ou vazio se for novo)

    if (employeeId) {
      // Modo Edição
      this.ui.employeeFormModalLabel.textContent = "Editar Funcionário";
      this.ui.btnSaveChangesEmployee.textContent = "Salvar Alterações";
      this.ui.passwordFieldContainer.style.display = 'block'; // Mostra campo senha
      this.ui.employeePassword.required = false; // Senha não é obrigatória na edição
      this.ui.passwordHelp.textContent = 'Deixe em branco para não alterar a senha.';
      this.ui.employeeEmail.disabled = true; // Não permite editar email (chave única)

      // Busca dados atuais para preencher o form
      const employee = this.state.employeeList.find(emp => emp.id === employeeId);
      if (employee) {
        this.ui.employeeFullName.value = employee.fullName || '';
        this.ui.employeeEmail.value = employee.email || '';
        this.ui.employeeRole.value = employee.role || 'employee';
        this.ui.employeeWeeklyHours.value = employee.weeklyHours || '';
        this.ui.employeeBirthDate.value = employee.birthDate || ''; // Formato YYYY-MM-DD
        this.ui.employeeHireDate.value = employee.hireDate || '';
        this.ui.employeePhotoUrl.value = employee.photoUrl || '';
      } else {
        console.error("Funcionário para edição não encontrado no cache local.");
        this.ui.employeeFormError.textContent = 'Erro: Funcionário não encontrado para edição.';
        this.ui.employeeFormError.style.display = 'block';
        // Idealmente, buscaria da API se não estivesse no cache
      }

    } else {
      // Modo Cadastro
      this.ui.employeeFormModalLabel.textContent = "Cadastrar Novo Funcionário";
      this.ui.btnSaveChangesEmployee.textContent = "Cadastrar Funcionário";
      this.ui.passwordFieldContainer.style.display = 'block';
      this.ui.employeePassword.required = true; // Senha obrigatória para novo
      this.ui.passwordHelp.textContent = 'Obrigatório para novos funcionários (mínimo 6 caracteres).';
      this.ui.employeeEmail.disabled = false; // Permite digitar email
    }
  }

  async handleSaveEmployeeForm() {
    if (!this._validateEmployeeForm()) {
      this.ui.employeeFormError.textContent = 'Por favor, corrija os campos inválidos.';
      this.ui.employeeFormError.style.display = 'block';
      return;
    }
    this.ui.employeeFormError.style.display = 'none';

    const employeeId = this.ui.employeeId.value;
    const isEditing = !!employeeId;

    const formData = new FormData(this.ui.employeeForm);
    const data = Object.fromEntries(formData.entries());

    // Remove senha se estiver vazia na edição
    if (isEditing && !data.password) {
      delete data.password;
    }
    // Remove campos de data se vazios para enviar null
    if (!data.birthDate) delete data.birthDate;
    if (!data.hireDate) delete data.hireDate;
    if (!data.photoUrl) delete data.photoUrl;


    // Define URL e Método (POST para criar, PUT para editar)
    const url = isEditing ? `/api/employees/${employeeId}` : '/api/employees';
    const method = isEditing ? 'PUT' : 'POST';

    console.log(`Salvando funcionário (${method}):`, data);

    this.ui.btnSaveChangesEmployee.disabled = true;
    this.ui.btnSaveChangesEmployee.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Salvando...';

    try {
      // Email não pode ser enviado na edição (PUT)
      if (isEditing) delete data.email;
      // ID oculto não precisa ser enviado no corpo
      delete data.id;


      const response = await this.fetchWithAuth(url, {
        method: method,
        body: JSON.stringify(data)
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        const fieldError = result.error?.field ? ` (Campo: ${result.error.field})` : '';
        throw new Error((result.message || `Erro ${response.status}`) + fieldError);
      }

      this.showAlert('success', `Funcionário ${isEditing ? 'atualizado' : 'cadastrado'} com sucesso!`);
      this.ui.employeeFormModal.hide();
      this.loadAndDisplayAdminEmployeeList(); // Recarrega a tabela admin

    } catch (error) {
      console.error("Erro ao salvar funcionário:", error);
      this.ui.employeeFormError.textContent = `Erro: ${error.message}`;
      this.ui.employeeFormError.style.display = 'block';
    } finally {
      this.ui.btnSaveChangesEmployee.disabled = false;
      this.ui.btnSaveChangesEmployee.innerHTML = isEditing ? 'Salvar Alterações' : 'Cadastrar Funcionário';
    }
  }

  _validateEmployeeForm() {
    const form = this.ui.employeeForm;
    // Adiciona classe para mostrar validação Bootstrap
    form.classList.add('was-validated');
    // Verifica validade geral
    let isValid = form.checkValidity();

    // Validação extra: senha é obrigatória apenas se for cadastro (sem ID)
    if (!this.ui.employeeId.value && !this.ui.employeePassword.value) {
      this.ui.employeePassword.classList.add('is-invalid'); // Marca como inválido
      this.ui.employeePassword.setCustomValidity("Senha é obrigatória para novo funcionário."); // Mensagem customizada (opcional)
      isValid = false;
    } else {
      this.ui.employeePassword.setCustomValidity(""); // Limpa validação customizada
      // Reavalia validade do campo de senha (minlength) se não for obrigatório e tiver valor
      if (!this.ui.employeeId.value && this.ui.employeePassword.value && !this.ui.employeePassword.checkValidity()) {
        isValid = false; // Já será pego pelo checkValidity geral, mas confirma
      } else if (this.ui.employeeId.value && this.ui.employeePassword.value && !this.ui.employeePassword.checkValidity()) {
        // Se for edição e a senha opcional foi preenchida mas é inválida
        isValid = false;
      } else {
        // Remove is-invalid se a senha opcional estiver em branco ou válida
        if (this.ui.employeePassword.value === '' || this.ui.employeePassword.checkValidity()) {
          this.ui.employeePassword.classList.remove('is-invalid');
        }

      }

    }
    return isValid;
  }


  // ================ UTILITÁRIOS ================

  async fetchWithAuth(url, options = {}) { /* ... (como antes) ... */ }
  showAlert(type, message) { /* ... (como antes) ... */ }
  formatTime(timestamp) { /* ... (como antes) ... */ }
  getTipoNome(tipo) { /* ... (como antes) ... */ }
  formatDateISO(date) { // Helper para formato YYYY-MM-DD
    if (!date) return '';
    try { return date.toISOString().split('T')[0]; }
    catch { return ''; }
  }

}

// Inicializa a aplicação
document.addEventListener('DOMContentLoaded', () => {
  window.pontoApp = new PontoApp();
});