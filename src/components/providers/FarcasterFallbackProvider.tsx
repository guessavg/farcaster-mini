'use client';

import { useEffect } from 'react';

// Este componente proporciona una implementación de fallback para entornos donde no está disponible el QuickAuth de Farcaster
export default function FarcasterFallbackProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Solo inyectar el mock si estamos en un navegador y el SDK de Farcaster no está disponible
    if (typeof window !== 'undefined' && (typeof window.sdk === 'undefined' || !window.sdk?.quickAuth)) {
      console.info('Farcaster environment not detected, providing mock implementation for development');
      
      // Mock básico del SDK de Farcaster para entornos de desarrollo
      window.sdk = {
        ...window.sdk,
        quickAuth: {
          getToken: async () => {
            console.info('Mock Farcaster quickAuth.getToken called');
            // Para testing, se puede descomentar esto para simular un token válido:
            // return { token: 'mock-token-for-development' };
            
            // En producción o por defecto, devolvemos null para indicar que no hay autenticación
            return null;
          }
        }
      };
    }
  }, []);
  
  return children;
}

// Añadir declaración global para TypeScript
declare global {
  interface Window {
    sdk?: {
      quickAuth?: {
        getToken: () => Promise<{ token: string } | null>;
      };
    };
  }
}
