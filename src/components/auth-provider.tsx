import { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

type AuthContextType = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      await checkDomainAndSync(session?.user);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      await checkDomainAndSync(session?.user);
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkDomainAndSync = async (user: User | null | undefined) => {
    if (!user) return;
    const email = user.email;
    if (email && !email.endsWith('@polijunior.com.br')) {
      toast.error('Acesso negado', {
        description: 'Apenas e-mails institucionais da Poli Júnior são permitidos.',
      });
      await supabase.auth.signOut();
      return;
    }

    // Upsert na tabela membros
    if (user) {
      await supabase.from('membros').upsert({
        id: user.id,
        nome: user.user_metadata?.full_name || email?.split('@')[0] || 'Usuário',
        email: email,
        avatarUrl: user.user_metadata?.avatar_url || null,
      }, { onConflict: 'id' });
    }
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) {
      toast.error('Erro no login', { description: error.message });
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error('Erro ao sair', { description: error.message });
    } else {
      window.location.href = "/login";
    }
  };

  return (
    <AuthContext.Provider value={{ session, user, loading, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
