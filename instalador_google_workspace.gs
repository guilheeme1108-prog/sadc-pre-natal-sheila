/**
 * SADC Pré-Natal - Instalador Automático
 * Este script cria automaticamente o Google Forms e a Planilha (Google Sheets)
 * com as regras da Nota Metodológica C3 (Saúde Brasil 360).
 */

function instalarSADC() {
  Logger.log("Iniciando a instalação do SADC Pré-Natal...");

  // 1. CRIAR O FORMULÁRIO
  var form = FormApp.create('SADC Pré-Natal - Coleta de Dados');
  form.setDescription('Sistema de Apoio à Decisão Clínica (SADC) para Microgestão do Pré-Natal.\nPreencha os dados em cada atendimento para o cálculo automático do Indicador C3.');
  form.setConfirmationMessage('Atendimento salvo com sucesso! O painel será atualizado.');

  // Campos Básicos
  form.addTextItem()
      .setTitle('Nome Completo da Gestante')
      .setRequired(true);

  form.addTextItem()
      .setTitle('CPF ou CNS')
      .setHelpText('Apenas números (11 ou 15 dígitos)')
      .setRequired(true);

  form.addDateItem()
      .setTitle('Data de Nascimento')
      .setRequired(true);

  form.addDateItem()
      .setTitle('Data da Última Menstruação (DUM)')
      .setRequired(true);

  form.addDateItem()
      .setTitle('Data do Atendimento Atual')
      .setRequired(true);

  // Equipe
  form.addMultipleChoiceItem()
      .setTitle('Profissional Responsável (CBO)')
      .setChoiceValues(['Médico(a) - 2251/2252/2231', 'Enfermeiro(a) - 2235'])
      .setRequired(true);

  form.addMultipleChoiceItem()
      .setTitle('Tipo de Equipe')
      .setChoiceValues(['eSF - Tipo 70 (Saúde da Família)', 'eAP - Tipo 76 (Atenção Primária)'])
      .setRequired(true);

  form.addTextItem()
      .setTitle('Nome do Agente de Saúde (ACS)')
      .setHelpText('Deixe em branco caso a equipe seja eAP');

  // Checklist de Boas Práticas (C3)
  var praticasItem = form.addCheckboxItem();
  praticasItem.setTitle('O que foi realizado NESTA consulta? (Checklist Nota C3)')
      .setHelpText('Selecione apenas o que ocorreu ou foi avaliado no atendimento de HOJE.')
      .setChoiceValues([
        '(A) Captação Precoce (1ª consulta até 12 semanas)',
        '(B) Consulta Médica/Enfermagem',
        '(C) Aferição de Pressão Arterial',
        '(D) Antropometria (Peso e Altura)',
        '(E) Visita ACS/TACS na Gestação',
        '(F) Vacina dTpa aplicada/registrada (A partir da 20ª sem)',
        '(G) Exames 1º Trimestre (Sífilis, HIV, Hep B e C)',
        '(H) Exames 3º Trimestre (Sífilis e HIV)',
        '(I) Consulta de Puerpério (Méd/Enf)',
        '(J) Visita Puerpério por ACS/TACS',
        '(K) Atividade em Saúde Bucal'
      ]);

  form.addParagraphTextItem()
      .setTitle('Observações Clínicas (Opcional)');

  // 2. CRIAR A PLANILHA E VINCULAR
  Logger.log("Criando Banco de Dados no Google Sheets...");
  var ss = SpreadsheetApp.create('SADC Pré-Natal - Banco de Dados');
  
  // Vincular o form à planilha
  form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());

  // Esperar o Google processar a vinculação (3 segundos)
  Utilities.sleep(3000);

  // 3. INSERIR FÓRMULAS AUTOMÁTICAS
  Logger.log("Injetando fórmulas matemáticas do Motor C3...");
  var ssVinculado = SpreadsheetApp.openById(ss.getId());
  
  // A nova aba do form geralmente chama "Respostas ao formulário 1"
  var sheets = ssVinculado.getSheets();
  var abaRespostas = null;
  
  for (var i = 0; i < sheets.length; i++) {
    if (sheets[i].getFormUrl() != null) {
      abaRespostas = sheets[i];
      break;
    }
  }

  if (abaRespostas) {
    // As perguntas padrão ocupam as colunas de A até L (Data e Hora até Observações)
    // Vamos adicionar os campos automáticos nas colunas M, N e O.
    
    abaRespostas.getRange("M1").setValue("IG (Semanas) Auto");
    abaRespostas.getRange("N1").setValue("DPP Auto");
    abaRespostas.getRange("O1").setValue("Trimestre Atual");

    // Fórmula IG: (Data Atend - DUM) / 7
    // A=Carimbo, B=Nome, C=CPF, D=Nasc, E=DUM, F=Atendimento
    abaRespostas.getRange("M2").setFormula('=ARRAYFORMULA(IF(E2:E=""; ""; INT((F2:F - E2:E) / 7)))');
    
    // Fórmula DPP: DUM + 280
    abaRespostas.getRange("N2").setFormula('=ARRAYFORMULA(IF(E2:E=""; ""; E2:E + 280))');
    
    // Trimestre (M2 = IG)
    abaRespostas.getRange("O2").setFormula('=ARRAYFORMULA(IF(M2:M=""; ""; IF(M2:M<=12; "1º Trimestre"; IF(M2:M<=27; "2º Trimestre"; "3º Trimestre"))))');

    // Colorir Cabeçalhos
    abaRespostas.getRange("M1:O1").setBackground("#10B981").setFontColor("white").setFontWeight("bold");
    abaRespostas.setFrozenRows(1);
  }

  Logger.log("==========================================");
  Logger.log("SISTEMA SADC INSTALADO COM SUCESSO!");
  Logger.log("Link do seu Formulário: " + form.getEditUrl());
  Logger.log("Link do seu Banco de Dados: " + ss.getUrl());
  Logger.log("==========================================");
}
