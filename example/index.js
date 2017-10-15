// This would be
// const ethTx = require('eth-tx');

const ethTx = require("..");
const path = require("path");
const fs = require("fs");

var address;

///////////////////////////////////////////////////////////////////////////////
// Connect to an external RPC node
async function startConnection() {
  try {
    ethTx.connect(); // defaults to localhost:8545

    // You can also specify your own URL
    ethTx.connect("http://localhost:8545");
  } catch (err) {
    console.log("Unable to connect", err);
  }
}

///////////////////////////////////////////////////////////////////////////////
// Use your own web3 instance

async function overrideWeb3() {
  try {
    var web3; // your already initialized web3 instance
    await ethTx.useConnection(web3);
  } catch (err) {
    console.log("Unable to connect", err);
  }
}

///////////////////////////////////////////////////////////////////////////////
// Compile solidity files

async function compile() {
  try {
    var source = path.join(__dirname, "contract-main.sol");
    var destination = path.join(__dirname, "..", "build", "data.js");
    if (!fs.existsSync(path.dirname(destination))) {
      fs.mkdirSync(path.dirname(destination));
    }

    await ethTx.compileTo(source, destination, {}).catch(console.log);
  } catch (err) {
    console.log("Unable to compile", err);
  }
}

///////////////////////////////////////////////////////////////////////////////
//

async function deploy() {
  const { HashStore, Owned } = require(path.join("..", "build", "data.js"));
  try {
    const HashStoreContract = ethTx.wrapContract(
      HashStore.abi,
      HashStore.byteCode
    );
    // const OwnedContract = ethTx.wrapContract(Owned.abi, Owned.byteCode);

    const initialHash = "0x1234";
    console.log("Deploying HashStore");
    const storeInstance = await HashStoreContract.new(initialHash);

    address = storeInstance.$address;
    console.log("Deployed on", address);

    console.log("Sending setHash on HashStore with", initialHash);
    var txHash = await storeInstance.setHash(initialHash);
    console.log("Transaction", txHash);

    console.log("Calling getHash on HashStore", await storeInstance.getHash());

    const newHash = "0x5678";
    console.log("Sending setHash on HashStore with", newHash);
    txHash = await storeInstance.setHash(newHash);
    console.log("Transaction", txHash);

    console.log(
      "Calling getHash on HashStore =>",
      await storeInstance.getHash(),
      "\n"
    );
  } catch (err) {
    console.log(err);
  }
}

///////////////////////////////////////////////////////////////////////////////
//

async function reuseContract() {
  const { HashStore } = require(path.join("..", "build", "data.js"));
  try {
    const HashStoreContract = ethTx.wrapContract(
      HashStore.abi,
      HashStore.byteCode
    );

    const newHash = "0x90ab";
    console.log("Attaching to HashStore on address", address);
    const storeInstance = new HashStoreContract(address);

    console.log("Sending setHash on HashStore with", newHash);
    await storeInstance.setHash(newHash);

    console.log(
      "Calling getHash on HashStore =>",
      await storeInstance.getHash()
    );
  } catch (err) {
    console.log(err);
  }
}

///////////////////////////////////////////////////////////////////////////////
//

///////////////////////////////////////////////////////////////////////////////
//

async function main() {
  try {
    await startConnection();

    // await overrideWeb3();

    await compile();

    await deploy();
    await reuseContract();
  } catch (err) {
    console.log("Unable to complete", err);
  }
}

main();
