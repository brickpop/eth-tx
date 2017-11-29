Ethereum TX
---

Ethereum TX is a Javascript library inspired on the work of Jordy Baylina ([runethtx](https://github.com/jbaylina/runethtx) and [ethconnector](https://github.com/jbaylina/ethconnector)).

* It provides a unified way to **compile**, **deploy**, **query** and **send transactions** to Ethereum Smart Contracts with ease.
* It also allows to perform simple operations in a simple way
* It abstracts the usage of the web3 component (you can provide your own, too)

# Environment

**NOTE**: This version is only targeted for NodeJS usage.

You may be able to import it using Webpack, but the compiler functions will not work, and ES6 features might need transpiling.

# Installation

```sh
$ npm install eth-tx
```

Once the package is ready, import it in your app:

```javascript
const ethTx = require("eth-tx/node");
```

# Usage

## Connection

```javascript
const { connect, useConnection } = ethTx;
```

To simply connect to `localhost:8545`, you can use:

```javascript
connect()
	.then(() => console.log("Success"))
	.catch(err => console.log("Error", err));
```

You can specify a custom URL like so:

```javascript
connect("http://localhost:8545")
	.then(() => console.log("Success"))
	.catch(err => console.log("Error", err));
```

Or you can reuse an already existing web3 instance:

```javascript
useConnection(web3)
	.then(() => console.log("Success"))
	.catch(err => console.log("Error", err));
```

At any time, you can check if a connection is already established:

```javascript
const { isConnected } = ethTx;

isConnected(); // returns true or false
```

And you can also subscribe to connection status changes. You will receive a status object with the properties `{ connected, network, accounts }`.

```javascript
const { onConnectionChanged } = ethTx;

onConnectionChanged(status => {
	if(!status.connected) {
		console.log("Web3 support is not available");
	}
	else if(status.accounts && status.accounts.length) {
		console.log(`Connected to ${status.network} => ${status.accounts.join()}`);
	}
	else {
		console.log(`The ${status.network} network is currently locked`);
	}
});
```

Some of the operations described below may require that a connection is already established.

## Compiling

```javascript
const { compileTo, compileBundled } = ethTx;
```

### In-memory
In NodeJS you can use:

```javascript
const smartContractSourceBundled = "...";

bundleContractFile(smartContractSourceBundled)
	.then(contracts => { /* ... */})
	.catch(err => console.log("Error", err));
```

### File system
To compile a smart contract from the local file system (NodeJS only):

```javascript
const fs = require('fs');
const path = require('path');

const source = path.join(__dirname, "contract-main.sol");
const destination = path.join(__dirname, "..", "build", "contracts.js");

if (!fs.existsSync(path.dirname(destination))) {
  fs.mkdirSync(path.dirname(destination));
}

compileTo(source, destination, {})
	.then(() => { /* ... */})
	.catch(err => console.log("Error", err));
```

## Working with contracts

Once a contract is compiled, you can wrap it into a class/object using the function `wrapContract`.

```javascript
const { wrapContract } = ethTx;
```

This function generates a customized Javascript class, containing the methods and operations of the contract.

### Deploying a contract

Once a contract is compiled, get its Application Binary Interface (ABI) and its Byte Code:

```javascript
const abi = [...];
const byteCode = "0x12345...";

const MyContract = wrapContract(abi, byteCode);

MyContract.new("parameter-1", "parameter-2")
	.then(myContractInstance => {
		console.log("Deployed on", myContractInstance.$address);

		// ...
	})
	.catch(err => console.log("Error", err));
```

The static method `new(...)` returns a promise that resolves with an instance of the newly deployed contract.

### Attaching to an already deployed contract

To interact with a contract already deployed to the BlockChain, use the constructor with the address:

```javascript
const abi = [...];
const byteCode = "0x12345...";
const address = "0x1234567890...";

const MyContract = wrapContract(abi, byteCode);

const myContractInstance = new MyContract(address);

```

### Interacting with a contract instance

#### Sending a transaction to the contract

Pass the parameters as show below. Invoking the `.send()` method will send the transaction to the net and may change the state of the contract.

```javascript
const options = {};
myContractInstance.setHash("param-1", "param-2").send(options)
	.then(transaction => {
		console.log("Transaction", transaction);

		// ...
	})
	.catch(err => console.log("Error", err));
```

#### Calling a read-only function

Pass the parameters as show below. Invoking the `.call()` method will execute the function of the contract and resolve to any value that might be returned.

This invocation will not change the state, as no transaction will be sent to the blockchain.

```javascript
const options = {};
myContractInstance.getHash("param-1").call(options)
	.then(value => {
		console.log("Resulting value", value);

		// ...
	})
	.catch(err => console.log("Error", err));
```

#### Retrieving public variables

The same scenario applies to the public variables of a contract instance.

```javascript
myContractInstance.totalAmount().call()
	.then(value => {
		console.log("totalAmount =", value);

		// ...
	})
	.catch(err => console.log("Error", err));
```

#### Estimate the gas cost

Pass the parameters as show below. Invoking the `.estimateGas()` method will evaluate the code and resolve the promise to the amount of gas expected to be spent on a successful transaction.

```javascript
const options = {};
myContractInstance.setHash("param-1", "param-2").estimateGas(options)
	.then(gas => {
		console.log("Estimated cost", gas);

		// ...
	})
	.catch(err => console.log("Error", err));
```

#### Invoke the fallback function

Simply send a transaction to the contract's address

```javascript
const params = {
	to: myContractInstance.$address,
	value: 10 // wei
};

ethTx.sendTransaction(params)
	.then(receipt => {
		console.log("Receipt:", receipt);

		// ...
	})
	.catch(err => console.log("Error", err));
```

## Working with simple transactions

Transactions can simply be a matter or transfering funds to another account.

```javascript
var accounts;
const { getAccounts, sendTransaction } = ethTx;

getAccounts()
	.then(acc => { accounts = acc; })
	.catch(err => console.log("Error", err));
```

To send ether to another account, we can simply:

```javascript
const amount = ethTx.getCurrentWeb3().utils.toWei("0.01", "ether");

const params = {
	// from: "0x123456...",  // by default will be accounts[0]
	to: accounts[1],
	value: amount,
	// data: "0x12345..."  // optional bytecode
};

sendTransaction(params)
	.then(result => console.log("Result", result))
	.catch(err => console.log("Error", err));
```

## Utilities

```javascript
const { getBalance, getBlock, getNetwork } = ethTx;
```

These two functions are simply a wrapper of their corresponding method in `web3`. They return a `Promise` resolving to the appropriate value.

## Examples

Check out the file `example/node/index.js` for a NodeJS script.

```sh
$ node example/node
```

Also check out the example client app on `example/client`. Run the `compile.sh` script and open `index.html`.

## About

By Jordi Moraleda

<!-- You can buy me a coffe ☕️ [0x093d4d1e3f8db7cfb06d3b638fbf44156e12b3dc](https://etherscan.io/address/0x093d4d1e3f8db7cfb06d3b638fbf44156e12b3dc#)-->
