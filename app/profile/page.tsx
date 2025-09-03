'use client';
import { useAuth } from "../../components/AuthContext";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useState, useRef, useEffect } from "react";
import { Eye, EyeOff } from 'lucide-react';

export default function ProfilePage() {
  const { user, token, refreshUser, login } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState("");
  const [avatarSuccess, setAvatarSuccess] = useState("");
  const fileInputRef = useRef(null);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess("");
    setError("");
    if (password && password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/api/auth/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ name, password: password || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Update failed");
      setSuccess("Profile updated successfully");
      setPassword("");
      setConfirmPassword("");
      if (data.token) login(data.token);
      refreshUser();
    } catch (err: any) {
      setError(err.message || "Update failed");
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setAvatarUploading(true);
    setAvatarError("");
    setAvatarSuccess("");
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append("avatar", file);
    try {
      const res = await fetch("http://localhost:5000/api/auth/profile/avatar", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setAvatarSuccess("Profile picture updated!");
      if (data.token) login(data.token);
      refreshUser();
    } catch (err: any) {
      setAvatarError(err.message || "Upload failed");
    } finally {
      setAvatarUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Auto-dismiss messages
  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(""), 2500);
      return () => clearTimeout(t);
    }
  }, [success]);
  useEffect(() => {
    if (error) {
      const t = setTimeout(() => setError(""), 2500);
      return () => clearTimeout(t);
    }
  }, [error]);
  useEffect(() => {
    if (avatarSuccess) {
      const t = setTimeout(() => setAvatarSuccess(""), 2500);
      return () => clearTimeout(t);
    }
  }, [avatarSuccess]);
  useEffect(() => {
    if (avatarError) {
      const t = setTimeout(() => setAvatarError(""), 2500);
      return () => clearTimeout(t);
    }
  }, [avatarError]);

  return (
    <div className="max-w-xl mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold mb-6">My Profile</h1>
      <div className="flex items-center gap-4 mb-6">
        <div className="relative group">
          <Avatar className="h-16 w-16">
            <AvatarImage 
              src={user?.avatarUrl ? `http://localhost:5000${user.avatarUrl}` : undefined} 
              alt={user?.name || user?.email} 
            />
            <AvatarFallback className="text-3xl">{user?.name ? user.name[0] : user?.email?.[0]}</AvatarFallback>
          </Avatar>
          <button
            type="button"
            className="absolute bottom-0 right-0 bg-blue-600 text-white rounded-full p-1 text-xs opacity-80 group-hover:opacity-100"
            onClick={() => fileInputRef.current && (fileInputRef.current as any).click()}
            disabled={avatarUploading}
          >
            {avatarUploading ? "..." : "Edit"}
          </button>
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            className="hidden"
            onChange={handleAvatarChange}
            disabled={avatarUploading}
          />
        </div>
        <div>
          <div className="font-semibold text-lg">{user?.name}</div>
          <div className="text-gray-500">{user?.email}</div>
          <div className="text-xs text-blue-700 font-medium mt-1">{user?.role}</div>
        </div>
      </div>
      {avatarSuccess && <div className="text-green-600 mb-2">{avatarSuccess}</div>}
      {avatarError && <div className="text-red-600 mb-2">{avatarError}</div>}
      <form className="bg-white rounded shadow p-4" onSubmit={handleUpdate}>
        <h2 className="font-semibold mb-2">Edit Profile</h2>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Name</label>
          <input
            className="w-full border rounded p-2"
            value={name}
            onChange={e => setName(e.target.value)}
            required
          />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">New Password</label>
          <div className="relative">
            <input
              className="w-full border rounded p-2 pr-10"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Leave blank to keep current password"
            />
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500"
              onClick={() => setShowPassword(v => !v)}
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Confirm Password</label>
          <div className="relative">
            <input
              className="w-full border rounded p-2 pr-10"
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
            />
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500"
              onClick={() => setShowPassword(v => !v)}
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
          disabled={loading}
        >
          {loading ? "Saving..." : "Save Changes"}
        </button>
        {success && <div className="text-green-600 mt-2">{success}</div>}
        {error && <div className="text-red-600 mt-2">{error}</div>}
      </form>
    </div>
  );
} 