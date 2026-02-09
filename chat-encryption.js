/**
 * Chat Encryption Module
 * Provides end-to-end encryption for private messages and file sharing
 * Uses Web Crypto API for modern browser-based encryption
 */

export class ChatEncryption {
    constructor() {
        this.keyPairs = new Map(); // Store key pairs for different conversations
        this.sharedKeys = new Map(); // Store shared encryption keys
    }

    /**
     * Generate a new RSA key pair for asymmetric encryption
     */
    async generateKeyPair() {
        try {
            const keyPair = await window.crypto.subtle.generateKey(
                {
                    name: "RSA-OAEP",
                    modulusLength: 2048,
                    publicExponent: new Uint8Array([1, 0, 1]),
                    hash: "SHA-256"
                },
                true,
                ["encrypt", "decrypt"]
            );
            return keyPair;
        } catch (error) {
            console.error('[CRYPTO] Failed to generate key pair:', error);
            throw error;
        }
    }

    /**
     * Generate a symmetric AES key for session encryption
     */
    async generateSessionKey() {
        try {
            const key = await window.crypto.subtle.generateKey(
                {
                    name: "AES-GCM",
                    length: 256
                },
                true,
                ["encrypt", "decrypt"]
            );
            return key;
        } catch (error) {
            console.error('[CRYPTO] Failed to generate session key:', error);
            throw error;
        }
    }

    /**
     * Export public key to share with other users
     */
    async exportPublicKey(publicKey) {
        try {
            const exported = await window.crypto.subtle.exportKey("spki", publicKey);
            const exportedAsString = this.arrayBufferToBase64(exported);
            return exportedAsString;
        } catch (error) {
            console.error('[CRYPTO] Failed to export public key:', error);
            throw error;
        }
    }

    /**
     * Import a public key received from another user
     */
    async importPublicKey(keyString) {
        try {
            const keyBuffer = this.base64ToArrayBuffer(keyString);
            const key = await window.crypto.subtle.importKey(
                "spki",
                keyBuffer,
                {
                    name: "RSA-OAEP",
                    hash: "SHA-256"
                },
                true,
                ["encrypt"]
            );
            return key;
        } catch (error) {
            console.error('[CRYPTO] Failed to import public key:', error);
            throw error;
        }
    }

    /**
     * Export session key for sharing (encrypted with recipient's public key)
     */
    async exportSessionKey(sessionKey) {
        try {
            const exported = await window.crypto.subtle.exportKey("raw", sessionKey);
            return this.arrayBufferToBase64(exported);
        } catch (error) {
            console.error('[CRYPTO] Failed to export session key:', error);
            throw error;
        }
    }

    /**
     * Import session key
     */
    async importSessionKey(keyString) {
        try {
            const keyBuffer = this.base64ToArrayBuffer(keyString);
            const key = await window.crypto.subtle.importKey(
                "raw",
                keyBuffer,
                {
                    name: "AES-GCM",
                    length: 256
                },
                true,
                ["encrypt", "decrypt"]
            );
            return key;
        } catch (error) {
            console.error('[CRYPTO] Failed to import session key:', error);
            throw error;
        }
    }

    /**
     * Encrypt a message using AES-GCM (symmetric encryption)
     */
    async encryptMessage(message, sessionKey) {
        try {
            const encoder = new TextEncoder();
            const data = encoder.encode(message);

            // Generate a random IV
            const iv = window.crypto.getRandomValues(new Uint8Array(12));

            const encryptedData = await window.crypto.subtle.encrypt(
                {
                    name: "AES-GCM",
                    iv: iv
                },
                sessionKey,
                data
            );

            // Combine IV and encrypted data
            const result = {
                iv: this.arrayBufferToBase64(iv),
                data: this.arrayBufferToBase64(encryptedData)
            };

            return JSON.stringify(result);
        } catch (error) {
            console.error('[CRYPTO] Failed to encrypt message:', error);
            throw error;
        }
    }

    /**
     * Decrypt a message using AES-GCM
     */
    async decryptMessage(encryptedMessage, sessionKey) {
        try {
            const { iv, data } = JSON.parse(encryptedMessage);

            const ivBuffer = this.base64ToArrayBuffer(iv);
            const dataBuffer = this.base64ToArrayBuffer(data);

            const decryptedData = await window.crypto.subtle.decrypt(
                {
                    name: "AES-GCM",
                    iv: ivBuffer
                },
                sessionKey,
                dataBuffer
            );

            const decoder = new TextDecoder();
            return decoder.decode(decryptedData);
        } catch (error) {
            console.error('[CRYPTO] Failed to decrypt message:', error);
            return '[Encrypted message - decryption failed]';
        }
    }

    /**
     * Encrypt session key with recipient's public key for key exchange
     */
    async encryptSessionKey(sessionKey, recipientPublicKey) {
        try {
            const exported = await window.crypto.subtle.exportKey("raw", sessionKey);

            const encryptedKey = await window.crypto.subtle.encrypt(
                {
                    name: "RSA-OAEP"
                },
                recipientPublicKey,
                exported
            );

            return this.arrayBufferToBase64(encryptedKey);
        } catch (error) {
            console.error('[CRYPTO] Failed to encrypt session key:', error);
            throw error;
        }
    }

    /**
     * Decrypt session key with own private key
     */
    async decryptSessionKey(encryptedSessionKey, privateKey) {
        try {
            const encryptedBuffer = this.base64ToArrayBuffer(encryptedSessionKey);

            const decryptedKey = await window.crypto.subtle.decrypt(
                {
                    name: "RSA-OAEP"
                },
                privateKey,
                encryptedBuffer
            );

            const sessionKey = await window.crypto.subtle.importKey(
                "raw",
                decryptedKey,
                {
                    name: "AES-GCM",
                    length: 256
                },
                true,
                ["encrypt", "decrypt"]
            );

            return sessionKey;
        } catch (error) {
            console.error('[CRYPTO] Failed to decrypt session key:', error);
            throw error;
        }
    }

    /**
     * Encrypt file data for secure file sharing
     */
    async encryptFile(fileData, sessionKey) {
        try {
            const iv = window.crypto.getRandomValues(new Uint8Array(12));

            const encryptedData = await window.crypto.subtle.encrypt(
                {
                    name: "AES-GCM",
                    iv: iv
                },
                sessionKey,
                fileData
            );

            return {
                iv: this.arrayBufferToBase64(iv),
                data: this.arrayBufferToBase64(encryptedData)
            };
        } catch (error) {
            console.error('[CRYPTO] Failed to encrypt file:', error);
            throw error;
        }
    }

    /**
     * Decrypt file data
     */
    async decryptFile(encryptedFile, sessionKey) {
        try {
            const ivBuffer = this.base64ToArrayBuffer(encryptedFile.iv);
            const dataBuffer = this.base64ToArrayBuffer(encryptedFile.data);

            const decryptedData = await window.crypto.subtle.decrypt(
                {
                    name: "AES-GCM",
                    iv: ivBuffer
                },
                sessionKey,
                dataBuffer
            );

            return decryptedData;
        } catch (error) {
            console.error('[CRYPTO] Failed to decrypt file:', error);
            throw error;
        }
    }

    /**
     * Generate a hash for message integrity verification
     */
    async hashMessage(message) {
        try {
            const encoder = new TextEncoder();
            const data = encoder.encode(message);
            const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
            return this.arrayBufferToBase64(hashBuffer);
        } catch (error) {
            console.error('[CRYPTO] Failed to hash message:', error);
            throw error;
        }
    }

    /**
     * Utility: Convert ArrayBuffer to Base64
     */
    arrayBufferToBase64(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return window.btoa(binary);
    }

    /**
     * Utility: Convert Base64 to ArrayBuffer
     */
    base64ToArrayBuffer(base64) {
        const binary = window.atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes.buffer;
    }

    /**
     * Store key pair for a conversation
     */
    storeKeyPair(conversationId, keyPair) {
        this.keyPairs.set(conversationId, keyPair);
    }

    /**
     * Get key pair for a conversation
     */
    getKeyPair(conversationId) {
        return this.keyPairs.get(conversationId);
    }

    /**
     * Store shared session key for a conversation
     */
    storeSharedKey(conversationId, sessionKey) {
        this.sharedKeys.set(conversationId, sessionKey);
    }

    /**
     * Get shared session key for a conversation
     */
    getSharedKey(conversationId) {
        return this.sharedKeys.get(conversationId);
    }

    /**
     * Clear all stored keys (for security on logout)
     */
    clearAllKeys() {
        this.keyPairs.clear();
        this.sharedKeys.clear();
    }
}

// Create singleton instance
export const chatEncryption = new ChatEncryption();
