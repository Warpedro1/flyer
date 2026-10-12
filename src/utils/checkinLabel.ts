import type { EventRead } from '../types/index.ts';

import { formatRecifeDayTime, formatRecifeTime } from './recifeTime.ts';

/** Se o check-in é possível agora. Respostas antigas sem estado contam como abertas. */
export function checkinAllowed(event: EventRead): boolean {
  return event.checkin_status == null || event.checkin_status === 'open';
}

/** Frase sobre a janela de check-in, para o detalhe do evento. */
export function checkinStatusText(event: EventRead): string | null {
  const closes = formatRecifeTime(event.checkin_closes_at);
  if (event.kind === 'place') {
    if (event.checkin_status === 'closed') {
      return 'Lugar fechado agora: o check-in funciona no horário de funcionamento.';
    }
    return closes ? `Check-in aberto até às ${closes}` : null;
  }
  switch (event.checkin_status) {
    case 'open':
      return closes ? `Check-in aberto até às ${closes}` : 'Check-in aberto';
    case 'not_yet':
      return `Check-in abre às ${formatRecifeDayTime(event.checkin_opens_at)}`;
    case 'closed':
      return 'Check-in fechado.';
    case 'no_schedule':
      return 'Este evento ainda não tem início e fim: sem check-in.';
    default:
      return null;
  }
}

/** Texto curto do botão quando o check-in ainda não é possível (lista do Check-in). */
export function checkinButtonText(event: EventRead): string {
  switch (event.checkin_status) {
    case 'not_yet':
      return `Abre às ${formatRecifeDayTime(event.checkin_opens_at)}`;
    case 'closed':
      return event.kind === 'place' ? 'Lugar fechado agora' : 'Check-in fechado';
    case 'no_schedule':
      return 'Sem check-in';
    default:
      return 'Fazer check-in';
  }
}
