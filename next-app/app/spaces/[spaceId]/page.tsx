"use client "
import { use, useEffect,useState } from "react"
import { useSocket } from "@/context/socket-context"
import jwt from "jsonwebtoken"
import ErrorScreen from "@/components/ErrorScreen"
import LoadingScreen from "@/components/Loading"
import StreamView from "@/components/StreamView"
import { useRouter } from "next/router"
import '@solana/wallet-adapter-react-ui/styles.css';

export default function Component({params:{spaceId}}:{params:{spaceId:string}}){

    const {socket,user,loading,setUser,connectionError} = useSocket();
    const [creatorId,setCreatorId] = useState<string>();
    const [loading1,setLoading1] = useState(true);
    const router = useRouter();

    useEffect(()=>{
        async function fetchHostId(){
            try{
                const resoponse = await fetch(`/api/spaces/?spaceId=${spaceId}`,{
                    method:"GET",
                });
                const data = await resoponse.json()
                if(!resoponse.ok && !data.success){
                    throw new Error(data.message || "Failed to fetch space");
                }
                setCreatorId(data.hostId);

            }catch(e){
                console.error(e);
            }finally{
                setLoading1(false);
            }
        }
        fetchHostId();
    },[spaceId]);

    useEffect(()=>{
        if(user && socket && creatorId){
            const token = user.token || jwt.sign(
                {
                    creatorId:creatorId,
                    userId : user?.id
                },
                process.env.NEXT_PUBLIC_SECRET || '',
            );

            socket?.send(
                JSON.stringify({
                    type : "join-room",
                    data:{
                        token,
                        spaceId,
                    }
                })
            );

            if(!user.token){
                setUser({...user,token});
            }
        }
    },[user,spaceId,creatorId,socket]);

    if(connectionError){
        return <ErrorScreen>Can not connect to socket server</ErrorScreen>
    }

    if(loading){
        return <LoadingScreen/>
    }

    if(!user){
        return <ErrorScreen>please log in</ErrorScreen>
    }

    if(loading1){
        return <LoadingScreen/>
    }
    
    if(creatorId === user.id){
        router.push(`/dashboard/${spaceId}`)
    }

    return <StreamView creatorId={creatorId as string} playVideo={false} spaceId={spaceId}/>

}
export const dynamic = "auto"