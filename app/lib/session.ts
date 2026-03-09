import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';

export async function getCurrentUser() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return null;
  }

  return session.user;
}
