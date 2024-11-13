"use client"
import { useState } from "react"
import { FaGithub } from "react-icons/fa"
import { TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { SignInFlow } from "@/types/auth-types";
import { error } from "console";
import { signIn } from "next-auth/react";
import { Card ,CardHeader,CardTitle ,CardContent} from "../ui/card";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Separator } from "../ui/separator";


interface SignupCardProps{
    setFormType:(state: SignInFlow)=>void;
}



export default function SignupCard({setFormType:setState}:SignupCardProps){
    const [email,setEmail] = useState("");
    const [password,setPassword] = useState("");
    const [confirmPassword,setConfirmPassword] = useState("");
    const [error,setError] = useState("");
    const [pending,setPending] = useState(false);
    const router = useRouter();

    const signWithProvider = async (provider :"github"| "credentials" )=>{
        try{
            if(provider === "credentials"){
                const res = signIn(provider,{
                    email,
                    password:false,
                    callbackUrl:'/home',
                });
                res.then((res)=>{
                    if(res?.error){
                        setError(res.error);
                    }
                    if (!res?.error) {
                        router.push("/");
                      }
                      setPending(false);
                });
            }
            if(provider === "github"){
                const res = signIn(provider,{
                    redirect:false,
                    callbackUrl:'/home'
                });
                res.then((res) => {
                    if (res?.error) {
                      setError(res.error);
                    }
                    console.log(res);
                    setPending(false);
                });
            }
        }catch(e){
            console.error(e)
        }
    };

    const handlerCredentialsSignup = (e:React.FormEvent<HTMLFormElement>)=>{
        e.preventDefault();
        setError("");
        setPending(true);
        if(password !== confirmPassword){
            setError("Password do not match");
            setPending(true);
            return;
        }
        signWithProvider("credentials");
    }
    const handleGithubSignup = (provider:"github")=>{
        setError('');
        setPending(true);
        signWithProvider(provider);
    };
    return(
        <Card className="  bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 bg-opacity-50 p-8 ">
           <CardHeader className="w-full">
           <CardTitle className="text-center text-3xl font-bold  text-white">
            Signup
            </CardTitle>
           </CardHeader>
           {!!error &&(
            <div className="mb-6 flex w-full items-center gap-x-2 rounded-md bg-destructive p-3 text-sm text-white ">
                <TriangleAlert className="size-4 shrink-0" />
                <p>{error}</p>
            </div>
           )}
           <CardContent className="space-y-6 px-0 pb-0">
            <form className="space-y-4" onSubmit={handlerCredentialsSignup}>
                <Input
                 disabled={pending}
                  value={email}
                  placeholder="Email"
                 onChange={(e) => setEmail(e.target.value)}
                  type="email"
                 required
                 className="border-gray-400 bg-transparent text-white placeholder:text-gray-400 focus-visible:ring-blue-700 focus-visible:ring-offset-0"
                   />
                <Input 
                   disabled={pending}
                   value={password}
                   placeholder="Password"
                   onChange={(e)=>setPassword(e.target.value)}
                   type="password"
                   required
                   className="border-gray-400 bg-transparent text-white placeholder:text-gray-400 focus-visible:ring-blue-700 focus-visible:ring-offset-0"
                />
                <Input
                disabled={pending}
                value={confirmPassword}
                placeholder="Confirm Password"
                onChange={(e)=>setConfirmPassword(e.target.value)}
                type="password"
                className="border-gray-400 bg-transparent text-white placeholder:text-gray-400 focus-visible:ring-blue-700 focus-visible:ring-offset-0"
                required
                />
                <Button
                type="submit"
                size={"lg"}
                disabled={pending}
                className="w-full bg-blue-700 hover:bg-blue-700"
                >Continue</Button>
            </form>
            <Separator className="bg-gradient-to-r from-gray-800 via-neutral-500 to-gray-800" />
            <br />
                <div className="flex flex-col items-center gap-y-2.5">
                    <Button
                    disabled={pending}
                    onClick={()=>{
                        handleGithubSignup("github");
                    }}
                    size={"lg"}
                    className="relative w-full bg-white text-black hover:bg-white/90"
                    >
                        <FaGithub className="absolute  left-2.5 top-3 size-5" ></FaGithub>
                        Continue With Github

                    </Button>
                    <p className="text-xs text-muted-foreground">
                        Already have an account ? {""}
                        <span
                        className="cursor-pointer text-sky-400 hover:underline"
                        onClick={()=>setState("signIn")}
                        >Sign In</span>
                    </p>
                </div>
            
           </CardContent>

        </Card>
    )




}