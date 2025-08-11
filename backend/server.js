const express = require('express');
const { ethers } = require('ethers');
const app = express();

app.use(express.json());

// Request logging
app.use((req, res, next) => {
    console.log(`${req.method} ${req.path} - ${req.get('User-Agent')}`);
    next();
});

// CORS headers for frontend on port 8088
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
});

// Smart contract configuration
const SMART_WALLET_ABI = [
    'function validateUserOp(tuple(address,uint256,bytes,bytes,bytes32,uint256,bytes32,bytes32,bytes) userOp, bytes32 userOpHash, uint256 missingAccountFunds) returns (uint256)',
    'function execute(address target, uint256 value, bytes calldata data)',
    'function executeBatch(address[] calldata targets, uint256[] calldata values, bytes[] calldata datas)'
];

let provider, smartWallet;

// Initialize blockchain connection
async function initBlockchain() {
    provider = new ethers.JsonRpcProvider('http://localhost:8545');
}

// Passkey verification endpoint
app.post('/api/passkey', async (req, res) => {
    try {
        const { type, credential, assertion } = req.body;
        
        if (type === 'register') {
            console.log('Storing credential:', credential.id);
            res.json({ success: true, message: 'Credential stored' });
            
        } else if (type === 'authenticate') {
            console.log('Verifying assertion:', assertion.id);
            const isValid = true; // Placeholder verification
            
            if (isValid) {
                res.json({ 
                    success: true, 
                    message: 'Authentication successful',
                    signatureData: assertion.signature 
                });
            } else {
                res.json({ success: false, error: 'Invalid signature' });
            }
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Smart contract interaction endpoint
app.post('/api/execute', async (req, res) => {
    try {
        const { target, value, data, signatureData } = req.body;
        
        if (!signatureData) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        
        console.log('Executing transaction:', { target, value, data });
        
        res.json({ 
            success: true, 
            txHash: '0x...',
            message: 'Transaction executed' 
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', async () => {
    await initBlockchain();
    console.log(`Backend server running on http://0.0.0.0:${PORT}`);
});