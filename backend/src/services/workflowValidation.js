export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

export function objectBody(value, allowed) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
      || Object.keys(value).some(key => !allowed.includes(key))) {
    throw new HttpError(400, 'Body inválido ou contém campos não permitidos.');
  }
  return value;
}

export function positiveId(value) {
  if (typeof value !== 'string' || !/^[1-9]\d{0,18}$/.test(value)
      || BigInt(value) > 9223372036854775807n) throw new HttpError(400, 'ID inválido.');
  return value;
}

export function positiveInteger(value, name) {
  if (!Number.isInteger(value) || value < 1 || value > 2147483647) {
    throw new HttpError(400, `${name} deve ser um inteiro positivo.`);
  }
  return value;
}

export function optionalObservation(value) {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string' || value.length > 5000) throw new HttpError(400, 'Observação inválida.');
  return value;
}

export function calendarDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)
      || !Number.isFinite(Date.parse(`${value}T00:00:00Z`))
      || new Date(`${value}T00:00:00Z`).toISOString().slice(0,10) !== value) {
    throw new HttpError(400, 'Data inválida. Use YYYY-MM-DD.');
  }
  return value;
}

export const availabilityCodes = ['D', 'N1', 'N2', 'I'];
export const shiftCodes = ['D', 'N1', 'N2'];

export function periodCode(value, flexible = true) {
  if (!(flexible ? availabilityCodes : shiftCodes).includes(value)) {
    throw new HttpError(400, flexible ? 'Período inválido. Use D, N1, N2 ou I.' : 'Plantão deve usar D, N1 ou N2. I é uma opção flexível.');
  }
  return value;
}
