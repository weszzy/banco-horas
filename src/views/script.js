/**
 * Sistema de Controle de Ponto
 * @version 1.0.0
 * @author SeuNome
 */

class PontoSystem {
    constructor() {
        this.currentFuncionario = null;
        this.initSelect2();
        this.loadFuncionarios();
        this.setupEventListeners();
    }

    /**
     * Inicializa o Select2 para busca de funcionários
     */
    initSelect2() {
        $('#funcionarioSelect').select2({
            placeholder: "Selecione um funcionário",
            allowClear: true,
            width: '100%',
            templateResult: this.formatFuncionario,
            templateSelection: this.formatFuncionario
        }).on('change', (e) => {
            this.handleFuncionarioChange(e.target.value);
        });
    }

    /**
     * Formata a exibição do funcionário no Select2
     */
    formatFuncionario(funcionario) {
        if (!funcionario.id) return funcionario.text;

        const $container = $(
            `<div class="funcionario-option">
          <img src="${funcionario.element.dataset.foto}" class="funcionario-avatar"/>
          <span>${funcionario.text}</span>
        </div>`
        );
        return $container;
    }

    /**
     * Carrega a lista de funcionários do servidor
     */
    async loadFuncionarios() {
        try {
            const response = await fetch('/api/funcionarios');
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
                option.dataset = { foto: func.foto_url };
                select.append(option);
            });

            select.trigger('change');
        } catch (err) {
            console.error('Erro ao carregar funcionários:', err);
            this.showAlert('danger', 'Falha ao carregar lista de funcionários');
        }
    }

    /**
     * Manipula a mudança de funcionário selecionado
     */
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

    /**
     * Atualiza a UI com os dados do funcionário atual
     */
    updateUI() {
        if (!this.currentFuncionario) return;

        const { registros } = this.currentFuncionario;
        const hoje = new Date().toISOString().split('T')[0];
        const registroHoje = registros.find(r => r.entrada.startsWith(hoje));

        // Atualiza status
        this.updateStatusCard(registroHoje);

        // Habilita/desabilita botões conforme estado
        $('#btnEntrada').prop('disabled', !!registroHoje?.entrada);
        $('#btnSaidaAlmoco').prop('disabled', !registroHoje?.entrada || !!registroHoje?.saida_almoco);
        $('#btnRetornoAlmoco').prop('disabled', !registroHoje?.saida_almoco || !!registroHoje?.retorno_almoco);
        $('#btnSaida').prop('disabled', !registroHoje?.retorno_almoco || !!registroHoje?.saida_final);
    }

    /**
     * Atualiza o card de status com os dados atuais
     */
    updateStatusCard(registro) {
        const container = $('#statusContainer');

        if (!registro) {
            container.html(`
          <div class="text-center py-4">
            <p class="text-muted">Nenhum registro encontrado para hoje</p>
          </div>
        `);
            return;
        }

        container.html(`
        <div class="row">
          <div class="col-md-6">
            <h6>Registro de Hoje</h6>
            <ul class="list-group list-group-flush">
              <li class="list-group-item d-flex justify-content-between">
                <span>Entrada:</span>
                <strong>${registro.entrada ? this.formatTime(registro.entrada) : '--:--'}</strong>
              </li>
              <li class="list-group-item d-flex justify-content-between">
                <span>Saída Almoço:</span>
                <strong>${registro.saida_almoco ? this.formatTime(registro.saida_almoco) : '--:--'}</strong>
              </li>
              <li class="list-group-item d-flex justify-content-between">
                <span>Retorno Almoço:</span>
                <strong>${registro.retorno_almoco ? this.formatTime(registro.retorno_almoco) : '--:--'}</strong>
              </li>
              <li class="list-group-item d-flex justify-content-between">
                <span>Saída Final:</span>
                <strong>${registro.saida_final ? this.formatTime(registro.saida_final) : '--:--'}</strong>
              </li>
            </ul>
          </div>
          <div class="col-md-6">
            <div class="card bg-light h-100">
              <div class="card-body text-center">
                <h6 class="card-title">Total de Horas</h6>
                <h2 class="display-4 ${registro.horas_trabalhadas >= 8 ? 'text-success' : 'text-danger'}">
                  ${registro.horas_trabalhadas || '0.00'}
                </h2>
                <button class="btn btn-outline-primary mt-3">
                  <i class="fas fa-user me-2"></i>Ver Perfil Completo
                </button>
              </div>
            </div>
          </div>
        </div>
      `);
    }

    /**
     * Configura os event listeners dos botões
     */
    setupEventListeners() {
        $('#btnEntrada').click(() => this.registrarPonto('entrada'));
        $('#btnSaidaAlmoco').click(() => this.registrarPonto('saida_almoco'));
        $('#btnRetornoAlmoco').click(() => this.registrarPonto('retorno_almoco'));
        $('#btnSaida').click(() => this.registrarPonto('saida_final'));
    }

    /**
     * Registra um ponto para o funcionário atual
     */
    async registrarPonto(tipo) {
        if (!this.currentFuncionario) return;

        try {
            const response = await fetch(`/api/registros/${tipo}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ funcionario_id: this.currentFuncionario.id })
            });

            if (response.ok) {
                this.showAlert('success', `Registro de ${this.getTipoNome(tipo)} realizado!`);
                this.handleFuncionarioChange(this.currentFuncionario.id);
            } else {
                throw new Error('Erro na resposta do servidor');
            }
        } catch (err) {
            console.error(`Erro ao registrar ${tipo}:`, err);
            this.showAlert('danger', `Falha ao registrar ${this.getTipoNome(tipo)}`);
        }
    }

    // ... (métodos auxiliares restantes)
}

// Inicializa o sistema quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    new PontoSystem();
});