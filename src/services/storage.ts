import type { MediaType } from '../types/index.ts';

import { supabase } from '../lib/supabase.ts';

const BUCKET = 'event-media';

/** Limites de tamanho (defesa no cliente; o bucket também limita no servidor). */
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024; // 50 MB

export interface UploadedMedia {
  /** Caminho do objeto no bucket privado (guardado em event_media.media_url). */
  path: string;
  type: MediaType;
}

function mediaTypeFromFile(file: File): MediaType | null {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('video/')) return 'video';
  return null;
}

function extensionFor(file: File): string {
  const fromName = file.name.split('.').pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]{1,5}$/.test(fromName)) return fromName;
  const fromMime = file.type.split('/').pop()?.toLowerCase();
  return fromMime && /^[a-z0-9]{1,5}$/.test(fromMime) ? fromMime : 'bin';
}

/**
 * Envia um ficheiro já validado para `{userId}/<uuid>.<extensão>` no bucket PRIVADO
 * e devolve o caminho. O backend assina a URL na leitura. Único sítio que escreve no
 * bucket: o esquema do caminho e as opções do upload ficam iguais para todos.
 */
async function uploadToEventMedia(userId: string, file: File, extension: string): Promise<string> {
  const path = `${userId}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type || undefined,
    upsert: false,
  });
  if (error) throw error;
  return path;
}

/**
 * Faz upload de uma mídia de evento para o bucket PRIVADO, na pasta do usuário,
 * e retorna o caminho (path) + tipo. O backend assina a URL na leitura.
 */
export async function uploadEventMedia(userId: string, file: File): Promise<UploadedMedia> {
  const type = mediaTypeFromFile(file);
  if (!type) {
    throw new Error('Tipo de arquivo não suportado. Envie uma imagem ou vídeo.');
  }
  const limit = type === 'image' ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
  if (file.size > limit) {
    const mb = Math.round(limit / (1024 * 1024));
    throw new Error(`Arquivo muito grande. Limite de ${String(mb)} MB para ${type === 'image' ? 'imagens' : 'vídeos'}.`);
  }

  return { path: await uploadToEventMedia(userId, file, extensionFor(file)), type };
}

/** O ícone do troféu: só os formatos que o backend aceita (sem SVG, que pode levar scripts). */
const TROPHY_ICON_EXTENSIONS: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
};
export const TROPHY_ICON_ACCEPT = Object.keys(TROPHY_ICON_EXTENSIONS).join(',');
export const MAX_TROPHY_ICON_BYTES = MAX_IMAGE_BYTES;

/**
 * Faz upload do ícone de um troféu personalizado para a pasta do utilizador no
 * bucket privado e devolve o caminho. A extensão vem do tipo da imagem, não do
 * nome do ficheiro: o backend valida-a.
 */
export async function uploadTrophyIcon(userId: string, file: File): Promise<string> {
  const extension = TROPHY_ICON_EXTENSIONS[file.type];
  if (!extension) {
    throw new Error('O ícone tem de ser uma imagem PNG, JPG, WebP ou GIF.');
  }
  if (file.size > MAX_TROPHY_ICON_BYTES) {
    const mb = Math.round(MAX_TROPHY_ICON_BYTES / (1024 * 1024));
    throw new Error(`Imagem muito grande. Limite de ${String(mb)} MB.`);
  }

  return uploadToEventMedia(userId, file, extension);
}
