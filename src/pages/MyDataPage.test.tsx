import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { apiResponseError } from '../test/axiosErrors.ts';
import type { MyProfile } from '../types/index.ts';

import MyDataPage from './MyDataPage.tsx';

const api = vi.hoisted(() => ({
  getMyProfile: vi.fn(),
  updateMyName: vi.fn(),
  updateMyUsername: vi.fn(),
  updateMyNickname: vi.fn(),
  updateMyPhone: vi.fn(),
  setMyAvatar: vi.fn(),
  removeMyAvatar: vi.fn(),
  checkUsername: vi.fn(),
  completeProfileIdentity: vi.fn(),
}));
const uploadAvatar = vi.hoisted(() => vi.fn());
const resizeToSquare = vi.hoisted(() => vi.fn());
const signOut = vi.hoisted(() => vi.fn());

vi.mock('../services/flyerApi.ts', () => api);
vi.mock('../services/storage.ts', () => ({ uploadAvatar }));
vi.mock('../utils/resizeImage.ts', () => ({ resizeToSquare }));
vi.mock('../hooks/useAuth.ts', () => ({
  useAuth: () => ({ user: { id: 'user-1', email: 'ana@example.com' }, signOut }),
}));

const PROFILE: MyProfile = {
  name: 'Ana Lima',
  username: 'ana.lima',
  username_change_available_at: null,
  nickname: 'Aninha',
  email: 'ana@example.com',
  cpf_masked: '***.982.247-**',
  phone_masked: '(81) 9****-5678',
  avatar_url: null,
  complete: true,
};

function renderPage(props: { completing?: boolean; onAccountChange?: () => void } = {}) {
  return render(
    <MemoryRouter initialEntries={['/profile/me']}>
      <Routes>
        <Route path="/profile/me" element={<MyDataPage {...props} />} />
        <Route path="/" element={<p>Início</p>} />
        <Route path="/login" element={<p>Tela de login</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

function section(name: RegExp) {
  return screen.getByRole('region', { name });
}

describe('MyDataPage', () => {
  beforeEach(() => {
    for (const fn of Object.values(api)) fn.mockReset().mockResolvedValue(undefined);
    api.getMyProfile.mockResolvedValue(PROFILE);
    api.checkUsername.mockResolvedValue({ available: true, reason: null, suggestion: null });
    uploadAvatar.mockReset();
    resizeToSquare.mockReset();
    signOut.mockReset().mockResolvedValue(undefined);
  });

  it('mostra os dados da conta e quem vê cada um', async () => {
    renderPage();

    expect(await screen.findByDisplayValue('ana.lima')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Aninha')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Ana Lima')).toBeInTheDocument();
    expect(screen.getByText('ana@example.com')).toBeInTheDocument();
    expect(screen.getByText('***.982.247-**')).toBeInTheDocument();
    expect(screen.getByText('(81) 9****-5678')).toBeInTheDocument();
    expect(screen.getByText(/os outros veem seu @usuário, seu vulgo e sua foto/i)).toBeInTheDocument();
  });

  it('diz o que deu errado quando não consegue carregar', async () => {
    api.getMyProfile.mockRejectedValue(apiResponseError(500, { detail: 'Erro interno.', code: 'internal_error' }));

    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent(/erro interno/i);
  });

  it('salva o nome, que só a pessoa vê', async () => {
    const user = userEvent.setup();
    renderPage();
    const name = await screen.findByDisplayValue('Ana Lima');

    await user.clear(name);
    await user.type(name, 'Ana Beatriz Lima');
    await user.click(within(section(/nome completo/i)).getByRole('button', { name: /salvar/i }));

    await waitFor(() => expect(api.updateMyName).toHaveBeenCalledWith('Ana Beatriz Lima'));
    expect(await within(section(/nome completo/i)).findByText(/salvo/i)).toBeInTheDocument();
  });

  describe('@usuário', () => {
    it('confere enquanto digita e salva o novo', async () => {
      const user = userEvent.setup();
      const onAccountChange = vi.fn();
      renderPage({ onAccountChange });
      const field = await screen.findByDisplayValue('ana.lima');

      await user.clear(field);
      await user.type(field, 'Ana.Bia');

      expect(await screen.findByText(/disponível/i)).toBeInTheDocument();
      expect(api.checkUsername).toHaveBeenLastCalledWith('ana.bia');
      await user.click(within(section(/@usuário/i)).getByRole('button', { name: /salvar/i }));

      await waitFor(() => expect(api.updateMyUsername).toHaveBeenCalledWith('ana.bia'));
      await waitFor(() => expect(onAccountChange).toHaveBeenCalled());
      expect(api.getMyProfile).toHaveBeenCalledTimes(2);
    });

    it('avisa quando já está em uso e oferece a sugestão', async () => {
      const user = userEvent.setup();
      api.checkUsername.mockResolvedValue({ available: false, reason: 'taken', suggestion: 'ana.bia42' });
      renderPage();
      const field = await screen.findByDisplayValue('ana.lima');

      await user.clear(field);
      await user.type(field, 'ana.bia');

      expect(await screen.findByText(/já está em uso/i)).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Usar @ana.bia42' }));
      expect(field).toHaveValue('ana.bia42');
    });

    it('mostra a regra quando o @ não é válido, sem salvar', async () => {
      const user = userEvent.setup();
      api.checkUsername.mockResolvedValue({ available: false, reason: 'invalid', suggestion: null });
      renderPage();
      const field = await screen.findByDisplayValue('ana.lima');

      await user.clear(field);
      await user.type(field, 'a!');

      expect(await screen.findByText(/de 3 a 20/i)).toBeInTheDocument();
      expect(within(section(/@usuário/i)).getByRole('button', { name: /salvar/i })).toBeDisabled();
    });

    it('fica travado até a data da próxima troca', async () => {
      api.getMyProfile.mockResolvedValue({ ...PROFILE, username_change_available_at: '2026-12-20T15:00:00Z' });

      renderPage();

      expect(await screen.findByDisplayValue('ana.lima')).toBeDisabled();
      expect(screen.getByText(/você poderá trocar de novo em 20\/12\/2026/i)).toBeInTheDocument();
    });

    it('mostra a recusa do backend', async () => {
      const user = userEvent.setup();
      api.updateMyUsername.mockRejectedValue(
        apiResponseError(422, { detail: 'O @usuário foi recusado pela moderação (assédio). Escolha outro.', code: 'content_blocked' }),
      );
      renderPage();
      const field = await screen.findByDisplayValue('ana.lima');

      await user.clear(field);
      await user.type(field, 'ana.bia');
      await screen.findByText(/disponível/i);
      await user.click(within(section(/@usuário/i)).getByRole('button', { name: /salvar/i }));

      expect(await screen.findByText(/recusado pela moderação/i)).toBeInTheDocument();
    });
  });

  describe('vulgo', () => {
    it('salva o vulgo', async () => {
      const user = userEvent.setup();
      renderPage();
      const field = await screen.findByDisplayValue('Aninha');

      await user.clear(field);
      await user.type(field, 'Aninha do Frevo');
      await user.click(within(section(/vulgo/i)).getByRole('button', { name: /salvar/i }));

      await waitFor(() => expect(api.updateMyNickname).toHaveBeenCalledWith('Aninha do Frevo'));
    });

    it('remove o vulgo', async () => {
      const user = userEvent.setup();
      renderPage();
      await screen.findByDisplayValue('Aninha');

      await user.click(within(section(/vulgo/i)).getByRole('button', { name: /remover/i }));

      await waitFor(() => expect(api.updateMyNickname).toHaveBeenCalledWith(null));
    });
  });

  describe('celular', () => {
    it('troca o celular', async () => {
      const user = userEvent.setup();
      renderPage();
      await screen.findByText('(81) 9****-5678');

      await user.click(within(section(/celular/i)).getByRole('button', { name: /trocar/i }));
      await user.type(screen.getByLabelText(/novo celular/i), '81987654321');
      await user.click(within(section(/celular/i)).getByRole('button', { name: /salvar/i }));

      await waitFor(() => expect(api.updateMyPhone).toHaveBeenCalledWith('(81) 98765-4321'));
    });

    it('não envia um celular inválido', async () => {
      const user = userEvent.setup();
      renderPage();
      await screen.findByText('(81) 9****-5678');

      await user.click(within(section(/celular/i)).getByRole('button', { name: /trocar/i }));
      await user.type(screen.getByLabelText(/novo celular/i), '1234');
      await user.click(within(section(/celular/i)).getByRole('button', { name: /salvar/i }));

      expect(await screen.findByText(/celular inválido/i)).toBeInTheDocument();
      expect(api.updateMyPhone).not.toHaveBeenCalled();
    });

    it('remove o celular depois de confirmar', async () => {
      const user = userEvent.setup();
      renderPage();
      await screen.findByText('(81) 9****-5678');

      await user.click(within(section(/celular/i)).getByRole('button', { name: /^remover/i }));
      await user.click(screen.getByRole('button', { name: /sim, remover/i }));

      await waitFor(() => expect(api.updateMyPhone).toHaveBeenCalledWith(null));
    });

    it('sem celular, oferece incluir', async () => {
      api.getMyProfile.mockResolvedValue({ ...PROFILE, phone_masked: null });

      renderPage();

      expect(await screen.findByText(/não informado/i)).toBeInTheDocument();
      expect(within(section(/celular/i)).getByRole('button', { name: /incluir/i })).toBeInTheDocument();
    });
  });

  describe('foto', () => {
    it('reduz, envia, modera e mostra a foto nova', async () => {
      const user = userEvent.setup();
      const onAccountChange = vi.fn();
      const small = new Blob([new Uint8Array([1])], { type: 'image/webp' });
      resizeToSquare.mockResolvedValue(small);
      uploadAvatar.mockResolvedValue('user-1/abc.webp');
      api.setMyAvatar.mockResolvedValue({ avatar_url: 'https://storage.example/abc.webp' });
      const { container } = renderPage({ onAccountChange });
      await screen.findByDisplayValue('ana.lima');
      const file = new File([new Uint8Array([1, 2])], 'eu.jpg', { type: 'image/jpeg' });

      await user.upload(screen.getByLabelText(/escolher foto/i), file);

      await waitFor(() => expect(api.setMyAvatar).toHaveBeenCalledWith('user-1/abc.webp'));
      expect(resizeToSquare).toHaveBeenCalledWith(file);
      expect(uploadAvatar).toHaveBeenCalledWith('user-1', small);
      await waitFor(() =>
        expect(container.querySelector('img[src="https://storage.example/abc.webp"]')).not.toBeNull(),
      );
      expect(onAccountChange).toHaveBeenCalled();
    });

    it('mostra a recusa da moderação', async () => {
      const user = userEvent.setup();
      resizeToSquare.mockResolvedValue(new Blob([new Uint8Array([1])], { type: 'image/webp' }));
      uploadAvatar.mockResolvedValue('user-1/abc.webp');
      api.setMyAvatar.mockRejectedValue(
        apiResponseError(422, { detail: 'A foto foi recusada pela moderação (conteúdo sexual). Escolha outra.', code: 'content_blocked' }),
      );
      renderPage();
      await screen.findByDisplayValue('ana.lima');

      await user.upload(screen.getByLabelText(/escolher foto/i), new File(['x'], 'eu.jpg', { type: 'image/jpeg' }));

      expect(await screen.findByText(/foto foi recusada pela moderação/i)).toBeInTheDocument();
    });

    it('remove a foto', async () => {
      const user = userEvent.setup();
      const onAccountChange = vi.fn();
      api.getMyProfile.mockResolvedValue({ ...PROFILE, avatar_url: 'https://storage.example/old.webp' });
      renderPage({ onAccountChange });

      await user.click(await screen.findByRole('button', { name: /remover foto/i }));

      await waitFor(() => expect(api.removeMyAvatar).toHaveBeenCalled());
      expect(onAccountChange).toHaveBeenCalled();
    });
  });

  describe('completar o cadastro (conta sem CPF)', () => {
    const incomplete: MyProfile = { ...PROFILE, cpf_masked: null, phone_masked: null, complete: false };

    it('pede o CPF, o celular é opcional, e entra no app', async () => {
      const user = userEvent.setup();
      const onAccountChange = vi.fn();
      api.getMyProfile.mockResolvedValue(incomplete);
      renderPage({ completing: true, onAccountChange });

      expect(await screen.findByLabelText(/^cpf/i)).toBeRequired();
      expect(screen.getByLabelText(/^celular/i)).not.toBeRequired();
      await user.type(screen.getByLabelText(/^cpf/i), '52998224725');
      await user.click(screen.getByRole('button', { name: /continuar/i }));

      await waitFor(() => expect(api.completeProfileIdentity).toHaveBeenCalledWith({ cpf: '529.982.247-25' }));
      expect(onAccountChange).toHaveBeenCalled();
      expect(await screen.findByText('Início')).toBeInTheDocument();
    });

    it('não envia um CPF inválido', async () => {
      const user = userEvent.setup();
      api.getMyProfile.mockResolvedValue(incomplete);
      renderPage({ completing: true });

      await user.type(await screen.findByLabelText(/^cpf/i), '11111111111');
      await user.click(screen.getByRole('button', { name: /continuar/i }));

      expect(await screen.findByText(/cpf inválido/i)).toBeInTheDocument();
      expect(api.completeProfileIdentity).not.toHaveBeenCalled();
    });

    it('deixa usar outra conta', async () => {
      const user = userEvent.setup();
      api.getMyProfile.mockResolvedValue(incomplete);
      renderPage({ completing: true });

      await user.click(await screen.findByRole('button', { name: /usar outra conta/i }));

      await waitFor(() => expect(signOut).toHaveBeenCalled());
      expect(await screen.findByText('Tela de login')).toBeInTheDocument();
    });
  });
});
