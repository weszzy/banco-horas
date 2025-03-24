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