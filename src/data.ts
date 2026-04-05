import { Question } from './App';

// Exemplo com 2 questões mantendo a exata estrutura do seu banco original
export const questionsData: Question[] = [
  {
    id: 1,
    ano: "2024",
    origem: "ENARE",
    banca: "AOCP",
    categoria: "CM",
    especialidade: "Cardiologia",
    tema_especifico: "Hipertensão Arterial",
    competencias: "Diagnóstico",
    enunciado: "Paciente masculino, 45 anos, comparece à consulta de rotina assintomático. Na triagem, apresenta Pressão Arterial (PA) de 150/95 mmHg. Segundo as diretrizes atuais, qual a conduta inicial mais adequada?",
    a: "Iniciar imediatamente inibidor da ECA.",
    b: "Solicitar MAPA 24h ou MRPA para confirmação diagnóstica antes de iniciar o tratamento farmacológico.",
    c: "Recomendar apenas mudanças no estilo de vida e reavaliar em 1 ano.",
    d: "Iniciar betabloqueador devido ao alto risco de infarto.",
    e: "Prescrever diurético tiazídico em dose baixa.",
    correta: "B",
    comentario: "Excelente! Em pacientes assintomáticos com PA estágio 1 e baixo risco cardiovascular, a diretriz brasileira recomenda a confirmação diagnóstica com MAPA ou MRPA para descartar a hipertensão do avental branco antes de iniciar a medicação.",
    justificativa_a: "Incorreto. A medicação imediata é reservada para estágios mais altos, alto risco CV ou lesão de órgão-alvo estabelecida.",
    justificativa_c: "Incorreto. Reavaliar em 1 ano é muito tempo; o diagnóstico deve ser confirmado prontamente.",
    justificativa_d: "Incorreto. Betabloqueadores não são primeira linha isolada para hipertensão sem indicações específicas (ex: pós-IAM).",
    justificativa_e: "Incorreto. Embora seja uma droga de primeira linha, a confirmação diagnóstica precede o tratamento medicamentoso neste perfil."
  },
  {
    id: 2,
    ano: "2023",
    origem: "USP-SP",
    banca: "FUVEST",
    categoria: "CC",
    especialidade: "Cirurgia do Trauma",
    tema_especifico: "Trauma Abdominal",
    competencias: "Conduta",
    enunciado: "Vítima de ferimento por arma branca no abdome anterior, chega ao pronto-socorro com PA 80/50 mmHg, FC 125 bpm, sudoreico e com evisceração de alça de delgado. Qual a conduta imediata?",
    a: "Tomografia computadorizada de abdome com contraste.",
    b: "Lavagem Peritoneal Diagnóstica (LPD).",
    c: "Laparotomia exploradora imediata.",
    d: "Ultrassom FAST para avaliar líquido livre.",
    e: "Reposição volêmica agressiva e observação rigorosa.",
    correta: "C",
    comentario: "Correto. Instabilidade hemodinâmica associada a trauma penetrante com violação do peritônio (evisceração) é indicação absoluta e imediata de laparotomia exploradora.",
    justificativa_a: "Incorreto. Paciente instável hemodinamicamente JAMAIS deve ser levado à tomografia.",
    justificativa_b: "Incorreto. A LPD tem papel no trauma fechado em pacientes instáveis (quando o FAST não está disponível), não em ferimentos penetrantes com indicação cirúrgica óbvia.",
    justificativa_d: "Incorreto. O FAST não mudaria a conduta, pois a evisceração + instabilidade já indicam o centro cirúrgico.",
    justificativa_e: "Incorreto. A reposição deve ocorrer, mas o tratamento definitivo da hemorragia (cirurgia) não pode ser atrasado por observação."
  }
];
