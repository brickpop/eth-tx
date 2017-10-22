module.exports = {
  getCurrentWeb3,
  connect,
  useConnection,
  deployContract,
  delay,
  rpcSend,
  sendTransaction,
  sendContractTransaction,
  sendContractConstantTransaction,

  // using the currently active web3
  getBalance,
  getTransactionReceipt,
  getBlock,
  getAccounts,
  estimateTransactionGas,
  estimateContractTransactionGas
};

const { findAbiMethod } = require("./util.js");

const Promise = require("bluebird");
const Web3 = require("web3");

// Local State

var connected = false;
// var eth;
// const Eth = require('ethjs');
var web3 = new Web3();

// default values
var gasLimit = 4700000;
var gasPrice = web3.utils.toWei("0.00000006");
var accounts = [];

function getCurrentWeb3() {
  if (!connected) {
    throw new Error(
      "You need to initialize eth-tx before you can deploy a contract"
    );
  }
  return web3;
}

function connect(providerUrl = "http://localhost:8545", opts = {}) {
  // eth = new Eth(new Eth.HttpProvider(providerUrl));
  web3 = new Web3(new Web3.providers.HttpProvider(providerUrl));

  if (opts.gasLimit) gasLimit = opts.gasLimit;
  if (opts.gasPrice) gasPrice = opts.gasPrice;

  return getAccounts().then(accountList => {
    accounts = accountList;
    connected = true;
    return accountList;
  });
}

function useConnection(web3Instance) {
  // eth = new Eth(provider);
  web3 = web3Instance;

  // TODO   get web3 provider and use the own version

  return getAccounts().then(accountList => {
    connected = true;
    accounts = accountList;
    return accountList;
  });
}

function deployContract({ $abi, $byteCode, ...opts }) {
  if (!connected) {
    return Promise.reject(
      new Error(
        "You need to initialize eth-tx before you can deploy a contract"
      )
    );
  } else if (!$abi) {
    return Promise.reject(
      new Error("The contract's `$abi` parameter is required")
    );
  } else if (!$byteCode) {
    return Promise.reject(
      new Error("The contract's `$byteCode` parameter is required")
    );
  }

  const constructorAbi = $abi.find(({ type }) => type === "constructor");

  let paramNames = [];
  let fromAccount, gas;

  if (constructorAbi) {
    paramNames = constructorAbi.inputs.map(({ name }) => {
      if (name[0] === "_") return name.substring(1);
      else return name;
    });
  }

  return Promise.try(() => {
    if (opts.$from) return opts.$from;
    else
      return getAccounts().then(accts => {
        accounts = accts;
        if (!accounts[0]) throw new Error("No accounts are available");
        else return accounts[0];
      });
  })
    .then(account => {
      fromAccount = account;

      if (opts.$gas) {
        gas = opts.$gas;
        return;
      }

      const params = paramNames.map(name => opts[name]);
      params.push({
        from: fromAccount,
        value: opts.$value || 0,
        data: $byteCode,
        gas: gasLimit
      });
      if (opts.$verbose) {
        console.log("constructor: " + JSON.stringify(params));
      }
      // const data = new web3.eth.Contract($abi).new.getData(...params);

      return estimateTransactionGas({
        from: fromAccount,
        value: opts.$value || 0,
        data: $byteCode,
        gas: gasLimit
      });
    })
    .then(estimatedGas => {
      if (opts.$verbose) console.log("Gas: " + estimatedGas);
      gas =
        estimatedGas +
        (opts.$extraGas ? opts.$extraGas : Math.floor(estimatedGas * 0.05));

      const params = paramNames.map(name => opts[name]);

      if (web3.version[0] == "0") {
        // version 0.x.x
        params.push({
          from: fromAccount,
          value: opts.$value || 0,
          data: $byteCode,
          gas
        });

        return new Promise((resolve, reject) => {
          params.push((err, contract) => {
            if (err) return reject(err);
            else if (typeof contract.address !== "undefined") {
              return resolve(contract);
            }
          });
          const ctr = web3.eth.contract($abi);
          ctr.new(...params);
        });
      } else {
        // newer API
        const ctr = new web3.eth.Contract($abi);
        return ctr.deploy({ data: $byteCode, arguments: params }).send({
          from: fromAccount,
          value: opts.$value || 0,
          gas,
          gasPrice
        });

        // return new Promise((resolve, reject) => {
        //   params.push((err, contract) => {
        //     if (err) return reject(err);
        //     else if (typeof contract.address !== "undefined") {
        //       return resolve(contract);
        //     }
        //   });

        // });
      }
    });
}

// Simpler version

// function deployContract(abi, byteCode, account, value) {
//   if (!connected)
//     throw new Error(
//       "You need to initialize eth-tx before you can deploy a contract"
//     );

//   var deployArgs = Array.prototype.slice.call(
//     arguments,
//     4,
//     arguments.length - 1
//   );

//   if (typeof abi == "string") abi = JSON.parse(abi);
//   if (typeof account == "number") account = accounts[account];

//   deployArgs.push({
//     from: account,
//     value,
//     data: byteCode,
//     gas: gasLimit,
//     gasPrice
//   });

//   return new Promise((resolve, reject) => {
//     deployArgs.push(function(err, contract) {
//       // eventual callback
//       if (err) return reject(err);
//       else if (contract && contract.address) {
//         resolve(contract);
//       }
//     });

//     var contract = web3.eth.contract(abi);
//     contract.new.apply(contract, deployArgs);
//   });
// }

// Transactions

function sendTransaction({
  data,
  from,
  value,
  gas,
  gasPrice,
  nonce,
  to,
  ...opts
}) {
  if (!connected) {
    return Promise.reject(
      new Error(
        "You need to initialize eth-tx before you can send a transaction"
      )
    );
  } else if (!to)
    return Promise.reject(new Error("The `to` field is required"));
  else if (!from && !accounts.length)
    return Promise.reject(new Error("A `from` account was not provided"));

  const txOpts = {
    to,
    value: value || 0,
    from: from || accounts[0]
  };
  if (data) txOpts.data = data;
  if (gas) txOpts.gas = gas;
  if (gasPrice) txOpts.gasPrice = gasPrice;
  if (nonce) txOpts.nonce = nonce;

  return Promise.try(() => {
    if (opts.$gas) {
      // forced gas amount
      txOpts.gas = opts.$gas;
      return txOpts.gas;
    }
    if (opts.$verbose) {
      console.log("sendTransaction: " + JSON.stringify(txOpts));
    }

    return estimateTransactionGas(txOpts).then(estimatedGas => {
      if (opts.$verbose) console.log("Gas: " + estimatedGas);

      txOpts.gas = estimatedGas + (opts.$extraGas ? opts.$extraGas : 10000);
    });
  }).then(
    () =>
      new Promise((resolve, reject) => {
        web3.eth.sendTransaction(txOpts, (err, txHash) => {
          if (err) return reject(err);
          setTimeout(() => {
            resolve(txHash);
          }, 100);
        });
      })
  );
}

function sendContractTransaction(contract, abi, method, opts = {}) {
  if (!connected) {
    throw new Error(
      "You need to initialize eth-tx before you can send a transaction"
    );
  } else if (!contract) throw new Error("The contract is required");
  else if (!method) throw new Error("The method is required");
  else if (!abi) throw new Error("The contract ABI is required");

  var fromAccount, gas;

  const methodAbi = findAbiMethod(abi, method, opts);
  if (!methodAbi) return Promise.reject(new Error("Invalid contract method"));

  const paramNames = methodAbi.inputs.map(({ name }) => {
    if (name[0] === "_") return name.substring(1);
    else return name;
  });

  return Promise.try(() => {
    if (opts.$from) return opts.$from;

    return getAccounts().then(accts => {
      accounts = accts;
      if (!accounts[0]) throw new Error("No accounts are available");
      else return accounts[0];
    });
  })
    .then(from => {
      fromAccount = from;

      if (opts.$noEstimateGas) {
        gas = gasLimit;
        return;
      } else if (opts.$gas) {
        gas = opts.$gas;
        return;
      }

      const params = paramNames.map(name => opts[name]);

      if (web3.version[0] == "0") {
        if (opts.$verbose) console.log(method + ": " + JSON.stringify(params));

        params.push({ from: fromAccount, value: opts.$value, gas: gasLimit });

        return new Promise((resolve, reject) => {
          params.push((err, estimatedGas) => {
            // callback
            if (err) return reject(err);
            else if (estimatedGas >= gasLimit)
              return reject(
                new Error(
                  "The transaction requires more gas than it is allowed"
                )
              );

            if (opts.$verbose) console.log("Gas: " + estimatedGas);

            gas =
              estimatedGas +
              (opts.$extraGas
                ? opts.$extraGas
                : Math.floor(estimatedGas * 0.05));
            resolve();
          });

          contract[method].estimateGas.apply(null, params);
        });
      } else {
        // newer
        return contract.methods
          [method](...params)
          .estimateGas(opts)
          .then(estimatedGas => {
            if (estimatedGas >= gasLimit)
              throw new Error(
                "The transaction requires more gas than it is allowed"
              );

            if (opts.$verbose) console.log("Gas: " + estimatedGas);

            gas =
              estimatedGas +
              (opts.$extraGas
                ? opts.$extraGas
                : Math.floor(estimatedGas * 0.05));
          });
      }
    })
    .then(() => {
      const params = paramNames.map(name => opts[name]);

      if (web3.version[0] == "0") {
        params.push({
          from: fromAccount,
          value: opts.$value,
          gas
        });

        return new Promise((resolve, reject) => {
          params.push((err, hash) => {
            // callback
            if (err) return reject(err);
            resolve(hash);
          });

          contract[method].apply(null, params);
        });
      } else {
        return contract.methods
          [method](...params)
          .send({ from: fromAccount, value: opts.$value, gas: gasLimit });
      }
    });
}

function sendContractConstantTransaction(contract, abi, method, opts = {}) {
  if (!connected) {
    return Promise.reject(
      new Error(
        "You need to initialize eth-tx before you can send a transaction"
      )
    );
  } else if (!contract)
    return Promise.reject(new Error("The contract is required"));
  else if (!method) return Promise.reject(new Error("The method is required"));

  const methodAbi = findAbiMethod(abi, method, opts);
  if (!methodAbi) return Promise.reject(new Error("Invalid contract method"));

  const paramNames = methodAbi.inputs.map(({ name }) => {
    if (name[0] === "_") {
      return name.substring(1);
    }
    return name;
  });

  const params = paramNames.map(name => opts[name]);

  if (web3.version[0] == "0") {
    return new Promise((resolve, reject) => {
      params.push((err, data) => {
        if (err) return reject(err);
        resolve(data);
      });

      contract[method].apply(null, params);
    });
  } else {
    // newer
    return contract.methods[method](...params).call();
  }
}

// Utilities

function delay(secs) {
  return rpcSend("evm_mine")
    .then(() => rpcSend("evm_increaseTime", [secs]))
    .then(() => rpcSend("evm_mine"));
}

// Call a low level RPC

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

// Convenience wrappers

function getBalance(address) {
  return web3.eth.getBalance(address);
}

function getTransactionReceipt(txHash) {
  return web3.eth.getTransactionReceipt(txHash);
}

function getBlock(blockNumber) {
  return web3.eth.getBlock(blockNumber);
}

function getAccounts() {
  return web3.eth.getAccounts().then(acct => {
    accounts = acct; // update the current list
    return accounts;
  });
}

function estimateTransactionGas(txOpts = {}) {
  return web3.eth.estimateGas(txOpts).then(estimatedGas => {
    if (estimatedGas >= gasLimit)
      throw new Error("The transaction requires more gas than it is allowed");
    else return estimatedGas;
  });
}

function estimateContractTransactionGas(contract, abi, method, opts) {
  if (!connected) {
    throw new Error(
      "You need to initialize eth-tx before you can send a transaction"
    );
  } else if (!contract) throw new Error("The contract is required");
  else if (!method) throw new Error("The method is required");
  else if (!abi) throw new Error("The contract ABI is required");

  const methodAbi = findAbiMethod(abi, method, opts);
  if (!methodAbi) return Promise.reject(new Error("Invalid contract method"));

  const paramNames = methodAbi.inputs.map(({ name }) => {
    if (name[0] === "_") return name.substring(1);
    else return name;
  });
  const params = paramNames.map(name => opts[name]);

  return contract.methods[method](...params).estimateGas(opts);
}
