"use client";
import React,{useState} from "react";
import { TriangleAlert } from "lucide-react";
import { FaGithub } from "react-icons/fa";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import {Card,CardContent,CardTitle,CardHeader} from "@/components/ui/card"
import { Input } from "../ui/input";
import { SignInFlow } from "@/types/auth-types";
import { Button } from "../ui/button";
import { Separator } from "../ui/separator";

interface SigninCardProps{
    setFormType:(state:SignInFlow)=>void;
}

export default function SigninCard({setFormType:setState}:SigninCardProps){
  const [email,setEmail] = useState("");
  const [password,SetPassword] = useState("");
  const [pending,setPending] = useState(false);
  const [error,setError] = useState("");
  const router = useRouter();
  
  const signInWithProvider = async(provider:"github"|"credentials")=>{
    try{
        if(provider === "credentials"){
            const res = signIn(provider,{
                email,
                password,
                redirect:false,
                callbackUrl:'/home',
            });
            res.then((res)=>{
                if(res?.error){
                    setError(res.error);
                }
                if(!res?.error){
                    router.push('/');
                }
                setPending(false);
            });
        }
        if(provider === "github"){
            const res = signIn(provider,{
                redirect:false,
                callbackUrl:'/home',
            });
            res.then((res)=>{
                if(res?.error){
                    setError(res.error);
                }
                if(!res?.error){
                    router.push('/');
                }
                setPending(false);
            });
        }
    }catch(e){
        console.log(error);
    }
  };

  const handlerCredentialSignin =(e:React.FormEvent<HTMLFormElement>)=>{
    e.preventDefault();
    setError("");
    setPending(true);
    signInWithProvider("credentials");
  };
  const handleGithubSignin = (provider:"github")=>{
    setError("");
    setPending(true);
    signInWithProvider(provider);
  };

return(
    <Card className="  bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 bg-opacity-50 p-8 ">
    <CardHeader className="w-full">
    <CardTitle className="text-center text-3xl font-bold  text-white">
     Signin 
     </CardTitle>
    </CardHeader>
    {!!error && (
        <div className="mb-6 flex w-full items-center gap-x-2 rounded-md bg-destructive p-3 text-sm text-white">
          <TriangleAlert className="size-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}
        <CardContent className="space-y-6 px-0 pb-0">
            <form onSubmit={handlerCredentialSignin} className="space-y-4">
                <Input
                disabled={pending}
                value={email}
                onChange={(e)=>setEmail(e.target.value)}
                placeholder="Email"
                className="border-gray-400 bg-transparent text-white placeholder:text-gray-400 focus-visible:ring-blue-600 focus-visible:ring-offset-0"
                type="email"
                required
                />
                <Input
                 disabled={pending}
                 placeholder="Password"
                 onChange={(e)=>SetPassword(e.target.value)}
                 className="border-gray-400 bg-transparent text-white placeholder:text-gray-400 focus-visible:ring-blue-700 focus-visible:ring-offset-0"
                 type="password"
                 required
                 />
                 <Button
                 disabled={pending}
                 type="submit"
                 className="w-full bg-blue-600 hover:bg-blue-700"
                 size={"lg"}
                 >Continue</Button>
            </form>
            <Separator className="bg-gradient-to-r from-gray-800 via-neutral-500 to-gray-800" />
            <div className="flex flex-col items-center gap-y-2.5">
                <Button
                disabled={pending}
                onClick={()=>{
                    handleGithubSignin("github")
                }}
                size={"lg"}
                className="relative w-full bg-white text-black hover:bg-white/90"
                >
                   <FaGithub className="absolute left-2.5 top-3 size-5" />
                   Continue With Github
                </Button>
                <p className="text-xs text-muted-foreground">
                    Don&apos;t have an account?{""}
                    <span className="cursor-pointer text-sky-700 hover:underline"
                    onClick={()=>setState("signUp")}
                    > Sign Up</span>
                </p>
            </div>
        </CardContent>
    </Card>
)
}