// This would be
// const ethTx = require('eth-tx');

const ethTx = require("..");
const path = require("path");
const fs = require("fs");

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

    // WIP

    // const bytesParam = new ArrayBuffer([1, 2, 3, 4]);
    const bytesParam = "0x1234";
    const storeInstance = await HashStoreContract.new(bytesParam);

    debugger;

    console.log(storeInstance);
  } catch (err) {
    console.log(err);
  }
}

///////////////////////////////////////////////////////////////////////////////
//

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
  } catch (err) {
    console.log("Unable to complete", err);
  }
}

main();
