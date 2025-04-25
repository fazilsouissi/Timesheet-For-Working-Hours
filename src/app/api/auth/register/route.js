// src/app/api/auth/register/route.js
import clientPromise from "@/lib/mongo";
import bcrypt from "bcryptjs";

export async function POST(request) {
  const { email, password, name } = await request.json();
  if (!email || !password) {
    return new Response(
        JSON.stringify({ message: "Email and password required" }),
        { status: 400 }
    );
  }

  const client = await clientPromise;
  const db = client.db();
  if (await db.collection("users").findOne({ email })) {
    return new Response(JSON.stringify({ message: "User exists" }), {
      status: 409,
    });
  }

  const hash = await bcrypt.hash(password, 10);
  await db.collection("users").insertOne({ email, password: hash, name });
  return new Response(JSON.stringify({ message: "User created" }), {
    status: 201,
  });
}
