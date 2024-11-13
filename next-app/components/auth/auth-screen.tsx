import { SignInFlow } from "@/types/auth-types";
import { useState } from "react";
import SigninCard from "./sign-in-card";
import SignupCard from "./sign-up-card";

export default function AuthScreen({authType}:{authType? : SignInFlow}){
   const [formType,SetFormType] = useState<SignInFlow>(authType || "signIn");
   return(
      <div className=" min-h-screen flex items-center justify-center gap-5 bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 p-4 ">
         <div className=" h-full md:w-[420px] px-4">
            {formType === "signIn" ? (
              <SigninCard setFormType={SetFormType}   />
            ):(
               <SignupCard setFormType={SetFormType} />
            )
            
         
         }

         </div>
      </div>
   )

}