/**
 * Funções para interação com a API
 */

// Registra entrada
async function registrarEntrada() {
    const funcionario = document.getElementById('funcionario').value;
    if (!funcionario) {
        alert('Por favor, insira o nome do funcionário');
        return;
    }

    try {
        const response = await fetch('/api/entrada', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ funcionario })
        });
        
        if (response.ok) {
            alert('Entrada registrada com sucesso!');
            carregarRegistrosRecentes();
        } else {
            throw new Error('Erro ao registrar entrada');
        }
    } catch (err) {
        console.error('Erro:', err);
        alert('Falha ao registrar entrada');
    }
}

// Carrega registros recentes
async function carregarRegistrosRecentes() {
    try {
        const response = await fetch('/api/registros/recentes');
        const registros = await response.json();
        
        const container = document.getElementById('registrosContainer');
        container.innerHTML = registros.map(reg => `
            <div class="col-md-6 col-lg-4">
                <div class="card h-100">
                    <div class="card-header">
                        <h5>${reg.funcionario}</h5>
                    </div>
                    <div class="card-body">
                        <p><strong>Entrada:</strong> ${formatarData(reg.entrada)}</p>
                        ${reg.saida_almoco ? `<p><strong>Saída Almoço:</strong> ${formatarData(reg.saida_almoco)}</p>` : ''}
                        ${reg.retorno_almoco ? `<p><strong>Retorno Almoço:</strong> ${formatarData(reg.retorno_almoco)}</p>` : ''}
                        ${reg.saida_final ? 
                            `<p><strong>Saída Final:</strong> ${formatarData(reg.saida_final)}</p>` : 
                            '<p class="text-warning"><strong>Status:</strong> Em trabalho</p>'
                        }
                    </div>
                    <div class="card-footer">
                        <button class="btn btn-sm btn-primary" onclick="abrirHistorico('${reg.funcionario}')">
                            <i class="fas fa-history me-1"></i>Ver Histórico
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (err) {
        console.error('Erro ao carregar registros:', err);
    }
}

// Abre modal com histórico completo
async function abrirHistorico(funcionario) {
    try {
        const response = await fetch(`/api/historico/${funcionario}`);
        const historico = await response.json();
        
        document.getElementById('historicoModalLabel').textContent = `Histórico de ${funcionario}`;
        
        const tbody = document.getElementById('historicoBody');
        tbody.innerHTML = historico.map(reg => `
            <tr>
                <td>${formatarData(reg.entrada, true)}</td>
                <td>${formatarHora(reg.entrada)}</td>
                <td>${reg.saida_almoco ? formatarHora(reg.saida_almoco) : '-'}</td>
                <td>${reg.retorno_almoco ? formatarHora(reg.retorno_almoco) : '-'}</td>
                <td>${reg.saida_final ? formatarHora(reg.saida_final) : '-'}</td>
            </tr>
        `).join('');
        
        // Mostra o modal
        const modal = new bootstrap.Modal(document.getElementById('historicoModal'));
        modal.show();
    } catch (err) {
        console.error('Erro ao carregar histórico:', err);
        alert('Falha ao carregar histórico');
    }
}

// Funções auxiliares
function formatarData(dataString, apenasData = false) {
    const data = new Date(dataString);
    if (apenasData) {
        return data.toLocaleDateString('pt-BR');
    }
    return data.toLocaleString('pt-BR');
}

function formatarHora(dataString) {
    const data = new Date(dataString);
    return data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

// Carrega registros quando a página é aberta
document.addEventListener('DOMContentLoaded', carregarRegistrosRecentes);