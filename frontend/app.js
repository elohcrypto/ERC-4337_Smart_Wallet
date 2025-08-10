// WebAuthn frontend logic for Passkey registration and authentication
const statusDisplay = document.getElementById('status');

// Utility function to convert buffer to base64url
function bufferToBase64url(buffer) {
    const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// Utility function to convert base64url to buffer
function base64urlToBuffer(base64url) {
    const padded = base64url.replace(/-/g, '+').replace(/_/g, '/');
    return Uint8Array.from(atob(padded), c => c.charCodeAt(0));
}

async function registerPasskey() {
    try {
        statusDisplay.textContent = 'Initiating Passkey registration...';
        
        // Placeholder: Fetch challenge from backend API
        const challenge = new Uint8Array(32).fill(1); // Dummy challenge for local testing
        const publicKey = {
            challenge,
            rp: { name: 'ERC-4337 Smart Wallet' },
            user: {
                id: new Uint8Array(16).fill(1), // Dummy user ID
                name: 'user@example.com',
                displayName: 'User'
            },
            pubKeyCredParams: [{ type: 'public-key', alg: -7 }], // ES256
            authenticatorSelection: { userVerification: 'preferred' },
            timeout: 60000
        };

        const credential = await navigator.credentials.create({ publicKey });
        statusDisplay.textContent = 'Passkey registered successfully!';

        // Placeholder: Send credential to backend API for storage
        console.log('Credential:', {
            id: credential.id,
            publicKey: bufferToBase64url(credential.response.getPublicKey())
        });
        // Send credential to backend
        await sendToBackend({
            type: 'register',
            credential: {
                id: credential.id,
                publicKey: bufferToBase64url(credential.response.getPublicKey()),
                attestationObject: bufferToBase64url(credential.response.attestationObject),
                clientDataJSON: bufferToBase64url(credential.response.clientDataJSON)
            }
        });
    } catch (error) {
        statusDisplay.textContent = `Registration failed: ${error.message}`;
        console.error('Registration error:', error);
    }
}

async function authenticatePasskey() {
    try {
        statusDisplay.textContent = 'Initiating Passkey authentication...';
        
        // Placeholder: Fetch challenge from backend API
        const challenge = new Uint8Array(32).fill(1); // Dummy challenge for local testing
        const publicKey = {
            challenge,
            allowCredentials: [], // Backend will provide allowed credentials
            timeout: 60000,
            userVerification: 'preferred'
        };

        const assertion = await navigator.credentials.get({ publicKey });
        statusDisplay.textContent = 'Authentication successful!';

        // Placeholder: Send assertion to backend API for verification
        console.log('Assertion:', {
            id: assertion.id,
            signature: bufferToBase64url(assertion.response.signature)
        });
        // Send to backend for verification and smart contract interaction
        const result = await sendToBackend({
            type: 'authenticate',
            assertion: {
                id: assertion.id,
                signature: bufferToBase64url(assertion.response.signature),
                authenticatorData: bufferToBase64url(assertion.response.authenticatorData),
                clientDataJSON: bufferToBase64url(assertion.response.clientDataJSON)
            }
        });
        
        if (result.success) {
            statusDisplay.textContent = 'Authentication successful! Ready for transactions.';
        }
    } catch (error) {
        statusDisplay.textContent = `Authentication failed: ${error.message}`;
        console.error('Authentication error:', error);
    }
}

// Backend API integration
async function sendToBackend(data) {
    try {
        const response = await fetch('/api/passkey', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return await response.json();
    } catch (error) {
        console.error('Backend API error:', error);
        return { success: false, error: error.message };
    }
}

// Smart contract integration
let provider, signer, smartWallet;
const SMART_WALLET_ADDRESS = '0x...'; // To be set after deployment
const SMART_WALLET_ABI = [
    'function owner() view returns (address)',
    'function execute(address target, uint256 value, bytes calldata data)',
    'function executeBatch(address[] calldata targets, uint256[] calldata values, bytes[] calldata datas)',
    'function updateOwner(address newOwner)',
    'function getNonce() view returns (uint256)',
    'event TransactionExecuted(address indexed target, uint256 value, bytes data)'
];

async function initializeContract() {
    if (typeof window.ethereum !== 'undefined') {
        provider = new ethers.BrowserProvider(window.ethereum);
        signer = await provider.getSigner();
        smartWallet = new ethers.Contract(SMART_WALLET_ADDRESS, SMART_WALLET_ABI, signer);
    }
}

async function executeTransaction(target, value, data) {
    try {
        const tx = await smartWallet.execute(target, value, data);
        await tx.wait();
        statusDisplay.textContent = 'Transaction executed successfully!';
        return tx;
    } catch (error) {
        statusDisplay.textContent = `Transaction failed: ${error.message}`;
        throw error;
    }
}