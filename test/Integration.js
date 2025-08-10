const { expect } = require("chai");
const { ethers } = require("hardhat");
const express = require("express");
const request = require("supertest");

describe("Integration Tests", function () {
  let smartWallet, entryPoint, owner, addr1;
  let app, server;

  before(async function () {
    // Deploy contracts
    [owner, addr1] = await ethers.getSigners();
    
    const EntryPoint = await ethers.getContractFactory("EntryPoint");
    entryPoint = await EntryPoint.deploy();
    
    const SmartWallet = await ethers.getContractFactory("SmartWallet");
    smartWallet = await SmartWallet.deploy(entryPoint.target, owner.address);

    // Setup backend server
    app = express();
    app.use(express.json());

    // Mock passkey verification endpoint
    app.post('/api/passkey', (req, res) => {
      const { type, credential, assertion } = req.body;
      
      if (type === 'register') {
        res.json({ success: true, message: 'Credential stored' });
      } else if (type === 'authenticate') {
        res.json({ 
          success: true, 
          message: 'Authentication successful',
          signatureData: assertion.signature 
        });
      }
    });

    // Mock transaction execution endpoint
    app.post('/api/execute', async (req, res) => {
      try {
        const { target, value, data, signatureData } = req.body;
        
        if (!signatureData) {
          return res.status(401).json({ error: 'Authentication required' });
        }

        // Simulate EntryPoint calling smart wallet
        await ethers.provider.send("hardhat_impersonateAccount", [entryPoint.target]);
        const entryPointSigner = await ethers.getSigner(entryPoint.target);
        
        await owner.sendTransaction({
          to: entryPoint.target,
          value: ethers.parseEther("1.0")
        });

        const tx = await smartWallet.connect(entryPointSigner).execute(target, value, data);
        await tx.wait();

        res.json({ 
          success: true, 
          txHash: tx.hash,
          message: 'Transaction executed' 
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
  });

  it("should handle passkey registration flow", async function () {
    const mockCredential = {
      id: "test-credential-id",
      publicKey: "mock-public-key",
      attestationObject: "mock-attestation",
      clientDataJSON: "mock-client-data"
    };

    const response = await request(app)
      .post('/api/passkey')
      .send({
        type: 'register',
        credential: mockCredential
      });

    expect(response.status).to.equal(200);
    expect(response.body.success).to.be.true;
    expect(response.body.message).to.equal('Credential stored');
  });

  it("should handle passkey authentication flow", async function () {
    const mockAssertion = {
      id: "test-credential-id",
      signature: "mock-signature",
      authenticatorData: "mock-auth-data",
      clientDataJSON: "mock-client-data"
    };

    const response = await request(app)
      .post('/api/passkey')
      .send({
        type: 'authenticate',
        assertion: mockAssertion
      });

    expect(response.status).to.equal(200);
    expect(response.body.success).to.be.true;
    expect(response.body.signatureData).to.equal('mock-signature');
  });

  it("should execute smart contract transaction through backend", async function () {
    const response = await request(app)
      .post('/api/execute')
      .send({
        target: addr1.address,
        value: 0,
        data: "0x1234",
        signatureData: "mock-signature"
      });

    expect(response.status).to.equal(200);
    expect(response.body.success).to.be.true;
    expect(response.body.txHash).to.be.a('string');
  });

  it("should reject transaction without authentication", async function () {
    const response = await request(app)
      .post('/api/execute')
      .send({
        target: addr1.address,
        value: 0,
        data: "0x1234"
      });

    expect(response.status).to.equal(401);
    expect(response.body.error).to.equal('Authentication required');
  });

  it("should verify smart contract state after backend interaction", async function () {
    // Verify contract is properly deployed and accessible
    expect(await smartWallet.owner()).to.equal(owner.address);
    expect(await smartWallet.entryPoint()).to.equal(entryPoint.target);
    expect(await smartWallet.getNonce()).to.equal(0);
  });
});