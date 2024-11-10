import db from "@/lib/db";
import { authOptions } from "@/lib/auth-options";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user.id) {
    return NextResponse.json({ message: "Unauthenticated" }, { status: 403 });
  }

  const spaceId = req.nextUrl.searchParams.get("spaceId");
  if (!spaceId) {
    return NextResponse.json({ message: "Space ID is required" }, { status: 400 });
  }

  const currentStream = await db.currentStream.findFirst({
    where: { spaceId },
  });

  if (!currentStream) {
    return NextResponse.json({ message: "No current song found to skip" }, { status: 404 });
  }

  await db.stream.update({
    where: { id: currentStream.streamId ?? "" },
    data: { played: true, playedTs: new Date() },
  });

  return NextResponse.json({ message: "The song has been skipped." });
}
