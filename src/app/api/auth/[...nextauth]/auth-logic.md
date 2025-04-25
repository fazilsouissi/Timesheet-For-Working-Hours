### 1. Why you’re hitting `/api/auth/signin` instead of `/auth/register`

You’re using NextAuth’s built-in **required** mode:

```js
const { data: session, status } = useSession({
  required: true,
  onUnauthenticated() { signIn(); },
});
```

- When `status` becomes `"unauthenticated"`, NextAuth’s `signIn()` helper redirects you to **its** default sign-in page:
  ```
  /api/auth/signin?callbackUrl=<where-to-go-after-login>
  ```
- That endpoint is handled by your catch-all `[...nextauth]/route.js`, which serves a built-in UI for credentials (unless you override it).

If you want users to go to **your** custom `/auth/register` or `/auth/login` pages instead:

1. In your NextAuth options (in `src/app/api/auth/[...nextauth]/route.js`), add:
   ```js
   export const authOptions = {
     // …existing config…
     pages: {
       signIn:  "/auth/login",      // show this page instead of default
       error:   "/auth/login",      // on errors too
     }
   };
   ```
2. Now `signIn()` will send them to `/auth/login` (and you can put a “Go to Register” link there).

---

### 2. How it all fits together

```
┌────────────────────────────────────────────────────┐
│ 1) User hits your app’s root URL “/”              │
│    └──> App Router page (e.g. src/app/page.js)    │
│         checks session with getServerSession()    │
│         or in client: useSession({ required })    │
├────────────────────────────────────────────────────┤
│ 2a) If UNAUTHENTICATED:                           │
│     • client: signIn() →                         │
│        GET /api/auth/signin?callbackUrl=/         │
│     • your nextauth route                      │
│       src/app/api/auth/[...nextauth]/route.js      │
│        handles default sign-in form               │
│     • or, with pages.signIn override →            │
│       Redirect to your custom /auth/login page    │
├────────────────────────────────────────────────────┤
│ 2b) If AUTHENTICATED:                             │
│     • render your TimesheetPage component         │
│     • fetch “/api/sessions” (GET & POST)          │
│       handled by                                │
│       src/app/api/sessions/route.js               │
│     • data stored per-user in MongoDB via         │
│       src/lib/mongo.js → Atlas driver             │
└────────────────────────────────────────────────────┘
```

- **Pages** (UI) live under `src/app/<route>/page.js`.
- **API routes** live under `src/app/api/<route>/route.js`.
- Your NextAuth catch-all is at `src/app/api/auth/[...nextauth]/route.js`, exporting `GET` and `POST`.
- Your custom register POST is at `src/app/api/auth/register/route.js`.
- Your session storage endpoints are at `src/app/api/sessions/route.js`.

---

### 3. What is a `route.js` file?

In Next.js’s **App Router**:

- Any folder under `src/app/api/…` must have a file named `route.js` (or `.ts`) which exports functions named after HTTP methods:
  ```js
  export async function GET(req) { … }
  export async function POST(req) { … }
  ```
- That `route.js` *is* the entry point for that URL. For example:
  ```
  src/app/api/auth/register/route.js
     handles POST /api/auth/register
  src/app/api/sessions/route.js
     handles GET & POST /api/sessions
  ```
- Your NextAuth integration uses a catch-all folder `[...nextauth]` with its own `route.js` that hooks into NextAuth’s internals.

---

#### Summary

- **Remove** the default NextAuth redirect by overriding `pages.signIn` if you want to use `/auth/login`.
- Think of **pages** (`page.js`) vs **API route handlers** (`route.js`) as separate layers: one for UI, one for data/auth logic.
- The built-in `/api/auth/signin` is NextAuth’s own sign-in form—swap it out by pointing `pages.signIn` to your custom login page.