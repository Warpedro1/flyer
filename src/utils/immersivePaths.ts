/**
 * Ecrãs que ocupam o ecrã todo, sem o cabeçalho do `AppLayout`.
 *
 * `/events/:id/attendees` fica de fora de propósito: é uma lista com navegação e
 * atualização periódica, não um ecrã imersivo como o detalhe, o bilhete ou o
 * leitor de QR.
 */
export function isImmersivePath(pathname: string): boolean {
  if (pathname === '/plans' || pathname === '/events/new') return true;
  const m = /^\/events\/([^/]+)(?:\/(?:ticket|scan))?$/.exec(pathname);
  if (m && m[1] !== 'new') return true;
  return false;
}
