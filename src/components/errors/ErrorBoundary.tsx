import { Component, type ErrorInfo, type ReactNode } from 'react';

import { reportClientError } from '../../services/flyerApi.ts';
import { isChunkLoadError, reloadOnce } from '../../utils/chunkReload.ts';
import { ErrorScreen } from './ErrorScreen.tsx';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
  reference: string | null;
  reloading: boolean;
}

function newReference(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 12);
}

/**
 * Apanha um erro de render e mostra a tela de erro em vez de uma tela em branco (#33).
 *
 * É o único componente de classe da app: o React não tem hook para isto. Um ficheiro
 * JS que já não existe (aba aberta antes de um deploy) recarrega a página uma vez; os
 * outros erros são enviados ao backend (`app_errors`, só com sessão) com a referência
 * que a tela mostra.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, reference: null, reloading: false };

  static getDerivedStateFromError(error: unknown): Partial<State> {
    return { error: error instanceof Error ? error : new Error(String(error)) };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    const chunk = isChunkLoadError(error);
    if (chunk && reloadOnce()) {
      this.setState({ reloading: true });
      return;
    }
    const reference = newReference();
    this.setState({ reference });
    void reportClientError(
      {
        message: error.message || String(error),
        route: window.location.pathname,
        code: chunk ? 'chunk_load_error' : 'render_error',
        stack: `${error.stack ?? ''}${info.componentStack ?? ''}`,
      },
      reference,
    );
  }

  private reset = (): void => {
    this.setState({ error: null, reference: null, reloading: false });
  };

  render(): ReactNode {
    if (this.state.reloading) {
      return (
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
        </div>
      );
    }
    if (this.state.error) {
      return <ErrorScreen reference={this.state.reference} onRetry={this.reset} />;
    }
    return this.props.children;
  }
}
