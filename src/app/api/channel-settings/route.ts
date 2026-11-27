import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getChannelSettings, saveChannelSettings, ChannelSettingsPayload } from "@/lib/channel-settings-server";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const settings = await getChannelSettings(session.companyId);
  return NextResponse.json({ settings });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = (await req.json()) as ChannelSettingsPayload;
    await saveChannelSettings(session.companyId, body);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal menyimpan." },
      { status: 400 }
    );
  }
}
