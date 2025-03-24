/**
 * Funções para interação com a API.
 */

// Registra entrada
async function registrarEntrada() {
    const funcionario = document.getElementById('funcionario').value;
    const response = await fetch('/api/entrada', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ funcionario })
    });
    if (response.ok) {
        alert('Entrada registrada!');
        carregarPerfil(funcionario);
    }
}

// Registra saída para almoço
async function registrarSaidaAlmoco() {
    const funcionario = document.getElementById('funcionario').value;
    const response = await fetch('/api/saida-almoco', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ funcionario })
    });
    if (response.ok) {
        alert('Saída para almoço registrada!');
        carregarPerfil(funcionario);
    }
}

/**
 * Carrega os registros mais recentes de todos os funcionários
 */
async function carregarRegistrosRecentes() {
    try {
        const response = await fetch('/api/registros/recentes');
        const registros = await response.json();

        const container = document.getElementById('registrosContainer');
        container.innerHTML = registros.map(reg => `
            <div class="card mb-3">
                <div class="card-header">
                    <h5>${reg.funcionario}</h5>
                </div>
                <div class="card-body">
                    <p>Última entrada: ${new Date(reg.entrada).toLocaleString()}</p>
                    ${reg.saida_final ?
                `<p>Última saída: ${new Date(reg.saida_final).toLocaleString()}</p>` :
                '<p class="text-warning">Ainda no trabalho</p>'
            }
                    <button class="btn btn-sm btn-primary" onclick="abrirHistorico('${reg.funcionario}')">
                        Ver histórico completo
                    </button>
                </div>
            </div>
        `).join('');
    } catch (err) {
        console.error('Erro ao carregar registros:', err);
    }
}

/**
 * Abre o histórico completo de um funcionário
 */
async function abrirHistorico(funcionario) {
    try {
        const response = await fetch(`/api/historico/${funcionario}`);
        const historico = await response.json();

        const modalHTML = `
            <div class="modal fade" id="historicoModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Histórico de ${funcionario}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <table class="table">
                                <thead>
                                    <tr>
                                        <th>Data</th>
                                        <th>Entrada</th>
                                        <th>Saída</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${historico.map(reg => `
                                        <tr>
                                            <td>${new Date(reg.entrada).toLocaleDateString()}</td>
                                            <td>${new Date(reg.entrada).toLocaleTimeString()}</td>
                                            <td>${reg.saida_final ? new Date(reg.saida_final).toLocaleTimeString() : '-'}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Adiciona o modal ao DOM e exibe
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        const modal = new bootstrap.Modal(document.getElementById('historicoModal'));
        modal.show();

        // Remove o modal quando fechado
        document.getElementById('historicoModal').addEventListener('hidden.bs.modal', () => {
            document.getElementById('historicoModal').remove();
        });
    } catch (err) {
        console.error('Erro ao carregar histórico:', err);
    }
}

// Carrega os registros quando a página é aberta
document.addEventListener('DOMContentLoaded', carregarRegistrosRecentes);

// Carrega o perfil do funcionário
async function carregarPerfil(funcionario) {
    const response = await fetch(`/api/registros?funcionario=${funcionario}`);
    const registro = await response.json();
    const perfilHTML = `
        <div class="card mt-4">
            <div class="card-header">
                <h5>${funcionario}</h5>
            </div>
            <div class="card-body">
                <p>Entrada: ${registro.entrada}</p>
                <p>Saída Almoço: ${registro.saida_almoco || '--'}</p>
                <p>Retorno Almoço: ${registro.retorno_almoco || '--'}</p>
                <p>Saída Final: ${registro.saida_final || '--'}</p>
            </div>
        </div>
    `;
    document.getElementById('perfilContainer').innerHTML = perfilHTML;
}