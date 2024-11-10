import { authOptions } from "@/lib/auth-options";
import db from "@/lib/db";
import { getServerSession } from "next-auth";
import { NextRequest,NextResponse } from "next/server";

export async function POST(req:NextRequest){
    const session = await getServerSession(authOptions);

    if(!session?.user.id){
        return NextResponse.json({message:"Unauthenticated"},{status:403});
    }

    const user = session.user;
    const spaceId = req.nextUrl.searchParams.get("spaceId");

    const currentStream = await db.currentStream.findFirst({
        where:{spaceId},
    });

    if(!currentStream){
        return NextResponse.json({message:"No song is currently playing to repeat"},{status:404});
    }

   await db.stream.update({
    where:{id:currentStream.streamId ?? ""},
    data:{played:false}
   })
   return NextResponse.json({ message: "The song is being repeated." });

}