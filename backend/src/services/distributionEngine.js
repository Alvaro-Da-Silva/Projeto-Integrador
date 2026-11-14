import { posicaoPatente } from '../config/patentes.js';

export const CODIGOS_PLANTAO = ['D', 'N1', 'N2'];

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
  candidatos_insuficientes: 'Menos cotistas disponíveis do que vagas.'
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
    const vagas = new Map(plantoesDia.map(p => [String(p.id),
      Math.max(0, p.quantidadeNecessaria - (fixasPorPlantao.get(String(p.id)) ?? 0))]));
    const interessados = new Map(plantoesDia.map(p => [String(p.id), 0]));

    for (const plantao of plantoesDia) {
      const id = String(plantao.id);
      const especificos = candidatos.filter(c => c.codigo === plantao.codigo && livre(c));
      interessados.set(id, especificos.length);
      const quantidade = vagas.get(id);
      if (!quantidade || !especificos.length) continue;

      const ordenados = ordenar(especificos, ctx);
      const escolhidos = ordenados.slice(0, quantidade);
      const preteridos = ordenados.slice(quantidade);

      for (const escolhido of escolhidos) {
        const criterio = preteridos.length ? comparar(escolhido, preteridos[0], ctx).criterio : 'sem_concorrencia';
        atribuir(plantao, escolhido, criterio);
      }
      vagas.set(id, quantidade - escolhidos.length);

      if (preteridos.length) {
        disputas.push({ plantaoId: id, data: dia.data, codigo: plantao.codigo, vagas: quantidade,
          interessados: especificos.length, naoSelecionados: preteridos.map(c => c.cotistaId) });
      }
    }

    let flexiveis = candidatos.filter(c => c.codigo === 'I' && livre(c));
    for (const plantao of plantoesDia) {
      const id = String(plantao.id);
      interessados.set(id, interessados.get(id) + flexiveis.length);
    }

    while (flexiveis.length) {
      const alvo = plantoesDia
        .filter(p => vagas.get(String(p.id)) > 0)
        .sort((a, b) => vagas.get(String(b.id)) - vagas.get(String(a.id)))[0];
      if (!alvo) break;

      const [escolhido] = ordenar(flexiveis, ctx);
      atribuir(alvo, escolhido, 'disponibilidade_flexivel');
      vagas.set(String(alvo.id), vagas.get(String(alvo.id)) - 1);
      flexiveis = flexiveis.filter(c => c.cotistaId !== escolhido.cotistaId);
    }

    for (const plantao of plantoesDia) {
      const faltam = vagas.get(String(plantao.id));
      if (!faltam) continue;
      const motivo = interessados.get(String(plantao.id)) ? 'candidatos_insuficientes' : 'sem_candidatos';
      naoPreenchidos.push({ plantaoId: String(plantao.id), data: dia.data, codigo: plantao.codigo,
        vagas: plantao.quantidadeNecessaria, faltam, motivo, descricaoMotivo: MOTIVOS[motivo] });
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
