import { ReactNode } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { GameProvider } from './context/GameContext';
import { AppRouter } from './router';
import { DevToolsProvider } from './devToolsContext';

function DevToolsWrapper({ children }: { children: ReactNode }) {
  const { user, updateDevMode } = useAuth();
  return (
    <DevToolsProvider
      userEmail={user?.email}
      initialDevMode={user?.devMode ?? false}
      onDevModeChange={updateDevMode}
    >
      {children}
    </DevToolsProvider>
  );
}

function App() {
  return (
    <AuthProvider>
      <DevToolsWrapper>
        <GameProvider>
          <AppRouter />
        </GameProvider>
      </DevToolsWrapper>
    </AuthProvider>
  );
}

export default App;
