import { Link } from 'react-router-dom'

export function CadastroPage() {
  return (
    <section>
      <h1>Cadastro</h1>
      <p>Página de criação de conta — em construção.</p>
      <p>
        Já tem conta? <Link to="/login">Fazer login</Link>
      </p>
    </section>
  )
}
