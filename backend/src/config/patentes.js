export const PATENTES = [
  'BC Pleno Classe 1',
  'BC Pleno Classe 2',
  'BC Pleno Classe 3',
  'BC Sênior Classe 1',
  'BC Sênior Classe 2',
  'BC Júnior Classe 1',
  'BC Júnior Classe 2',
  'BC Júnior Classe 3',
  'BC'
];

const normalizar = valor => String(valor ?? '')
  .normalize('NFD').replace(/\p{M}/gu, '')
  .toLowerCase().replace(/\s+/g, ' ').trim();

const POSICAO = new Map(PATENTES.map((patente, i) => [normalizar(patente), i]));

export function posicaoPatente(patente) {
  return POSICAO.get(normalizar(patente)) ?? PATENTES.length;
}
