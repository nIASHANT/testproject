"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import api from "@/services/api";
import {
  getCurrentUser,
  CurrentUser,
} from "@/services/auth";

type User = {
  id: string;
  email: string;
  full_name: string;
  role: "admin" | "operator" | "reader";
  is_active: boolean;
};

export default function UsersPage() {
  const router = useRouter();

  const [currentUser, setCurrentUser] =
    useState<CurrentUser | null>(null);

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const [showCreateModal, setShowCreateModal] =
    useState(false);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] =
    useState<"reader" | "operator">("reader");

  const [creating, setCreating] = useState(false);

  async function loadUsers() {
    const response = await api.get("/users");
    setUsers(response.data);
  }

  useEffect(() => {
    async function initialize() {
      try {
        const user = await getCurrentUser();

        if (user.role !== "admin") {
          router.replace("/dashboard");
          return;
        }

        setCurrentUser(user);
        await loadUsers();
      } catch (err) {
        console.error(err);
        router.replace("/");
      } finally {
        setLoading(false);
      }
    }

    initialize();
  }, [router]);

  async function createUser() {
    if (!fullName.trim()) {
      alert("Please enter full name");
      return;
    }

    if (!email.trim()) {
      alert("Please enter email");
      return;
    }

    if (!password) {
      alert("Please enter password");
      return;
    }

    setCreating(true);

    try {
      await api.post("/users", {
        full_name: fullName.trim(),
        email: email.trim(),
        password,
        role,
      });

      setFullName("");
      setEmail("");
      setPassword("");
      setRole("reader");

      setShowCreateModal(false);

      await loadUsers();

      alert("User created successfully");
    } catch (err: any) {
      console.error(err);

      alert(
        err.response?.data?.detail ||
          "Failed to create user"
      );
    } finally {
      setCreating(false);
    }
  }

  async function toggleUser(user: User) {
    if (user.id === currentUser?.id) {
      alert("You cannot deactivate your own account.");
      return;
    }

    try {
      const response = await api.patch(
        `/users/${user.id}`,
        {
          is_active: !user.is_active,
        }
      );

      setUsers((currentUsers) =>
        currentUsers.map((item) =>
          item.id === user.id
            ? response.data
            : item
        )
      );
    } catch (err: any) {
      console.error(err);

      alert(
        err.response?.data?.detail ||
          "Failed to update user"
      );
    }
  }

  async function deleteUser(user: User) {
    if (user.id === currentUser?.id) {
      alert("You cannot delete your own account.");
      return;
    }

    const confirmed = window.confirm(
      `Delete ${user.full_name} (${user.email})?`
    );

    if (!confirmed) {
      return;
    }

    try {
      await api.delete(`/users/${user.id}`);

      setUsers((currentUsers) =>
        currentUsers.filter(
          (item) => item.id !== user.id
        )
      );
    } catch (err: any) {
      console.error(err);

      alert(
        err.response?.data?.detail ||
          "Failed to delete user"
      );
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p className="text-gray-600">
          Loading users...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 p-10">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <Link
              href="/dashboard"
              className="text-sm text-gray-500 hover:text-black"
            >
              ← Back to Dashboard
            </Link>

            <h1 className="text-3xl font-bold mt-2">
              Users
            </h1>

            <p className="text-gray-600">
              Manage ReleaseForge users
            </p>
          </div>

          <button
            onClick={() =>
              setShowCreateModal(true)
            }
            className="bg-black text-white px-4 py-2 rounded hover:bg-gray-800"
          >
            + Create User
          </button>
        </div>

        {/* Users table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {users.length === 0 ? (
            <div className="p-6 text-gray-600">
              No users found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left p-4">
                      Name
                    </th>
                    <th className="text-left p-4">
                      Email
                    </th>
                    <th className="text-left p-4">
                      Role
                    </th>
                    <th className="text-left p-4">
                      Status
                    </th>
                    <th className="text-right p-4">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {users.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b last:border-b-0"
                    >
                      <td className="p-4 font-medium">
                        {user.full_name}
                      </td>

                      <td className="p-4 text-gray-600">
                        {user.email}
                      </td>

                      <td className="p-4">
                        <span className="px-2 py-1 rounded bg-gray-100 text-sm capitalize">
                          {user.role}
                        </span>
                      </td>

                      <td className="p-4">
                        <span
                          className={
                            user.is_active
                              ? "text-green-600"
                              : "text-red-600"
                          }
                        >
                          {user.is_active
                            ? "Active"
                            : "Inactive"}
                        </span>
                      </td>

                      <td className="p-4">
                        <div className="flex justify-end gap-2">
                          {user.id !==
                            currentUser?.id && (
                            <>
                              <button
                                onClick={() =>
                                  toggleUser(user)
                                }
                                className="px-3 py-1 border rounded text-sm hover:bg-gray-50"
                              >
                                {user.is_active
                                  ? "Disable"
                                  : "Enable"}
                              </button>

                              <button
                                onClick={() =>
                                  deleteUser(user)
                                }
                                className="px-3 py-1 border border-red-300 text-red-600 rounded text-sm hover:bg-red-50"
                              >
                                Delete
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Create User Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-semibold mb-5">
                Create User
              </h2>

              <input
                className="w-full border p-3 rounded mb-3"
                placeholder="Full Name"
                value={fullName}
                onChange={(e) =>
                  setFullName(e.target.value)
                }
              />

              <input
                className="w-full border p-3 rounded mb-3"
                placeholder="Email"
                type="email"
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
              />

              <input
                className="w-full border p-3 rounded mb-3"
                placeholder="Password"
                type="password"
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value)
                }
              />

              <select
                className="w-full border p-3 rounded mb-5"
                value={role}
                onChange={(e) =>
                  setRole(
                    e.target.value as
                      | "reader"
                      | "operator"
                  )
                }
              >
                <option value="reader">
                  Reader
                </option>
                <option value="operator">
                  Operator
                </option>
              </select>

              <div className="flex justify-end gap-2">
                <button
                  onClick={() =>
                    setShowCreateModal(false)
                  }
                  disabled={creating}
                  className="px-4 py-2 border rounded"
                >
                  Cancel
                </button>

                <button
                  onClick={createUser}
                  disabled={creating}
                  className="px-4 py-2 bg-black text-white rounded disabled:opacity-50"
                >
                  {creating
                    ? "Creating..."
                    : "Create User"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
