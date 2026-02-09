/**
 * API Integration Dashboard
 * Provides API endpoints, webhooks, and integration capabilities
 * For CloudConnect, Glytch, and GoHighLevel integration
 */

import { getFirestore, collection, addDoc, onSnapshot, doc, getDoc, updateDoc, query, where, orderBy, serverTimestamp, setDoc, deleteDoc } from "firebase/firestore";

export class APIDashboard {
    constructor(db, currentUser) {
        this.db = db;
        this.currentUser = currentUser;
        this.apiKeys = new Map();
        this.webhooks = new Map();
        this.integrations = new Map();
        this.isOpen = false;
    }

    /**
     * Initialize API dashboard
     */
    async initialize() {
        try {
            await this.loadAPIKeys();
            await this.loadWebhooks();
            await this.loadIntegrations();

            this.createDashboardUI();
            console.log('[API] Dashboard initialized');
        } catch (error) {
            console.error('[API] Failed to initialize dashboard:', error);
        }
    }

    /**
     * Create dashboard UI
     */
    createDashboardUI() {
        const dashboard = document.createElement('div');
        dashboard.id = 'api-dashboard';
        dashboard.className = 'api-dashboard hidden';

        dashboard.innerHTML = `
            <div class="api-dashboard-wrapper">
                <div class="api-dashboard-header">
                    <h2><i class="fas fa-plug"></i> API Integration Dashboard</h2>
                    <button class="api-close-btn" id="api-close-btn">
                        <i class="fas fa-times"></i>
                    </button>
                </div>

                <div class="api-dashboard-body">
                    <!-- Navigation Tabs -->
                    <div class="api-tabs">
                        <button class="api-tab active" data-tab="overview">
                            <i class="fas fa-chart-line"></i> Overview
                        </button>
                        <button class="api-tab" data-tab="keys">
                            <i class="fas fa-key"></i> API Keys
                        </button>
                        <button class="api-tab" data-tab="webhooks">
                            <i class="fas fa-webhook"></i> Webhooks
                        </button>
                        <button class="api-tab" data-tab="integrations">
                            <i class="fas fa-puzzle-piece"></i> Integrations
                        </button>
                        <button class="api-tab" data-tab="docs">
                            <i class="fas fa-book"></i> API Docs
                        </button>
                    </div>

                    <!-- Overview Panel -->
                    <div class="api-panel active" data-panel="overview">
                        <div class="api-stats-grid">
                            <div class="api-stat-card">
                                <div class="stat-icon"><i class="fas fa-exchange-alt"></i></div>
                                <div class="stat-info">
                                    <div class="stat-value" id="api-requests-count">0</div>
                                    <div class="stat-label">API Requests Today</div>
                                </div>
                            </div>
                            <div class="api-stat-card">
                                <div class="stat-icon"><i class="fas fa-key"></i></div>
                                <div class="stat-info">
                                    <div class="stat-value" id="api-keys-count">0</div>
                                    <div class="stat-label">Active API Keys</div>
                                </div>
                            </div>
                            <div class="api-stat-card">
                                <div class="stat-icon"><i class="fas fa-webhook"></i></div>
                                <div class="stat-info">
                                    <div class="stat-value" id="webhooks-count">0</div>
                                    <div class="stat-label">Active Webhooks</div>
                                </div>
                            </div>
                            <div class="api-stat-card">
                                <div class="stat-icon"><i class="fas fa-plug"></i></div>
                                <div class="stat-info">
                                    <div class="stat-value" id="integrations-count">0</div>
                                    <div class="stat-label">Connected Integrations</div>
                                </div>
                            </div>
                        </div>

                        <div class="api-quick-actions">
                            <h3>Quick Actions</h3>
                            <div class="action-buttons">
                                <button class="btn-action" onclick="window.apiDashboard.createAPIKey()">
                                    <i class="fas fa-plus"></i> Create API Key
                                </button>
                                <button class="btn-action" onclick="window.apiDashboard.addWebhook()">
                                    <i class="fas fa-webhook"></i> Add Webhook
                                </button>
                                <button class="btn-action" onclick="window.apiDashboard.connectIntegration()">
                                    <i class="fas fa-puzzle-piece"></i> Connect Integration
                                </button>
                            </div>
                        </div>

                        <div class="api-integrations-showcase">
                            <h3>Available Integrations</h3>
                            <div class="integrations-grid">
                                <div class="integration-card" data-integration="gohighlevel">
                                    <img src="https://via.placeholder.com/100x40?text=GHL" alt="GoHighLevel">
                                    <h4>GoHighLevel</h4>
                                    <p>CRM & Marketing Automation</p>
                                    <button class="btn-connect">Connect</button>
                                </div>
                                <div class="integration-card" data-integration="cloudconnect">
                                    <img src="https://via.placeholder.com/100x40?text=CloudConnect" alt="CloudConnect">
                                    <h4>CloudConnect</h4>
                                    <p>Resource Management Platform</p>
                                    <button class="btn-connect">Connect</button>
                                </div>
                                <div class="integration-card" data-integration="glytch">
                                    <img src="https://via.placeholder.com/100x40?text=Glytch" alt="Glytch">
                                    <h4>Glytch Toolshed</h4>
                                    <p>Developer Tools & Utilities</p>
                                    <button class="btn-connect">Connect</button>
                                </div>
                                <div class="integration-card" data-integration="zapier">
                                    <img src="https://via.placeholder.com/100x40?text=Zapier" alt="Zapier">
                                    <h4>Zapier</h4>
                                    <p>Workflow Automation</p>
                                    <button class="btn-connect">Connect</button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- API Keys Panel -->
                    <div class="api-panel" data-panel="keys">
                        <div class="panel-header">
                            <h3>API Keys</h3>
                            <button class="btn-primary" onclick="window.apiDashboard.createAPIKey()">
                                <i class="fas fa-plus"></i> Create New Key
                            </button>
                        </div>
                        <div class="api-keys-list" id="api-keys-list">
                            <p class="empty-message">No API keys yet. Create one to get started.</p>
                        </div>
                    </div>

                    <!-- Webhooks Panel -->
                    <div class="api-panel" data-panel="webhooks">
                        <div class="panel-header">
                            <h3>Webhooks</h3>
                            <button class="btn-primary" onclick="window.apiDashboard.addWebhook()">
                                <i class="fas fa-plus"></i> Add Webhook
                            </button>
                        </div>
                        <div class="webhooks-list" id="webhooks-list">
                            <p class="empty-message">No webhooks configured. Add one to receive real-time events.</p>
                        </div>
                    </div>

                    <!-- Integrations Panel -->
                    <div class="api-panel" data-panel="integrations">
                        <div class="panel-header">
                            <h3>Connected Integrations</h3>
                        </div>
                        <div class="integrations-list" id="integrations-list">
                            <p class="empty-message">No integrations connected yet.</p>
                        </div>
                    </div>

                    <!-- API Docs Panel -->
                    <div class="api-panel" data-panel="docs">
                        <div class="api-docs">
                            <h3>API Documentation</h3>

                            <div class="doc-section">
                                <h4>Authentication</h4>
                                <p>All API requests require an API key in the header:</p>
                                <pre><code>Authorization: Bearer YOUR_API_KEY</code></pre>
                            </div>

                            <div class="doc-section">
                                <h4>Endpoints</h4>

                                <div class="endpoint">
                                    <div class="endpoint-header">
                                        <span class="method get">GET</span>
                                        <span class="path">/api/v1/resources</span>
                                    </div>
                                    <p>Get all resources</p>
                                    <pre><code>GET /api/v1/resources?lat=26.72&lng=-81.89&radius=5</code></pre>
                                </div>

                                <div class="endpoint">
                                    <div class="endpoint-header">
                                        <span class="method post">POST</span>
                                        <span class="path">/api/v1/resources</span>
                                    </div>
                                    <p>Create a new resource</p>
                                    <pre><code>{
  "name": "Resource Name",
  "type": "Food Drive",
  "location": {"lat": 26.72, "lng": -81.89},
  "description": "Description here"
}</code></pre>
                                </div>

                                <div class="endpoint">
                                    <div class="endpoint-header">
                                        <span class="method post">POST</span>
                                        <span class="path">/api/v1/chat/message</span>
                                    </div>
                                    <p>Send a message via API</p>
                                    <pre><code>{
  "roomId": "room_id",
  "message": "Your message",
  "encrypted": false
}</code></pre>
                                </div>

                                <div class="endpoint">
                                    <div class="endpoint-header">
                                        <span class="method get">GET</span>
                                        <span class="path">/api/v1/user/profile</span>
                                    </div>
                                    <p>Get user profile information</p>
                                </div>
                            </div>

                            <div class="doc-section">
                                <h4>Webhooks</h4>
                                <p>Subscribe to events:</p>
                                <ul>
                                    <li><code>resource.created</code> - New resource added</li>
                                    <li><code>resource.updated</code> - Resource modified</li>
                                    <li><code>resource.verified</code> - Resource verified</li>
                                    <li><code>chat.message</code> - New chat message</li>
                                    <li><code>user.joined</code> - New user registered</li>
                                </ul>
                            </div>

                            <div class="doc-section">
                                <h4>Rate Limits</h4>
                                <p>API rate limits:</p>
                                <ul>
                                    <li>Free tier: 1,000 requests/day</li>
                                    <li>Pro tier: 10,000 requests/day</li>
                                    <li>Enterprise: Unlimited</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(dashboard);

        // Setup event listeners
        this.setupEventListeners();

        // Make accessible globally
        window.apiDashboard = this;
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Close button
        document.getElementById('api-close-btn')?.addEventListener('click', () => {
            this.hide();
        });

        // Tab switching
        document.querySelectorAll('.api-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.currentTarget.dataset.tab;
                this.switchTab(tabName);
            });
        });

        // Integration connect buttons
        document.querySelectorAll('.integration-card .btn-connect').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const card = e.target.closest('.integration-card');
                const integration = card.dataset.integration;
                this.connectIntegration(integration);
            });
        });
    }

    /**
     * Switch tabs
     */
    switchTab(tabName) {
        document.querySelectorAll('.api-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });

        document.querySelectorAll('.api-panel').forEach(panel => {
            panel.classList.toggle('active', panel.dataset.panel === tabName);
        });
    }

    /**
     * Show dashboard
     */
    show() {
        document.getElementById('api-dashboard')?.classList.remove('hidden');
        this.isOpen = true;
    }

    /**
     * Hide dashboard
     */
    hide() {
        document.getElementById('api-dashboard')?.classList.add('hidden');
        this.isOpen = false;
    }

    /**
     * Create API key
     */
    async createAPIKey() {
        const name = prompt('Enter a name for this API key:');
        if (!name) return;

        try {
            const apiKey = this.generateAPIKey();

            await addDoc(collection(this.db, 'apiKeys'), {
                userId: this.currentUser.uid,
                name: name,
                key: apiKey,
                createdAt: serverTimestamp(),
                lastUsed: null,
                requestCount: 0,
                active: true
            });

            alert(`API Key created!\n\nKey: ${apiKey}\n\nSave this key securely - it won't be shown again.`);

            await this.loadAPIKeys();
        } catch (error) {
            console.error('[API] Failed to create key:', error);
            alert('Failed to create API key');
        }
    }

    /**
     * Generate API key
     */
    generateAPIKey() {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return 'glytch_' + Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }

    /**
     * Add webhook
     */
    async addWebhook() {
        const url = prompt('Enter webhook URL:');
        if (!url) return;

        const events = prompt('Enter events to subscribe to (comma-separated):\nresource.created, resource.updated, chat.message, etc.');
        if (!events) return;

        try {
            await addDoc(collection(this.db, 'webhooks'), {
                userId: this.currentUser.uid,
                url: url,
                events: events.split(',').map(e => e.trim()),
                createdAt: serverTimestamp(),
                active: true,
                lastTriggered: null,
                deliveryCount: 0
            });

            alert('Webhook added successfully!');
            await this.loadWebhooks();
        } catch (error) {
            console.error('[API] Failed to add webhook:', error);
            alert('Failed to add webhook');
        }
    }

    /**
     * Connect integration
     */
    async connectIntegration(integrationType = null) {
        const type = integrationType || prompt('Enter integration type (gohighlevel, cloudconnect, glytch, zapier):');
        if (!type) return;

        const apiKey = prompt(`Enter your ${type.toUpperCase()} API key:`);
        if (!apiKey) return;

        try {
            await addDoc(collection(this.db, 'integrations'), {
                userId: this.currentUser.uid,
                type: type,
                apiKey: apiKey,
                connectedAt: serverTimestamp(),
                active: true,
                syncEnabled: true
            });

            alert(`${type} integration connected successfully!`);
            await this.loadIntegrations();
        } catch (error) {
            console.error('[API] Failed to connect integration:', error);
            alert('Failed to connect integration');
        }
    }

    /**
     * Load API keys
     */
    async loadAPIKeys() {
        const keysRef = collection(this.db, 'apiKeys');
        const q = query(keysRef, where('userId', '==', this.currentUser.uid));

        onSnapshot(q, (snapshot) => {
            this.apiKeys.clear();
            snapshot.forEach(doc => {
                this.apiKeys.set(doc.id, { id: doc.id, ...doc.data() });
            });

            this.renderAPIKeys();
            this.updateStats();
        });
    }

    /**
     * Load webhooks
     */
    async loadWebhooks() {
        const webhooksRef = collection(this.db, 'webhooks');
        const q = query(webhooksRef, where('userId', '==', this.currentUser.uid));

        onSnapshot(q, (snapshot) => {
            this.webhooks.clear();
            snapshot.forEach(doc => {
                this.webhooks.set(doc.id, { id: doc.id, ...doc.data() });
            });

            this.renderWebhooks();
            this.updateStats();
        });
    }

    /**
     * Load integrations
     */
    async loadIntegrations() {
        const integrationsRef = collection(this.db, 'integrations');
        const q = query(integrationsRef, where('userId', '==', this.currentUser.uid));

        onSnapshot(q, (snapshot) => {
            this.integrations.clear();
            snapshot.forEach(doc => {
                this.integrations.set(doc.id, { id: doc.id, ...doc.data() });
            });

            this.renderIntegrations();
            this.updateStats();
        });
    }

    /**
     * Render API keys
     */
    renderAPIKeys() {
        const list = document.getElementById('api-keys-list');
        if (!list) return;

        if (this.apiKeys.size === 0) {
            list.innerHTML = '<p class="empty-message">No API keys yet. Create one to get started.</p>';
            return;
        }

        list.innerHTML = '';
        this.apiKeys.forEach(key => {
            const keyItem = document.createElement('div');
            keyItem.className = 'api-key-item';
            keyItem.innerHTML = `
                <div class="key-info">
                    <h4>${key.name}</h4>
                    <code>${key.key.substring(0, 20)}...</code>
                    <p class="key-meta">Created: ${key.createdAt?.toDate().toLocaleDateString() || 'N/A'} | Requests: ${key.requestCount || 0}</p>
                </div>
                <div class="key-actions">
                    <button class="btn-icon" onclick="window.apiDashboard.copyKey('${key.key}')" title="Copy">
                        <i class="fas fa-copy"></i>
                    </button>
                    <button class="btn-icon danger" onclick="window.apiDashboard.deleteKey('${key.id}')" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            list.appendChild(keyItem);
        });
    }

    /**
     * Render webhooks
     */
    renderWebhooks() {
        const list = document.getElementById('webhooks-list');
        if (!list) return;

        if (this.webhooks.size === 0) {
            list.innerHTML = '<p class="empty-message">No webhooks configured.</p>';
            return;
        }

        list.innerHTML = '';
        this.webhooks.forEach(webhook => {
            const item = document.createElement('div');
            item.className = 'webhook-item';
            item.innerHTML = `
                <div class="webhook-info">
                    <h4>${webhook.url}</h4>
                    <p>Events: ${webhook.events.join(', ')}</p>
                    <p class="webhook-meta">Deliveries: ${webhook.deliveryCount || 0}</p>
                </div>
                <div class="webhook-actions">
                    <button class="btn-icon danger" onclick="window.apiDashboard.deleteWebhook('${webhook.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            list.appendChild(item);
        });
    }

    /**
     * Render integrations
     */
    renderIntegrations() {
        const list = document.getElementById('integrations-list');
        if (!list) return;

        if (this.integrations.size === 0) {
            list.innerHTML = '<p class="empty-message">No integrations connected yet.</p>';
            return;
        }

        list.innerHTML = '';
        this.integrations.forEach(integration => {
            const item = document.createElement('div');
            item.className = 'integration-item';
            item.innerHTML = `
                <div class="integration-info">
                    <h4>${integration.type}</h4>
                    <p>Connected: ${integration.connectedAt?.toDate().toLocaleDateString() || 'N/A'}</p>
                    <span class="status-badge ${integration.active ? 'active' : 'inactive'}">
                        ${integration.active ? 'Active' : 'Inactive'}
                    </span>
                </div>
                <div class="integration-actions">
                    <button class="btn-icon danger" onclick="window.apiDashboard.disconnectIntegration('${integration.id}')">
                        <i class="fas fa-unlink"></i> Disconnect
                    </button>
                </div>
            `;
            list.appendChild(item);
        });
    }

    /**
     * Update stats
     */
    updateStats() {
        document.getElementById('api-keys-count').textContent = this.apiKeys.size;
        document.getElementById('webhooks-count').textContent = this.webhooks.size;
        document.getElementById('integrations-count').textContent = this.integrations.size;
    }

    /**
     * Copy API key
     */
    copyKey(key) {
        navigator.clipboard.writeText(key).then(() => {
            alert('API key copied to clipboard!');
        });
    }

    /**
     * Delete API key
     */
    async deleteKey(keyId) {
        if (!confirm('Are you sure you want to delete this API key?')) return;

        try {
            await deleteDoc(doc(this.db, 'apiKeys', keyId));
            await this.loadAPIKeys();
        } catch (error) {
            console.error('[API] Failed to delete key:', error);
        }
    }

    /**
     * Delete webhook
     */
    async deleteWebhook(webhookId) {
        if (!confirm('Are you sure you want to delete this webhook?')) return;

        try {
            await deleteDoc(doc(this.db, 'webhooks', webhookId));
            await this.loadWebhooks();
        } catch (error) {
            console.error('[API] Failed to delete webhook:', error);
        }
    }

    /**
     * Disconnect integration
     */
    async disconnectIntegration(integrationId) {
        if (!confirm('Are you sure you want to disconnect this integration?')) return;

        try {
            await deleteDoc(doc(this.db, 'integrations', integrationId));
            await this.loadIntegrations();
        } catch (error) {
            console.error('[API] Failed to disconnect integration:', error);
        }
    }
}

export default APIDashboard;
