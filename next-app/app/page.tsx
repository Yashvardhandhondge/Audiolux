import React from 'react'
import { Button } from '@/components/ui/button'
import { Users, Radio, Headphones, Gem, Repeat } from "lucide-react";
import Appbar from '@/components/Appbar';
import getServerSession from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth-options';
import Link from 'next/link';

export default async function Landingpage() {
    const session = await getServerSession(authOptions);
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
       <Appbar showThemeSwitch={false} /> 
       <main className='flex h-screen py-12 md:py-24 lg:py-32 items-center justify-center'>
        <div className='container  h-full px-4 md:px-6'>
            <div className='flex flex-col items-center justify-center mt-6 ml-10 space-y-4 text-center'>
                <div className='space-y-2'>
                    <h1 className='text-3xl font-bold tracking-tighter text-white sm:text-4xl md:text-5xl lg:text-6xl/none'>
                    <span className=''>AudioLux</span> – Where Music is Shaped by You                    </h1>
                    <p className='mx-auto max-w-[700px] text-gray-400 md:text-xl'>
                    Create or join a room, upvote tracks, skip, or repeat songs. Experience the power of collective choice.

                    </p>

                </div>
                <div className='space-x-4'>
                    <Button className='bg-blue-600 text-white hover:bg-blue-700'>
                        <Link
                        href={{
                            pathname:"/auth",
                            query:{authType:"signUp"}
                        }}
                        >Get Started</Link>
                    </Button>
                    <Button className="bg-white text-blue-400 hover:bg-white/90 transition-transform translate-x-5">
                Learn More
              </Button>

                </div>
            </div>

        </div>

       </main>
       <section className="w-full bg-gray-800 bg-opacity-50 py-12 md:py-24 lg:py-32">
        <div className="container px-4 md:px-6">
          <h2 className="mb-8 text-center text-2xl font-bold tracking-tighter text-white sm:text-3xl">
            Key Features
          </h2>
          <div className="grid gap-8 sm:grid-cols-3">
            <div className="flex flex-col items-center space-y-3 text-center">
              <Gem className="h-12 w-12 text-yellow-400" />
              <h3 className="text-xl font-bold text-white">Admin Control</h3>
              <p className="text-gray-400">Create rooms and set up custom playlists.</p>
            </div>
            <div className="flex flex-col items-center space-y-3 text-center">
              <Users className="h-12 w-12 text-green-400" />
              <h3 className="text-xl font-bold text-white">Community Upvotes</h3>
              <p className="text-gray-400">Let listeners upvote and choose what plays next.</p>
            </div>
            <div className="flex flex-col items-center space-y-3 text-center">
              <Repeat className="h-12 w-12 text-blue-400" />
              <h3 className="text-xl font-bold text-white">Repeat & Skip</h3>
              <p className="text-gray-400">Decide to repeat or skip tracks with collective feedback.</p>
            </div>
          </div>
        </div>
      </section>
      <section className='w-full py-12 md:py-24 lg:py-32'>
          <div className='container px-4 md:px-6'>
            <div className='flex flex-col items-center space-y-4 text-center'>
               <div className='space-y-2'>
                <h2 className='text-3xl font-bold tracking-tighter text-center ml-10 text-white sm:text-4xl'>
                  Ready to Share the Stage
                </h2>
                <p className='mx-auto max-w-[600px] text-gray-400 md:text-xl'>
                  Join CrystalStream now and create unforgettable group listening experiences.
                </p>
                </div> 
                <div className='w-full max-w-sm'>
               <Link
               href={{
                pathname:'/auth',
                query:{
                  authType:"signUp"
                },
               }}
               >
                <Button
                type='submit'
                className='bg-indigo-600 text-white hover:bg-indigo-700 transition-tranform transform scale-120'
                >Sign Up</Button>
               </Link>
                </div>

            </div>

          </div>
      </section>
    </div>
  )
}

