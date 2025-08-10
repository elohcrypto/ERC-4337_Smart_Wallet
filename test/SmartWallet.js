const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SmartWallet", function () {
  let SmartWallet, smartWallet, owner, addr1, entryPoint;
  let mockData, mockDest;

  beforeEach(async function () {
    // Get signers
    [owner, addr1] = await ethers.getSigners();

    // Deploy EntryPoint contract
    const EntryPoint = await ethers.getContractFactory("EntryPoint");
    entryPoint = await EntryPoint.deploy();
    
    // Deploy SmartWallet contract
    SmartWallet = await ethers.getContractFactory("SmartWallet");
    smartWallet = await SmartWallet.deploy(entryPoint.target, owner.address);

    // Mock data for testing
    mockDest = addr1.address;
    mockData = "0x1234"; // Example calldata
  });

  it("should execute transaction when called from EntryPoint", async function () {
    // Impersonate EntryPoint to call execute
    await ethers.provider.send("hardhat_impersonateAccount", [entryPoint.target]);
    const entryPointSigner = await ethers.getSigner(entryPoint.target);
    
    // Fund the EntryPoint account for gas
    await owner.sendTransaction({
      to: entryPoint.target,
      value: ethers.parseEther("1.0")
    });
    
    // Execute transaction from EntryPoint
    await expect(
      smartWallet.connect(entryPointSigner).execute(mockDest, 0, mockData)
    ).to.emit(smartWallet, "TransactionExecuted").withArgs(mockDest, 0, mockData);
    
    await ethers.provider.send("hardhat_stopImpersonatingAccount", [entryPoint.target]);
  });

  it("should revert when not called from EntryPoint", async function () {
    // Expect revert when called directly (not from EntryPoint)
    await expect(
      smartWallet.execute(mockDest, 0, mockData)
    ).to.be.revertedWith("Only EntryPoint can call");
  });
  
  it("should update owner correctly", async function () {
    const newOwner = addr1.address;
    
    await expect(
      smartWallet.connect(owner).updateOwner(newOwner)
    ).to.emit(smartWallet, "OwnerUpdated").withArgs(owner.address, newOwner);
    
    expect(await smartWallet.owner()).to.equal(newOwner);
  });
  
  it("should revert when non-owner tries to update owner", async function () {
    await expect(
      smartWallet.connect(addr1).updateOwner(addr1.address)
    ).to.be.revertedWith("Only owner can update");
  });
  
  it("should return correct EntryPoint address", async function () {
    expect(await smartWallet.entryPoint()).to.equal(entryPoint.target);
  });
  
  it("should return correct nonce", async function () {
    expect(await smartWallet.getNonce()).to.equal(0);
  });

  it("should execute batch transactions when called from EntryPoint", async function () {
    // Impersonate EntryPoint to call executeBatch
    await ethers.provider.send("hardhat_impersonateAccount", [entryPoint.target]);
    const entryPointSigner = await ethers.getSigner(entryPoint.target);
    
    // Fund the EntryPoint account for gas
    await owner.sendTransaction({
      to: entryPoint.target,
      value: ethers.parseEther("1.0")
    });
    
    const targets = [addr1.address, addr1.address];
    const values = [0, 0];
    const datas = ["0x1234", "0x5678"];
    
    // Execute batch transaction from EntryPoint
    await expect(
      smartWallet.connect(entryPointSigner).executeBatch(targets, values, datas)
    ).to.emit(smartWallet, "TransactionExecuted").withArgs(targets[0], values[0], datas[0]);
    
    await ethers.provider.send("hardhat_stopImpersonatingAccount", [entryPoint.target]);
  });
});