import { beforeEach, describe, expect, it, vi } from 'vitest';

const upload = vi.hoisted(() => vi.fn());

vi.mock('../lib/supabase.ts', () => ({
  supabase: { storage: { from: () => ({ upload }) } },
}));

import { MAX_IMAGE_BYTES, uploadEventMedia } from './storage.ts';

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
