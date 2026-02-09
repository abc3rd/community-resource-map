/**
 * IRC-Style Chat System
 * Supports direct messaging, public/private chat rooms, and IRC commands
 * Integrates with Firebase Firestore for real-time communication
 */

import { getFirestore, collection, addDoc, onSnapshot, doc, getDoc, updateDoc, query, where, orderBy, limit, serverTimestamp, setDoc, deleteDoc, arrayUnion, arrayRemove, getDocs } from "firebase/firestore";
import { chatEncryption } from './chat-encryption.js';

export class ChatSystem {
    constructor(db, auth) {
        this.db = db;
        this.auth = auth;
        this.currentUser = null;
        this.currentRoom = null;
        this.currentDM = null;
        this.activeListeners = [];
        this.userPublicKeys = new Map();
        this.encryption = chatEncryption;

        // Chat state
        this.rooms = new Map();
        this.directMessages = new Map();
        this.onlineUsers = new Map();
        this.typingUsers = new Set();

        // Callbacks for UI updates
        this.callbacks = {
            onMessage: null,
            onRoomUpdate: null,
            onUserUpdate: null,
            onTyping: null,
            onNotification: null
        };
    }

    /**
     * Initialize chat system for current user
     */
    async initialize(user) {
        this.currentUser = user;

        try {
            // Generate encryption keys for the user
            const keyPair = await this.encryption.generateKeyPair();
            const publicKey = await this.encryption.exportPublicKey(keyPair.publicKey);

            // Store user's public key in Firestore
            await setDoc(doc(this.db, 'chatUsers', user.uid), {
                uid: user.uid,
                displayName: user.displayName || 'Anonymous',
                email: user.email,
                publicKey: publicKey,
                accountType: user.accountType || 'individual',
                isCIO: user.accountType === 'cio' || user.isCIO || false,
                status: 'online',
                lastSeen: serverTimestamp(),
                currentRoom: null,
                createdAt: serverTimestamp()
            }, { merge: true });

            // Store private key locally (in memory only for security)
            this.encryption.storeKeyPair('user_' + user.uid, keyPair);

            // Load available rooms
            await this.loadRooms();

            // Load direct message conversations
            await this.loadDirectMessages();

            // Set up presence monitoring
            this.setupPresence();

            console.log('[CHAT] Chat system initialized for user:', user.uid);
            return true;
        } catch (error) {
            console.error('[CHAT] Failed to initialize chat system:', error);
            throw error;
        }
    }

    /**
     * Load all available chat rooms
     */
    async loadRooms() {
        const roomsRef = collection(this.db, 'chatRooms');

        onSnapshot(roomsRef, (snapshot) => {
            snapshot.forEach((doc) => {
                const roomData = doc.data();
                const roomId = doc.id;

                // Check if user can see this room
                if (this.canAccessRoom(roomData)) {
                    this.rooms.set(roomId, {
                        id: roomId,
                        ...roomData
                    });
                }
            });

            if (this.callbacks.onRoomUpdate) {
                this.callbacks.onRoomUpdate(Array.from(this.rooms.values()));
            }
        });
    }

    /**
     * Check if user can access a room
     */
    canAccessRoom(room) {
        if (room.type === 'public') return true;
        if (room.type === 'private') {
            // Check if user is in allowed users list or is CIO
            return room.members?.includes(this.currentUser.uid) ||
                   this.currentUser.isCIO;
        }
        return false;
    }

    /**
     * Create a new chat room
     */
    async createRoom(roomName, type = 'public', description = '') {
        try {
            const roomData = {
                name: roomName,
                type: type, // 'public' or 'private'
                description: description,
                createdBy: this.currentUser.uid,
                createdAt: serverTimestamp(),
                members: [this.currentUser.uid],
                admins: [this.currentUser.uid],
                moderators: [],
                bannedUsers: [],
                settings: {
                    allowFileSharing: true,
                    encryption: type === 'private',
                    maxMembers: type === 'public' ? 1000 : 50
                }
            };

            const docRef = await addDoc(collection(this.db, 'chatRooms'), roomData);
            console.log('[CHAT] Room created:', docRef.id);

            return docRef.id;
        } catch (error) {
            console.error('[CHAT] Failed to create room:', error);
            throw error;
        }
    }

    /**
     * Join a chat room
     */
    async joinRoom(roomId) {
        try {
            const roomRef = doc(this.db, 'chatRooms', roomId);
            const roomSnap = await getDoc(roomRef);

            if (!roomSnap.exists()) {
                throw new Error('Room not found');
            }

            const roomData = roomSnap.data();

            // Check access
            if (!this.canAccessRoom(roomData)) {
                throw new Error('Access denied to this room');
            }

            // Add user to members if not already
            if (!roomData.members.includes(this.currentUser.uid)) {
                await updateDoc(roomRef, {
                    members: arrayUnion(this.currentUser.uid)
                });
            }

            // Update user's current room
            await updateDoc(doc(this.db, 'chatUsers', this.currentUser.uid), {
                currentRoom: roomId
            });

            this.currentRoom = roomId;

            // Start listening to messages in this room
            this.listenToRoomMessages(roomId);

            // Announce join
            await this.sendSystemMessage(roomId, `${this.currentUser.displayName} has joined the room`);

            console.log('[CHAT] Joined room:', roomId);
            return true;
        } catch (error) {
            console.error('[CHAT] Failed to join room:', error);
            throw error;
        }
    }

    /**
     * Leave current room
     */
    async leaveRoom() {
        if (!this.currentRoom) return;

        try {
            // Announce leave
            await this.sendSystemMessage(this.currentRoom, `${this.currentUser.displayName} has left the room`);

            // Update user's current room
            await updateDoc(doc(this.db, 'chatUsers', this.currentUser.uid), {
                currentRoom: null
            });

            // Stop listening to messages
            this.stopListeningToRoom(this.currentRoom);

            this.currentRoom = null;

            console.log('[CHAT] Left room');
            return true;
        } catch (error) {
            console.error('[CHAT] Failed to leave room:', error);
            throw error;
        }
    }

    /**
     * Send a message to current room
     */
    async sendRoomMessage(message, encrypted = false) {
        if (!this.currentRoom) {
            throw new Error('Not in a room');
        }

        try {
            let messageData = {
                roomId: this.currentRoom,
                senderId: this.currentUser.uid,
                senderName: this.currentUser.displayName || 'Anonymous',
                message: message,
                encrypted: encrypted,
                timestamp: serverTimestamp(),
                type: 'message'
            };

            // Encrypt message if room requires it
            if (encrypted) {
                const roomRef = doc(this.db, 'chatRooms', this.currentRoom);
                const roomSnap = await getDoc(roomRef);
                const roomData = roomSnap.data();

                if (roomData.settings.encryption) {
                    const sessionKey = this.encryption.getSharedKey(this.currentRoom) ||
                                      await this.encryption.generateSessionKey();

                    messageData.message = await this.encryption.encryptMessage(message, sessionKey);
                    this.encryption.storeSharedKey(this.currentRoom, sessionKey);
                }
            }

            await addDoc(collection(this.db, 'chatMessages'), messageData);

            return true;
        } catch (error) {
            console.error('[CHAT] Failed to send message:', error);
            throw error;
        }
    }

    /**
     * Send system message (joins, leaves, kicks, etc.)
     */
    async sendSystemMessage(roomId, message) {
        try {
            await addDoc(collection(this.db, 'chatMessages'), {
                roomId: roomId,
                senderId: 'system',
                senderName: 'System',
                message: message,
                encrypted: false,
                timestamp: serverTimestamp(),
                type: 'system'
            });
        } catch (error) {
            console.error('[CHAT] Failed to send system message:', error);
        }
    }

    /**
     * Listen to messages in a room
     */
    listenToRoomMessages(roomId) {
        const messagesRef = collection(this.db, 'chatMessages');
        const q = query(
            messagesRef,
            where('roomId', '==', roomId),
            orderBy('timestamp', 'desc'),
            limit(100)
        );

        const unsubscribe = onSnapshot(q, async (snapshot) => {
            const messages = [];

            for (const doc of snapshot.docs) {
                const data = doc.data();
                let message = { id: doc.id, ...data };

                // Decrypt if encrypted
                if (data.encrypted) {
                    const sessionKey = this.encryption.getSharedKey(roomId);
                    if (sessionKey) {
                        try {
                            message.message = await this.encryption.decryptMessage(data.message, sessionKey);
                            message.decrypted = true;
                        } catch (e) {
                            message.message = '[Encrypted message]';
                            message.decrypted = false;
                        }
                    }
                }

                messages.push(message);
            }

            messages.reverse(); // Show oldest first

            if (this.callbacks.onMessage) {
                this.callbacks.onMessage(messages, 'room', roomId);
            }
        });

        this.activeListeners.push({ type: 'room', id: roomId, unsubscribe });
    }

    /**
     * Stop listening to a room
     */
    stopListeningToRoom(roomId) {
        const listener = this.activeListeners.find(l => l.type === 'room' && l.id === roomId);
        if (listener) {
            listener.unsubscribe();
            this.activeListeners = this.activeListeners.filter(l => l !== listener);
        }
    }

    /**
     * Start a direct message conversation
     */
    async startDirectMessage(recipientUserId) {
        try {
            // Create conversation ID (sorted UIDs for consistency)
            const conversationId = [this.currentUser.uid, recipientUserId].sort().join('_');

            // Check if conversation exists
            const convRef = doc(this.db, 'chatConversations', conversationId);
            const convSnap = await getDoc(convRef);

            if (!convSnap.exists()) {
                // Create new conversation
                await setDoc(convRef, {
                    participants: [this.currentUser.uid, recipientUserId],
                    createdAt: serverTimestamp(),
                    lastMessage: null,
                    lastMessageTime: null,
                    encrypted: true
                });

                // Exchange encryption keys
                await this.exchangeKeys(recipientUserId, conversationId);
            }

            this.currentDM = conversationId;

            // Listen to DM messages
            this.listenToDirectMessages(conversationId);

            console.log('[CHAT] Started DM conversation:', conversationId);
            return conversationId;
        } catch (error) {
            console.error('[CHAT] Failed to start DM:', error);
            throw error;
        }
    }

    /**
     * Exchange encryption keys for DM
     */
    async exchangeKeys(recipientUserId, conversationId) {
        try {
            // Get recipient's public key
            const recipientRef = doc(this.db, 'chatUsers', recipientUserId);
            const recipientSnap = await getDoc(recipientRef);
            const recipientData = recipientSnap.data();

            if (!recipientData.publicKey) {
                console.warn('[CHAT] Recipient has no public key, using unencrypted');
                return;
            }

            // Generate session key for this conversation
            const sessionKey = await this.encryption.generateSessionKey();

            // Import recipient's public key
            const recipientPublicKey = await this.encryption.importPublicKey(recipientData.publicKey);

            // Encrypt session key with recipient's public key
            const encryptedSessionKey = await this.encryption.encryptSessionKey(sessionKey, recipientPublicKey);

            // Store encrypted session key in conversation
            await setDoc(doc(this.db, 'chatConversations', conversationId), {
                [`sessionKeys.${this.currentUser.uid}`]: await this.encryption.exportSessionKey(sessionKey),
                [`encryptedKeys.${recipientUserId}`]: encryptedSessionKey
            }, { merge: true });

            // Store session key locally
            this.encryption.storeSharedKey(conversationId, sessionKey);

        } catch (error) {
            console.error('[CHAT] Failed to exchange keys:', error);
        }
    }

    /**
     * Send direct message
     */
    async sendDirectMessage(recipientUserId, message) {
        try {
            const conversationId = [this.currentUser.uid, recipientUserId].sort().join('_');

            // Get or create session key
            let sessionKey = this.encryption.getSharedKey(conversationId);
            if (!sessionKey) {
                await this.startDirectMessage(recipientUserId);
                sessionKey = this.encryption.getSharedKey(conversationId);
            }

            let encryptedMessage = message;
            let encrypted = false;

            // Encrypt message if session key exists
            if (sessionKey) {
                encryptedMessage = await this.encryption.encryptMessage(message, sessionKey);
                encrypted = true;
            }

            // Save message
            await addDoc(collection(this.db, 'chatDirectMessages'), {
                conversationId: conversationId,
                senderId: this.currentUser.uid,
                recipientId: recipientUserId,
                message: encryptedMessage,
                encrypted: encrypted,
                timestamp: serverTimestamp(),
                read: false
            });

            // Update conversation last message
            await updateDoc(doc(this.db, 'chatConversations', conversationId), {
                lastMessage: encrypted ? '[Encrypted]' : message,
                lastMessageTime: serverTimestamp()
            });

            return true;
        } catch (error) {
            console.error('[CHAT] Failed to send DM:', error);
            throw error;
        }
    }

    /**
     * Listen to direct messages
     */
    listenToDirectMessages(conversationId) {
        const messagesRef = collection(this.db, 'chatDirectMessages');
        const q = query(
            messagesRef,
            where('conversationId', '==', conversationId),
            orderBy('timestamp', 'desc'),
            limit(100)
        );

        const unsubscribe = onSnapshot(q, async (snapshot) => {
            const messages = [];

            for (const doc of snapshot.docs) {
                const data = doc.data();
                let message = { id: doc.id, ...data };

                // Decrypt if encrypted
                if (data.encrypted) {
                    const sessionKey = this.encryption.getSharedKey(conversationId);
                    if (sessionKey) {
                        try {
                            message.message = await this.encryption.decryptMessage(data.message, sessionKey);
                            message.decrypted = true;
                        } catch (e) {
                            message.message = '[Encrypted message]';
                            message.decrypted = false;
                        }
                    }
                }

                // Mark as read if recipient is current user
                if (data.recipientId === this.currentUser.uid && !data.read) {
                    updateDoc(doc.ref, { read: true });
                }

                messages.push(message);
            }

            messages.reverse(); // Show oldest first

            if (this.callbacks.onMessage) {
                this.callbacks.onMessage(messages, 'dm', conversationId);
            }
        });

        this.activeListeners.push({ type: 'dm', id: conversationId, unsubscribe });
    }

    /**
     * Load all direct message conversations
     */
    async loadDirectMessages() {
        const conversationsRef = collection(this.db, 'chatConversations');
        const q = query(
            conversationsRef,
            where('participants', 'array-contains', this.currentUser.uid)
        );

        onSnapshot(q, async (snapshot) => {
            for (const doc of snapshot.docs) {
                const data = doc.data();
                this.directMessages.set(doc.id, { id: doc.id, ...data });
            }

            if (this.callbacks.onRoomUpdate) {
                this.callbacks.onRoomUpdate(Array.from(this.rooms.values()));
            }
        });
    }

    /**
     * IRC-style command parser
     */
    async parseCommand(input) {
        if (!input.startsWith('/')) {
            return { type: 'message', content: input };
        }

        const parts = input.slice(1).split(' ');
        const command = parts[0].toLowerCase();
        const args = parts.slice(1);

        switch (command) {
            case 'join':
                return { type: 'command', action: 'join', args: args };

            case 'leave':
            case 'part':
                return { type: 'command', action: 'leave', args: args };

            case 'msg':
            case 'dm':
                return { type: 'command', action: 'dm', args: args };

            case 'invite':
                return { type: 'command', action: 'invite', args: args };

            case 'kick':
                return { type: 'command', action: 'kick', args: args };

            case 'ban':
                return { type: 'command', action: 'ban', args: args };

            case 'list':
                return { type: 'command', action: 'list', args: args };

            case 'who':
                return { type: 'command', action: 'who', args: args };

            case 'help':
                return { type: 'command', action: 'help', args: args };

            case 'create':
                return { type: 'command', action: 'create', args: args };

            default:
                return { type: 'unknown', content: input };
        }
    }

    /**
     * Execute IRC command
     */
    async executeCommand(command) {
        switch (command.action) {
            case 'join':
                if (command.args[0]) {
                    const roomName = command.args[0].replace('#', '');
                    await this.joinRoomByName(roomName);
                }
                break;

            case 'leave':
                await this.leaveRoom();
                break;

            case 'dm':
                if (command.args.length >= 2) {
                    const recipient = command.args[0];
                    const message = command.args.slice(1).join(' ');
                    await this.sendDirectMessageByUsername(recipient, message);
                }
                break;

            case 'invite':
                if (command.args[0]) {
                    await this.inviteUserToRoom(command.args[0], this.currentRoom);
                }
                break;

            case 'kick':
                if (command.args[0]) {
                    await this.kickUser(command.args[0]);
                }
                break;

            case 'list':
                return this.listRooms();

            case 'who':
                return this.listUsersInRoom();

            case 'help':
                return this.getHelpText();

            case 'create':
                if (command.args[0]) {
                    const roomName = command.args[0].replace('#', '');
                    const type = command.args[1] || 'public';
                    await this.createRoom(roomName, type);
                }
                break;
        }
    }

    /**
     * Get help text for IRC commands
     */
    getHelpText() {
        return `
Available Commands:
/join #roomname - Join a chat room
/leave - Leave current room
/msg username message - Send direct message
/invite username - Invite user to current room (CIO/Admin only)
/kick username - Kick user from room (CIO/Admin only)
/ban username - Ban user from room (CIO/Admin only)
/list - List available rooms
/who - Show users in current room
/create #roomname [public|private] - Create new room
/help - Show this help message
        `.trim();
    }

    /**
     * Join room by name
     */
    async joinRoomByName(roomName) {
        const room = Array.from(this.rooms.values()).find(r =>
            r.name.toLowerCase() === roomName.toLowerCase()
        );

        if (room) {
            await this.joinRoom(room.id);
        } else {
            throw new Error('Room not found');
        }
    }

    /**
     * Send DM by username
     */
    async sendDirectMessageByUsername(username, message) {
        const usersRef = collection(this.db, 'chatUsers');
        const q = query(usersRef, where('displayName', '==', username));
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
            const recipientDoc = snapshot.docs[0];
            await this.sendDirectMessage(recipientDoc.id, message);
        } else {
            throw new Error('User not found');
        }
    }

    /**
     * Invite user to room (CIO/Admin only)
     */
    async inviteUserToRoom(username, roomId) {
        if (!this.canModerateRoom(roomId)) {
            throw new Error('Permission denied');
        }

        const usersRef = collection(this.db, 'chatUsers');
        const q = query(usersRef, where('displayName', '==', username));
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
            const userId = snapshot.docs[0].id;
            const roomRef = doc(this.db, 'chatRooms', roomId);

            await updateDoc(roomRef, {
                members: arrayUnion(userId)
            });

            await this.sendSystemMessage(roomId, `${username} has been invited to the room`);
        } else {
            throw new Error('User not found');
        }
    }

    /**
     * Kick user from room (CIO/Admin only)
     */
    async kickUser(username) {
        if (!this.canModerateRoom(this.currentRoom)) {
            throw new Error('Permission denied');
        }

        const usersRef = collection(this.db, 'chatUsers');
        const q = query(usersRef, where('displayName', '==', username));
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
            const userId = snapshot.docs[0].id;
            const roomRef = doc(this.db, 'chatRooms', this.currentRoom);

            await updateDoc(roomRef, {
                members: arrayRemove(userId)
            });

            await this.sendSystemMessage(this.currentRoom, `${username} has been kicked from the room`);
        } else {
            throw new Error('User not found');
        }
    }

    /**
     * Check if user can moderate a room
     */
    async canModerateRoom(roomId) {
        if (this.currentUser.isCIO) return true;

        const roomRef = doc(this.db, 'chatRooms', roomId);
        const roomSnap = await getDoc(roomRef);
        const roomData = roomSnap.data();

        return roomData.admins?.includes(this.currentUser.uid) ||
               roomData.moderators?.includes(this.currentUser.uid);
    }

    /**
     * List available rooms
     */
    listRooms() {
        return Array.from(this.rooms.values()).map(room => ({
            name: room.name,
            type: room.type,
            members: room.members?.length || 0,
            description: room.description
        }));
    }

    /**
     * List users in current room
     */
    async listUsersInRoom() {
        if (!this.currentRoom) return [];

        const roomRef = doc(this.db, 'chatRooms', this.currentRoom);
        const roomSnap = await getDoc(roomRef);
        const roomData = roomSnap.data();

        const userPromises = (roomData.members || []).map(async (userId) => {
            const userRef = doc(this.db, 'chatUsers', userId);
            const userSnap = await getDoc(userRef);
            return userSnap.data();
        });

        return await Promise.all(userPromises);
    }

    /**
     * Setup presence monitoring
     */
    setupPresence() {
        // Update status on activity
        window.addEventListener('focus', () => {
            this.updateStatus('online');
        });

        window.addEventListener('blur', () => {
            this.updateStatus('away');
        });

        // Update status periodically
        setInterval(() => {
            if (this.currentUser) {
                this.updateStatus('online');
            }
        }, 60000); // Every minute
    }

    /**
     * Update user status
     */
    async updateStatus(status) {
        if (!this.currentUser) return;

        try {
            await updateDoc(doc(this.db, 'chatUsers', this.currentUser.uid), {
                status: status,
                lastSeen: serverTimestamp()
            });
        } catch (error) {
            console.error('[CHAT] Failed to update status:', error);
        }
    }

    /**
     * Cleanup on logout
     */
    async cleanup() {
        // Update status to offline
        if (this.currentUser) {
            await this.updateStatus('offline');
        }

        // Unsubscribe from all listeners
        this.activeListeners.forEach(listener => listener.unsubscribe());
        this.activeListeners = [];

        // Clear encryption keys
        this.encryption.clearAllKeys();

        // Clear state
        this.currentUser = null;
        this.currentRoom = null;
        this.currentDM = null;
        this.rooms.clear();
        this.directMessages.clear();

        console.log('[CHAT] Chat system cleaned up');
    }

    /**
     * Set callback handlers
     */
    setCallbacks(callbacks) {
        this.callbacks = { ...this.callbacks, ...callbacks };
    }
}

export default ChatSystem;
