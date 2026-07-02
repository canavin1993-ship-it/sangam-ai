const AUTH_KEY = process.env.MSG91_AUTH_KEY;
const SENDER = process.env.MSG91_SENDER_ID || "JNGAMA";
const DLT_TEMPLATE = process.env.MSG91_DLT_TEMPLATE_ID;

export async function sendOtpSms(phoneE164: string, otp: string) {
  if (!AUTH_KEY) throw new Error("MSG91 not configured");
  const msg = `Your Jangama Matrimony verification code is ${otp}. Valid for 10 minutes. Do not share.`;
  const params = new URLSearchParams({
    authkey: AUTH_KEY,
    mobiles: phoneE164.replace("+", ""),
    message: msg,
    sender: SENDER,
    route: "4",
    country: "91",
  });
  if (DLT_TEMPLATE) params.set("DLT_TE_ID", DLT_TEMPLATE);
  const res = await fetch("https://api.msg91.com/api/sendhttp.php?" + params.toString());
  if (!res.ok) throw new Error(`MSG91 send failed: ${await res.text()}`);
  return await res.text();
}
