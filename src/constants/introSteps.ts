/**
 * Passos da introdução do 1.º login (Warpedro1/flyer#23). Cada um destaca o elemento
 * com `data-tour="<target>"` que estiver visível (barra lateral no computador, barra de
 * baixo ou topo no celular); sem nenhum, o balão fica no centro e usa `where`.
 */
export interface IntroStep {
  target: string;
  title: string;
  body: string;
  /** Onde encontrar, quando o elemento não está na tela. */
  where: string;
}

export const INTRO_STEPS: readonly IntroStep[] = [
  {
    target: 'discover',
    title: 'Descobrir',
    body: 'Eventos e lugares perto de você. Use os filtros para escolher categoria, data, distância e preço.',
    where: 'Fica no menu, com o ícone da bússola.',
  },
  {
    target: 'map',
    title: 'Mapa',
    body: 'Os mesmos eventos e lugares no mapa, para ver o que está perto.',
    where: 'O botão do mapa fica no topo da tela Descobrir.',
  },
  {
    target: 'create-event',
    title: 'Criar evento',
    body: 'Crie o seu evento, com lotação, fila de espera e um troféu para quem fizer check-in.',
    where: 'O botão "Criar" fica no topo da tela Descobrir e em Meus eventos.',
  },
  {
    target: 'my-events',
    title: 'Meus eventos',
    body: 'Os eventos que você criou e aqueles em que vai, com o seu ingresso.',
    where: 'O botão do calendário fica no topo da tela Descobrir.',
  },
  {
    target: 'notifications',
    title: 'Notificações',
    body: 'Os avisos do Flyer aparecem no sino.',
    where: 'O sino fica no topo da tela.',
  },
  {
    target: 'profile',
    title: 'Perfil',
    body: 'Seus dados, seu plano e seus troféus. Cada troféu leva ao evento de onde veio.',
    where: 'Fica no menu, com a sua foto.',
  },
  {
    target: 'chat',
    title: 'Chat IA',
    body: 'Conte do que você gosta para receber recomendações sob medida.',
    where: 'Fica no menu, com o ícone de conversa.',
  },
];
