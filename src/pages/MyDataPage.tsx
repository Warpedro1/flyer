import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { DataSection } from '../components/myData/DataSection.tsx';
import { IdentitySection } from '../components/myData/IdentitySection.tsx';
import { NameSection } from '../components/myData/NameSection.tsx';
import { NicknameSection } from '../components/myData/NicknameSection.tsx';
import { PhoneSection } from '../components/myData/PhoneSection.tsx';
import { PhotoSection } from '../components/myData/PhotoSection.tsx';
import { UsernameSection } from '../components/myData/UsernameSection.tsx';
import { BackButton } from '../components/navigation/BackButton.tsx';
import { useAccount } from '../hooks/useAccount.ts';
import { useAuth } from '../hooks/useAuth.ts';
import { getMyProfile } from '../services/flyerApi.ts';
import type { MyProfile } from '../types/index.ts';
import { formatApiError } from '../utils/apiError.ts';
import { avatarLabel } from '../utils/publicName.ts';

interface MyDataPageProps {
  /** Conta sem CPF: o layout mostra só esta tela, para completar o cadastro. */
  completing?: boolean;
  /** Avisa o layout que a conta mudou (CPF, foto, @usuário); sem isso, usa o do `<Outlet>`. */
  onAccountChange?: () => void;
}

/**
 * "Meus dados" (Warpedro1/flyer-back#24, #32): o que só a própria pessoa vê e edita. O
 * nome, o e-mail, o CPF e o celular são privados; o @usuário, o vulgo e a foto são o
 * que os outros veem. Também completa o cadastro de quem ainda não tem CPF.
 */
export default function MyDataPage({ completing = false, onAccountChange }: MyDataPageProps) {
  const { user, signOut } = useAuth();
  const { refreshAccount } = useAccount();
  const notifyAccount = onAccountChange ?? refreshAccount;
  const navigate = useNavigate();
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setProfile(await getMyProfile());
      setError(null);
    } catch (err) {
      setError(formatApiError(err));
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    getMyProfile()
      .then((data) => {
        if (!cancelled) setProfile(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(formatApiError(err));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Mudou o que aparece no menu (foto ou @usuário): o layout confere de novo.
  const afterPublicChange = () => {
    void reload();
    notifyAccount();
  };

  const handleOtherAccount = async () => {
    await signOut();
    void navigate('/login', { replace: true });
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 pb-28 sm:p-8 md:pb-8">
      {!completing && <BackButton />}
      <header>
        <h1 className="text-2xl font-bold text-gray-900">{completing ? 'Complete seu cadastro' : 'Meus dados'}</h1>
        {completing && (
          <p className="mt-1 text-sm text-gray-600">Para usar o Flyer, precisamos do seu CPF. O celular é opcional.</p>
        )}
        <p className="mt-1 text-sm text-gray-500">
          Só você vê seu nome, e-mail, CPF e celular. Os outros veem seu @usuário, seu vulgo e sua foto.
        </p>
      </header>

      {error && (
        <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800">
          {error}
        </p>
      )}

      {!profile && !error && (
        <div className="flex justify-center py-8">
          <div
            className="h-8 w-8 animate-spin rounded-full border-2 border-red-600 border-t-transparent"
            role="status"
            aria-label="Carregando"
          />
        </div>
      )}

      {profile && (
        <>
          {!profile.complete && (
            <IdentitySection
              onCompleted={() => {
                notifyAccount();
                void navigate('/', { replace: true });
              }}
            />
          )}
          <PhotoSection
            userId={user?.id ?? ''}
            avatarUrl={profile.avatar_url}
            label={avatarLabel(profile)}
            onChanged={(avatarUrl) => {
              setProfile((p) => (p ? { ...p, avatar_url: avatarUrl } : p));
              notifyAccount();
            }}
          />
          <UsernameSection
            current={profile.username}
            availableAt={profile.username_change_available_at}
            onSaved={afterPublicChange}
          />
          <NicknameSection current={profile.nickname} onSaved={() => void reload()} />
          <NameSection current={profile.name} />
          <DataSection title="E-mail" hint="Só você vê.">
            <p className="text-sm text-gray-900">{profile.email ?? 'Não informado'}</p>
          </DataSection>
          {profile.complete && (
            <>
              <DataSection title="CPF" hint="Só você vê. Não pode ser alterado.">
                <p className="font-mono text-sm text-gray-900">{profile.cpf_masked}</p>
              </DataSection>
              <PhoneSection masked={profile.phone_masked} onSaved={() => void reload()} />
            </>
          )}
        </>
      )}

      {completing && (
        <button
          type="button"
          onClick={() => void handleOtherAccount()}
          className="w-full py-2 text-sm font-medium text-gray-500 hover:text-red-600"
        >
          Usar outra conta
        </button>
      )}
    </div>
  );
}
