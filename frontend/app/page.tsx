
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/services/api";

export default function Home() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function login() {
    try {
      const formData = new URLSearchParams();
      formData.append("username", email);
      formData.append("password", password);

      const response = await api.post("/auth/login", formData, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });

      localStorage.setItem("token", response.data.access_token);

      // Login successful -> Dashboard
      router.push("/dashboard");
    } catch (err: any) {
      console.error(err.response?.data || err.message);

      alert(
        err.response?.data?.detail
          ? JSON.stringify(err.response.data.detail)
          : "Login failed"
      );
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow w-96">
        <h1 className="text-2xl font-bold mb-6 text-center">
          ReleaseForge
        </h1>

        <input
          className="w-full border p-3 rounded mb-4"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          className="w-full border p-3 rounded mb-6"
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          onClick={login}
          className="w-full bg-black text-white py-3 rounded hover:bg-gray-800"
        >
          Login
        </button>
      </div>
    </main>
  );
}