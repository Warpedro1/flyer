/** Mensagens amigáveis para erros de geolocalização (browser/OS). */
export function friendlyGeoError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('network service') || m.includes('query location')) {
    return (
      'O navegador não conseguiu obter a posição (serviço de rede/localização). ' +
      'No Windows: Configurações → Privacidade → Localização, e permita a localização para aplicativos da área de trabalho. ' +
      'No Chrome: permita a localização para este site (ícone à esquerda da barra de endereços).'
    );
  }
  if (m.includes('denied') || m.includes('permission')) {
    return 'Permissão de localização negada. Permita o acesso à localização para este site nas configurações do navegador.';
  }
  if (m.includes('timeout')) {
    return 'Tempo esgotado ao pedir a localização. Tente novamente ou use a posição aproximada abaixo.';
  }
  if (m.includes('unavailable') || m.includes('indisponível')) {
    return 'Localização indisponível. Verifique se o GPS/serviço de localização está ativo ou use a posição aproximada abaixo.';
  }
  return message;
}
