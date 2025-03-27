/**
 * Sistema de Controle de Ponto
 * @version 1.1.0
 * @author SeuNome
 */
class PontoSystem {
  constructor() {
    this.currentFuncionario = null;
    this.initSelect2();
    this.loadFuncionarios();
    this.setupEventListeners();
  }

  // ================ MÉTODOS PRINCIPAIS ================
  initSelect2() {
    $('#funcionarioSelect').select2({
      placeholder: "Selecione um funcionário",
      allowClear: true,
      width: '100%',
      templateResult: this.formatFuncionario,
      templateSelection: this.formatFuncionario
    }).on('change', (e) => this.handleFuncionarioChange(e.target.value));
  }

  async loadFuncionarios() {
    try {
      const response = await fetch('/api/funcionarios');
      if (!response.ok) throw new Error('Erro na resposta');

      const { data: funcionarios } = await response.json();
      const select = $('#funcionarioSelect');

      select.empty().append('<option></option>');
      funcionarios.forEach(func => {
        const option = new Option(
          `${func.nome} - ${func.cargo}`,
          func.id,
          false,
          false
        );
        option.dataset = { foto: func.foto_url || '/assets/default-avatar.jpg' };
        select.append(option);
      });
    } catch (err) {
      console.error('Erro ao carregar funcionários:', err);
      this.showAlert('danger', 'Falha ao carregar lista de funcionários');
    }
  }

  // ================ MÉTODOS DE ATUALIZAÇÃO ================
  async handleFuncionarioChange(funcionarioId) {
    if (!funcionarioId) {
      this.currentFuncionario = null;
      this.resetUI();
      return;
    }

    try {
      const [funcionario, registros] = await Promise.all([
        this.fetchFuncionario(funcionarioId),
        this.fetchRegistros(funcionarioId)
      ]);

      this.currentFuncionario = { ...funcionario, registros };
      this.updateUI();
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
      this.showAlert('danger', 'Falha ao carregar dados do funcionário');
    }
  }

  updateUI() {
    if (!this.currentFuncionario) return;

    const hoje = new Date().toISOString().split('T')[0];
    const registroHoje = this.currentFuncionario.registros?.find(r => r.entrada?.startsWith(hoje));

    // Atualiza status
    this.updateStatusCard(registroHoje);

    // Habilita/desabilita botões
    $('#btnEntrada').prop('disabled', !!registroHoje?.entrada);
    $('#btnSaidaAlmoco').prop('disabled', !registroHoje?.entrada || !!registroHoje?.saida_almoco);
    $('#btnRetornoAlmoco').prop('disabled', !registroHoje?.saida_almoco || !!registroHoje?.retorno_almoco);
    $('#btnSaida').prop('disabled', !registroHoje?.retorno_almoco || !!registroHoje?.saida_final);
  }

  // ================ MÉTODOS AUXILIARES ================
  async fetchFuncionario(id) {
    const response = await fetch(`/api/funcionarios/${id}`);
    if (!response.ok) throw new Error('Funcionário não encontrado');
    return await response.json().then(res => res.data);
  }

  async fetchRegistros(funcionarioId) {
    const response = await fetch(`/api/registros/historico/${funcionarioId}`);
    if (!response.ok) throw new Error('Erro ao carregar registros');
    return await response.json().then(res => res.data);
  }

  showAlert(type, message) {
    const alertId = `alert-${Date.now()}`;
    const alert = $(`
          <div id="${alertId}" class="alert alert-${type} alert-dismissible fade show" role="alert">
              ${message}
              <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
          </div>
      `);

    $('.container-fluid').prepend(alert);
    setTimeout(() => $(`#${alertId}`).alert('close'), 5000);
  }

  resetUI() {
    $('#statusContainer').html(`
          <div class="text-center py-5">
              <p class="text-muted">Selecione um funcionário para visualizar o status</p>
          </div>
      `);
    $('#btnEntrada, #btnSaidaAlmoco, #btnRetornoAlmoco, #btnSaida').prop('disabled', true);
  }

  formatFuncionario(funcionario) {
    if (!funcionario.id) return funcionario.text;
    return $(`
          <div class="funcionario-option">
              <img src="${funcionario.element.dataset.foto}" class="funcionario-avatar"/>
              <span>${funcionario.text}</span>
          </div>
      `);
  }

  formatTime(timestamp) {
    if (!timestamp) return '--:--';
    return new Date(timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  getTipoNome(tipo) {
    const tipos = {
      'entrada': 'Entrada',
      'saida_almoco': 'Saída Almoço',
      'retorno_almoco': 'Retorno Almoço',
      'saida_final': 'Saída Final'
    };
    return tipos[tipo] || tipo;
  }

  setupEventListeners() {
    $('#btnEntrada').click(() => this.registrarPonto('entrada'));
    $('#btnSaidaAlmoco').click(() => this.registrarPonto('saida_almoco'));
    $('#btnRetornoAlmoco').click(() => this.registrarPonto('retorno_almoco'));
    $('#btnSaida').click(() => this.registrarPonto('saida_final'));
  }

  async registrarPonto(tipo) {
    if (!this.currentFuncionario) return;

    try {
      const response = await fetch(`/api/registros/${tipo}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ funcionario_id: this.currentFuncionario.id })
      });

      if (!response.ok) throw new Error('Erro na resposta');

      this.showAlert('success', `${this.getTipoNome(tipo)} registrado com sucesso!`);
      this.handleFuncionarioChange(this.currentFuncionario.id);
    } catch (err) {
      console.error(`Erro ao registrar ${tipo}:`, err);
      this.showAlert('danger', `Falha ao registrar ${this.getTipoNome(tipo)}`);
    }
  }
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => new PontoSystem());