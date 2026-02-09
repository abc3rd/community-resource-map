/**
 * Chat UI Module
 * Handles all chat interface rendering and interactions
 */

export class ChatUI {
    constructor(chatSystem) {
        this.chatSystem = chatSystem;
        this.currentView = 'rooms'; // 'rooms', 'room', 'dm'
        this.unreadCounts = new Map();

        // UI Elements (will be created dynamically)
        this.elements = {
            chatContainer: null,
            chatSidebar: null,
            chatMain: null,
            messageInput: null,
            messageList: null,
            roomList: null,
            userList: null
        };

        this.initialize();
    }

    /**
     * Initialize chat UI
     */
    initialize() {
        this.createChatInterface();
        this.setupEventListeners();
    }

    /**
     * Create main chat interface structure
     */
    createChatInterface() {
        // Create main chat container
        const chatContainer = document.createElement('div');
        chatContainer.id = 'chat-system';
        chatContainer.className = 'chat-system hidden';
        chatContainer.innerHTML = `
            <div class="chat-wrapper">
                <!-- Chat Header -->
                <div class="chat-header">
                    <div class="chat-header-left">
                        <i class="fas fa-comments"></i>
                        <span class="chat-title">Glytch Chat</span>
                        <span class="chat-status-indicator" title="Connected">
                            <i class="fas fa-circle" style="color: #4caf50;"></i>
                        </span>
                    </div>
                    <div class="chat-header-right">
                        <button class="chat-btn" id="chat-notifications-btn" title="Notifications">
                            <i class="fas fa-bell"></i>
                            <span class="notification-badge hidden">0</span>
                        </button>
                        <button class="chat-btn" id="chat-settings-btn" title="Settings">
                            <i class="fas fa-cog"></i>
                        </button>
                        <button class="chat-btn" id="chat-minimize-btn" title="Minimize">
                            <i class="fas fa-minus"></i>
                        </button>
                        <button class="chat-btn" id="chat-close-btn" title="Close">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>

                <div class="chat-body">
                    <!-- Sidebar -->
                    <div class="chat-sidebar">
                        <!-- Tab Navigation -->
                        <div class="chat-tabs">
                            <button class="chat-tab active" data-tab="rooms">
                                <i class="fas fa-hashtag"></i> Rooms
                            </button>
                            <button class="chat-tab" data-tab="dms">
                                <i class="fas fa-envelope"></i> DMs
                                <span class="dm-badge hidden">0</span>
                            </button>
                            <button class="chat-tab" data-tab="mesh">
                                <i class="fab fa-bluetooth-b"></i> Mesh
                            </button>
                        </div>

                        <!-- Room List -->
                        <div class="chat-panel active" data-panel="rooms">
                            <div class="chat-search">
                                <input type="text" id="room-search" placeholder="Search rooms...">
                                <button id="create-room-btn" title="Create Room">
                                    <i class="fas fa-plus"></i>
                                </button>
                            </div>
                            <div class="room-list" id="room-list">
                                <!-- Rooms will be populated here -->
                            </div>
                        </div>

                        <!-- DM List -->
                        <div class="chat-panel" data-panel="dms">
                            <div class="chat-search">
                                <input type="text" id="dm-search" placeholder="Search users...">
                                <button id="new-dm-btn" title="New Message">
                                    <i class="fas fa-plus"></i>
                                </button>
                            </div>
                            <div class="dm-list" id="dm-list">
                                <!-- DMs will be populated here -->
                            </div>
                        </div>

                        <!-- Mesh Network Panel -->
                        <div class="chat-panel" data-panel="mesh">
                            <div class="mesh-status">
                                <div class="mesh-header">
                                    <i class="fab fa-bluetooth-b"></i>
                                    <span>Bluetooth Mesh Network</span>
                                </div>
                                <button id="mesh-toggle-btn" class="btn-mesh">
                                    Enable Mesh Mode
                                </button>
                                <div class="mesh-info hidden" id="mesh-info">
                                    <p><i class="fas fa-signal"></i> <span id="mesh-peers">0</span> peers connected</p>
                                    <p><i class="fas fa-shield-alt"></i> Encrypted P2P</p>
                                </div>
                            </div>
                            <div class="mesh-devices" id="mesh-devices">
                                <!-- Mesh devices will appear here -->
                            </div>
                        </div>
                    </div>

                    <!-- Main Chat Area -->
                    <div class="chat-main">
                        <!-- Welcome Screen -->
                        <div class="chat-welcome" id="chat-welcome">
                            <div class="welcome-content">
                                <i class="fas fa-comments fa-3x"></i>
                                <h2>Welcome to Glytch Chat</h2>
                                <p>Select a room or start a direct message</p>
                                <div class="quick-actions">
                                    <button class="btn-primary" id="quick-join-general">
                                        <i class="fas fa-hashtag"></i> Join #general
                                    </button>
                                    <button class="btn-secondary" id="quick-create-room">
                                        <i class="fas fa-plus"></i> Create Room
                                    </button>
                                </div>
                                <div class="irc-commands">
                                    <h3>IRC Commands</h3>
                                    <code>/join #roomname</code> - Join a room<br>
                                    <code>/msg username message</code> - Send DM<br>
                                    <code>/list</code> - List rooms<br>
                                    <code>/help</code> - Show all commands
                                </div>
                            </div>
                        </div>

                        <!-- Active Chat -->
                        <div class="chat-active hidden" id="chat-active">
                            <!-- Chat Header Info -->
                            <div class="chat-info">
                                <div class="chat-info-left">
                                    <h3 id="chat-current-name">#general</h3>
                                    <p id="chat-current-desc">General discussion</p>
                                </div>
                                <div class="chat-info-right">
                                    <button class="chat-btn" id="toggle-users-btn" title="Toggle User List">
                                        <i class="fas fa-users"></i>
                                        <span id="user-count">0</span>
                                    </button>
                                    <button class="chat-btn" id="room-settings-btn" title="Room Settings">
                                        <i class="fas fa-cog"></i>
                                    </button>
                                </div>
                            </div>

                            <!-- Messages Container -->
                            <div class="messages-container" id="messages-container">
                                <div class="messages-list" id="messages-list">
                                    <!-- Messages will be populated here -->
                                </div>

                                <!-- Typing Indicator -->
                                <div class="typing-indicator hidden" id="typing-indicator">
                                    <span class="typing-dots">
                                        <span></span><span></span><span></span>
                                    </span>
                                    <span class="typing-text">Someone is typing...</span>
                                </div>
                            </div>

                            <!-- File Preview Area -->
                            <div class="file-preview hidden" id="file-preview">
                                <div class="file-preview-content">
                                    <button class="file-preview-close">&times;</button>
                                    <div class="file-preview-info">
                                        <i class="fas fa-file"></i>
                                        <span id="file-preview-name">file.txt</span>
                                        <span id="file-preview-size">0 KB</span>
                                    </div>
                                    <label class="encrypt-checkbox">
                                        <input type="checkbox" id="file-encrypt-check" checked>
                                        <i class="fas fa-lock"></i> Encrypt file
                                    </label>
                                </div>
                            </div>

                            <!-- Message Input Area -->
                            <div class="message-input-area">
                                <div class="message-input-wrapper">
                                    <button class="input-btn" id="attach-file-btn" title="Attach file">
                                        <i class="fas fa-paperclip"></i>
                                    </button>
                                    <button class="input-btn" id="camera-btn" title="Security Camera">
                                        <i class="fas fa-video"></i>
                                    </button>
                                    <input type="file" id="file-input" style="display: none;" multiple>
                                    <input
                                        type="text"
                                        id="message-input"
                                        placeholder="Type a message... (or IRC command starting with /)"
                                        autocomplete="off"
                                    >
                                    <button class="input-btn" id="emoji-btn" title="Emoji">
                                        <i class="fas fa-smile"></i>
                                    </button>
                                    <button class="input-btn-primary" id="send-message-btn">
                                        <i class="fas fa-paper-plane"></i>
                                    </button>
                                </div>
                            </div>
                        </div>

                        <!-- User List Sidebar -->
                        <div class="user-list-sidebar hidden" id="user-list-sidebar">
                            <div class="user-list-header">
                                <h4>Members</h4>
                            </div>
                            <div class="user-list" id="user-list">
                                <!-- Users will be populated here -->
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Floating Chat Button (when minimized) -->
            <button class="chat-float-btn hidden" id="chat-float-btn">
                <i class="fas fa-comments"></i>
                <span class="float-badge hidden">0</span>
            </button>
        `;

        document.body.appendChild(chatContainer);

        // Store element references
        this.elements.chatContainer = chatContainer;
        this.elements.messageInput = document.getElementById('message-input');
        this.elements.messageList = document.getElementById('messages-list');
        this.elements.roomList = document.getElementById('room-list');
        this.elements.dmList = document.getElementById('dm-list');
        this.elements.userList = document.getElementById('user-list');
        this.elements.chatWelcome = document.getElementById('chat-welcome');
        this.elements.chatActive = document.getElementById('chat-active');
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Send message
        document.getElementById('send-message-btn')?.addEventListener('click', () => {
            this.sendMessage();
        });

        // Enter key to send
        this.elements.messageInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Tab switching
        document.querySelectorAll('.chat-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.currentTarget.dataset.tab;
                this.switchTab(tabName);
            });
        });

        // Close/minimize chat
        document.getElementById('chat-close-btn')?.addEventListener('click', () => {
            this.hideChat();
        });

        document.getElementById('chat-minimize-btn')?.addEventListener('click', () => {
            this.minimizeChat();
        });

        // Float button
        document.getElementById('chat-float-btn')?.addEventListener('click', () => {
            this.showChat();
        });

        // File attachment
        document.getElementById('attach-file-btn')?.addEventListener('click', () => {
            document.getElementById('file-input')?.click();
        });

        document.getElementById('file-input')?.addEventListener('change', (e) => {
            this.handleFileSelect(e);
        });

        // Camera/security feed
        document.getElementById('camera-btn')?.addEventListener('click', () => {
            this.showSecurityCamera();
        });

        // Create room
        document.getElementById('create-room-btn')?.addEventListener('click', () => {
            this.showCreateRoomDialog();
        });

        // New DM
        document.getElementById('new-dm-btn')?.addEventListener('click', () => {
            this.showNewDMDialog();
        });

        // Toggle user list
        document.getElementById('toggle-users-btn')?.addEventListener('click', () => {
            this.toggleUserList();
        });

        // Mesh network toggle
        document.getElementById('mesh-toggle-btn')?.addEventListener('click', () => {
            this.toggleMeshNetwork();
        });

        // Quick actions
        document.getElementById('quick-join-general')?.addEventListener('click', () => {
            this.quickJoinGeneral();
        });

        document.getElementById('quick-create-room')?.addEventListener('click', () => {
            this.showCreateRoomDialog();
        });
    }

    /**
     * Send message
     */
    async sendMessage() {
        const input = this.elements.messageInput;
        const message = input.value.trim();

        if (!message) return;

        try {
            // Check if it's a command
            const parsed = await this.chatSystem.parseCommand(message);

            if (parsed.type === 'command') {
                await this.chatSystem.executeCommand(parsed);

                if (parsed.action === 'help') {
                    this.showHelpMessage(this.chatSystem.getHelpText());
                }
            } else if (parsed.type === 'message') {
                // Send regular message
                if (this.currentView === 'room' && this.chatSystem.currentRoom) {
                    await this.chatSystem.sendRoomMessage(message, false);
                } else if (this.currentView === 'dm' && this.chatSystem.currentDM) {
                    // Extract recipient from currentDM
                    const participants = this.chatSystem.currentDM.split('_');
                    const recipientId = participants.find(id => id !== this.chatSystem.currentUser.uid);
                    await this.chatSystem.sendDirectMessage(recipientId, message);
                }
            } else {
                this.showError('Unknown command. Type /help for available commands.');
            }

            // Clear input
            input.value = '';

        } catch (error) {
            console.error('[UI] Failed to send message:', error);
            this.showError(error.message || 'Failed to send message');
        }
    }

    /**
     * Render room list
     */
    renderRooms(rooms) {
        if (!this.elements.roomList) return;

        this.elements.roomList.innerHTML = '';

        if (rooms.length === 0) {
            this.elements.roomList.innerHTML = '<p class="empty-message">No rooms available</p>';
            return;
        }

        rooms.forEach(room => {
            const roomItem = document.createElement('div');
            roomItem.className = 'room-item';
            if (this.chatSystem.currentRoom === room.id) {
                roomItem.classList.add('active');
            }

            roomItem.innerHTML = `
                <div class="room-icon">
                    <i class="fas fa-${room.type === 'private' ? 'lock' : 'hashtag'}"></i>
                </div>
                <div class="room-info">
                    <div class="room-name">${room.name}</div>
                    <div class="room-meta">${room.members?.length || 0} members</div>
                </div>
            `;

            roomItem.addEventListener('click', () => {
                this.joinRoom(room.id, room.name);
            });

            this.elements.roomList.appendChild(roomItem);
        });
    }

    /**
     * Render messages
     */
    renderMessages(messages, type, id) {
        if (!this.elements.messageList) return;

        this.elements.messageList.innerHTML = '';

        messages.forEach(msg => {
            const messageDiv = document.createElement('div');
            messageDiv.className = 'message';

            if (msg.senderId === this.chatSystem.currentUser?.uid) {
                messageDiv.classList.add('message-own');
            }

            if (msg.type === 'system') {
                messageDiv.classList.add('message-system');
                messageDiv.innerHTML = `
                    <div class="message-content">
                        <i class="fas fa-info-circle"></i>
                        ${this.escapeHTML(msg.message)}
                    </div>
                `;
            } else {
                const timestamp = msg.timestamp?.toDate ?
                    msg.timestamp.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) :
                    'Now';

                messageDiv.innerHTML = `
                    <div class="message-avatar">
                        <i class="fas fa-user-circle"></i>
                    </div>
                    <div class="message-body">
                        <div class="message-header">
                            <span class="message-author">${this.escapeHTML(msg.senderName)}</span>
                            <span class="message-time">${timestamp}</span>
                            ${msg.encrypted ? '<i class="fas fa-lock" title="Encrypted"></i>' : ''}
                        </div>
                        <div class="message-content">${this.escapeHTML(msg.message)}</div>
                    </div>
                `;
            }

            this.elements.messageList.appendChild(messageDiv);
        });

        // Scroll to bottom
        this.elements.messageList.parentElement.scrollTop =
            this.elements.messageList.parentElement.scrollHeight;
    }

    /**
     * Join room
     */
    async joinRoom(roomId, roomName) {
        try {
            await this.chatSystem.joinRoom(roomId);
            this.showChatArea(roomName, 'room');
        } catch (error) {
            this.showError('Failed to join room: ' + error.message);
        }
    }

    /**
     * Show chat area
     */
    showChatArea(name, type) {
        this.currentView = type;
        this.elements.chatWelcome?.classList.add('hidden');
        this.elements.chatActive?.classList.remove('hidden');

        document.getElementById('chat-current-name').textContent =
            type === 'room' ? '#' + name : name;
    }

    /**
     * Show/hide chat
     */
    showChat() {
        this.elements.chatContainer?.classList.remove('hidden');
        document.getElementById('chat-float-btn')?.classList.add('hidden');
    }

    hideChat() {
        this.elements.chatContainer?.classList.add('hidden');
    }

    minimizeChat() {
        this.elements.chatContainer?.classList.add('hidden');
        document.getElementById('chat-float-btn')?.classList.remove('hidden');
    }

    /**
     * Switch tabs
     */
    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.chat-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });

        // Update panels
        document.querySelectorAll('.chat-panel').forEach(panel => {
            panel.classList.toggle('active', panel.dataset.panel === tabName);
        });
    }

    /**
     * Toggle user list
     */
    toggleUserList() {
        document.getElementById('user-list-sidebar')?.classList.toggle('hidden');
    }

    /**
     * Show create room dialog
     */
    showCreateRoomDialog() {
        const roomName = prompt('Enter room name:');
        if (!roomName) return;

        const isPrivate = confirm('Make this a private room?');
        const type = isPrivate ? 'private' : 'public';

        this.chatSystem.createRoom(roomName, type)
            .then(() => {
                this.showSuccess(`Room #${roomName} created!`);
            })
            .catch(error => {
                this.showError('Failed to create room: ' + error.message);
            });
    }

    /**
     * Show new DM dialog
     */
    showNewDMDialog() {
        const username = prompt('Enter username to message:');
        if (!username) return;

        this.chatSystem.sendDirectMessageByUsername(username, '')
            .catch(error => {
                this.showError('User not found: ' + username);
            });
    }

    /**
     * Handle file selection
     */
    handleFileSelect(event) {
        const files = event.target.files;
        if (files.length === 0) return;

        const filePreview = document.getElementById('file-preview');
        const fileName = document.getElementById('file-preview-name');
        const fileSize = document.getElementById('file-preview-size');

        fileName.textContent = files[0].name;
        fileSize.textContent = this.formatFileSize(files[0].size);
        filePreview?.classList.remove('hidden');

        // TODO: Implement file upload with encryption
    }

    /**
     * Toggle mesh network
     */
    async toggleMeshNetwork() {
        const btn = document.getElementById('mesh-toggle-btn');
        const meshInfo = document.getElementById('mesh-info');

        if (btn.textContent.includes('Enable')) {
            try {
                // Request Bluetooth access
                const device = await navigator.bluetooth.requestDevice({
                    acceptAllDevices: true,
                    optionalServices: ['battery_service']
                });

                btn.textContent = 'Disable Mesh Mode';
                btn.classList.add('active');
                meshInfo?.classList.remove('hidden');

                this.showSuccess('Bluetooth Mesh Network enabled!');
            } catch (error) {
                this.showError('Bluetooth not available or permission denied');
            }
        } else {
            btn.textContent = 'Enable Mesh Mode';
            btn.classList.remove('active');
            meshInfo?.classList.add('hidden');
        }
    }

    /**
     * Show security camera feed
     */
    showSecurityCamera() {
        // TODO: Implement security camera integration
        this.showNotification('Security camera integration coming soon!');
    }

    /**
     * Quick join general room
     */
    async quickJoinGeneral() {
        try {
            // Try to find general room or create it
            const generalRoom = Array.from(this.chatSystem.rooms.values())
                .find(r => r.name.toLowerCase() === 'general');

            if (generalRoom) {
                await this.joinRoom(generalRoom.id, 'general');
            } else {
                const roomId = await this.chatSystem.createRoom('general', 'public', 'General discussion');
                await this.joinRoom(roomId, 'general');
            }
        } catch (error) {
            this.showError('Failed to join general room');
        }
    }

    /**
     * Utility functions
     */
    escapeHTML(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showHelpMessage(helpText) {
        const helpDiv = document.createElement('div');
        helpDiv.className = 'message message-system';
        helpDiv.innerHTML = `
            <div class="message-content">
                <pre>${this.escapeHTML(helpText)}</pre>
            </div>
        `;
        this.elements.messageList?.appendChild(helpDiv);
    }

    showNotification(message, type = 'info') {
        // Use existing toast system
        const event = new CustomEvent('showToast', {
            detail: { message, type }
        });
        window.dispatchEvent(event);
    }
}

export default ChatUI;
