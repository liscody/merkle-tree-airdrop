import { ethers } from "hardhat";
import { expect } from "chai";
import { MerkleTree } from "merkletreejs"; // MerkleTree.js
import { takeSnapshot } from "@nomicfoundation/hardhat-network-helpers";
import type { MerkleAirDrop } from "../typechain-types";
import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import type { SnapshotRestorer } from "@nomicfoundation/hardhat-network-helpers";

const keccak256 = require("keccak256");

describe("MerkleAirDrop", function () {
    let snapshotA: SnapshotRestorer;
    // Signers.
    let deployer: SignerWithAddress, owner: SignerWithAddress, user: SignerWithAddress, claimer: SignerWithAddress;

    let merkleAirDrop: MerkleAirDrop;
    let myErc20: any;
    let hexProof: any;
    let root: any;

    before(async () => {
        // Getting of signers.
        [deployer, user, claimer] = await ethers.getSigners();

        const leaves = [
            claimer.address,
            "0xAb8483F64d9C6d1EcF9b849Ae677dD3315835cb2",
            "0x4B20993Bc481177ec7E8f571ceCaE8A9e22C02db",
            "0x78731D3Ca6b7E34aC0F824c42a7cC18A495cabaB",
            "0x617F2E2fD72FD9D5503197092aC168c91465E7f2",
            "0x17F6AD8Ef982297579C203069C1DbfFE4348c372",
            "0x5c6B0f7Bf3E7ce046039Bd8FABdfD3f9F5021678",
            "0x1aE0EA34a72D944a8C7603FfB3eC30a6669E454C"
        ];

        const leafsNode = leaves.map((addr) => keccak256(addr));
        // console.log(leafsNode);

        const merkleTree = new MerkleTree(leafsNode, keccak256, { sortPairs: true });
        root = "0x" + merkleTree.getRoot().toString("hex");
        console.log(root, "root");
        console.log(merkleTree.toString());

        const claimerAddress = leafsNode[0];
        hexProof = merkleTree.getHexProof(claimerAddress);

        console.log(hexProof, "hexProof");
        console.log(claimerAddress, "claimerAddress");

        // Deployment of the factory.
        const MyERC20 = await ethers.getContractFactory("MyERC20", deployer);
        myErc20 = await MyERC20.deploy();
        await myErc20.deployed();

        const MerkleAirDrop = await ethers.getContractFactory("MerkleAirDrop", deployer);
        merkleAirDrop = await MerkleAirDrop.deploy(root, 1000000);
        await merkleAirDrop.deployed();

        await myErc20.transfer(merkleAirDrop.address, 10000000000000);

        owner = deployer;
        await merkleAirDrop.connect(owner).setToken(myErc20.address);

        snapshotA = await takeSnapshot();
    });

    afterEach(async () => await snapshotA.restore());

    describe("Testing claim function", function () {
        it("Should reverted with custom error 'AlreadyClaimed'", async () => {
            await merkleAirDrop.connect(claimer).claim(hexProof);
            await expect(merkleAirDrop.connect(claimer).claim(hexProof)).to.be.revertedWithCustomError(
                merkleAirDrop,
                "AlreadyClaimed"
            );
        });

        it("Should reverted with custom error 'NotInMerkle'", async () => {
            await expect(merkleAirDrop.connect(owner).claim(hexProof)).to.be.revertedWithCustomError(
                merkleAirDrop,
                "NotInMerkle"
            );
        });

        it("Should change balance after claim", async () => {
            await merkleAirDrop.connect(claimer).claim(hexProof);
            let balance = await myErc20.balanceOf(claimer.address);
            expect(balance).to.be.equal(1000000);
        });
    });

    describe("Testing setRoot function", function () {
        it("Should change a root", async () => {
            let newRoot = root;
            await merkleAirDrop.connect(owner).setRoot(newRoot);
            expect(root).to.be.equal(newRoot);
        });
    });
    describe("Testing setAmount function", function () {
        it("Should change a amount", async () => {
            let newAmount = 5000000;
            await merkleAirDrop.connect(owner).setAmount(newAmount);
            expect(newAmount).to.be.equal(5000000);
        });
    });
});
