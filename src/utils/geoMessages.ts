/** Mensagens amigáveis para erros de geolocalização (browser/OS). */
export function friendlyGeoError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('network service') || m.includes('query location')) {
    return (
      'O navegador não conseguiu obter a posição (serviço de rede/localização). ' +
      'No Windows: Definições → Privacidade → Localização, e permite localização para aplicações de ambiente de trabalho. ' +
      'No Chrome: permite a localização para este site (ícone à esquerda da barra de endereços).'
    );
  }
  if (m.includes('denied') || m.includes('permission')) {
    return 'Permissão de localização recusada. Permite o acesso à localização para este site nas definições do browser.';
  }
  if (m.includes('timeout')) {
    return 'Tempo esgotado ao pedir a localização. Tenta novamente ou usa a posição aproximada abaixo.';
  }
  if (m.includes('unavailable') || m.includes('indisponível')) {
    return 'Localização indisponível. Verifica se o GPS/serviço de localização está ativo ou usa a posição aproximada abaixo.';
  }
  return message;
}
