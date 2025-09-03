"use client";
import useSWR from "swr";
import { useAuth } from "../../components/AuthContext";
import { get, post } from "../../lib/api";
import { useState } from "react";

export default function ProfilePage() {
  const { user, token } = useAuth();
  const { data, mutate } = useSWR(user ? ["/auth/profile", token] : null, ([url, t]) => get(url, t));
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const handleUpdate = async () => {
    setLoading(true);
    setSuccess("");
    setError("");
    try {
      await post("/auth/profile", { name: name || data?.name, password }, token);
      setSuccess("Profile updated!");
      mutate();
      setName("");
      setPassword("");
    } catch (e: any) {
      setError(e.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  if (!data) return <div className="p-8">Loading...</div>;

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-8">My Profile</h1>
      <div className="bg-white rounded shadow p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Name</label>
          <input className="w-full border rounded px-3 py-2" value={name || data.name} onChange={e => setName(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input className="w-full border rounded px-3 py-2 bg-gray-100" value={data.email} disabled />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Role</label>
          <input className="w-full border rounded px-3 py-2 bg-gray-100" value={data.isAdmin ? "Admin" : "User"} disabled />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">New Password</label>
          <input className="w-full border rounded px-3 py-2" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Leave blank to keep current password" />
        </div>
        <button onClick={handleUpdate} disabled={loading} className="w-full bg-blue-600 text-white py-2 rounded mt-4 hover:bg-blue-700 transition">
          {loading ? "Updating..." : "Update Profile"}
        </button>
        {success && <div className="text-green-600 text-center mt-2">{success}</div>}
        {error && <div className="text-red-600 text-center mt-2">{error}</div>}
      </div>
    </div>
  );
} 