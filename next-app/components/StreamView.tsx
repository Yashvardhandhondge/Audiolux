"use client"
import React,{useEffect,useState} from 'react'
import { toast } from 'sonner'
import "react-lite-youtube-embed/dist/LiteYouTubeEmbed.css";
import { useSocket } from '@/context/socket-context';
import { useSession } from 'next-auth/react';

function StreamView() {
  return (
    <div>StreamView</div>
  )
}

export default StreamView