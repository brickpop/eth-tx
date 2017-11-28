// NODEJS EXAMPLE

// This would be
// const ethTx = require('eth-tx');

const ethTx = require("../../node");
const path = require("path");
const fs = require("fs");

var address;

///////////////////////////////////////////////////////////////////////////////
// Connect to an external RPC node
async function startConnection() {
  console.log("Connecting");

  try {
    await ethTx.connect(); // defaults to localhost:8545

    // You can also specify your own URL
    await ethTx.connect("http://localhost:8545");
  } catch (err) {
    console.log("Unable to connect", err);
  }
}

///////////////////////////////////////////////////////////////////////////////
// Use your own web3 instance

const Web3 = require("web3");
async function overrideWeb3() {
  try {
    var web3; // your already initialized web3 instance
    web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));

    // force to recycle an existing web3 configuration
    await ethTx.useConnection(web3);
  } catch (err) {
    console.log("Unable to connect", err);
  }
}

///////////////////////////////////////////////////////////////////////////////
// Compile solidity files

async function compile() {
  console.log("Compiling code");

  try {
    var source = path.join(__dirname, "..", "contract-main.sol");
    var destination = path.join(__dirname, "..", "build", "contracts.js");
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
  const { HashStore, Owned } = require(path.join(
    "..",
    "build",
    "contracts.js"
  ));
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

    console.log("Estimating gas for setHash on HashStore");
    var gas = await storeInstance.setHash(initialHash).estimateGas();
    console.log("Estimated", gas);

    console.log("Sending setHash on HashStore with", initialHash);
    var transaction = await storeInstance.setHash(initialHash).send();
    console.log("Transaction", transaction);

    var result = await storeInstance.setHash(initialHash).call();
    console.log("Calling setHash to check the theoretical result:", result);

    console.log(
      "Calling getHash on HashStore",
      await storeInstance.getHash().call()
    );

    const newHash = "0x5678";
    console.log("Sending setHash on HashStore with", newHash);
    transaction = await storeInstance.setHash(newHash).send();
    console.log("Transaction", transaction);

    console.log(
      "Calling getHash on HashStore =>",
      await storeInstance.getHash().call(),
      "\n"
    );
  } catch (err) {
    console.log(err);
  }
}

///////////////////////////////////////////////////////////////////////////////
//

async function reuseContract() {
  const { HashStore } = require(path.join("..", "build", "contracts.js"));
  try {
    const HashStoreContract = ethTx.wrapContract(
      HashStore.abi,
      HashStore.byteCode
    );

    const newHash = "0x90ab";
    console.log("Attaching to HashStore on address", address);
    const storeInstance = new HashStoreContract(address);

    console.log(
      "Calling getHash on HashStore =>",
      await storeInstance.getHash().call()
    );

    console.log("Sending setHash on HashStore with", newHash);
    await storeInstance.setHash(newHash).send();
    console.log(
      "Calling setHash on HashStore =>",
      await storeInstance.setHash(newHash).call()
    );

    console.log(
      "Calling getHash on HashStore =>",
      await storeInstance.getHash().call()
    );
  } catch (err) {
    console.log(err);
  }
}

///////////////////////////////////////////////////////////////////////////////
//

async function transferEth() {
  console.log("Transfering 0.01 ether");

  try {
    const accounts = await ethTx.getAccounts();
    const result = await ethTx.sendTransaction({
      // from: accounts[0],  // by default
      to: accounts[1],
      value: ethTx.getCurrentWeb3().utils.toWei("0.01", "ether")
      // data: "012345..."
    });

    console.log("Result", result);
  } catch (err) {
    console.error(err);
  }
}

///////////////////////////////////////////////////////////////////////////////
//

async function main() {
  try {
    await startConnection();

    // await overrideWeb3();

    await compile();

    await deploy();
    await reuseContract();

    await transferEth();
  } catch (err) {
    console.log("Unable to complete", err);
  }
}

main();
