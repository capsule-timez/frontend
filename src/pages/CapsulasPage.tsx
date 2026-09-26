import { useAuth } from '../hooks/useAuth'

export function CapsulasPage() {
  const { user } = useAuth()

  return (
    <section>
      <h1>Minhas cápsulas</h1>
      <p>Olá, {user?.name}!</p>
      <p>Listagem de cápsulas — em construção.</p>
    </section>
  )
}
