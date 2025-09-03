'use client';
import { useAuth } from "../../components/AuthContext";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const { token } = useAuth();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  // Account settings state
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);
  const [showProfilePublic, setShowProfilePublic] = useState(true);
  const [dataSharing, setDataSharing] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsSuccess, setSettingsSuccess] = useState("");
  const [settingsError, setSettingsError] = useState("");

  useEffect(() => {
    if (!token) {
      router.replace("/login");
      return;
    }
    async function fetchSettings() {
      setSettingsLoading(true);
      setSettingsError("");
      try {
        const res = await fetch("http://localhost:5000/api/auth/profile", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load settings");
        setEmailNotifications(data.emailNotifications);
        setSmsNotifications(data.smsNotifications);
        setShowProfilePublic(data.showProfilePublic);
        setDataSharing(data.dataSharing);
      } catch (err: any) {
        setSettingsError(err.message || "Failed to load settings");
      } finally {
        setSettingsLoading(false);
      }
    }
    fetchSettings();
  }, [token, router]);

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
    if (settingsSuccess) {
      const t = setTimeout(() => setSettingsSuccess(""), 2500);
      return () => clearTimeout(t);
    }
  }, [settingsSuccess]);
  useEffect(() => {
    if (settingsError) {
      const t = setTimeout(() => setSettingsError(""), 2500);
      return () => clearTimeout(t);
    }
  }, [settingsError]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess("");
    setError("");
    try {
      const res = await fetch("http://localhost:5000/api/auth/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Password change failed");
      setSuccess("Password changed successfully");
      setPassword("");
    } catch (err: any) {
      setError(err.message || "Password change failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsLoading(true);
    setSettingsSuccess("");
    setSettingsError("");
    try {
      const res = await fetch("http://localhost:5000/api/auth/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          emailNotifications,
          smsNotifications,
          showProfilePublic,
          dataSharing,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save settings");
      setSettingsSuccess("Settings saved successfully");
    } catch (err: any) {
      setSettingsError(err.message || "Failed to save settings");
    } finally {
      setSettingsLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      <div className="bg-white rounded shadow p-4 mb-8">
        <h2 className="font-semibold mb-2">Change Password</h2>
        <form onSubmit={handleChangePassword}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">New Password</label>
            <input
              className="w-full border rounded p-2"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
            disabled={loading}
          >
            {loading ? "Saving..." : "Change Password"}
          </button>
          {success && <div className="text-green-600 mt-2">{success}</div>}
          {error && <div className="text-red-600 mt-2">{error}</div>}
        </form>
      </div>
      <div className="bg-white rounded shadow p-4">
        <h2 className="font-semibold mb-2">Account Settings</h2>
        <form onSubmit={handleSaveSettings}>
          <div className="mb-4 flex items-center justify-between">
            <label className="font-medium">Email Notifications</label>
            <input type="checkbox" checked={emailNotifications} onChange={e => setEmailNotifications(e.target.checked)} />
          </div>
          <div className="mb-4 flex items-center justify-between">
            <label className="font-medium">SMS Notifications</label>
            <input type="checkbox" checked={smsNotifications} onChange={e => setSmsNotifications(e.target.checked)} />
          </div>
          <div className="mb-4 flex items-center justify-between">
            <label className="font-medium">Show Profile Publicly</label>
            <input type="checkbox" checked={showProfilePublic} onChange={e => setShowProfilePublic(e.target.checked)} />
          </div>
          <div className="mb-4 flex items-center justify-between">
            <label className="font-medium">Allow Data Sharing</label>
            <input type="checkbox" checked={dataSharing} onChange={e => setDataSharing(e.target.checked)} />
          </div>
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
            disabled={settingsLoading}
          >
            {settingsLoading ? "Saving..." : "Save Settings"}
          </button>
          {settingsSuccess && <div className="text-green-600 mt-2">{settingsSuccess}</div>}
          {settingsError && <div className="text-red-600 mt-2">{settingsError}</div>}
        </form>
      </div>
    </div>
  );
} 