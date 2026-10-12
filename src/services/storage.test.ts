import { beforeEach, describe, expect, it, vi } from 'vitest';

const upload = vi.hoisted(() => vi.fn());

vi.mock('../lib/supabase.ts', () => ({
  supabase: { storage: { from: () => ({ upload }) } },
}));

import { MAX_IMAGE_BYTES, MAX_TROPHY_ICON_BYTES, uploadEventMedia, uploadTrophyIcon } from './storage.ts';

describe('uploadEventMedia', () => {
  beforeEach(() => {
    upload.mockReset();
  });

  it('faz upload de imagem e retorna path {uid}/<uuid>.<ext> + tipo', async () => {
    upload.mockResolvedValue({ error: null });
    const file = new File([new Uint8Array([1, 2, 3])], 'foto.PNG', { type: 'image/png' });

    const result = await uploadEventMedia('user-123', file);

    expect(result.type).toBe('image');
    expect(result.path).toMatch(/^user-123\/[0-9a-f-]+\.png$/i);
    expect(upload).toHaveBeenCalledTimes(1);
  });

  it('rejeita tipo não suportado sem chamar o storage', async () => {
    const file = new File(['x'], 'doc.txt', { type: 'text/plain' });
    await expect(uploadEventMedia('u', file)).rejects.toThrow(/não suportado/i);
    expect(upload).not.toHaveBeenCalled();
  });

  it('rejeita arquivo acima do limite de tamanho', async () => {
    const big = new File([new Uint8Array(MAX_IMAGE_BYTES + 1)], 'grande.jpg', { type: 'image/jpeg' });
    await expect(uploadEventMedia('u', big)).rejects.toThrow(/muito grande/i);
    expect(upload).not.toHaveBeenCalled();
  });

  it('propaga erro do storage', async () => {
    upload.mockResolvedValue({ error: new Error('storage down') });
    const file = new File(['x'], 'a.jpg', { type: 'image/jpeg' });
    await expect(uploadEventMedia('u', file)).rejects.toThrow('storage down');
  });
});

describe('uploadTrophyIcon', () => {
  beforeEach(() => {
    upload.mockReset();
  });

  it.each([
    ['image/png', 'png'],
    ['image/jpeg', 'jpg'],
    ['image/webp', 'webp'],
    ['image/gif', 'gif'],
  ])('envia %s para a pasta do utilizador com a extensão .%s', async (mime, ext) => {
    upload.mockResolvedValue({ error: null });
    // O nome do ficheiro não decide a extensão: "foto.jfif" é JPEG, mas o backend só aceita .jpg.
    const file = new File([new Uint8Array([1])], 'foto.jfif', { type: mime });

    const path = await uploadTrophyIcon('user-1', file);

    expect(path).toMatch(new RegExp(`^user-1/[0-9a-f-]+\\.${ext}$`, 'i'));
    expect(upload).toHaveBeenCalledWith(path, file, expect.objectContaining({ contentType: mime }));
  });

  it.each([
    ['video/mp4', 'aula.mp4'],
    ['image/heic', 'IMG_0001.HEIC'],
    ['image/svg+xml', 'logo.svg'],
  ])('recusa %s: o ícone é uma imagem PNG, JPG, WebP ou GIF', async (mime, name) => {
    const file = new File(['x'], name, { type: mime });

    await expect(uploadTrophyIcon('user-1', file)).rejects.toThrow(/PNG, JPG, WebP ou GIF/);
    expect(upload).not.toHaveBeenCalled();
  });

  it('recusa um ícone grande demais', async () => {
    const big = new File([new Uint8Array(MAX_TROPHY_ICON_BYTES + 1)], 'grande.png', { type: 'image/png' });

    await expect(uploadTrophyIcon('user-1', big)).rejects.toThrow(/muito grande/i);
    expect(upload).not.toHaveBeenCalled();
  });
});
