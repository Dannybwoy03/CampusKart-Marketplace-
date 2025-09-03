"use client";
import useSWR from "swr";
import { useAuth } from "../../components/AuthContext";
import { get, post, del } from "../../lib/api";

export default function AdminUsersPage() {
  const { user, token } = useAuth();
  const { data: users, mutate } = useSWR(user?.isAdmin ? ["/admin/users", token] : null, ([url, t]) => get(url, t));

  async function handleRole(id: string, makeAdmin: boolean) {
    await post(`/admin/users/${id}/role`, { isAdmin: makeAdmin }, token);
    mutate();
  }
  async function handleDelete(id: string) {
    await del(`/admin/users/${id}`, token);
    mutate();
  }

  if (!user?.isAdmin) return <div className="p-8 text-red-600">Admin only</div>;
  if (!users) return <div className="p-8">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-8">Manage Users</h1>
      <table className="w-full bg-white rounded shadow overflow-hidden">
        <thead className="bg-gray-50">
          <tr>
            <th className="p-3">Name</th>
            <th className="p-3">Email</th>
            <th className="p-3">Role</th>
            <th className="p-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u: any) => (
            <tr key={u.id}>
              <td className="p-3">{u.name}</td>
              <td className="p-3">{u.email}</td>
              <td className="p-3">{u.isAdmin ? "Admin" : "User"}</td>
              <td className="p-3 flex gap-2">
                <button onClick={() => handleRole(u.id, !u.isAdmin)} className="px-3 py-1 rounded bg-blue-600 text-white text-xs hover:bg-blue-700">
                  {u.isAdmin ? "Demote" : "Promote"}
                </button>
                <button onClick={() => handleDelete(u.id)} className="px-3 py-1 rounded bg-red-600 text-white text-xs hover:bg-red-700">Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 