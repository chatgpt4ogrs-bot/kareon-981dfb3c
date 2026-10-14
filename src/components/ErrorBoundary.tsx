import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/** Evita a tela branca: mostra o erro da tela em vez de derrubar o app inteiro. */
class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Erro ao renderizar a tela:", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="mx-auto max-w-lg rounded-lg border border-border bg-card p-8 text-center space-y-4">
        <AlertTriangle className="w-10 h-10 mx-auto text-destructive" />
        <div className="space-y-1">
          <p className="font-semibold text-foreground">Não foi possível carregar esta tela.</p>
          <p className="text-sm text-muted-foreground">
            Tente novamente. Se o problema continuar, entre em contato com o suporte.
          </p>
        </div>
        <p className="text-xs text-muted-foreground break-words bg-muted rounded p-2">{this.state.error.message}</p>
        <Button variant="outline" onClick={() => this.setState({ error: null })}>
          Tentar novamente
        </Button>
      </div>
    );
  }
}

export default ErrorBoundary;
