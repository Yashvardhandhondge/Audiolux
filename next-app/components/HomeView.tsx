"use client";
import { toast } from "sonner";
import {Appbar} from "@/components/Appbar";
import { Button } from "./ui/button";
import{
  Dialog,
  DialogTitle,
  DialogContent,
  DialogHeader,
  DialogFooter
} from "@/components/ui/dialog"
import { useEffect,useMemo,useState } from "react";
import CardSkeleton from "./ui/cardSkeleton";
import SpacesCard from "./SpacesCard";
import { set } from "zod";

interface Space{
  endTime ?: Date |null;
  hostId : string;
  id : string;
  isActive : boolean;
  startTime : Date | null;
  name: string;
}


export default function HomeView() {
  const [isCraeateSpaceOpen,setIsCreateSpaceOpen] = useState(false);
  const [spaceName,setSpaceName] = useState("");
  const [spaces,setSpaces] = useState<Space[] | null>(null);
  const [loading,setIsLoading] = useState(false);

  useEffect(()=>{
    const fetchSpaces = async()=>{
      setIsLoading(true);
      try{
        const response = await fetch("/api/spaces", {
          method: "GET",
        });

        const data = await response.json();
        
        if(!response.ok || !data.success){
          throw new Error(data.message || "Failed to fetch spaces");
        }

        const fetchedSpaces: Space[] = data.spaces;
        setSpaces(fetchedSpaces);
      }catch(e){
        toast.error("Failed to fetch spaces");
    }finally{
      setIsLoading(false);
    }
  };
},[]);
   
   const handleCreateSpac= async()=>{
  setIsCreateSpaceOpen(false);
  try{
    const response = await fetch(`/api/spaces`,{
      method:"POST",
      headers:{
        "Content-Type":"application/json"
      },
      body:JSON.stringify({
        spaceName:spaceName,
      }),
    });
    const data = await response.json();
    if(!response.ok || !data.success){
      throw new Error(data.message || "Failed to create space");
    }

    const newSpace = data.space;
    setSpaces((prev)=>{
      const updatedSpaces:Space[] = prev ? [...prev,newSpace] : [newSpace];
      return updatedSpaces;
    });
    toast.success(data.message);
  } catch(e){
    toast.error("Failed to create space");
  }
  };

  const handleDeleteSpace = async(spaceId:string)=>{
    try {
      const response = await fetch(`/api/spaces/?spaceId=${spaceId}`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to delete space");
      }
      setSpaces((prev) => {
        const updatedSpaces: Space[] = prev
          ? prev.filter((space) => space.id !== spaceId)
          : [];
        return updatedSpaces;
      });
      toast.success(data.message);
    } catch (error: any) {
      toast.error(error.message || "Error Deleting Space"); 
    }
  }
  const renderSpaces = useMemo(() => {
    if (loading) {
      return (
        <>
          <div className="dark mx-auto h-[500px] w-full py-4 sm:w-[450px] lg:w-[500px]">
            <CardSkeleton />
          </div>
          <div className="dark mx-auto h-[500px] w-full py-4 sm:w-[450px] lg:w-[500px]">
            <CardSkeleton />
          </div>
        </>
      );
    }

    if (spaces && spaces.length > 0) {
      return spaces.map((space) => (
        <SpacesCard
          key={space.id}
          space={space}
          handleDeleteSpace={handleDeleteSpace}
        />
      ));
    }
  }, [loading, spaces, handleDeleteSpace]);


  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 bg-opacity-50 text-gray-200">
    <Appbar />
    <div className="flex flex-grow flex-col items-center px-4 py-8">
      <div className="h-36 rounded-xl  bg-gradient-to-r from-violet-500 to-fuchsia-500 bg-clip-text text-9xl font-bold text-transparent">
        Spaces
      </div>
      <Button
        onClick={() => {
          setIsCreateSpaceOpen(true);
        }}
        className="mt-10 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
      >
        Create a new Space
      </Button>
      <div className="mt-20 grid grid-cols-1 gap-8 p-4 md:grid-cols-2">
          {renderSpaces}
        </div>
        <Dialog open={isCraeateSpaceOpen} onOpenChange={setIsCreateSpaceOpen}>
        <DialogContent className="bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 bg-opacity-50">
          <DialogHeader >
            <DialogTitle className="mb-10 text-center">
              Create new space
            </DialogTitle>
            <fieldset className="Fieldset">
              <label
                className="text-violet11 w-[90px] text-right text-xl font-bold"
                htmlFor="name"
              >
                Name of the Space
              </label>
              <input
                className="text-violet11 shadow-violet7 focus:shadow-violet8 mt-5 inline-flex h-[35px] w-full flex-1 items-center justify-center rounded-[4px] px-[10px] text-[15px] leading-none shadow-[0_0_0_1px] outline-none focus:shadow-[0_0_0_2px]"
                id="name"
                defaultValue="Space Name"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setSpaceName(e.target.value);
                }}
              />
            </fieldset>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateSpaceOpen(false)}
              className="bg-red-400"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateSpac}
              className="bg-gradient-to-r from-sky-500 to-fuchsia-500 text-white hover:bg-blue-700"
            >
              Create Space
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </div>
  );

}



