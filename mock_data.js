// mock_data.js
// Dados iniciais de demonstração para o SADC

const gerarDataPassada = (semanas) => {
    const d = new Date();
    d.setDate(d.getDate() - (semanas * 7));
    return d.toISOString().split('T')[0];
};

const mockGestantes = [
    {
        id: "1",
        nome: "Maria da Silva Souza",
        cpf: "111.***.***-11",
        dum: gerarDataPassada(10), // 10 semanas
        equipe: "INE 123456 - Equipe Saúde da Família",
        tipoEquipe: "eSF - Tipo 70",
        atendimentos: [
            {
                data: gerarDataPassada(2),
                profissional: "Enf. João",
                boasPraticas: ['A', 'B', 'C', 'D']
            }
        ]
    },
    {
        id: "2",
        nome: "Ana Carolina Freitas",
        cpf: "222.***.***-22",
        dum: gerarDataPassada(32), // 32 semanas
        equipe: "INE 123456 - Equipe Saúde da Família",
        tipoEquipe: "eSF - Tipo 70",
        atendimentos: [
            { data: gerarDataPassada(30), profissional: "Médica Clara", boasPraticas: ['A', 'B', 'C', 'D', 'G'] },
            { data: gerarDataPassada(26), profissional: "Enf. João", boasPraticas: ['B', 'C', 'D'] },
            { data: gerarDataPassada(22), profissional: "ACS Marcos", boasPraticas: ['E'] },
            // Faltando consultas, pa, antropometria, dTpa, e 3 tri exames (amarelo)
        ]
    },
    {
        id: "3",
        nome: "Luciana Alves de Lima",
        cpf: "333.***.***-33",
        dum: gerarDataPassada(38), // 38 semanas (Atrasada em várias coisas)
        equipe: "INE 987654 - eAP Centro",
        tipoEquipe: "eAP - Tipo 76",
        atendimentos: [
            { data: gerarDataPassada(20), profissional: "Médica Clara", boasPraticas: ['B', 'C', 'D'] } // Captação tardia (Sem 'A')
        ]
    },
    {
        id: "4",
        nome: "Juliana Mendes",
        cpf: "444.***.***-44",
        dum: gerarDataPassada(44), // Puerpério (44 semanas = 2 após 42)
        equipe: "INE 123456 - Equipe Saúde da Família",
        tipoEquipe: "eSF - Tipo 70",
        atendimentos: [
            { data: gerarDataPassada(36), profissional: "Enf. João", boasPraticas: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'K'] },
            { data: gerarDataPassada(32), profissional: "Enf. João", boasPraticas: ['B', 'C', 'D', 'E'] },
            { data: gerarDataPassada(28), profissional: "Enf. João", boasPraticas: ['B', 'C', 'D', 'E'] },
            { data: gerarDataPassada(24), profissional: "Enf. João", boasPraticas: ['B', 'C', 'D'] },
            { data: gerarDataPassada(20), profissional: "Enf. João", boasPraticas: ['B', 'C', 'D'] },
            { data: gerarDataPassada(16), profissional: "Enf. João", boasPraticas: ['B', 'C', 'D'] },
            { data: gerarDataPassada(12), profissional: "Enf. João", boasPraticas: ['B', 'C', 'D'] }
        ]
    }
];

if (!localStorage.getItem('sadc_gestantes')) {
    localStorage.setItem('sadc_gestantes', JSON.stringify(mockGestantes));
}
