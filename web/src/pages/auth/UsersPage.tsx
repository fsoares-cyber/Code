import { useEffect, useState } from "react";
import { api } from "../../api";
import type { CurrentUser } from "../../auth/AuthContext";

interface UserRow extends CurrentUser {
  createdAt: string;
}

const emptyForm = { name: "", email: "", password: "", role: "USER" as "ADMIN" | "USER" };

export function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setUsers(await api.get<UserRow[]>("/auth/users"));
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post("/auth/users", form);
      setForm(emptyForm);
      setShowForm(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao criar usuário");
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Usuários</h2>
          <p>Apenas administradores podem criar novas contas.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm((s) => !s)}>
          {showForm ? "Cancelar" : "+ Novo usuário"}
        </button>
      </div>

      {showForm && (
        <div className="card">
          <form className="form-grid" onSubmit={handleSubmit}>
            <div>
              <label>Nome *</label>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label>E-mail *</label>
              <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <label>Senha (mín. 8 caracteres) *</label>
              <input required type="password" minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </div>
            <div>
              <label>Papel</label>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as "ADMIN" | "USER" })}>
                <option value="USER">Usuário</option>
                <option value="ADMIN">Administrador</option>
              </select>
            </div>
            {error && (
              <div className="full small" style={{ color: "var(--danger)" }}>
                {error}
              </div>
            )}
            <div className="full">
              <button className="btn btn-primary" type="submit">
                Criar usuário
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>E-mail</th>
              <th>Papel</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td>{u.role === "ADMIN" ? "Administrador" : "Usuário"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
