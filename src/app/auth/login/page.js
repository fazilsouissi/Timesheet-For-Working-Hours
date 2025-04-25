"use client";
import Link from "next/link";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    const res = await signIn("credentials", {
      redirect: false,
      email: form.email,
      password: form.password,
    });
    if (res.error) {
      setError(res.error);
    } else {
      router.push("/");
    }
  }

  return (
      <div className="max-w-md mx-auto p-4">
        <h1 className="text-2xl mb-4">Log in</h1>
        {error && <p className="text-red-600 mb-2">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-3">
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
          <button type="submit" className="w-full py-2 bg-green-600 text-white rounded">
            Sign in
          </button>
        </form>
        <p className="mt-4 text-center">
          Don’t have an account?{" "}
          <Link href="/auth/register" className="text-blue-600 underline">
            Sign up
          </Link>
        </p>
      </div>
  );
}
