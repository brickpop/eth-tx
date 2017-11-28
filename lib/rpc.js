module.exports = {
  connect,
  useConnection,
  getCurrentWeb3,
  isConnected,
  onConnectionChanged: addConnectionChangedListener,

  deployContract,
  delay,
  rpcSend,
  sendTransaction,
  sendContractTransaction,
  sendContractConstantTransaction,

  // using the currently active web3
  getBalance,
  getNetwork,
  getAccounts,
  getTransactionReceipt,
  getBlock,
  estimateTransactionGas,
  estimateContractTransactionGas
};

const { findAbiMethod } = require("./util.js");

const Promise = require("bluebird");
const Web3 = require("web3");

// Local State

var web3 = new Web3();
var connectionStatus = {
  connected: false,
  network: null,
  accounts: []
};

var connectionChangeInterval = null;
var connectionChangeCallbacks = [];
var lastConnectionStatus = {
  connected: false,
  network: null,
  accounts: null
};

const INTERVAL_PERIOD = 1000;

// default values
var gasLimit = 4700000;
var gasPrice = web3.utils.toWei("0.00000006");

function connect(providerUrl = "http://localhost:8545", opts = {}) {
  // eth = new Eth(new Eth.HttpProvider(providerUrl));
  web3 = new Web3(new Web3.providers.HttpProvider(providerUrl));

  if (opts.gasLimit) gasLimit = opts.gasLimit;
  if (opts.gasPrice) gasPrice = opts.gasPrice;

  return getNetwork()
    .then(networkId => {
      connectionStatus.network = networkId;
      connectionStatus.connected = true;

      return getAccounts();
    })
    .then(accountList => {
      connectionStatus.accounts = accountList;
      return accountList;
    });
}

function useConnection(web3Instance) {
  web3 = new Web3(web3Instance.currentProvider);

  return getNetwork()
    .then(networkId => {
      connectionStatus.network = networkId;
      connectionStatus.connected = true;

      return getAccounts();
    })
    .then(accountList => {
      connectionStatus.accounts = accountList;
      return accountList;
    });
}

function getCurrentWeb3() {
  if (!connectionStatus.connected) {
    throw new Error(
      "You need to initialize eth-tx before you can connect to the het"
    );
  }
  return web3;
}

function isConnected() {
  return connectionStatus.connected;
}

function addConnectionChangedListener(func) {
  if (!func || typeof func !== "function")
    throw new Error("The first parameter must be a callback");

  if (!connectionChangeInterval) {
    connectionChangeInterval = setInterval(
      checkConnectionChanged,
      INTERVAL_PERIOD
    );
  }
  connectionChangeCallbacks.push(func);
}

function deployContract(opts) {
  const { $abi, $byteCode } = opts;
  opts.$abi = undefined;
  opts.$byteCode = undefined;

  if (!connectionStatus.connected) {
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
        connectionStatus.accounts = accts;
        if (!connectionStatus.accounts[0])
          throw new Error("No accounts are available");
        else return connectionStatus.accounts[0];
      });
  })
    .then(account => {
      fromAccount = account;

      if (opts.$gas) {
        gas = opts.$gas;
        return;
      }

      const params = paramNames.map(name => opts[name]);
      return new web3.eth.Contract($abi)
        .deploy({ data: $byteCode, arguments: params })
        .estimateGas();
    })
    .then(estimatedGas => {
      if (opts.$verbose) console.log("Gas: " + estimatedGas);
      gas =
        estimatedGas +
        (opts.$extraGas ? opts.$extraGas : Math.floor(estimatedGas * 0.05));

      const params = paramNames.map(name => opts[name]);

      const contractBase = new web3.eth.Contract($abi);
      return contractBase.deploy({ data: $byteCode, arguments: params }).send({
        from: fromAccount,
        value: opts.$value || 0,
        gas,
        gasPrice
      });
    });
}

// Transactions

function sendTransaction(opts) {
  if (!connectionStatus.connected) {
    return Promise.reject(
      new Error(
        "You need to initialize eth-tx before you can send a transaction"
      )
    );
  }

  const { data, from, value, gas, gasPrice, nonce, to } = opts;
  if (!to) return Promise.reject(new Error("The `to` field is required"));
  else if (!from && !connectionStatus.accounts.length)
    return Promise.reject(new Error("A `from` account was not provided"));

  const txOpts = {
    to,
    value: value || 0,
    from: from || connectionStatus.accounts[0]
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
  }).then(() => web3.eth.sendTransaction(txOpts));
}

function sendContractTransaction(contract, abi, method, opts = {}) {
  if (!connectionStatus.connected) {
    throw new Error(
      "You need to initialize eth-tx before you can send a transaction"
    );
  } else if (!contract) throw new Error("The contract is required");
  else if (!method) throw new Error("The method is required");
  else if (!abi) throw new Error("The contract ABI is required");

  var gas;

  const methodAbi = findAbiMethod(abi, method, opts);
  if (!methodAbi) return Promise.reject(new Error("Invalid contract method"));

  const paramNames = methodAbi.inputs.map(({ name }) => {
    if (name[0] === "_") return name.substring(1);
    else return name;
  });

  return Promise.try(() => {
    if (opts.$from) return opts.$from;

    return getAccounts().then(accts => {
      connectionStatus.accounts = accts;
      if (!connectionStatus.accounts[0])
        throw new Error("No accounts are available");
      else return connectionStatus.accounts[0];
    });
  })
    .then(from => {
      opts.from = from;

      if (opts.$noEstimateGas) {
        gas = gasLimit;
        return;
      } else if (opts.$gas) {
        gas = opts.$gas;
        return;
      }

      const params = paramNames.map(name => opts[name]);

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
            (opts.$extraGas ? opts.$extraGas : Math.floor(estimatedGas * 0.05));
        });
    })
    .then(() => {
      const params = paramNames.map(name => opts[name]);

      return contract.methods
        [method](...params)
        .send({ from: opts.from, value: opts.$value, gas, gasLimit });
    });
}

function sendContractConstantTransaction(contract, abi, method, opts = {}) {
  if (!connectionStatus.connected) {
    return Promise.reject(
      new Error(
        "You need to initialize eth-tx before you can send a transaction"
      )
    );
  } else if (!contract) {
    return Promise.reject(new Error("The contract is required"));
  } else if (!method) {
    return Promise.reject(new Error("The method is required"));
  }

  const methodAbi = findAbiMethod(abi, method, opts);
  if (!methodAbi) return Promise.reject(new Error("Invalid contract method"));

  const paramNames = methodAbi.inputs.map(({ name }) => {
    if (name[0] === "_") {
      return name.substring(1);
    }
    return name;
  });

  const params = paramNames.map(name => opts[name]);

  return contract.methods[method](...params).call();
}

// Utilities

function delay(secs) {
  return rpcSend("evm_mine")
    .then(() => rpcSend("evm_increaseTime", [secs]))
    .then(() => rpcSend("evm_mine"));
}

function checkConnectionChanged() {
  Promise.all(getAccounts(), getNetwork())
    .then(() => {
      var newConnectionStatus = {
        connected: connectionStatus.connected,
        network: connectionStatus.network,
        accounts: connectionStatus.accounts
      };
      if (lastConnectionStatus.connected != connectionStatus.connected) {
        notifyChangeListeners(newConnectionStatus);
      } else if (lastConnectionStatus.network != connectionStatus.network) {
        notifyChangeListeners(newConnectionStatus);
      } else if (
        (lastConnectionStatus.accounts || []).join() !=
        (connectionStatus.accounts || []).join()
      ) {
        notifyChangeListeners(newConnectionStatus);
      }

      lastConnectionStatus = newConnectionStatus;
    })
    .catch(err => console.error(err));
}

function notifyChangeListeners(newState) {
  connectionChangeCallbacks.forEach(func => func(newState));
}

// Call a low level RPC

function rpcSend(method, params = []) {
  if (!connectionStatus.connected) {
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

function getNetwork() {
  return web3.eth.net.getNetworkType().then(networkId => {
    connectionStatus.network = networkId;
    return connectionStatus.network;
  });
}

function getAccounts() {
  return web3.eth.getAccounts().then(acct => {
    connectionStatus.accounts = acct; // update the current list
    return connectionStatus.accounts;
  });
}

function getTransactionReceipt(txHash) {
  return web3.eth.getTransactionReceipt(txHash);
}

function getBlock(blockNumber) {
  return web3.eth.getBlock(blockNumber);
}

function estimateTransactionGas(txOpts = {}) {
  return web3.eth.estimateGas(txOpts).then(estimatedGas => {
    if (estimatedGas >= gasLimit)
      throw new Error("The transaction requires more gas than it is allowed");
    else return estimatedGas;
  });
}

function estimateContractTransactionGas(contract, abi, method, opts) {
  if (!connectionStatus.connected) {
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
