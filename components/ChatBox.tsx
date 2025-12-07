'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import io, { Socket } from 'socket.io-client';
import {
    Box, Paper, TextField, IconButton, Typography,
    Avatar, Fab, Badge, Tooltip
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import CloseIcon from '@mui/icons-material/Close';
import ChatIcon from '@mui/icons-material/Chat';

let socket: Socket;

export default function ChatBox() {
    const { data: session } = useSession();
    const [isOpen, setIsOpen] = useState(false);
    const [msg, setMsg] = useState('');
    const [chat, setChat] = useState<any[]>([]);
    const [unread, setUnread] = useState(0);
    const scrollRef = useRef<HTMLDivElement>(null);

    // UPDATED EMOJIS: Added Thumbs Down (👎)
    const emojis = ['👍', '👎', '🎉', '❤️', '😂', '😭', '🔥', '⚽'];

    useEffect(() => {
        // Initialize Socket
        fetch('/worldcup/api/socket/io').finally(() => {
            socket = io({
                path: '/worldcup/api/socket/io',
                autoConnect: true,
            });

            socket.on('connect', () => {
                console.log('Chat connected');
            });

            socket.on('history', (history: any) => {
                setChat(history);
                scrollToBottom();
            });

            socket.on('receive-message', (message: any) => {
                setChat((prev) => [...prev, message]);
                scrollToBottom();
                if (!isOpen) {
                    setUnread((prev) => prev + 1);
                }
            });
        });

        return () => {
            if (socket) socket.disconnect();
        };
    }, [isOpen]);

    const scrollToBottom = () => {
        setTimeout(() => {
            if (scrollRef.current) {
                scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
            }
        }, 100);
    };

    const sendMessage = (text: string) => {
        if (!text.trim() || !session?.user?.name) return;

        const messageData = {
            username: session.user.name,
            text: text,
            createdAt: new Date(),
        };

        socket.emit('send-message', messageData);
        setMsg('');
    };

    const handleEmoji = (emoji: string) => {
        sendMessage(emoji);
    };

    const toggleChat = () => {
        setIsOpen(!isOpen);
        if (!isOpen) {
            setUnread(0);
            scrollToBottom();
        }
    };

    if (!session) return null;

    return (
        <Box sx={{ position: 'fixed', bottom: 20, right: 20, zIndex: 9999 }}>

            {/* 1. CLOSED STATE: EXTENDED BUTTON WITH TITLE */}
            {!isOpen && (
                <Tooltip title="Click to start chatting" arrow>
                    <Fab
                        variant="extended"
                        color="primary"
                        onClick={toggleChat}
                        sx={{ fontWeight: 'bold', textTransform: 'none', px: 3 }}
                    >
                        <Badge badgeContent={unread} color="error" sx={{ mr: 1 }}>
                            <ChatIcon />
                        </Badge>
                        Fan Chat
                    </Fab>
                </Tooltip>
            )}

            {/* 2. OPEN STATE: CHAT WINDOW */}
            {isOpen && (
                <Paper elevation={6} sx={{ width: 320, height: 450, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRadius: 2 }}>

                    {/* Header */}
                    <Box sx={{ bgcolor: '#1976d2', color: 'white', p: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box display="flex" alignItems="center" gap={1}>
                            <ChatIcon fontSize="small" />
                            <Typography variant="subtitle1" fontWeight="bold">Fan Chat</Typography>
                        </Box>
                        <IconButton size="small" onClick={toggleChat} sx={{ color: 'white' }}>
                            <CloseIcon />
                        </IconButton>
                    </Box>

                    {/* Messages Area */}
                    <Box
                        ref={scrollRef}
                        sx={{ flex: 1, overflowY: 'auto', p: 2, bgcolor: '#f5f5f5', display: 'flex', flexDirection: 'column', gap: 1.5 }}
                    >
                        {chat.map((m, i) => {
                            const isMe = m.username === session.user?.name;
                            return (
                                <Box key={i} sx={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>

                                    {/* STRICT USERNAME DISPLAY (Always visible) */}
                                    <Typography variant="caption" sx={{ color: '#666', mb: 0.3, px: 0.5, fontWeight: 'bold', fontSize: '10px' }}>
                                        {m.username}
                                    </Typography>

                                    <Box sx={{ display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row', alignItems: 'flex-end', gap: 1 }}>
                                        <Avatar sx={{ width: 24, height: 24, fontSize: 10, bgcolor: isMe ? '#1565c0' : '#999' }}>
                                            {m.username.substring(0, 2).toUpperCase()}
                                        </Avatar>

                                        <Paper
                                            elevation={1}
                                            sx={{
                                                p: 1,
                                                px: 1.5,
                                                bgcolor: isMe ? '#e3f2fd' : 'white',
                                                maxWidth: 200,
                                                borderRadius: 2,
                                                borderTopRightRadius: isMe ? 0 : 2,
                                                borderTopLeftRadius: isMe ? 2 : 0
                                            }}
                                        >
                                            <Typography variant="body2">{m.text}</Typography>
                                        </Paper>
                                    </Box>
                                </Box>
                            );
                        })}
                    </Box>

                    {/* Emoji Bar */}
                    <Box sx={{ p: 1, borderTop: '1px solid #ddd', display: 'flex', justifyContent: 'center', gap: 1.5, bgcolor: '#fff' }}>
                        {emojis.map(e => (
                            <button
                                key={e}
                                onClick={() => handleEmoji(e)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', padding: 0 }}
                                title="Send Emoji"
                            >
                                {e}
                            </button>
                        ))}
                    </Box>

                    {/* Input Area */}
                    <Box sx={{ p: 1, display: 'flex', gap: 1, bgcolor: 'white' }}>
                        <TextField
                            size="small"
                            fullWidth
                            placeholder="Type a message..."
                            value={msg}
                            onChange={e => setMsg(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && sendMessage(msg)}
                            autoComplete="off"
                        />
                        <IconButton color="primary" onClick={() => sendMessage(msg)}>
                            <SendIcon />
                        </IconButton>
                    </Box>
                </Paper>
            )}
        </Box>
    );
}