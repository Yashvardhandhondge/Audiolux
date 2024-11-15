import React,{useState,useEffect} from "react";


export default function LoadingScreen(){
    const [loading , setLoading] = useState(true);

    useEffect(()=>{
        const cycleInterval = setInterval(()=>{
            setLoading((prev)=>!prev);
        },2000)
        return ()=>clearInterval(cycleInterval);
    },[]);

    return(
        <div className="bg-gradient-to-r from-gray-900 via-black to-gray-900 text-gray-200 min-h-screen flex justify-center items-center">
            {
                loading ? (
              <div className="flex space-x-3">
                <span className="sr-only">Loading ...</span>
                <div className="h-8 w-8 bg-white rounded-full animate-bounce shadow-lg [animation-delay:-0.3s]"></div>
                <div className="h-8 w-8 bg-white rounded-full animate-bounce shadow-lg [animation-delay:-0.15s]"></div>
                <div className="h-8 w-8 bg-white rounded-full animate-bounce shadow-lg"></div>
        </div>
                ) :(
              <h1 className="text-2xl font-bold">Loading ...</h1>
                )
            }

        </div>
    )
}