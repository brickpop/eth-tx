module.exports = {
  connect,
  deployContract,
  delay,
  rpcSend
};

const Promise = require("bluebird");
const Web3 = require("web3");
const TestRPC = require("ethereumjs-testrpc");

// Local State

var connected = false;
var web3 = new Web3();

// default values
var gasLimit = 4000000;
var gasPrice = web3.toWei(0.00000006);
var accounts = [];

function connect(provider = "testrpc", opts = {}) {
  if (provider.toUpperCase() === "TESTRPC") {
    web3.setProvider(TestRPC.provider(opts));
  } else {
    web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));
  }

  if (opts.gasLimit) gasLimit = opts.gasLimit;
  if (opts.gasPrice) gasPrice = opts.gasPrice;

  return new Promise((resolve, reject) => {
    web3.eth.getAccounts(function(err, accountList) {
      if (err) return reject(err);
      accounts = accountList;

      connected = true;
      resolve();
    });
  });
}

function deployContract(abi, codeData, account, value) {
  if (!connected)
    throw new Error(
      "You need to initialize eth-tx before you can deploy a contract"
    );

  var deployArgs = Array.prototype.slice.call(
    arguments,
    4,
    arguments.length - 1
  );

  if (typeof abi == "string") abi = JSON.parse(abi);
  if (typeof account == "number") account = accounts[account];

  deployArgs.push({
    from: account,
    value,
    data: codeData,
    gas: gasLimit,
    gasPrice
  });

  return new Promise((resolve, reject) => {
    deployArgs.push(function(err, contract) {
      // eventual callback
      if (err) return reject(err);
      else if (contract && contract.address) {
        resolve(contract);
      }
    });

    var contract = web3.eth.contract(abi);
    contract.new.apply(contract, deployArgs);
  });
}

function delay(secs) {
  return rpcSend("evm_mine")
    .then(() => rpcSend("evm_increaseTime", [secs]))
    .then(() => rpcSend("evm_mine"));
}

// UTILITY FUNCTIONS

// CALL a low level RPC
function rpcSend(method, params = []) {
  if (!connected) {
    return Promise.reject(
      new Error(
        "You need to initialize eth-tx before you can send RPC transactions"
      )
    );
  } else if (!method) {
    return Promise.reject(new Error("You need to indicate a method"));
  }

  return new Promise((resolve, reject) => {
    web3.currentProvider.sendAsync(
      {
        jsonrpc: "2.0",
        method,
        params,
        id: new Date().getTime()
      },
      err => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}
