import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

const BOT_TOKEN = process.env.BOT_TOKEN || "";
const VIP_CHANNEL_ID = process.env.VIP_CHANNEL_ID || "-1004379884084";

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

async function checkVipViaTelegram(userId: number): Promise<{ is_vip: boolean; status?: string }> {
  // Check if user is a member of the VIP channel using Telegram Bot API
  try {
    const res = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/getChatMember?chat_id=${VIP_CHANNEL_ID}&user_id=${userId}`,
      { signal: AbortSignal.timeout(5000) }
    );
    const data = await res.json();
    
    if (!data.ok) {
      return { is_vip: false };
    }
    
    const memberStatus = data.result?.status;
    // member, administrator, creator = active VIP
    const isVip = ["member", "administrator", "creator"].includes(memberStatus);
    return { is_vip: isVip, status: memberStatus };
  } catch {
    return { is_vip: false };
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
    
    // Check VIP channel membership via Telegram Bot API (works from any server)
    const vipResult = await checkVipViaTelegram(user.id);
    
    return NextResponse.json({ 
      is_vip: vipResult.is_vip,
      user_id: user.id,
      username: user.username,
      channel_status: vipResult.status,
    });
  } catch (error) {
    console.error("VIP status check error:", error);
    return NextResponse.json({ is_vip: false, error: "Server error" }, { status: 500 });
  }
}