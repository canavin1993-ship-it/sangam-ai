// Check the notification seam's control flow WITHOUT hitting real providers.
// Run: node_modules/lovable-tagger/node_modules/.bin/esbuild scripts/notifications-check.ts --bundle --format=esm --platform=node > /tmp/nc.mjs && node /tmp/nc.mjs
import assert from "node:assert";
import { sendNotification, channelStatus } from "../src/lib/notifications";

// Ensure a clean, unconfigured environment for the test.
for (const k of ["MSG91_AUTH_KEY", "RESEND_API_KEY", "MSG91_WHATSAPP_KEY"]) delete process.env[k];

// Unconfigured channels must SKIP (not throw, not fake success).
for (const channel of ["sms", "email", "whatsapp", "push"] as const) {
  const r = await sendNotification({ channel, to: "x", body: "hi" });
  assert.equal(r.status, "skipped", `${channel} should skip when unconfigured (got ${r.status})`);
}

// channelStatus reflects env.
assert.equal(channelStatus("sms").configured, false);
process.env.MSG91_AUTH_KEY = "test";
assert.equal(channelStatus("sms").configured, true, "sms should be configured once key present");

// Push is never configured until a provider is wired.
assert.equal(channelStatus("push").configured, false);

console.log("notifications-check OK — skip/config routing verified (no real sends)");
