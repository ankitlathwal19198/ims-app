// app/login/page.tsx
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import LoginClientComponent from './LoginClientComponent';

export default async function LoginPage() {
  const session = await auth();

  if (session?.user) redirect('/');

  return <LoginClientComponent />;
}
