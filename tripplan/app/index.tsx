import { Redirect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingView } from '@/components/LoadingView';

export default function Index() {
  const { session, loading } = useAuth();

  if (loading) {
    return <LoadingView message="Загрузка..." />;
  }

  if (session) {
    return <Redirect href="/(tabs)/trips" />;
  }

  return <Redirect href="/auth/login" />;
}
