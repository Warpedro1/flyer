/**
 * Depois de um deploy, uma aba antiga pode pedir um ficheiro JS que já não existe
 * (#33). Recarregar a página traz a versão nova; mas só uma vez, para não entrar em
 * ciclo se o problema for outro.
 */
const KEY = 'flyer.chunkReloadAt';
const WINDOW_MS = 10_000;

const CHUNK_ERROR =
  /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Unable to preload CSS|ChunkLoadError/i;

export function isChunkLoadError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  return err.name === 'ChunkLoadError' || CHUNK_ERROR.test(err.message);
}

/** Recarrega e devolve `true`, ou `false` se já recarregou há menos de 10 s. */
export function reloadOnce(reload: () => void = () => window.location.reload()): boolean {
  try {
    const last = Number(sessionStorage.getItem(KEY) ?? 0);
    if (Date.now() - last < WINDOW_MS) return false;
    sessionStorage.setItem(KEY, String(Date.now()));
  } catch {
    // Sem armazenamento não há como saber se já recarregou: mais vale a tela de erro.
    return false;
  }
  reload();
  return true;
}
