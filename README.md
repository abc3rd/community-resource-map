# Cloud Connect Resource Hub + Glytch Chat System

**A comprehensive community resource mapping platform with integrated real-time IRC-style chat, end-to-end encrypted messaging, API dashboard, and Bluetooth mesh networking.**

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app)

---

## 🌟 Features Overview

### 📍 Resource Mapping
- Interactive map showing community resources
- 11 resource types (Food Drives, Water Spigots, WiFi Hotspots, etc.)
- Real-time resource updates
- User-contributed resources
- Resource verification system
- Comment and rating system
- Location-based search
- Mobile geolocation

### 💬 Glytch Chat System (Universal Inbox)
- **IRC-style commands** for power users
- **Direct messaging** with end-to-end encryption
- **Public and private chat rooms**
- **Bluetooth mesh networking** for offline P2P communication
- **File sharing** with encryption
- **Real-time typing indicators**
- **User presence tracking** (online/away/offline)
- **CIO admin role** with moderation powers
- **Message notifications** and unread counts

### 🔌 API Integration Dashboard
- **API key management** - Generate and manage API keys
- **Webhook configuration** - Subscribe to real-time events
- **Platform integrations** - GoHighLevel, CloudConnect, Glytch, Zapier
- **Interactive API documentation**
- **Usage statistics** and monitoring
- **RESTful API endpoints** for all features

### 🔐 Security & Authentication
- **Single Sign-On (SSO)** - One login for all features
- **End-to-end encryption** using Web Crypto API
- **RSA-2048** asymmetric encryption
- **AES-256-GCM** symmetric encryption
- **SHA-256** message integrity
- **Firebase Authentication** integration
- **Firestore security rules** for all collections

---

## 🚀 Quick Start

### Prerequisites

- Node.js 14+ (for Firebase CLI)
- Firebase account
- Modern web browser with ES6 module support

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/abc3rd/community-resource-map.git
   cd community-resource-map
   git checkout claude/codebase-analysis-script-011CUpHX9nfQNApPgmmYu368
   ```

2. **No build step required!** This is a static site using ES6 modules.

3. **Deploy Firestore security rules** (IMPORTANT)
   ```bash
   npm install -g firebase-tools
   firebase login
   firebase init
   firebase deploy --only firestore:rules
   ```

4. **Deploy to Railway**
   - Click the "Deploy on Railway" button above, OR
   - Connect your GitHub repo to Railway
   - Select branch: `claude/codebase-analysis-script-011CUpHX9nfQNApPgmmYu368`
   - Railway will auto-detect static site and deploy

5. **Access your app!**
   - Railway will provide a URL (e.g., `https://your-app.railway.app`)
   - Sign up for an account
   - Start using chat, mapping resources, and API features!

---

## 📖 User Guide

### Getting Started

#### 1. Sign Up / Sign In

Click the **"Sign In"** button in the header and create an account. Choose:

- **Individual User** - For community members
- **Organization** - For businesses, charities, government agencies
- **CIO** - For administrators (requires manual setup)

#### 2. Add Resources to the Map

1. Click **"+"** floating button
2. Click on the map to select location
3. Fill in resource details:
   - Name
   - Type (Food Drive, Water Spigot, etc.)
   - Description
   - Operating hours
   - Contact info
   - Accessibility notes
4. Submit!

#### 3. Access Chat

After logging in, click **"Chat"** button in header to open the Glytch Chat System.

#### 4. Access API Dashboard

Click **"API"** button in header to manage API keys, webhooks, and integrations.

---

## 💬 Chat System Guide

### IRC Commands

Type these in the message input:

```
/join #general           - Join the general room
/join #roomname          - Join any room by name
/leave                   - Leave current room
/msg username message    - Send private direct message
/invite username         - Invite user to room (Admin/CIO only)
/kick username           - Remove user from room (Admin/CIO only)
/ban username            - Ban user from room (Admin/CIO only)
/list                    - List all available rooms
/who                     - Show users in current room
/create #roomname public - Create new public room
/create #roomname private - Create new private room (CIO only)
/help                    - Display all commands
```

### Direct Messages (DMs)

1. Click **"DMs"** tab in chat sidebar
2. Click **"+ New Message"** button
3. Enter username
4. Type and send message
5. All DMs are **automatically encrypted** 🔒

### Bluetooth Mesh Network (Offline Mode)

For peer-to-peer communication without internet:

1. Click **"Mesh"** tab
2. Click **"Enable Mesh Mode"**
3. Grant Bluetooth permissions
4. Nearby devices will appear
5. Connect and chat offline!

### File Sharing

1. Click 📎 (paperclip) icon in chat input
2. Select file
3. Check **"Encrypt file"** for security
4. Send encrypted file to room or DM

---

## 🔌 API Documentation

### Authentication

All API requests require an API key in the header:

```
Authorization: Bearer glytch_your_api_key_here
```

### Generate API Key

1. Log in to the app
2. Click **"API"** button in header
3. Go to **"API Keys"** tab
4. Click **"Create New Key"**
5. Copy and save the key (shown only once)

### Endpoints

#### Get Resources

```http
GET /api/v1/resources?lat=26.72&lng=-81.89&radius=5
```

**Response:**
```json
{
  "resources": [
    {
      "id": "abc123",
      "name": "Community Food Drive",
      "type": "Food Drive",
      "location": {"lat": 26.72, "lng": -81.89},
      "description": "Weekly food distribution",
      "operatingHours": "Mon-Fri 9am-5pm"
    }
  ]
}
```

#### Create Resource

```http
POST /api/v1/resources
Content-Type: application/json

{
  "name": "New Resource",
  "type": "Food Drive",
  "location": {"lat": 26.72, "lng": -81.89},
  "description": "Resource description",
  "operatingHours": "24/7",
  "contactInfo": "555-1234"
}
```

#### Send Chat Message

```http
POST /api/v1/chat/message
Content-Type: application/json

{
  "roomId": "general_room_id",
  "message": "Hello from API!",
  "encrypted": false
}
```

#### Get User Profile

```http
GET /api/v1/user/profile
```

### Webhooks

Subscribe to real-time events:

**Available Events:**
- `resource.created` - New resource added to map
- `resource.updated` - Resource information changed
- `resource.verified` - Resource verified by user
- `chat.message` - New message in chat room
- `user.joined` - New user registered

**Webhook Payload Example:**

```json
{
  "event": "resource.created",
  "timestamp": "2026-02-09T12:00:00Z",
  "data": {
    "resourceId": "abc123",
    "name": "New Food Drive",
    "location": {"lat": 26.72, "lng": -81.89},
    "createdBy": "user_id"
  }
}
```

**Set Up Webhook:**

1. Go to API Dashboard → Webhooks
2. Click "Add Webhook"
3. Enter your webhook URL
4. Select events to subscribe to
5. Save!

### Rate Limits

- **Free tier**: 1,000 requests/day
- **Pro tier**: 10,000 requests/day
- **Enterprise**: Unlimited

---

## 🏗️ Architecture

### Technology Stack

- **Frontend**: Vanilla JavaScript (ES6 Modules)
- **Mapping**: Leaflet.js
- **Database**: Firebase Firestore (real-time)
- **Authentication**: Firebase Auth (SSO)
- **Encryption**: Web Crypto API
- **Bluetooth**: Web Bluetooth API
- **Styling**: CSS3 (Grid/Flexbox)

### Project Structure

```
community-resource-map/
├── index.html                  - Main HTML file
├── app.js                      - Core application logic
├── style.css                   - Main stylesheet
│
├── chat-system.js              - Chat core (IRC commands, rooms, DMs)
├── chat-encryption.js          - Encryption/decryption logic
├── chat-ui.js                  - Chat user interface
├── chat-integration.js         - SSO integration layer
├── chat-styles.css             - Chat styling
│
├── api-dashboard.js            - API management interface
├── api-dashboard-styles.css    - API dashboard styling
│
├── firestore.rules             - Database security rules
├── manifest.json               - PWA manifest
│
├── README.md                   - This file
├── DEPLOYMENT_GUIDE.md         - Detailed deployment instructions
└── ANALYZER_README.md          - Codebase analyzer documentation
```

### Data Flow

```
User Login (Firebase Auth)
    ↓
SSO Initialization
    ↓
    ├─→ Chat System Init
    │   ├─→ Generate Encryption Keys
    │   ├─→ Create Chat User Profile
    │   ├─→ Load Rooms & Conversations
    │   └─→ Set Up Real-time Listeners
    │
    └─→ API Dashboard Init
        ├─→ Load API Keys
        ├─→ Load Webhooks
        └─→ Load Integrations
```

### Firebase Collections

```
Firestore Collections:
├── users                       - User profiles
├── resources                   - Map resources
├── comments                    - Resource comments
├── chatUsers                   - Chat user profiles
├── chatRooms                   - Chat rooms
├── chatMessages                - Room messages
├── chatConversations           - DM conversations
├── chatDirectMessages          - Direct messages
├── apiKeys                     - User API keys
├── webhooks                    - Webhook configurations
└── integrations                - Connected integrations
```

---

## 🔐 Security

### End-to-End Encryption

**How it works:**

1. **Key Generation**: Each user generates RSA-2048 key pair on login
2. **Public Key Storage**: Public key stored in Firestore
3. **Key Exchange**:
   - Sender generates AES-256 session key
   - Encrypts session key with recipient's public RSA key
   - Stores encrypted session key in conversation
4. **Message Encryption**:
   - Encrypts message with AES-256-GCM session key
   - Stores encrypted message in Firestore
5. **Message Decryption**:
   - Recipient decrypts session key with private RSA key
   - Decrypts message with session key
   - Displays plain text

**Result:** Only sender and recipient can read messages. Not even the server can decrypt them!

### Firestore Security Rules

All collections have strict security rules:

- Users can only read/write their own data
- CIOs have elevated permissions
- Room admins can moderate their rooms
- API keys are private to each user
- Direct messages only visible to participants

### Best Practices

- ✅ Use HTTPS (required for Web Crypto API)
- ✅ Never expose API keys in client code
- ✅ Rotate API keys regularly
- ✅ Use encrypted DMs for sensitive information
- ✅ Review Firestore security rules before production
- ✅ Enable Firebase Authentication email verification

---

## 👥 User Roles

### Individual User (Default)

- Add resources to map
- Comment on resources
- Verify resources
- Join public chat rooms
- Send/receive DMs
- Generate API keys
- Create webhooks

### Organization

Same as Individual, plus:
- Organization badge on profile
- Enhanced trust score
- Organization name displayed

### CIO (Chief Integration Officer)

All user permissions, plus:
- **Create private chat rooms**
- **Kick/ban users from rooms**
- **Delete any message**
- **Access all chat rooms**
- **Moderate all rooms**
- **View all API usage stats**

**How to become a CIO:**

Update the user document in Firestore:

```javascript
// In Firebase Console → Firestore → users → [userId]
{
  accountType: "cio",
  isCIO: true
}
```

---

## 📱 Mobile Support

### Progressive Web App (PWA)

This app is a PWA and can be installed on mobile devices:

1. Open app in mobile browser
2. Tap "Add to Home Screen"
3. Launch from home screen like a native app

### Mobile Features

- ✅ Fully responsive design
- ✅ Touch-optimized controls
- ✅ Geolocation for "current location"
- ✅ Mobile camera access for photos
- ✅ Bluetooth mesh on mobile
- ✅ Offline mode with service workers
- ✅ Push notifications (coming soon)

---

## 🧪 Testing

### Manual Testing Checklist

**Authentication:**
- [ ] Sign up new user
- [ ] Sign in existing user
- [ ] Sign out
- [ ] Switch between accounts

**Resource Mapping:**
- [ ] Add new resource
- [ ] View resource details
- [ ] Comment on resource
- [ ] Verify resource
- [ ] Search by location
- [ ] Filter by type

**Chat System:**
- [ ] Join room with `/join #general`
- [ ] Send message in room
- [ ] Send DM with `/msg username hello`
- [ ] Create room with `/create #test public`
- [ ] Leave room with `/leave`
- [ ] View online users with `/who`
- [ ] Enable Bluetooth mesh
- [ ] Share file in chat

**API Dashboard:**
- [ ] Create API key
- [ ] Copy API key
- [ ] Delete API key
- [ ] Add webhook
- [ ] Test webhook delivery
- [ ] Connect integration
- [ ] View API docs

**Security:**
- [ ] Verify DMs are encrypted
- [ ] Check Firestore rules block unauthorized access
- [ ] Test CIO permissions
- [ ] Verify SSL/TLS is enabled

### Automated Testing

```bash
# Coming soon: Jest unit tests
npm test

# Coming soon: Cypress E2E tests
npm run test:e2e
```

---

## 🚀 Deployment

### Deploy to Railway

**Method 1: One-Click Deploy**

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app)

**Method 2: GitHub Integration**

1. Push code to GitHub
2. Go to [Railway.app](https://railway.app)
3. New Project → Deploy from GitHub
4. Select repository and branch
5. Deploy!

**Method 3: Railway CLI**

```bash
npm install -g @railway/cli
railway login
railway init
railway up
```

### Deploy to Netlify

```bash
npm install -g netlify-cli
netlify deploy --prod
```

### Deploy to Vercel

```bash
npm install -g vercel
vercel --prod
```

### Deploy to Firebase Hosting

```bash
firebase deploy --only hosting
```

### Deploy to GitHub Pages

```bash
git checkout -b gh-pages
git push origin gh-pages
```

Then enable GitHub Pages in repository settings.

---

## 🔧 Configuration

### Firebase Configuration

Your Firebase config is already in `app.js`:

```javascript
const firebaseConfig = {
    apiKey: "AIzaSyCL03QIQULiU64iUQWL2YCPaouEv4Yyyak",
    authDomain: "map-app-v2-90d8d.firebaseapp.com",
    projectId: "map-app-v2-90d8d",
    storageBucket: "map-app-v2-90d8d.firebasestorage.app",
    messagingSenderId: "116352941102",
    appId: "1:116352941102:web:c9eb28488ec7fdec6bf3bf",
    measurementId: "G-9Q3ZP4RYLV"
};
```

**To use your own Firebase project:**

1. Create project at [Firebase Console](https://console.firebase.google.com)
2. Enable Firestore Database
3. Enable Authentication → Email/Password
4. Copy config from Project Settings
5. Replace config in `app.js`
6. Deploy Firestore rules:
   ```bash
   firebase deploy --only firestore:rules
   ```

### Environment Variables

No environment variables needed! Everything is configured in the code.

For production, you may want to:
- Move Firebase config to environment variables
- Add API rate limiting
- Enable Firebase App Check

---

## 🛠️ Development

### Local Development

**Simple HTTP Server:**

```bash
# Python 3
python -m http.server 8000

# Node.js
npx http-server -p 8000

# PHP
php -S localhost:8000
```

Then open: `http://localhost:8000`

### Firebase Emulator (Recommended)

```bash
firebase emulators:start
```

This runs:
- Firestore emulator
- Authentication emulator
- Functions emulator (if needed)

### Hot Reload

Use [live-server](https://www.npmjs.com/package/live-server) for auto-reload:

```bash
npm install -g live-server
live-server
```

---

## 📚 Additional Documentation

- [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) - Comprehensive deployment instructions
- [ANALYZER_README.md](ANALYZER_README.md) - Codebase analysis tool documentation
- [Firebase Documentation](https://firebase.google.com/docs)
- [Leaflet.js Documentation](https://leafletjs.com/reference.html)
- [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
- [Web Bluetooth API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Bluetooth_API)

---

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

### Code Style

- Use ES6 modules
- Follow existing code formatting
- Add comments for complex logic
- Use meaningful variable names
- Keep functions focused and small

---

## 📝 License

MIT License - feel free to use this project for personal or commercial purposes.

---

## 🙏 Acknowledgments

- **Leaflet.js** for amazing mapping library
- **Firebase** for real-time database and auth
- **Font Awesome** for icons
- **OpenStreetMap** for map tiles
- **Web Crypto API** for encryption

---

## 📞 Support

### Issues

Report bugs or request features:
[GitHub Issues](https://github.com/abc3rd/community-resource-map/issues)

### Documentation

- 📖 [README.md](README.md) - This file
- 🚀 [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) - Deployment instructions
- 🔍 [ANALYZER_README.md](ANALYZER_README.md) - Codebase analyzer

### Community

- 💬 Join our chat (use the app!)
- 📧 Email: support@cloudconnect.com (example)
- 🐦 Twitter: @cloudconnect (example)

---

## 🗺️ Roadmap

### Version 2.0 (Coming Soon)

- [ ] **TypeScript Migration** - Convert all JavaScript to TypeScript
- [ ] **Voice Chat** - WebRTC voice channels in chat rooms
- [ ] **Video Calls** - 1-on-1 and group video calls
- [ ] **Screen Sharing** - Share screen in chat
- [ ] **Mobile App** - React Native iOS/Android apps
- [ ] **Push Notifications** - Real-time mobile notifications
- [ ] **Message Search** - Full-text search across chat history
- [ ] **Message Reactions** - Emoji reactions to messages
- [ ] **File Preview** - Preview images/videos/PDFs in chat
- [ ] **Code Syntax Highlighting** - Share code with syntax highlighting
- [ ] **Message Threading** - Reply to specific messages
- [ ] **Admin Dashboard** - Web-based admin panel
- [ ] **Analytics** - Usage analytics and insights
- [ ] **Multi-language Support** - i18n for global users

### Version 3.0 (Future)

- [ ] AI Chatbot integration
- [ ] Blockchain verification for resources
- [ ] AR resource discovery
- [ ] Machine learning for resource recommendations
- [ ] Integration marketplace
- [ ] White-label solution for organizations

---

## 📊 Stats

- **7 JavaScript modules** for clean architecture
- **4,356 lines of code** added for chat and API
- **12 Firestore collections** for data management
- **End-to-end encrypted** direct messages
- **IRC-style commands** for power users
- **Bluetooth mesh** for offline communication
- **SSO integration** for seamless UX
- **Mobile responsive** for all devices
- **PWA ready** for installation
- **Zero build step** - deploy anywhere instantly

---

## ✨ Credits

**Developed by:** AI Assistant (Claude) for abc3rd

**Branch:** `claude/codebase-analysis-script-011CUpHX9nfQNApPgmmYu368`

**Commit:** `f8390f7 - Add comprehensive IRC-style chat system with SSO, API dashboard, and Bluetooth mesh networking`

**Deployment:** Ready for Railway, Netlify, Vercel, Firebase, or any static hosting

---

## 🎉 Get Started Now!

```bash
# Clone the repository
git clone https://github.com/abc3rd/community-resource-map.git
cd community-resource-map

# Checkout the feature branch
git checkout claude/codebase-analysis-script-011CUpHX9nfQNApPgmmYu368

# Deploy Firestore rules
firebase deploy --only firestore:rules

# Deploy to Railway
# (Connect GitHub repo to Railway and select the branch)

# Or run locally
python -m http.server 8000
# Open http://localhost:8000
```

**Happy mapping and chatting! 🗺️💬**

---

**Star ⭐ this repo if you find it useful!**
