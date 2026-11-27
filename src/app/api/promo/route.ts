import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getCompanyPromoSettings, saveCompanyPromoSettings, PromoSettingsPayload } from "@/lib/promo-settings";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const settings = await getCompanyPromoSettings(session.companyId);
  return NextResponse.json({ settings });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = (await req.json()) as PromoSettingsPayload;
    await saveCompanyPromoSettings(session.companyId, body);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal menyimpan pengaturan promo." },
      { status: 400 }
    );
  }
}
