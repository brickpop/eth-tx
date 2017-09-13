/*
This library is a combination based on the work of Jordi Baylina
- https://github.com/jbaylina/ethconnector
- https://github.com/jbaylina/runethtx
*/

const { connect, deployContract, delay, rpcSend } = require("./lib/rpc.js");
const {
  bundleContracts,
  applyConstants,
  compileBundle,
  compile
} = require("./lib/compile.js");

module.exports = {
  connect,
  deployContract,
  delay,
  rpcSend,

  bundleContracts,
  applyConstants,
  compileBundle,
  compile

  // deploy,
  // sendContractTx,
  // sendTx,
  // getBalance,
  // getTransactionReceipt,
  // getBlock,
  // asyncfunc,
  // generateClass
};
