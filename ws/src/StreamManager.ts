import WebSocket from "ws";
import { createClient,RedisClientType } from "redis";
//@ts-ignore
import youtubesearchapi from 'youtube-search-api'
import { Job,Queue,Worker } from "bullmq";
import { PrismaClient } from "@prisma/client";

type User = {
    userId: string;
    ws: WebSocket[];
    token: string;
  };
  
  type Space = {
    creatorId: string;
    users: Map<String, User>;
  };
  
import { getVideoId,isValidYoutubeURL } from "./utils";

const TIME_SPAN_FOR_VOTE = 1200000; 
const TIME_SPAN_FOR_QUEUE = 1200000; 
const TIME_SPAN_FOR_REPEAT = 3600000;
const MAX_QUEUE_LENGTH = 20;

const connection = {
    username:process.env.REDIS_USERNAME || "",
    password:process.env.REDIS_PASSWORD || "",
    host: process.env.REDIS_HOST || "",
    port: parseInt(process.env.REDIS_PORT || "") || 6379,
};

const redisCredentials = {
    url: `redis://${connection.username}:${connection.password}@${connection.host}:${connection.port}`,
  };

export class RoomManager {
    private static instance : RoomManager;
    public spaces: Map<string, Space>;
    public users:Map<string,User>;
    public redisClient:RedisClientType;
    public publisher : RedisClientType;
    public subscriber : RedisClientType;
    public prisma: PrismaClient;
    public queue : Queue;
    public worker: Worker;
    public wstoSpace:Map<WebSocket,string>;

    private constructor(){
        this.spaces = new Map();
        this.users = new Map();
        this.redisClient = createClient(redisCredentials);
        this.publisher = createClient(redisCredentials);
        this.subscriber = createClient(redisCredentials);
        this.prisma = new PrismaClient();
        this.queue = new Queue(process.pid.toString(),{
            connection,
        });
        this.worker = new Worker(process.pid.toString(),this.processJob,{
            connection,
        });
        this.wstoSpace = new Map();
    }

    static getInstance(){
        if(!RoomManager.instance){
            RoomManager.instance = new RoomManager();
        }
        return RoomManager.instance;
    }

    async processJob(job:Job){
    const {data,name} = job;
    if(name === "cast-vote"){
        await RoomManager.getInstance().adminCastVote(
            data.creatorId,
            data.userId,
            data.streamId,
            data.vote,
            data.spaceId
        );
    } else if (name ==="add-to-queue"){
        await RoomManager.getInstance().adminAddStreamHandler(
            data.spaceId,
            data.userId,
            data.url,
            data.existingActiveStream
        );
    }    else if (name === "play-next"){
        await RoomManager.getInstance().adminPlayNext(data.spaceId,data.userId);
    } else if (name === "remove-song"){
        await RoomManager.getInstance().adminRemoveSong(
            data.spaceId,
            data.userId,
            data.streamId
        );
    }else if (name === "empty-queue"){
        await RoomManager.getInstance().adminEmptyQueue(data.spaceId);
    } else if (name === "repeat-song"){
        await RoomManager.getInstance().adminRepeatSong(data.spaceId,data.userId);
    } else if (name === "skip-song"){
        await RoomManager.getInstance().adminSkipSong(data.spaceId,data.userId);
    }
}

async initRedisClient(){
    await this.redisClient.connect();
    await this.publisher.connect();
    await this.subscriber.connect();
}

onSubscribeRoom(message:string,spaceId:string){
    console.log("Subscribe Room",spaceId);
    const {type,data} = JSON.parse(message);
    if (type === "new-stream"){
        RoomManager.getInstance().publishNewStream(spaceId,data);
    } else if (type === "new-vote"){
        RoomManager.getInstance().publishNewVote(
            spaceId,
            data.streamId,
            data.vote,
            data.votedBy
        );
    }else if (type === "play-next"){
        RoomManager.getInstance().publishPlayNext(spaceId);
    } else if (type === "remove-song"){
        RoomManager.getInstance().publishRemoveSong(spaceId,data.streamId);
    } else if (type === "empty-queue"){
        RoomManager.getInstance().publishEmptyQueue(spaceId);
    } else if (type === "repeat-song"){
        RoomManager.getInstance().publishRepeatSong(spaceId);
    } else if (type === "skip-song"){
        RoomManager.getInstance().publishSkipSong(spaceId);
    }
}



async createRoom(spaceId:string){
    console.log(process.pid + ": CreateRoom :",{spaceId});
    if(!this.spaces.has(spaceId)){
        this.spaces.set(spaceId,{
            users : new Map<String,User>(),
            creatorId : "",
        });
        await this.subscriber.subscribe(spaceId,this.onSubscribeRoom);
    }
}

async addUser(userId:string,spaceId:string, ws: WebSocket, token: string){
    let user = this.users.get(userId);
    if(!user){
        this.users.set(userId,{
            userId: userId,
            ws :[ws],
            token: token,
        });
    }else{
        if(!user.ws.some((existingWs)=>existingWs === ws)){
            user.ws.push(ws);
        }
    }
}

async joinRoom(
    spaceId:string,
    creatorId:string,
    userId:string,
    ws:WebSocket,
    token:string
){
    console.log("Join Room",+spaceId);
    let space = this.spaces.get(spaceId);
    let user = this.users.get(userId);
    if(!space){
        await this.createRoom(spaceId);
        space = this.spaces.get(spaceId);
    }
    if(!user){
        await this.addUser(userId, spaceId, ws, token);
        user = this.users.get(userId);
    }else{
        if(!user.ws.some((existingWs)=>existingWs === ws)){
            user.ws.push(ws);
        }
    }
    this.wstoSpace.set(ws,spaceId);

    if(space && user){
        space.users.set(userId,user);
        this.spaces.set(spaceId,{
            ...space,
            users: new Map(space.users),
            creatorId: creatorId,
        })
    }
}

publishEmptyQueue(spaceId:string){
    const space = this.spaces.get(spaceId);
    space?.users.forEach((user,userId)=>{
        user?.ws.forEach((ws)=>{
            ws.send(
                JSON.stringify({
                    types:`empty-queue/${spaceId}`,
                })
            )
        })
    })
}

async adminEmptyQueue(spaceId:string){
    const room = this.spaces.get(spaceId);
    const userId = this.spaces.get(spaceId)?.creatorId;
    const user = this.users.get(userId as string);

    if(room && user){
        await this.prisma.stream.updateMany({
            where:{
                played:false,
                spaceId:spaceId,
            },
            data:{
                played:true,
                playedTs: new Date(),
            },
        });
        await this,this.publisher.publish(
            spaceId,
            JSON.stringify({
                type:"empty-queue",
            })
        )
    }

}

publishRemoveSong(spaceId:string,streamId:string){
  const space = this.spaces.get(spaceId);
    space?.users.forEach((user,userId)=>{
        user?.ws.forEach((ws)=>{
            ws.send(
                JSON.stringify({
                    type:`remove-song/${spaceId}`,
                    data:{streamId},
                })
            )
        })
    })
}  


async adminRemoveSong(spaceId:string,userId:string,streamId:string){
const user = this.users.get(userId);
const creatorId = this.spaces.get(spaceId)?.creatorId;
if(user && userId === creatorId){
    await this.prisma.stream.delete({
        where:{
            id:streamId,
            spaceId:spaceId,
        },
    })
    await this.publisher.publish(
        spaceId,
        JSON.stringify({
            type:"remove-song",
            data:{
                streamId,
                spaceId,
            },
        })
    );
}else{
    user?.ws.forEach((ws)=>{
        ws.send(
            JSON.stringify({
                type:"error",
                data:{
                    message:"You can't remove the song . You are not the host,"
                }
            })
        )
    })
}
}

publishPlayNext(spaceId: string) {
    const space = this.spaces.get(spaceId);
    space?.users.forEach((user, userId) => {
      user?.ws.forEach((ws) => {
        ws.send(
          JSON.stringify({
            type: `play-next/${spaceId}`,
          })
        );
      });
    });
  }

  async payAndPlayNext(spaceId:string,userId:string,url:string){
    const creatorId = this.spaces.get(spaceId)?.creatorId;
    console.log("pay and play next",creatorId,userId);
    let targetUser = this.users.get(userId);
    if (!targetUser || !creatorId) {
        return;
      }

      const extractedId = getVideoId(url);

      if(!extractedId){
        targetUser?.ws.forEach((ws)=>{
            ws.send(
                JSON.stringify({
                    type:"errpr",
                    data:{message :"Inavid Youtube Url"}
                })
            )
        })
        return;
      }
      const res = await youtubesearchapi.GetListByKeyword(extractedId);

      if(res.thumbnail){
        const thumbnails = res.thumbnail.thumbnails;
        thumbnails.sort((a:{width:number},b:{width:number})=>
        a.width<b.width ? -1 :1
    );
    const stream = await this.prisma.stream.create({
        data:{
            id:crypto.randomUUID(),
            userId:creatorId,
            url:url,
            extractedId,
            type:"Youtube",
            addedBy:userId,
            title:res.title?? "Can't find video",
            smallImg:
            (thumbnails.length > 1
              ? thumbnails[thumbnails.length - 2].url
              : thumbnails[thumbnails.length - 1].url) ??
            "https://cdn.pixabay.com/photo/2024/02/28/07/42/european-shorthair-8601492_640.jpg",
          bigImg:
            thumbnails[thumbnails.length - 1].url ??
            "https://cdn.pixabay.com/photo/2024/02/28/07/42/european-shorthair-8601492_640.jpg",
          spaceId: spaceId,
        },
        
    })
    await Promise.all([
        this.prisma.currentStream.upsert({
          where: {
            spaceId: spaceId,
          },
          update: {
            spaceId: spaceId,
            userId,
            streamId: stream.id,
          },
          create: {
            id: crypto.randomUUID(),
            spaceId: spaceId,
            userId,
            streamId: stream.id,
          },
        }),
        this.prisma.stream.update({
          where: {
            id: stream.id,
          },
          data: {
            played: true,
            playedTs: new Date(),
          },
        }),
      ]);
      await this.publisher.publish(
        spaceId,
        JSON.stringify({
          type: "play-next",
        })
      );
    }
  }
  
  async adminPlayNext(spaceId: string, userId: string) {
    const creatorId = this.spaces.get(spaceId)?.creatorId;
    console.log("Play Next",creatorId,userId);
    let targetUser = this.users.get(userId);
    if(!targetUser){
        return;
    }
    if(targetUser.userId !== creatorId){
        targetUser.ws.forEach((ws)=>{
            ws.send(
                JSON.stringify({
                    type:"error",
                    data:{
                        message:"You can't play next. You are not the host",
                    },
                })
            )
        })
        return;
    }

    const mostUpvotedStream = await this.prisma.stream.findFirst({
        where:{
            played:false,
            spaceId:spaceId,
        },
        orderBy:{
            upvotes:{
                _count:"desc",
            },
        },
    });
    if(!mostUpvotedStream){
        targetUser.ws.forEach((ws)=>{
            ws.send(
                JSON.stringify({
                    type:"error",
                    data:{
                        message:"No streams in the queue",
                    },
                })
            )
        })
        return
    }
    await Promise.all([
        this.prisma.currentStream.upsert({
            where:{spaceId:spaceId},
            update:{
                spaceId:spaceId,
                userId,
                streamId:mostUpvotedStream.id,
            },create:{
                spaceId:spaceId,
                userId,
                streamId:mostUpvotedStream.id,
            },
        }),
        this.prisma.stream.update({
            where:{
                id:mostUpvotedStream.id,
            },
            data:{
                played:true,
                playedTs:new Date(),
            }
        })
    ])

    let previousQueueLength = parseInt(
        (await this.redisClient.get(`queueLength:${spaceId}`)) || "1",
        10
    );
    if(previousQueueLength){
        await this.redisClient.set(
            `queueLength:${spaceId}`,
            previousQueueLength - 1
        );
    }
    await this.publisher.publish(
        spaceId,
        JSON.stringify({
            type:"play-next",
        })
    )
  }

  publishNewVote(
    spaceId: string,
    streamId: string,
    vote: "upvote" | "downvote",
    votedBy: string
  ){
    console.log(process.pid + "publishNewVote");
    const spaces = this.spaces.get(spaceId);
    spaces?.users.forEach((user,userId)=>{
        user?.ws.forEach((ws)=>{
            ws.send(
                JSON.stringify({
                    type:`new-vote/${spaceId}`,
                    data:{
                        streamId,
                        vote,
                        spaceId,
                        votedBy,
                    },
                })
            )
        })

    }
    )
  }
  
  async adminCastVote(
    creatorId: string,
    userId: string,
    streamId: string,
    vote: string,
    spaceId: string
  ) {
    console.log(process.pid + " adminCastVote");
    if (vote === "upvote") {
      await this.prisma.upvote.create({
        data: {
          id: crypto.randomUUID(),
          userId,
          streamId,
        },
      });
    } else {
      await this.prisma.upvote.delete({
        where: {
        
            userId_streamId: {
              userId,
              streamId,
          
          },
        },
      });
    }
    await this.redisClient.set(
      `lastVoted-${spaceId}-${userId}`,
      new Date().getTime(),
      {
        EX: TIME_SPAN_FOR_VOTE / 1000,
      }
    );

    await this.publisher.publish(
      spaceId,
      JSON.stringify({
        type: "new-vote",
        data: { streamId, vote, votedBy: userId },
      })
    );
  }

  async casteVote(
    userId: string,
    streamId: string,
    vote:"upvote" | "downvote",
    spaceId: string
  ){
    console.log(process.pid + "casteVote");
    const space = this.spaces.get(spaceId);
    const currentUser = this.users.get(userId);
    const creatorId = this.spaces.get(spaceId)?.creatorId;
    const isCreator = currentUser?.userId === creatorId;
    if(!space || !currentUser){
        return;
    }
    if(!isCreator){
        const lastVoted = await this.redisClient.get(
            `lastVoted-${spaceId}-${userId}`
        );

        if(lastVoted){
            currentUser?.ws.forEach((ws)=>{
                ws.send(
                    JSON.stringify({
                        type:"error",
                        data:{
                            message:"You can't vote again so soon",
                        },
                    })
                )
            })
            return;
        }
    }
    await this.queue.add("cast-vote",{
        creatorId,
        userId,
        streamId,
        vote,
        spaceId:spaceId,
    });
  }

  publishNewStream(spaceId:string,data:any){
    console.log(process.pid + "publishNewStream");
    console.log("Publish New Stream",spaceId);
    const space = this.spaces.get(spaceId);
    if(space){
        space?.users.forEach((user,userId)=>{
            user?.ws.forEach((ws)=>{
                ws.send(
                    JSON.stringify({
                        type:`new-stream/${spaceId}`,
                        data,
                    })
                )
            })
        })
    }
  }

  async adminAddStreamHandler(
    spaceId:string,
    userId:string,
    url:string,
    existingActiveStream:number){
        console.log(process.pid + "adminAddStreamHandler");
        console.log("Admin Add Stream Handler",spaceId);
        const room = this.spaces.get(spaceId);
        const currentUser = this.users.get(userId);
        if(!room || typeof existingActiveStream !== "number"){
            return;
        }
        const extractedId = getVideoId(url);
        if(!extractedId){
            currentUser?.ws.forEach((ws)=>{
                ws.send(
                    JSON.stringify({
                        type:"error",
                        data:{
                            message:"Invalid Youtube URL",
                        },
                    })
                )
            })
            return;
        }

        await this.redisClient.set(
            `queue-length-${spaceId}`,
            existingActiveStream + 1
          );
      
          const res = await youtubesearchapi.GetVideoDetails(extractedId);
      
          if (res.thumbnail) {
            const thumbnails = res.thumbnail.thumbnails;
            thumbnails.sort((a: { width: number }, b: { width: number }) =>
              a.width < b.width ? -1 : 1
            );
            const stream = await this.prisma.stream.create({
              data: {
                id: crypto.randomUUID(),
                userId: userId,
                url: url,
                extractedId,
                type: "Youtube",
                addedBy: userId,
                title: res.title ?? "Cant find video",
               
                smallImg:
                  (thumbnails.length > 1
                    ? thumbnails[thumbnails.length - 2].url
                    : thumbnails[thumbnails.length - 1].url) ??
                  "https://cdn.pixabay.com/photo/2024/02/28/07/42/european-shorthair-8601492_640.jpg",
                bigImg:
                  thumbnails[thumbnails.length - 1].url ??
                  "https://cdn.pixabay.com/photo/2024/02/28/07/42/european-shorthair-8601492_640.jpg",
                spaceId: spaceId,
              },
            });
      
            await this.redisClient.set(`${spaceId}-${url}`, new Date().getTime(), {
              EX: TIME_SPAN_FOR_REPEAT / 1000,
            });
      
            await this.redisClient.set(
              `lastAdded-${spaceId}-${userId}`,
              new Date().getTime(),
              {
                EX: TIME_SPAN_FOR_QUEUE / 1000,
              }
            );
      
            await this.publisher.publish(
              spaceId,
              JSON.stringify({
                type: "new-stream",
                data: {
                  ...stream,
                  hasUpvoted: false,
                  upvotes: 0,
                },
              })
            );
          } else {
            currentUser?.ws.forEach((ws) => {
              ws.send(
                JSON.stringify({
                  type: "error",
                  data: {
                    message: "Video not found",
                  },
                })
              );
            });
          }
        }

        async addToQueue(spaceId:string,currentUserId:string,url:string){
        console.log(process.pid + "addToQueue");
        const space = this.spaces.get(spaceId);
        const currentUser = this.users.get(currentUserId);
        const creatorId = this.spaces.get(spaceId)?.creatorId;
        const isCreator = currentUser === creatorId;
        if(!space || !currentUser){
            console.log("Space or User not found");
            return;
        }
        
        if (!isValidYoutubeURL(url)) {
            currentUser?.ws.forEach((ws) => {
              ws.send(
                JSON.stringify({
                  type: "error",
                  data: { message: "Invalid YouTube URL" },
                })
              );
            });
            return;
          }
      
          let previousQueueLength = parseInt(
            (await this.redisClient.get(`queue-length-${spaceId}`)) || "0",
            10
          );
      
         
          if (!previousQueueLength) {
            previousQueueLength = await this.prisma.stream.count({
              where: {
                spaceId: spaceId,
                played: false,
              },
            });
          }
      
          if (!isCreator) {
            let lastAdded = await this.redisClient.get(
              `lastAdded-${spaceId}-${currentUserId}`
            );
      
            if (lastAdded) {
              currentUser.ws.forEach((ws) => {
                ws.send(
                  JSON.stringify({
                    type: "error",
                    data: {
                      message: "You can add again after 20 min.",
                    },
                  })
                );
              });
              return;
            }
            let alreadyAdded = await this.redisClient.get(`${spaceId}-${url}`);
      
            if (alreadyAdded) {
              currentUser.ws.forEach((ws) => {
                ws.send(
                  JSON.stringify({
                    type: "error",
                    data: {
                      message: "This song is blocked for 1 hour",
                    },
                  })
                );
              });
              return;
            }
      
            if (previousQueueLength >= MAX_QUEUE_LENGTH) {
              currentUser.ws.forEach((ws) => {
                ws.send(
                  JSON.stringify({
                    type: "error",
                    data: {
                      message: "Queue limit reached",
                    },
                  })
                );
              });
              return;
            }
          }
      
          await this.queue.add("add-to-queue", {
            spaceId,
            userId: currentUser.userId,
            url,
            existingActiveStream: previousQueueLength,
          });
        }

        async adminRepeatSong(spaceId: string, userId: string) {
            const room = this.spaces.get(spaceId);
            const user = this.users.get(userId);
        
            if (!room || !user) {
                console.error("Room or User not found");
                return;
            }
        
            const currentStream = await this.prisma.currentStream.findFirst({
                where: { spaceId: spaceId },
            });
        
            if (!currentStream) {
                user.ws.forEach((ws) => {
                    ws.send(
                        JSON.stringify({
                            type: "error",
                            data: { message: "No song is currently playing to repeat." },
                        })
                    );
                });
                return;
            }
        
            await this.queue.add("repeat-song", { spaceId, userId });
        
            user.ws.forEach((ws) => {
                ws.send(
                    JSON.stringify({
                        type: "repeat-song",
                        data: { message: "The song is being repeated." },
                    })
                );
            });
        }
        
        async adminSkipSong(spaceId: string, userId: string) {
            const room = this.spaces.get(spaceId);
            const user = this.users.get(userId);
        
            if (!room || !user) {
                console.error("Room or User not found");
                return;
            }
        
            await this.queue.add("skip-song", { spaceId, userId });
        
            user.ws.forEach((ws) => {
                ws.send(
                    JSON.stringify({
                        type: "skip-song",
                        data: { message: "The song is being skipped." },
                    })
                );
            });
        }
        
        async publishRepeatSong(spaceId: string) {
            const space = this.spaces.get(spaceId);
            if (!space) {
                console.error(`Space with id ${spaceId} not found.`);
                return;
            }
            const currentStream = await this.prisma.currentStream.findFirst({
                where: {
                    spaceId: spaceId,
                },
            });
    
            if (!currentStream) {
                space.users.forEach((user) => {
                    user.ws.forEach((ws) => {
                        ws.send(
                            JSON.stringify({
                                type: "error",
                                data: {
                                    message: "No song is currently playing to repeat.",
                                },
                            })
                        );
                    });
                });
                return;
            }
            await this.queue.add("repeat-song", {
                spaceId,
                userId: space.creatorId, 
            });
            space.users.forEach((user) => {
                user.ws.forEach((ws) => {
                    ws.send(
                        JSON.stringify({
                            type: "repeat-song",
                            data: {
                                message: "The song is being repeated.",
                            },
                        })
                    );
                });
            });
        }
    
        async publishSkipSong(spaceId: string) {
            const space = this.spaces.get(spaceId);
            if (!space) {
                console.error(`Space with id ${spaceId} not found.`);
                return;
            }
            space.users.forEach((user) => {
                user.ws.forEach((ws) => {
                    ws.send(
                        JSON.stringify({
                            type: "skip-song",
                            data: {
                                message: "The song is being skipped.",
                            },
                        })
                    );
                });
            });
            await this.queue.add("skip-song", {
                spaceId,
                userId: space.creatorId, 
            });
        }
    
 disconnect(ws: WebSocket) {
console.log(process.pid + "disconnect");
let userId:string | null = null;
const spaceId = this.wstoSpace.get(ws);
this.users.forEach((user,id)=>{
    const wsIndex = user.ws.indexOf(ws);
    if (wsIndex !== -1) {
        userId = id;
        user.ws.splice(wsIndex, 1);
      }
      if (user.ws.length === 0) {
        this.users.delete(id);
      }
}) 
if (userId && spaceId) {
    const space = this.spaces.get(spaceId);
    if (space) {
      const updatedUsers = new Map(
        Array.from(space.users).filter(([usrId]) => userId !== usrId)
      );
      this.spaces.set(spaceId, {
        ...space,
        users: updatedUsers,
      });
    }
  }

}
    }