/**
 * Chat System Integration Module
 * Initializes and integrates the Glytch Chat System with the main app
 */

import ChatSystem from './chat-system.js';
import ChatUI from './chat-ui.js';

let chatSystem = null;
let chatUI = null;

/**
 * Initialize chat system
 */
export async function initializeChat(db, auth, currentUser) {
    try {
        console.log('[CHAT-INTEGRATION] Initializing chat system...');

        // Create chat system instance
        chatSystem = new ChatSystem(db, auth);

        // Initialize for current user
        await chatSystem.initialize(currentUser);

        // Create UI
        chatUI = new ChatUI(chatSystem);

        // Setup callbacks for real-time updates
        chatSystem.setCallbacks({
            onMessage: (messages, type, id) => {
                chatUI.renderMessages(messages, type, id);
            },
            onRoomUpdate: (rooms) => {
                chatUI.renderRooms(rooms);
            },
            onUserUpdate: (users) => {
                // Handle user list updates
            },
            onTyping: (userId, typing) => {
                // Handle typing indicators
            },
            onNotification: (notification) => {
                chatUI.showNotification(notification.message, notification.type);
            }
        });

        // Add chat button to header
        addChatButton();

        // Auto-create general room if CIO or first time
        if (currentUser.isCIO || currentUser.accountType === 'cio') {
            await ensureGeneralRoom();
        }

        console.log('[CHAT-INTEGRATION] Chat system initialized successfully');
        return { chatSystem, chatUI };

    } catch (error) {
        console.error('[CHAT-INTEGRATION] Failed to initialize chat:', error);
        throw error;
    }
}

/**
 * Add chat button to header controls
 */
function addChatButton() {
    const headerControls = document.querySelector('.header-controls');
    if (!headerControls) return;

    const chatButton = document.createElement('button');
    chatButton.id = 'chat-toggle-btn';
    chatButton.className = 'btn btn-secondary chat-toggle';
    chatButton.innerHTML = '<i class="fas fa-comments"></i> Chat';
    chatButton.title = 'Open Glytch Chat - Universal Inbox';

    chatButton.addEventListener('click', () => {
        const chatContainer = document.getElementById('chat-system');
        if (chatContainer) {
            chatContainer.classList.remove('hidden');
        }
    });

    // Insert before auth button
    const authBtn = document.getElementById('auth-btn');
    headerControls.insertBefore(chatButton, authBtn);
}

/**
 * Ensure general room exists
 */
async function ensureGeneralRoom() {
    try {
        const generalExists = Array.from(chatSystem.rooms.values())
            .find(r => r.name.toLowerCase() === 'general');

        if (!generalExists) {
            await chatSystem.createRoom('general', 'public', 'General discussion for all users');
            console.log('[CHAT-INTEGRATION] Created general room');
        }
    } catch (error) {
        console.error('[CHAT-INTEGRATION] Failed to ensure general room:', error);
    }
}

/**
 * Cleanup chat on logout
 */
export async function cleanupChat() {
    if (chatSystem) {
        await chatSystem.cleanup();
    }

    const chatButton = document.getElementById('chat-toggle-btn');
    if (chatButton) {
        chatButton.remove();
    }

    chatSystem = null;
    chatUI = null;
}

/**
 * Get chat system instance
 */
export function getChatSystem() {
    return chatSystem;
}

/**
 * Get chat UI instance
 */
export function getChatUI() {
    return chatUI;
}

/**
 * Send notification to chat
 */
export function sendChatNotification(message, type = 'info') {
    if (chatUI) {
        chatUI.showNotification(message, type);
    }
}

export default {
    initializeChat,
    cleanupChat,
    getChatSystem,
    getChatUI,
    sendChatNotification
};
