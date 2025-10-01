// app/page.tsx
import { redirect } from 'next/navigation';

export default function Home() {
  // The middleware will handle this, but as a fallback:
  redirect('/dashboard');
}