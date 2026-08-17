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

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
import { getFirestore, collection, getDocs, doc, setDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBfRWPAiWz56kIAgD65egEWruaqTVdMITM",
  authDomain: "sadc-prenatal.firebaseapp.com",
  projectId: "sadc-prenatal",
  storageBucket: "sadc-prenatal.firebasestorage.app",
  messagingSenderId: "779345423814",
  appId: "1:779345423814:web:60ba6799e60ca6d14c16c7"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// -----------------------------------------
// DATA LAYER (Firebase)
// -----------------------------------------

async function getGestantes() {
    try {
        const querySnapshot = await getDocs(collection(db, "gestantes"));
        const gestantes = [];
        querySnapshot.forEach((doc) => {
            gestantes.push(doc.data());
        });
        return gestantes;
    } catch (e) {
        console.error("Erro ao buscar dados do Firebase: ", e);
        return [];
    }
}

async function saveGestante(gestante) {
    try {
        await setDoc(doc(db, "gestantes", gestante.id), gestante);
    } catch (e) {
        console.error("Erro ao salvar no Firebase: ", e);
    }
}

async function deleteGestanteDB(id) {
    try {
        await deleteDoc(doc(db, "gestantes", id));
    } catch (e) {
        console.error("Erro ao deletar no Firebase: ", e);
    }
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

sadcForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Mudar estado do botão
    const btnSubmit = document.querySelector('.btn-submit');
    const originalText = btnSubmit.innerText;
    btnSubmit.innerText = "Salvando na Nuvem...";
    btnSubmit.disabled = true;

    const cpfInput = document.getElementById('cpf').value;
    const cpfError = document.getElementById('cpf-error');
    
    if (!validarDocumento(cpfInput)) {
        cpfError.style.display = 'block';
        document.getElementById('cpf').focus();
        btnSubmit.innerText = originalText;
        btnSubmit.disabled = false;
        return;
    } else {
        cpfError.style.display = 'none';
    }

    // Autopreenchimento: Verificar se CPF já existe no blur/input (implementado fora do submit também)
    
    const nomeInput = document.getElementById('nome').value;
    const dataNascimento = document.getElementById('dataNascimento').value;
    const dumInput = document.getElementById('dum').value;
    const dataAtend = document.getElementById('dataAtendimento').value;
    const profissional = document.getElementById('profissional').value;
    const tipoEquipe = document.getElementById('equipe').value;
    const pertenceEquipe = document.getElementById('pertenceEquipe').value;
    const observacoes = document.getElementById('observacoes').value;
    const acsInput = document.getElementById('acs').value;
    const classificacaoRiscoInput = document.getElementById('classificacaoRisco').value;

    // Coletar checkboxes
    const checkboxes = document.querySelectorAll('.custom-checkbox input:checked');
    const boasPraticas = Array.from(checkboxes).map(cb => cb.value);

    let gestantes = await getGestantes();
    
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
            pertenceEquipe: pertenceEquipe,
            acs: acsInput,
            classificacaoRisco: classificacaoRiscoInput,
            atendimentos: []
        };
        gestantes.push(gestante);
    } else {
        // Atualizar DUM caso tenha mudado
        gestante.dum = dumInput;
        gestante.dataNascimento = dataNascimento || gestante.dataNascimento;
        gestante.tipoEquipe = tipoEquipe;
        gestante.pertenceEquipe = pertenceEquipe;
        gestante.classificacaoRisco = classificacaoRiscoInput;
        if (acsInput) gestante.acs = acsInput;
    }

    // Adicionar novo atendimento
    gestante.atendimentos.push({
        data: dataAtend,
        profissional: profissional,
        observacoes: observacoes,
        boasPraticas: boasPraticas
    });

    await saveGestante(gestante);
    
    showToast("Atendimento Salvo com Sucesso na Nuvem! Redirecionando...");
    sadcForm.reset();
    btnSubmit.innerText = originalText;
    btnSubmit.disabled = false;
    
    // Resetar condicionais
    document.getElementById('check-E').style.display = 'flex';
    document.getElementById('check-J').style.display = 'flex';
    document.getElementById('group-acs').style.display = 'flex';

// Redirecionar para o dashboard para ver a paciente salva
    setTimeout(() => {
        btnDash.click();
    }, 1500);
});

// Autopreenchimento pelo CPF
document.getElementById('cpf').addEventListener('blur', async (e) => {
    const cpfInput = e.target.value;
    if (validarDocumento(cpfInput)) {
        let gestantes = await getGestantes();
        let gestante = gestantes.find(g => g.cpf === cpfInput);
        if (gestante) {
            document.getElementById('nome').value = gestante.nome;
            document.getElementById('dataNascimento').value = gestante.dataNascimento || "";
            document.getElementById('dum').value = gestante.dum;
            
            // Autocalcular DPP naegele para a gestante encontrada
            if (gestante.dum) {
                const dppCalc = C3Engine.calcularDPP(gestante.dum);
                if (dppCalc) {
                    const dp = dppCalc.split('-');
                    document.getElementById('dppForm').value = `${dp[2]}/${dp[1]}/${dp[0]}`;
                }
            }

            document.getElementById('equipe').value = gestante.tipoEquipe || "eSF - Tipo 70";
            if (gestante.pertenceEquipe) document.getElementById('pertenceEquipe').value = gestante.pertenceEquipe;
            document.getElementById('acs').value = gestante.acs || "";
            document.getElementById('classificacaoRisco').value = gestante.classificacaoRisco || "Risco Habitual";
            showToast("Dados da gestante carregados automaticamente.");
            // Dispara evento para atualizar selects
            document.getElementById('equipe').dispatchEvent(new Event('change'));
        }
    }
});

// Evento para calcular DPP automaticamente quando a DUM for inserida
document.getElementById('dum').addEventListener('change', (e) => {
    const dumVal = e.target.value;
    if (dumVal) {
        const dppCalc = C3Engine.calcularDPP(dumVal);
        if (dppCalc) {
            const dp = dppCalc.split('-');
            document.getElementById('dppForm').value = `${dp[2]}/${dp[1]}/${dp[0]}`;
        }
    } else {
        document.getElementById('dppForm').value = "";
    }
});

// Autopreencher data do atendimento com data de hoje
document.getElementById('dataAtendimento').valueAsDate = new Date();

// -----------------------------------------
// DASHBOARD (Camada 3)
// -----------------------------------------

async function renderDashboard() {
    const tbody = document.getElementById('dash-tbody');
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 2rem;">🔄 Carregando dados da nuvem (Firebase)...</td></tr>';

    const gestantes = await getGestantes();
    tbody.innerHTML = '';

    let stats = { total_equipe: 0, total_extra: 0, verde: 0, amarelo: 0, vermelho: 0, somaNotasEquipe: 0 };

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

    let activeIndex = 1;
    gestantesAvaliadas.forEach(g => {
        if (g.statusGestacao !== "Encerrada") {
            const isEquipe = (g.pertenceEquipe === 'da equipe' || !g.pertenceEquipe); // Padrão 'da equipe'
            
            if (isEquipe) {
                stats.total_equipe++;
                stats.somaNotasEquipe += g.nota;
            } else {
                stats.total_extra++;
            }
            
            stats[g.semaforoGeral]++;

            // Usando nome real da gestante
            const nomeExibicao = g.nome || `Paciente ${activeIndex++}`;
            g.cpfMasked = g.cpf; // Removed mask

            const tr = document.createElement('tr');
            tr.onclick = () => abrirFicha(g);
            
            const badgesSemaforo = {
                "verde": `<span class="badge badge-verde"><span class="semaforo-dot verde"></span> Cuidado em Dia</span>`,
                "amarelo": `<span class="badge badge-amarelo"><span class="semaforo-dot amarelo"></span> Prazo Próximo</span>`,
                "vermelho": `<span class="badge badge-vermelho"><span class="semaforo-dot vermelho"></span> Pendência</span>`
            };

            let alertasHTML = g.alertas.map(a => `<span class="alert-item ${a.cor}">• ${a.msg}</span>`).join('');
            if (alertasHTML === '') alertasHTML = '<span class="alert-item verde">Tudo OK</span>';

            // Última consulta
            const sortedAtends = [...g.atendimentos].sort((a,b) => new Date(a.data) - new Date(b.data));
            const ultimaData = sortedAtends.length > 0 ? sortedAtends[sortedAtends.length - 1].data : null;
            let ultimaDataFormatada = "-";
            if (ultimaData) {
                const parts = ultimaData.split('-');
                ultimaDataFormatada = `${parts[2]}/${parts[1]}/${parts[0]}`;
            }

            // Classificação de risco
            const risco = g.classificacaoRisco || "Risco Habitual";
            const riscoBadgeClass = risco === "Alto Risco" ? "risco-alto" : "risco-habitual";

            tr.innerHTML = `
                <td>
                    <div style="font-weight:600; color:var(--dark);">${nomeExibicao}</div>
                    <div style="font-size:0.8rem; margin: 2px 0 4px 0;"><span class="risco-badge ${riscoBadgeClass}">${risco}</span></div>
                    <div style="font-size:0.85rem; color:var(--gray);">${g.cpfMasked}</div>
                </td>
                <td>${badgesSemaforo[g.semaforoGeral]}</td>
                <td>
                    <div style="font-weight:600;">${g.igSemanas} sem.</div>
                    <div style="font-size:0.85rem; color:var(--gray);">${g.statusGestacao}</div>
                </td>
                <td>
                    <div style="font-weight:500;">${ultimaDataFormatada}</div>
                </td>
                <td><strong style="font-size:1.2rem;">${g.nota}</strong> <span style="font-size:0.8rem;color:var(--gray)">/100</span></td>
                <td class="alert-list">${alertasHTML}</td>
            `;
            tbody.appendChild(tr);
        }
    });

    const mediaEquipe = stats.total_equipe > 0 ? Math.round(stats.somaNotasEquipe / stats.total_equipe) : 0;
    
    document.getElementById('dash-total-equipe').innerText = stats.total_equipe;
    document.getElementById('dash-total-extra').innerText = stats.total_extra;
    document.getElementById('dash-media').innerText = mediaEquipe + "%";
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
    document.getElementById('f-nome').innerText = g.nome || "Paciente";
    
    const risco = g.classificacaoRisco || "Risco Habitual";
    const riscoBadgeClass = risco === "Alto Risco" ? "risco-alto" : "risco-habitual";
    const vinculotxt = g.pertenceEquipe === 'extra área' ? "Extra Área" : "Da Equipe";
    document.getElementById('f-cpf').innerHTML = `CPF: ${g.cpf} &nbsp;&nbsp;|&nbsp;&nbsp; <span class="risco-badge ${riscoBadgeClass}">${risco}</span> &nbsp;&nbsp;|&nbsp;&nbsp; Vínculo: ${vinculotxt}`;
    
    // Formatar data DUM e DPP
    const dataParts = g.dum.split('-');
    const dumBr = `${dataParts[2]}/${dataParts[1]}/${dataParts[0]}`;
    document.getElementById('f-dum').innerText = `DUM: ${dumBr}`;
    
    const dppCalc = C3Engine.calcularDPP(g.dum);
    if (dppCalc) {
        const dp = dppCalc.split('-');
        document.getElementById('f-dpp').innerText = `DPP: ${dp[2]}/${dp[1]}/${dp[0]}`;
    } else {
        document.getElementById('f-dpp').innerText = `DPP: Não calculada`;
    }

    document.getElementById('f-equipe').innerText = g.equipe;
    document.getElementById('f-acs').innerText = g.acs ? `ACS: ${g.acs}` : `ACS: Não informado`;

    // Auditoria (Segurança)
    const sortedAuditoria = [...g.atendimentos].sort((a,b) => new Date(a.data) - new Date(b.data));
    let msgAuditoria = "";
    if (sortedAuditoria.length > 0) {
        const formatDateStr = (iso) => {
            const p = iso.split('-'); return `${p[2]}/${p[1]}/${p[0]}`;
        };
        const cad = sortedAuditoria[0];
        msgAuditoria = `<strong>Cadastrada por:</strong> ${cad.profissional} em ${formatDateStr(cad.data)}`;
        if (sortedAuditoria.length > 1) {
            const ult = sortedAuditoria[sortedAuditoria.length - 1];
            msgAuditoria += `<br><strong>Última alteração por:</strong> ${ult.profissional} em ${formatDateStr(ult.data)}`;
        }
    }
    
    let containerAuditoria = document.getElementById('f-auditoria');
    if (!containerAuditoria) {
        containerAuditoria = document.createElement('div');
        containerAuditoria.id = 'f-auditoria';
        containerAuditoria.style = "margin-top: 1rem; font-size: 0.85rem; color: var(--gray); background: #f8f9fa; padding: 8px; border-radius: 4px; border-left: 3px solid var(--primary);";
        document.querySelector('.ficha-header').appendChild(containerAuditoria);
    }
    containerAuditoria.innerHTML = msgAuditoria;

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
        { desc: "Captação Precoce (Até 12ª Sem)", ok: ac.captacaoPrecoce, code: 'A' },
        { desc: `Consultas Méd./Enf. (${ac.consultas}/7)`, ok: ac.consultas >= 7, code: 'B' },
        { desc: `Pressão Arterial (${ac.pa}/7)`, ok: ac.pa >= 7, code: 'C' },
        { desc: `Antropometria (${ac.antropometria}/7)`, ok: ac.antropometria >= 7, code: 'D' },
        { desc: "Vacina dTpa", ok: ac.dTpa, code: 'F' },
        { desc: "Exames 1º Trimestre", ok: ac.exames1Tri, code: 'G' },
        { desc: "Exames 3º Trimestre", ok: ac.exames3Tri, code: 'H' },
        { desc: "Saúde Bucal", ok: ac.saudeBucal, code: 'K' },
        { desc: "Consulta Puerpério", ok: ac.consultaPuerperio, code: 'I' }
    ];

    if (!eAP) {
        metas.splice(4, 0, { desc: `Visitas ACS Gestação (${ac.visitasACS}/3)`, ok: ac.visitasACS >= 3, code: 'E' });
        metas.push({ desc: "Visita ACS Puerpério", ok: ac.visitaPuerperioACS, code: 'J' });
    }

    const formatDt = (iso) => {
        const p = iso.split('-');
        return `${p[2]}/${p[1]}/${p[0].substring(2)}`;
    };

    metas.forEach(m => {
        const icon = m.ok ? '✅' : '⚠️';
        let dateStr = "";
        
        // Buscar datas se houver registro dessa prática
        const atendsPratica = g.atendimentos.filter(at => at.boasPraticas.includes(m.code));
        if (atendsPratica.length > 0) {
            atendsPratica.sort((a,b) => new Date(a.data) - new Date(b.data));
            if (['B', 'C', 'D', 'E'].includes(m.code)) {
                // Práticas contínuas: mostrar a data do último registro
                dateStr = `<br><small style="color:var(--gray); margin-left: 1.5rem;">Último registro em: ${formatDt(atendsPratica[atendsPratica.length-1].data)}</small>`;
            } else {
                // Práticas únicas: mostrar a data da realização
                dateStr = `<br><small style="color:var(--gray); margin-left: 1.5rem;">Realizado em: ${formatDt(atendsPratica[0].data)}</small>`;
            }
        }

        ulMetas.innerHTML += `<li style="margin-bottom:0.8rem; line-height: 1.2;">${icon} ${m.desc}${dateStr}</li>`;
    });

    modalFicha.classList.add('active');
}

window.apagarPacienteAtual = async function() {
    if (!gestanteAtual) return;
    
    const btn = document.getElementById('btn-apagar-paciente');
    
    // Se já estiver no estado de confirmação, executa a exclusão
    if (btn.innerText.includes("Confirmar Exclusão")) {
        btn.innerHTML = "⏳ Excluindo da Nuvem...";
        await deleteGestanteDB(gestanteAtual.id);
        fecharModal();
        await renderDashboard();
        showToast("Paciente removida com sucesso da nuvem.");
        
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

window.fecharModal = function() {
    modalFicha.classList.remove('active');
}

// Fechar modal clicando fora
modalFicha.addEventListener('click', (e) => {
    if (e.target === modalFicha) window.fecharModal();
});
