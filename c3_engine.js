// c3_engine.js
// Motor Lógico e Clínico do Indicador C3 - Saúde Brasil 360

const C3Engine = {
    // Utilitário de datas
    calculateWeeks: (startDate, endDate) => {
        const msInWeek = 1000 * 60 * 60 * 24 * 7;
        const diff = new Date(endDate) - new Date(startDate);
        return Math.floor(diff / msInWeek);
    },

    calculateDays: (startDate, endDate) => {
        const msInDay = 1000 * 60 * 60 * 24;
        const diff = new Date(endDate) - new Date(startDate);
        return Math.floor(diff / msInDay);
    },

    addDays: (date, days) => {
        const result = new Date(date);
        result.setDate(result.getDate() + days);
        return result.toISOString().split('T')[0];
    },

    // 2.2 - Cálculos automáticos obrigatórios
    calcularDPP: (dum) => {
        return C3Engine.addDays(dum, 280); // DPP clássica: +280 dias
    },

    calcularIG: (dum, dataReferencia = new Date()) => {
        return C3Engine.calculateWeeks(dum, dataReferencia);
    },

    identificarTrimestre: (igSemanas) => {
        if (igSemanas <= 12) return 1;
        if (igSemanas >= 13 && igSemanas <= 27) return 2;
        return 3;
    },

    // Consolidação por Gestante (2.3 e 2.4)
    avaliarGestante: (gestante, atendimentos) => {
        const igSemanas = C3Engine.calcularIG(gestante.dum);
        let statusGestacao = "Ativa";
        const maxDiasGestacao = 294; // 42 semanas
        
        let diasDesdeDum = C3Engine.calculateDays(gestante.dum, new Date());
        let diasPuerperio = 0;

        if (diasDesdeDum > maxDiasGestacao) {
            // Pode estar no puerpério (42 dias após 42 semanas ou pós parto)
            let diasAposParto = diasDesdeDum - maxDiasGestacao; 
            // Simplificação para o protótipo: Assume DPP/294 dias como marco de início do puerpério se não informado parto
            if (diasAposParto <= 42) {
                statusGestacao = "Puerpério";
                diasPuerperio = diasAposParto;
            } else {
                statusGestacao = "Encerrada";
            }
        }

        // Variáveis acumuladas
        const acumulado = {
            consultas: 0,
            pa: 0,
            antropometria: 0,
            visitasACS: 0,
            captacaoPrecoce: false,
            dTpa: false,
            exames1Tri: false,
            exames3Tri: false,
            consultaPuerperio: false,
            visitaPuerperioACS: false,
            saudeBucal: false
        };

        // Processar histórico de atendimentos
        // Ordenar atendimentos por data
        const atendimentosOrdenados = [...atendimentos].sort((a, b) => new Date(a.data) - new Date(b.data));
        let primeiraConsultaData = null;

        atendimentosOrdenados.forEach(atend => {
            const igAtendimento = C3Engine.calcularIG(gestante.dum, atend.data);
            const noPuerperio = C3Engine.calculateDays(gestante.dum, atend.data) > maxDiasGestacao;

            if (atend.boasPraticas.includes('A') && !primeiraConsultaData) {
                primeiraConsultaData = atend.data;
                if (igAtendimento <= 12) acumulado.captacaoPrecoce = true;
            }
            if (atend.boasPraticas.includes('B') && !noPuerperio) acumulado.consultas++;
            if (atend.boasPraticas.includes('C') && !noPuerperio) acumulado.pa++;
            if (atend.boasPraticas.includes('D') && !noPuerperio) acumulado.antropometria++;
            
            // Visita ACS gestação (após a primeira consulta)
            if (atend.boasPraticas.includes('E') && primeiraConsultaData && new Date(atend.data) >= new Date(primeiraConsultaData) && !noPuerperio) {
                acumulado.visitasACS++;
            }

            if (atend.boasPraticas.includes('F')) acumulado.dTpa = true; // a partir 20a sem (formulário já instrui, simplificado aqui)
            if (atend.boasPraticas.includes('G')) acumulado.exames1Tri = true;
            if (atend.boasPraticas.includes('H')) acumulado.exames3Tri = true;
            
            if (atend.boasPraticas.includes('I') && noPuerperio) acumulado.consultaPuerperio = true;
            if (atend.boasPraticas.includes('J') && noPuerperio) acumulado.visitaPuerperioACS = true;
            if (atend.boasPraticas.includes('K')) acumulado.saudeBucal = true;
        });

        // 2.4 Cálculo da Pontuação (0 a 100)
        let pontos = 0;
        let maxPontos = 100;
        const eAP76 = gestante.tipoEquipe === 'eAP - Tipo 76';

        if (eAP76) maxPontos = 82; // E (9) e J (9) não contam

        if (acumulado.captacaoPrecoce) pontos += 10;
        if (acumulado.consultas >= 7) pontos += 9;
        if (acumulado.pa >= 7) pontos += 9;
        if (acumulado.antropometria >= 7) pontos += 9;
        if (!eAP76 && acumulado.visitasACS >= 3) pontos += 9;
        if (acumulado.dTpa) pontos += 9;
        if (acumulado.exames1Tri) pontos += 9;
        if (acumulado.exames3Tri) pontos += 9;
        if (acumulado.consultaPuerperio) pontos += 9;
        if (!eAP76 && acumulado.visitaPuerperioACS) pontos += 9;
        if (acumulado.saudeBucal) pontos += 9;

        // Converter para %
        const nota = Math.round((pontos / maxPontos) * 100);

        // 2.5 Alertas e gatilhos preditivos
        const alertas = [];
        let semaforoGeral = "verde"; // verde, amarelo, vermelho

        const addAlerta = (msg, cor) => {
            alertas.push({ msg, cor });
            if (cor === "vermelho") semaforoGeral = "vermelho";
            if (cor === "amarelo" && semaforoGeral === "verde") semaforoGeral = "amarelo";
        };

        if (statusGestacao === "Ativa") {
            if (igSemanas > 12 && acumulado.consultas === 0) addAlerta("Captação tardia", "vermelho");
            if (igSemanas > 30 && acumulado.consultas < 7) addAlerta("Consultas insuficientes", "vermelho");
            if (igSemanas > 30 && acumulado.pa < 7) addAlerta("PA insuficiente", "vermelho");
            if (igSemanas > 30 && acumulado.antropometria < 7) addAlerta("Antropometria insuficiente", "vermelho");
            
            if (igSemanas >= 13 && !acumulado.exames1Tri) addAlerta("Exames 1º Tri pendentes", "vermelho");
            if (igSemanas >= 9 && igSemanas < 13 && !acumulado.exames1Tri) addAlerta("Exames 1º Tri pendentes", "amarelo");

            if (igSemanas >= 36 && !acumulado.exames3Tri) addAlerta("Exames 3º Tri pendentes", "vermelho");
            if (igSemanas >= 32 && igSemanas < 36 && !acumulado.exames3Tri) addAlerta("Exames 3º Tri pendentes", "amarelo");

            if (!acumulado.dTpa) {
                if (igSemanas > 30) addAlerta("Vacina dTpa pendente", "vermelho");
                else if (igSemanas >= 20) addAlerta("Vacina dTpa pendente", "amarelo");
            }

            if (igSemanas > 30 && !acumulado.saudeBucal) addAlerta("Saúde bucal pendente", "amarelo");
            if (!eAP76 && primeiraConsultaData && igSemanas > 30 && acumulado.visitasACS < 3) addAlerta("Visitas domiciliares insuficientes", "amarelo");
        }

        if (statusGestacao === "Puerpério") {
            if (!acumulado.consultaPuerperio) {
                if (diasPuerperio > 42) addAlerta("Puerpério: consulta não realizada", "vermelho");
                else addAlerta("Puerpério: consulta pendente", "amarelo"); // Alerta amarelo durante a janela
            }
            if (!eAP76 && !acumulado.visitaPuerperioACS) {
                addAlerta("Puerpério: visita pendente", "amarelo");
            }
        }

        return {
            igSemanas,
            statusGestacao,
            acumulado,
            pontos,
            maxPontos,
            nota,
            alertas,
            semaforoGeral
        };
    }
};

window.C3Engine = C3Engine;
