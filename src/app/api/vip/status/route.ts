import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

const BOT_TOKEN = process.env.BOT_TOKEN || "";
const BOT_API_URL = process.env.BOT_API_URL || "http://localhost:8080";

function validateInitData(initData: string): { valid: boolean; user?: any } {
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get("hash");
    params.delete("hash");
    
    const dataCheckString = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join("\n");
    
    const secretKey = crypto.createHmac("sha256", "WebAppData").update(BOT_TOKEN).digest();
    const calculatedHash = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");
    
    if (calculatedHash !== hash) {
      return { valid: false };
    }
    
    const userParam = params.get("user");
    if (userParam) {
      return { valid: true, user: JSON.parse(userParam) };
    }
    
    return { valid: true };
  } catch {
    return { valid: false };
  }
}

export async function POST(request: NextRequest) {
  try {
    const { initData } = await request.json();
    
    if (!initData) {
      return NextResponse.json({ is_vip: false, error: "No initData" }, { status: 400 });
    }
    
    const { valid, user } = validateInitData(initData);
    
    if (!valid || !user) {
      return NextResponse.json({ is_vip: false, error: "Invalid initData" }, { status: 401 });
    }
    
    // Call bot's internal API to check VIP status
    const botRes = await fetch(`${BOT_API_URL}/api/internal/vip/status?user_id=${user.id}`, {
      headers: { "Content-Type": "application/json" },
      // Short timeout since it's local
      signal: AbortSignal.timeout(3000),
    });
    
    if (!botRes.ok) {
      console.error("Bot API error:", await botRes.text());
      return NextResponse.json({ is_vip: false, error: "Bot API unavailable" }, { status: 502 });
    }
    
    const data = await botRes.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("VIP status check error:", error);
    return NextResponse.json({ is_vip: false, error: "Server error" }, { status: 500 });
  }
}