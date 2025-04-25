// src/app/api/sessions/route.js
import clientPromise from "@/lib/mongo";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return new Response(null, { status: 401 });

  const db = (await clientPromise).db();
  const doc = await db.collection("user_sessions").findOne({
    userId: session.user.id,
  });
  return new Response(
      JSON.stringify({ weeklySessions: doc?.weeklySessions || {} })
  );
}

export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!session) return new Response(null, { status: 401 });

  const { weeklySessions } = await request.json();
  const db = (await clientPromise).db();
  await db.collection("user_sessions").updateOne(
      { userId: session.user.id },
      { $set: { weeklySessions } },
      { upsert: true }
  );
  return new Response(JSON.stringify({ message: "Saved" }));
}
