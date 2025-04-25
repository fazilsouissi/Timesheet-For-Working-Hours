"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Register() {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      router.push("/auth/login");
    } else {
      const { message } = await res.json();
      setError(message);
    }
  }

  return (
      <div className="max-w-md mx-auto p-4">
        <h1 className="text-2xl mb-4">Create an account</h1>
        {error && <p className="text-red-600 mb-2">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
              type="text"
              placeholder="Name"
              required
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full p-2 border rounded"
          />
          <input
              type="email"
              placeholder="Email"
              required
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              className="w-full p-2 border rounded"
          />
          <input
              type="password"
              placeholder="Password"
              required
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              className="w-full p-2 border rounded"
          />
          <button type="submit" className="w-full py-2 bg-blue-600 text-white rounded">
            Sign up
          </button>
        </form>
        <p className="mt-4 text-center">
          Already have an account?{" "}
          <Link href="/auth/login" className="text-blue-600 underline">
            Log in
          </Link>
        </p>
      </div>
  );
}
