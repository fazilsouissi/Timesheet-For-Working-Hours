// src/app/api/auth/[...nextauth]/route.js
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import {MongoDBAdapter} from "@next-auth/mongodb-adapter";
import clientPromise from "@/lib/mongo";
import bcrypt from "bcryptjs";

export const authOptions = {
  adapter: MongoDBAdapter(clientPromise),
  session: {strategy: "jwt", maxAge: 30 * 24 * 60 * 60},
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/auth/login",      // show this page instead of default
    error: "/auth/login",      // on errors too
  },
  providers: [
    CredentialsProvider({
      name: "Email",
      credentials: {
        email: {label: "Email", type: "email"},
        password: {label: "Password", type: "password"},
      },
      async authorize(creds) {
        const client = await clientPromise;
        const user = await client.db().collection("users").findOne({
          email: creds.email,
        });
        if (!user) throw new Error("No user with that email");
        const valid = await bcrypt.compare(creds.password, user.password);
        if (!valid) throw new Error("Bad password");
        return {id: user._id.toString(), email: user.email, name: user.name};
      },
    }),
  ],
  callbacks: {
    async jwt({token, user}) {
      if (user) token.id = user.id;
      return token;
    },
    async session({session, token}) {
      session.user.id = token.id;
      return session;
    },
  },
};

// NextAuth in App Router needs named exports for each method:
const handler = NextAuth(authOptions);
export {handler as GET, handler as POST};
