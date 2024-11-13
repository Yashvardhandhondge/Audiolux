"use client";
import { signIn, signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import Link from "next/link";
import { Users, Radio, Headphones } from "lucide-react";

export function Appbar({ showThemeSwitch = true , isSpectator=false }) {
  const session = useSession();
  const router = useRouter();

    return (
    <div className="flex justify-between px-5 py-4 md:px-10 xl:px-20  ">
       <div
        onClick={() => {
          router.push("/home");
        }}
        className={`flex  justify-center text-lg font-bold hover:cursor-pointer ${showThemeSwitch ? "" : "text-white"}`}
      >
        
        <Headphones className="mr-2 mt-1"/>
       <h1 className="text-2xl">AudioLux</h1> 
   
      </div>
      <div className="flex items-center gap-x-2">
        {isSpectator && <WalletMultiButton />}
        {session.data?.user &&(
            <Button
            className="bg-blue-600 text-white hover:bg-blue-700"
            onClick={()=>
                signOut({
                    callbackUrl:'/',
                })
            }
            >
             Logout
            </Button>
        )}
        {!session.data?.user && (
            <div className="space-x-3">
                <Button
                className="bg-blue-600 text-white hover:bg-blue-700/10 translate-tramsform transform-gpu "
                onClick={()=>router.push("/auth")}
                >Signin</Button>
                <Link
                href={{
                    pathname:'/auth',
                    query:{
                        authType:"signUp",
                    },
                }}
                >
                    <Button
                    variant={"ghost"}
                    className="text-white bg-blue-600 hover:bg-blue-700/10 "
                    >Signup</Button>
                </Link>

            </div>
        )}
        {showThemeSwitch && <ThemeSwitcher />}
      </div>
    </div>
  )
}

export default Appbar