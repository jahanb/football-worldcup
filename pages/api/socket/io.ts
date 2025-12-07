import { Server as NetServer } from "http";
import { NextApiRequest } from "next";
import { Server as ServerIO } from "socket.io";
import { connectDB } from "@/lib/db";
import Message from "@/models/Message";

export const config = {
    api: {
        bodyParser: false,
    },
};

const ioHandler = (req: NextApiRequest, res: any) => {
    if (!res.socket.server.io) {
        console.log("*First use, starting socket.io*");

        const httpServer: NetServer = res.socket.server;

        // Initialize Socket.io
        const io = new ServerIO(httpServer, {
            path: "/worldcup/api/socket/io", // IMPORTANT: Must match base path
            addTrailingSlash: false,
        });

        io.on("connection", async (socket) => {

            // 1. Send chat history on connection
            await connectDB();
            const history = await Message.find().sort({ createdAt: -1 }).limit(50);
            socket.emit("history", history.reverse());

            // 2. Listen for new messages
            socket.on("send-message", async (msg) => {
                // Save to DB
                await Message.create({ username: msg.username, text: msg.text });
                // Broadcast to everyone
                io.emit("receive-message", msg);
            });
        });

        res.socket.server.io = io;
    }
    res.end();
};

export default ioHandler;