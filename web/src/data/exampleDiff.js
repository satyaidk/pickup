// A realistic staged diff, used by "Use an example diff".

export const EXAMPLE_DIFF = `diff --git a/src/pages/Login.jsx b/src/pages/Login.jsx
index 3b1f2a0..8c4d9e1 100644
--- a/src/pages/Login.jsx
+++ b/src/pages/Login.jsx
@@ -41,8 +41,9 @@ export default function Login() {
       <button type="submit" disabled={loading}>
         Sign in
       </button>
-      <p className="muted">Trouble signing in? Contact support.</p>
-      <p className="muted">support@example.com</p>
+      <Link to="/forgot-password" className="muted">
+        Forgot your password?
+      </Link>
     </form>
   );
 }
diff --git a/src/lib/resetTokens.js b/src/lib/resetTokens.js
new file mode 100644
index 0000000..a41c7d2
--- /dev/null
+++ b/src/lib/resetTokens.js
@@ -0,0 +1,24 @@
+import crypto from "node:crypto";
+import { db } from "./db.js";
+
+const THIRTY_MINUTES = 30 * 60 * 1000;
+
+export async function createResetToken(userId) {
+  const token = crypto.randomBytes(32).toString("hex");
+  await db.resetTokens.insert({
+    userId,
+    hash: crypto.createHash("sha256").update(token).digest("hex"),
+    expiresAt: Date.now() + THIRTY_MINUTES,
+  });
+  return token;
+}
+
+export async function useResetToken(token) {
+  const hash = crypto.createHash("sha256").update(token).digest("hex");
+  const row = await db.resetTokens.findOne({ hash });
+  if (!row || row.expiresAt < Date.now()) return null;
+  await db.resetTokens.delete({ hash });
+  return row.userId;
+}
diff --git a/src/routes/auth.js b/src/routes/auth.js
index 77e0c3b..f2d81aa 100644
--- a/src/routes/auth.js
+++ b/src/routes/auth.js
@@ -1,5 +1,7 @@
 import { Router } from "express";
 import { login, logout } from "../controllers/session.js";
+import { createResetToken, useResetToken } from "../lib/resetTokens.js";
+import { sendResetEmail } from "../lib/mail.js";

 const router = Router();

@@ -18,4 +20,24 @@ router.post("/logout", logout);

+router.post("/forgot-password", async (req, res) => {
+  const user = await findUserByEmail(req.body.email);
+  if (user) {
+    const token = await createResetToken(user.id);
+    await sendResetEmail(user.email, token);
+  }
+  res.status(202).json({ ok: true });
+});
+
+router.post("/reset-password", async (req, res) => {
+  const userId = await useResetToken(req.body.token);
+  if (!userId) return res.status(400).json({ error: "Link expired" });
+  await setPassword(userId, req.body.password);
+  res.json({ ok: true });
+});
+
 export default router;
`;
