import { Component, ErrorInfo, ReactNode } from 'react';
import { HomeSafeFallback } from './HomeSafeFallback';

type HomeRenderBoundaryProps = {
  children: ReactNode;
};

type HomeRenderBoundaryState = {
  hasError: boolean;
};

export class HomeRenderBoundary extends Component<HomeRenderBoundaryProps, HomeRenderBoundaryState> {
  state: HomeRenderBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError(): HomeRenderBoundaryState {
    return {
      hasError: true,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[Discora] Home render fallback activated', error, errorInfo);
  }

  componentDidUpdate(previousProps: HomeRenderBoundaryProps) {
    if (this.state.hasError && previousProps.children !== this.props.children) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      return <HomeSafeFallback detail="Discora mostro una vista segura de Inicio para evitar una pantalla vacia." />;
    }

    return this.props.children;
  }
}
