import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { getAuthToken, getAuthUser, clearAuth, setAuthToken, setAuthUser, AuthUser } from '@/lib/api';
import { oneSignalLogout, oneSignalCompleteSetup } from '@/lib/onesignal';

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing auth on mount
  useEffect(() => {
    const initAuth = () => {
      try {
        const existingToken = getAuthToken();
        const existingUser = getAuthUser();
        
        if (existingToken && existingUser) {
          setToken(existingToken);
          setUser(existingUser);
          
          // Khởi tạo OneSignal nếu user đã đăng nhập từ trước
          if (existingUser.email) {
            console.log("🚀 Starting OneSignal setup for existing user...");
            oneSignalCompleteSetup(existingUser.email);
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        clearAuth();
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = (newToken: string, newUser: AuthUser) => {
    setAuthToken(newToken);
    setAuthUser(newUser);
    setToken(newToken);
    setUser(newUser);
    
    // Khởi tạo OneSignal và cập nhật Player ID sau khi đăng nhập thành công
    if (newUser.email) {
      console.log("🚀 Starting OneSignal setup after login...");
      oneSignalCompleteSetup(newUser.email);
    }
  };

  const logout = () => {
    clearAuth();
    setToken(null);
    setUser(null);
    oneSignalLogout();
  };

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    isAuthenticated: !!(token && user),
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
