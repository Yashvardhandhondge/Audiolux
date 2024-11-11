import { YT_REGEX } from "@/lib/utils";
import { useSocket } from "@/context/socket-context";
import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CardContent,Card } from "@/components/ui/card";
import LiteYouTubeEmbed from "react-lite-youtube-embed";
import {useConnection,useWallet} from "@solana/wallet-adapter-react"
import {LAMPORTS_PER_SOL,PublicKey,SystemProgram,Transaction} from "@solana/web3.js"
import { useSession } from "next-auth/react";

type Props ={
    inputLink:string;
    creatorId:string;
    userId:string;
    setLoading:(value:boolean)=>void;
    setInputLink:(value:string)=>void;
    loading:boolean;
    enqueueToast:(type: "error" | "success",message:string)=>void;
    spaceId:string,
    isSpectator:boolean
};

export default function AddSongForm({
    inputLink,
    enqueueToast,
    setInputLink,
    loading,
    setLoading,
    userId,
    spaceId,
    isSpectator,
}:Props){
    
}