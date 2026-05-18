// app.js
// Controlador da Aplicação (UI, LocalStorage, Integração com Motor C3)

// Elementos da UI
const btnForm = document.getElementById('btn-form');
const btnDash = document.getElementById('btn-dash');
const secForm = document.getElementById('sec-form');
const secDash = document.getElementById('sec-dash');
const sadcForm = document.getElementById('sadc-form');
const equipeSelect = document.getElementById('equipe');
const toast = document.getElementById('toast');

// Controle de Ocultamento E e J para eAP 76
equipeSelect.addEventListener('change', (e) => {
    const isEAP = e.target.value === 'eAP - Tipo 76';
    const checkE = document.getElementById('check-E');
    const checkJ = document.getElementById('check-J');
    const groupAcs = document.getElementById('group-acs');
    
    if (isEAP) {
        checkE.style.display = 'none';
        checkJ.style.display = 'none';
        groupAcs.style.display = 'none';
        checkE.querySelector('input').checked = false;
        checkJ.querySelector('input').checked = false;
    } else {
        checkE.style.display = 'flex';
        checkJ.style.display = 'flex';
        groupAcs.style.display = 'flex';
    }
});

// Navegação
btnForm.addEventListener('click', () => {
    btnForm.classList.add('active');
    btnDash.classList.remove('active');
    secForm.classList.add('active');
    secDash.classList.remove('active');
});

btnDash.addEventListener('click', () => {
    btnDash.classList.add('active');
    btnForm.classList.remove('active');
    secDash.classList.add('active');
    secForm.classList.remove('active');
    renderDashboard();
});

function showToast(message) {
    toast.innerText = message;
    toast.classList.add('show');
    setTimeout(() => { toast.classList.remove('show'); }, 3000);
}

// -----------------------------------------
// DATA LAYER (LocalStorage)
// -----------------------------------------

function getGestantes() {
    return JSON.parse(localStorage.getItem('sadc_gestantes')) || [];
}

function saveGestantes(data) {
    localStorage.setItem('sadc_gestantes', JSON.stringify(data));
}

// -----------------------------------------
// VALIDAÇÃO DE CPF/CNS
// -----------------------------------------
function validarDocumento(doc) {
    const limpo = doc.replace(/[^\d]+/g, '');
    
    // Validação de CNS (15 dígitos)
    if (limpo.length === 15) return true;

    // Validação de CPF (11 dígitos e cálculo)
    if (limpo.length === 11) {
        if (!!limpo.match(/(\d)\1{10}/)) return false; // todos os números iguais
        let soma = 0, resto;
        for (let i = 1; i <= 9; i++) soma += parseInt(limpo.substring(i-1, i)) * (11 - i);
        resto = (soma * 10) % 11;
        if ((resto == 10) || (resto == 11)) resto = 0;
        if (resto != parseInt(limpo.substring(9, 10))) return false;
        
        soma = 0;
        for (let i = 1; i <= 10; i++) soma += parseInt(limpo.substring(i-1, i)) * (12 - i);
        resto = (soma * 10) % 11;
        if ((resto == 10) || (resto == 11)) resto = 0;
        if (resto != parseInt(limpo.substring(10, 11))) return false;
        
        return true;
    }
    
    return false; // nem 11 nem 15
}

// -----------------------------------------
// FORMULÁRIO (Camada 1)
// -----------------------------------------

sadcForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const cpfInput = document.getElementById('cpf').value;
    const cpfError = document.getElementById('cpf-error');
    
    if (!validarDocumento(cpfInput)) {
        cpfError.style.display = 'block';
        document.getElementById('cpf').focus();
        return;
    } else {
        cpfError.style.display = 'none';
    }

    const nomeInput = document.getElementById('nome').value;
    const dataNascimento = document.getElementById('dataNascimento').value;
    const dumInput = document.getElementById('dum').value;
    const dataAtend = document.getElementById('dataAtendimento').value;
    const profissional = document.getElementById('profissional').value;
    const tipoEquipe = document.getElementById('equipe').value;
    const observacoes = document.getElementById('observacoes').value;
    const acsInput = document.getElementById('acs').value;

    // Coletar checkboxes
    const checkboxes = document.querySelectorAll('.custom-checkbox input:checked');
    const boasPraticas = Array.from(checkboxes).map(cb => cb.value);

    let gestantes = getGestantes();
    
    // Buscar se a gestante já existe pelo CPF
    let gestante = gestantes.find(g => g.cpf === cpfInput);

    if (!gestante) {
        // Criar nova
        gestante = {
            id: Date.now().toString(),
            nome: nomeInput,
            cpf: cpfInput,
            dataNascimento: dataNascimento,
            dum: dumInput,
            equipe: "INE 000000 - " + tipoEquipe,
            tipoEquipe: tipoEquipe,
            acs: acsInput,
            atendimentos: []
        };
        gestantes.push(gestante);
    } else {
        // Atualizar DUM caso tenha mudado
        gestante.dum = dumInput;
        gestante.dataNascimento = dataNascimento || gestante.dataNascimento;
        gestante.tipoEquipe = tipoEquipe;
        if (acsInput) gestante.acs = acsInput;
    }

    // Adicionar novo atendimento
    gestante.atendimentos.push({
        data: dataAtend,
        profissional: profissional,
        observacoes: observacoes,
        boasPraticas: boasPraticas
    });

    saveGestantes(gestantes);
    
    showToast("Atendimento Salvo com Sucesso! Redirecionando...");
    sadcForm.reset();
    
    // Resetar condicionais
    document.getElementById('check-E').style.display = 'flex';
    document.getElementById('check-J').style.display = 'flex';
    document.getElementById('group-acs').style.display = 'flex';

    // Redirecionar para o dashboard para ver a paciente salva
    setTimeout(() => {
        btnDash.click();
    }, 1500);
});

// Autopreencher data do atendimento com data de hoje
document.getElementById('dataAtendimento').valueAsDate = new Date();

// -----------------------------------------
// DASHBOARD (Camada 3)
// -----------------------------------------

function renderDashboard() {
    const gestantes = getGestantes();
    const tbody = document.getElementById('dash-tbody');
    tbody.innerHTML = '';

    let stats = { total: 0, verde: 0, amarelo: 0, vermelho: 0, somaNotas: 0 };

    // Processar gestantes através do Motor C3
    const gestantesAvaliadas = gestantes.map(g => {
        const avaliacao = C3Engine.avaliarGestante(g, g.atendimentos);
        return { ...g, ...avaliacao };
    });

    // Ordenar: Vermelho primeiro, depois Amarelo, Verde, e por IG
    gestantesAvaliadas.sort((a, b) => {
        const p = { "vermelho": 1, "amarelo": 2, "verde": 3 };
        if (p[a.semaforoGeral] !== p[b.semaforoGeral]) return p[a.semaforoGeral] - p[b.semaforoGeral];
        return b.igSemanas - a.igSemanas;
    });

    gestantesAvaliadas.forEach(g => {
        if (g.statusGestacao !== "Encerrada") {
            stats.total++;
            stats[g.semaforoGeral]++;
            stats.somaNotas += g.nota;

            const tr = document.createElement('tr');
            tr.onclick = () => abrirFicha(g);
            
            const badgesSemaforo = {
                "verde": `<span class="badge badge-verde"><span class="semaforo-dot verde"></span> Cuidado em Dia</span>`,
                "amarelo": `<span class="badge badge-amarelo"><span class="semaforo-dot amarelo"></span> Prazo Próximo</span>`,
                "vermelho": `<span class="badge badge-vermelho"><span class="semaforo-dot vermelho"></span> Pendência</span>`
            };

            let alertasHTML = g.alertas.map(a => `<span class="alert-item ${a.cor}">• ${a.msg}</span>`).join('');
            if (alertasHTML === '') alertasHTML = '<span class="alert-item verde">Tudo OK</span>';

            tr.innerHTML = `
                <td>
                    <div style="font-weight:600; color:var(--dark);">${g.nome}</div>
                    <div style="font-size:0.85rem; color:var(--gray);">${g.cpf}</div>
                </td>
                <td>${badgesSemaforo[g.semaforoGeral]}</td>
                <td>
                    <div style="font-weight:600;">${g.igSemanas} sem.</div>
                    <div style="font-size:0.85rem; color:var(--gray);">${g.statusGestacao}</div>
                </td>
                <td><strong style="font-size:1.2rem;">${g.nota}</strong> <span style="font-size:0.8rem;color:var(--gray)">/100</span></td>
                <td class="alert-list">${alertasHTML}</td>
            `;
            tbody.appendChild(tr);
        }
    });

    const media = stats.total > 0 ? Math.round(stats.somaNotas / stats.total) : 0;
    
    document.getElementById('dash-total').innerText = stats.total;
    document.getElementById('dash-media').innerText = media + "%";
    document.getElementById('dash-verde').innerText = stats.verde;
    document.getElementById('dash-amarelo').innerText = stats.amarelo;
    document.getElementById('dash-vermelho').innerText = stats.vermelho;
}

// -----------------------------------------
// FICHA INDIVIDUAL (Modal)
// -----------------------------------------
const modalFicha = document.getElementById('modal-ficha');
let gestanteAtual = null;

function abrirFicha(g) {
    gestanteAtual = g;
    document.getElementById('f-nome').innerText = g.nome;
    document.getElementById('f-cpf').innerText = `CPF: ${g.cpf}`;
    
    // Formatar data DUM
    const dataParts = g.dum.split('-');
    const dumBr = `${dataParts[2]}/${dataParts[1]}/${dataParts[0]}`;
    document.getElementById('f-dum').innerText = `DUM: ${dumBr}`;
    document.getElementById('f-equipe').innerText = g.equipe;
    document.getElementById('f-acs').innerText = g.acs ? `ACS: ${g.acs}` : `ACS: Não informado`;

    const fCircle = document.getElementById('f-circle');
    fCircle.className = `score-circle ${g.semaforoGeral}`;
    document.getElementById('f-nota').innerText = g.nota;

    document.getElementById('f-status-badge').innerHTML = `<span class="semaforo-dot ${g.semaforoGeral}"></span> Status: ${g.statusGestacao} (${g.igSemanas} semanas)`;
    document.getElementById('f-status-badge').className = `badge badge-${g.semaforoGeral}`;

    // Timeline
    const timeline = document.getElementById('f-timeline');
    timeline.innerHTML = '';
    
    const atendOrdenados = [...g.atendimentos].sort((a,b) => new Date(b.data) - new Date(a.data));
    
    if (atendOrdenados.length === 0) {
        timeline.innerHTML = '<p style="color:var(--gray)">Nenhum atendimento registrado.</p>';
    }

    atendOrdenados.forEach(at => {
        const parts = at.data.split('-');
        const dataStr = `${parts[2]}/${parts[1]}/${parts[0]}`;
        const praticas = at.boasPraticas.length > 0 ? at.boasPraticas.join(', ') : 'Nenhuma específica';
        const obs = at.observacoes ? `<br><small style="color:var(--gray)">Obs: ${at.observacoes}</small>` : '';
        
        timeline.innerHTML += `
            <div class="timeline-item">
                <div class="timeline-date">${dataStr}</div>
                <div class="timeline-title">${at.profissional}</div>
                <div class="timeline-desc">Práticas: [${praticas}] ${obs}</div>
            </div>
        `;
    });

    // Metas Cumpridas/Pendentes
    const ulMetas = document.getElementById('f-metas');
    ulMetas.innerHTML = '';
    
    const eAP = g.tipoEquipe === 'eAP - Tipo 76';
    const ac = g.acumulado;

    const metas = [
        { desc: "Captação Precoce (Até 12ª Sem)", ok: ac.captacaoPrecoce },
        { desc: `Consultas Méd./Enf. (${ac.consultas}/7)`, ok: ac.consultas >= 7 },
        { desc: `Pressão Arterial (${ac.pa}/7)`, ok: ac.pa >= 7 },
        { desc: `Antropometria (${ac.antropometria}/7)`, ok: ac.antropometria >= 7 },
        { desc: "Vacina dTpa", ok: ac.dTpa },
        { desc: "Exames 1º Trimestre", ok: ac.exames1Tri },
        { desc: "Exames 3º Trimestre", ok: ac.exames3Tri },
        { desc: "Saúde Bucal", ok: ac.saudeBucal },
        { desc: "Consulta Puerpério", ok: ac.consultaPuerperio }
    ];

    if (!eAP) {
        metas.splice(4, 0, { desc: `Visitas ACS Gestação (${ac.visitasACS}/3)`, ok: ac.visitasACS >= 3 });
        metas.push({ desc: "Visita ACS Puerpério", ok: ac.visitaPuerperioACS });
    }

    metas.forEach(m => {
        const icon = m.ok ? '✅' : '⚠️';
        ulMetas.innerHTML += `<li style="margin-bottom:0.5rem;">${icon} ${m.desc}</li>`;
    });

    modalFicha.classList.add('active');
}

window.apagarPacienteAtual = function() {
    if (!gestanteAtual) return;
    
    const btn = document.getElementById('btn-apagar-paciente');
    
    // Se já estiver no estado de confirmação, executa a exclusão
    if (btn.innerText.includes("Confirmar Exclusão")) {
        let gestantes = getGestantes();
        gestantes = gestantes.filter(gest => gest.cpf !== gestanteAtual.cpf);
        saveGestantes(gestantes);
        fecharModal();
        renderDashboard();
        showToast("Paciente removida com sucesso.");
        
        // Resetar o botão para o estado original escondido
        setTimeout(() => {
            btn.innerHTML = "🗑️ Encerrar / Apagar Paciente";
            btn.style.backgroundColor = "var(--vermelho)";
        }, 500);
    } else {
        // Primeiro clique: Muda o botão para pedir confirmação
        btn.innerHTML = "⚠️ Confirmar Exclusão? (Irreversível)";
        btn.style.backgroundColor = "#991B1B"; // Vermelho mais escuro
        
        // Cancela a confirmação após 5 segundos se não houver segundo clique
        setTimeout(() => {
            if (btn.innerText.includes("Confirmar Exclusão")) {
                btn.innerHTML = "🗑️ Encerrar / Apagar Paciente";
                btn.style.backgroundColor = "var(--vermelho)";
            }
        }, 5000);
    }
};

function fecharModal() {
    modalFicha.classList.remove('active');
}

// Fechar modal clicando fora
modalFicha.addEventListener('click', (e) => {
    if (e.target === modalFicha) fecharModal();
});
