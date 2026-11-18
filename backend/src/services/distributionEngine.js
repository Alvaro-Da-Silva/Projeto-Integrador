import { posicaoPatente } from '../config/patentes.js';

export const CODIGOS_PLANTAO = ['D', 'N1', 'N2'];
export const NOTURNOS = ['N1', 'N2'];
export const MAX_N2_POR_DIA = 1;
export const MAX_COTAS_POR_DIA = 4;


export function limitesDoDia(plantoesDia) {
  const qtd = codigo => plantoesDia.find(p => p.codigo === codigo)?.quantidadeNecessaria ?? 0;
  const N1 = qtd('N1');
  const N2 = Math.min(qtd('N2'), MAX_N2_POR_DIA);
  return { D: qtd('D'), N1, N2, noite: Math.max(N1, N2) };
}

export function vagasRestantes(limites, ocupacao, codigo) {
  const usados = ocupacao.get(codigo) ?? 0;
  if (!NOTURNOS.includes(codigo)) return Math.max(0, (limites[codigo] ?? 0) - usados);
  const noite = (ocupacao.get('N1') ?? 0) + (ocupacao.get('N2') ?? 0);
  return Math.max(0, Math.min(limites[codigo] - usados, limites.noite - noite));
}

export function motivoSemVaga(limites, ocupacao, codigo) {
  if (vagasRestantes(limites, ocupacao, codigo) > 0) return null;
  const usados = ocupacao.get(codigo) ?? 0;
  if (codigo === 'N2' && usados >= limites.N2) {
    return 'O dia já tem um cotista no N2. Não pode haver dois N2 no mesmo dia.';
  }
  if (NOTURNOS.includes(codigo) && usados < limites[codigo]) {
    return `As ${limites.noite} vagas noturnas do dia (N1 + N2) já estão ocupadas. Substitua ou remova alguém da noite.`;
  }
  return 'O plantão já está completo. Substitua um cotista ou remova uma atribuição.';
}

export function vagasEfetivas(plantoesDia, ocupacao = new Map()) {
  const limites = limitesDoDia(plantoesDia);
  const n2 = Math.min(ocupacao.get('N2') ?? 0, limites.N2);
  return new Map(plantoesDia.map(p => {
    if (p.codigo === 'N1') return [String(p.id), Math.min(limites.N1, limites.noite - n2)];
    if (p.codigo === 'N2') return [String(p.id), limites.N1 ? n2 : limites.N2];
    return [String(p.id), p.quantidadeNecessaria];
  }));
}

export function totalVagas(plantoes) {
  const porDia = new Map();
  for (const p of plantoes) {
    const dia = String(p.diaId);
    if (!porDia.has(dia)) porDia.set(dia, []);
    porDia.get(dia).push(p);
  }
  let total = 0;
  for (const plantoesDia of porDia.values()) {
    const limites = limitesDoDia(plantoesDia);
    total += limites.D + limites.noite;
  }
  return total;
}

export const CRITERIOS = [
  { id: 'menos_servicos_escala', descricao: 'Menos serviços definitivos nesta escala',
    valor: (c, ctx) => ctx.contagem.get(c.cotistaId) ?? 0 },
  { id: 'maior_patente', descricao: 'Empate: maior patente',
    valor: c => posicaoPatente(c.patente) },
  { id: 'registro_mais_antigo', descricao: 'Persistindo o empate: disponibilidade registrada primeiro',
    valor: c => timestamp(c.registradaEm) },
  { id: 'menor_id', descricao: 'Ordem de cadastro do cotista',
    valor: c => BigInt(c.cotistaId) }
];

export const MOTIVOS = {
  sem_candidatos: 'Nenhum cotista informou disponibilidade para este plantão.',
  candidatos_insuficientes: 'Menos cotistas disponíveis do que vagas.',
  limite_n2: 'Sobraram interessados só no N2, que aceita no máximo um cotista por dia. A vaga restante é de N1.'
};

function timestamp(value) {
  const time = new Date(value ?? 0).getTime();
  return Number.isFinite(time) ? time : 0;
}

function compararValores(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

function comparar(a, b, ctx) {
  for (const criterio of CRITERIOS) {
    const diff = compararValores(criterio.valor(a, ctx), criterio.valor(b, ctx));
    if (diff) return { diff, criterio: criterio.id };
  }
  return { diff: 0, criterio: null };
}

const ordenar = (lista, ctx) => [...lista].sort((a, b) => comparar(a, b, ctx).diff);

export function distribuir({ plantoes, disponibilidades, fixas = [] }) {
  const ctx = { contagem: new Map() };
  const ocupados = new Set();
  const plantaoPorId = new Map(plantoes.map(p => [String(p.id), p]));
  const fixasPorPlantao = new Map();

  for (const fixa of fixas) {
    const plantao = plantaoPorId.get(String(fixa.plantaoId));
    if (!plantao) continue;
    const cotistaId = String(fixa.cotistaId);
    ctx.contagem.set(cotistaId, (ctx.contagem.get(cotistaId) ?? 0) + 1);
    ocupados.add(`${cotistaId}|${plantao.diaId}`);
    fixasPorPlantao.set(String(plantao.id), (fixasPorPlantao.get(String(plantao.id)) ?? 0) + 1);
  }

  const candidatosPorDia = new Map();
  for (const disp of disponibilidades) {
    const diaId = String(disp.diaId);
    if (!candidatosPorDia.has(diaId)) candidatosPorDia.set(diaId, []);
    candidatosPorDia.get(diaId).push({ ...disp, cotistaId: String(disp.cotistaId), diaId });
  }

  const dias = new Map();
  for (const plantao of plantoes) {
    if (!CODIGOS_PLANTAO.includes(plantao.codigo)) continue;
    const diaId = String(plantao.diaId);
    if (!dias.has(diaId)) dias.set(diaId, { diaId, data: plantao.data, plantoes: [] });
    dias.get(diaId).plantoes.push(plantao);
  }

  const atribuicoes = [];
  const naoPreenchidos = [];
  const disputas = [];

  const atribuir = (plantao, candidato, criterio) => {
    atribuicoes.push({ plantaoId: String(plantao.id), cotistaId: candidato.cotistaId, criterio });
    ctx.contagem.set(candidato.cotistaId, (ctx.contagem.get(candidato.cotistaId) ?? 0) + 1);
    ocupados.add(`${candidato.cotistaId}|${plantao.diaId}`);
  };

  const livre = c => !ocupados.has(`${c.cotistaId}|${c.diaId}`);

  const diasOrdenados = [...dias.values()].sort((a, b) => compararValores(a.data, b.data));

  for (const dia of diasOrdenados) {
    const candidatos = candidatosPorDia.get(dia.diaId) ?? [];
    const plantoesDia = [...dia.plantoes].sort(
      (a, b) => CODIGOS_PLANTAO.indexOf(a.codigo) - CODIGOS_PLANTAO.indexOf(b.codigo));
    const porCodigo = new Map(plantoesDia.map(p => [p.codigo, p]));
    const limites = limitesDoDia(plantoesDia);
    const ocupacao = new Map(plantoesDia.map(p => [p.codigo, fixasPorPlantao.get(String(p.id)) ?? 0]));
    const restantes = codigo => vagasRestantes(limites, ocupacao, codigo);
    const interessados = new Map(plantoesDia.map(p => [p.codigo, 0]));

    for (const grupo of [['D'], NOTURNOS]) {
      const codigos = grupo.filter(c => porCodigo.has(c));
      if (!codigos.length) continue;
      const vagasIniciais = new Map(codigos.map(c => [c, restantes(c)]));
      const ordenados = ordenar(candidatos.filter(c => codigos.includes(c.codigo) && livre(c)), ctx);
      for (const c of ordenados) interessados.set(c.codigo, interessados.get(c.codigo) + 1);

      const escolhidos = new Set();
      for (const candidato of ordenados) {
        if (!restantes(candidato.codigo)) continue;
        escolhidos.add(candidato);
        ocupacao.set(candidato.codigo, ocupacao.get(candidato.codigo) + 1);
      }

      ordenados.forEach((candidato, i) => {
        if (!escolhidos.has(candidato)) return;
        const preterido = ordenados.slice(i + 1).find(c => !escolhidos.has(c));
        const criterio = preterido ? comparar(candidato, preterido, ctx).criterio : 'sem_concorrencia';
        atribuir(porCodigo.get(candidato.codigo), candidato, criterio ?? 'sem_concorrencia');
      });

      for (const codigo of codigos) {
        const preteridos = ordenados.filter(c => c.codigo === codigo && !escolhidos.has(c));
        if (!preteridos.length) continue;
        disputas.push({ plantaoId: String(porCodigo.get(codigo).id), data: dia.data, codigo,
          vagas: vagasIniciais.get(codigo), interessados: interessados.get(codigo),
          naoSelecionados: preteridos.map(c => c.cotistaId) });
      }
    }

    // Flexíveis (I) completam as vagas que sobraram, priorizando o plantão com mais vagas livres.
    let flexiveis = candidatos.filter(c => c.codigo === 'I' && livre(c));
    const flexiveisNoDia = flexiveis.length;

    while (flexiveis.length) {
      const alvo = plantoesDia
        .filter(p => restantes(p.codigo) > 0)
        .sort((a, b) => restantes(b.codigo) - restantes(a.codigo))[0];
      if (!alvo) break;

      const [escolhido] = ordenar(flexiveis, ctx);
      atribuir(alvo, escolhido, 'disponibilidade_flexivel');
      ocupacao.set(alvo.codigo, ocupacao.get(alvo.codigo) + 1);
      flexiveis = flexiveis.filter(c => c.cotistaId !== escolhido.cotistaId);
    }

    const faltas = [];
    if (porCodigo.has('D')) {
      faltas.push({ plantao: porCodigo.get('D'), vagas: limites.D, faltam: restantes('D'),
        interessados: interessados.get('D') + flexiveisNoDia });
    }
    const noturno = porCodigo.get('N1') ?? porCodigo.get('N2');
    if (noturno) {
      const ocupadasNoite = (ocupacao.get('N1') ?? 0) + (ocupacao.get('N2') ?? 0);
      const n2Barrados = disputas.some(d => d.data === dia.data && d.codigo === 'N2');
      faltas.push({ plantao: noturno, vagas: limites.noite, faltam: Math.max(0, limites.noite - ocupadasNoite),
        interessados: (interessados.get('N1') ?? 0) + (interessados.get('N2') ?? 0) + flexiveisNoDia, n2Barrados });
    }

    for (const { plantao, vagas, faltam, interessados: total, n2Barrados } of faltas) {
      if (!faltam) continue;
      const motivo = n2Barrados ? 'limite_n2' : total ? 'candidatos_insuficientes' : 'sem_candidatos';
      naoPreenchidos.push({ plantaoId: String(plantao.id), data: dia.data, codigo: plantao.codigo,
        vagas, faltam, motivo, descricaoMotivo: MOTIVOS[motivo] });
    }
  }

  return {
    atribuicoes,
    naoPreenchidos,
    disputas,
    servicosPorCotista: Object.fromEntries(ctx.contagem),
    criterios: CRITERIOS.map(({ id, descricao }) => ({ id, descricao }))
  };
}

const HORARIOS = { D: [7, 19], N1: [19, 31], N2: [18, 30] };

export function intervaloPlantao(data, codigo) {
  const [inicio, fim] = HORARIOS[codigo] ?? [0, 24];
  const base = Math.round(Date.parse(`${data}T00:00:00Z`) / 3_600_000);
  return [base + inicio, base + fim];
}

export function conflitaHorario(a, b) {
  const [ai, af] = intervaloPlantao(a.data, a.codigo);
  const [bi, bf] = intervaloPlantao(b.data, b.codigo);
  return ai < bf && bi < af;
}
