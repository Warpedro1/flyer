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
    throw new Error('O ícone precisa ser uma imagem PNG, JPG, WebP ou GIF.');
  }
  if (file.size > MAX_TROPHY_ICON_BYTES) {
    const mb = Math.round(MAX_TROPHY_ICON_BYTES / (1024 * 1024));
    throw new Error(`Imagem muito grande. Limite de ${String(mb)} MB.`);
  }

  return uploadToEventMedia(userId, file, extension);
}

/** A foto de perfil (Warpedro1/flyer-back#24): só os formatos do bucket `avatars`. */
const AVATAR_EXTENSIONS: Record<string, string> = {
  'image/webp': 'webp',
  'image/jpeg': 'jpg',
  'image/png': 'png',
};
const AVATAR_BUCKET = 'avatars';
/** O bucket aceita até 2 MB; a foto já reduzida para 512×512 fica bem abaixo disso. */
export const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

/**
 * Envia a foto de perfil (já reduzida por `resizeToSquare`) para `avatars/{userId}/<uuid>.<ext>`
 * e devolve o caminho. Só vale depois que o backend a modera (`setMyAvatar`).
 */
export async function uploadAvatar(userId: string, photo: Blob): Promise<string> {
  const extension = AVATAR_EXTENSIONS[photo.type];
  if (!extension) {
    throw new Error('A foto precisa ser uma imagem JPG, PNG ou WEBP.');
  }
  if (photo.size > MAX_AVATAR_BYTES) {
    throw new Error('Foto muito grande. Limite de 2 MB.');
  }
  const path = `${userId}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from(AVATAR_BUCKET).upload(path, photo, {
    contentType: photo.type,
    upsert: false,
  });
  // A mensagem do Storage vem em inglês; a pessoa vê esta.
  if (error) throw new Error('Não foi possível enviar a foto. Verifique sua conexão e tente de novo.');
  return path;
}

/**
 * Apaga uma foto enviada que não chegou a ser usada (o backend não a aceitou ou não
 * respondeu). Melhor esforço: o bucket só deixa apagar na própria pasta, e uma falha
 * deixa só um arquivo órfão.
 */
export async function removeAvatarUpload(path: string): Promise<void> {
  try {
    await supabase.storage.from(AVATAR_BUCKET).remove([path]);
  } catch {
    // Sem conexão: fica o arquivo, que ninguém vê.
  }
}
