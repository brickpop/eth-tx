module.exports = {
  wrapContract
};

const { argsToOpts } = require("./util.js");

const {
  getCurrentWeb3,
  // sendTransaction,
  sendContractTransaction,
  sendContractConstantTransaction,
  estimateContractTransactionGas,
  deployContract
} = require("./rpc.js");

// FUNCTIONS

// Create a class from a contract ABI/ByteCode

function wrapContract(abi, byteCode) {
  if (!abi)
    throw new Error("The contract's Application Binary Interface is required");
  else if (typeof byteCode == "undefined")
    throw new Error("The contract's bytecode parameter is required");

  return class WrappedContract {
    constructor(address) {
      this.$address = address;
      this.$abi = abi;
      this.$byteCode = byteCode;

      const web3 = getCurrentWeb3();
      this.$contract = new web3.eth.Contract(this.$abi, this.$address);

      this.defineContractMethods();
    }

    // Populate contract methods
    defineContractMethods() {
      this.$abi.forEach(({ /*constant,*/ name, inputs, type }) => {
        if (type !== "function") return; // type == 'constructor' => skip

        // TODO overloaded functions?

        // Function
        const self = this;
        this[name] = (...args) => {
          var opts = argsToOpts(args, inputs);
          return {
            call: () => {
              // constant
              return sendContractConstantTransaction(
                self.$contract,
                self.$abi,
                name,
                opts
              );
            },
            send: () => {
              // transaction
              return sendContractTransaction(
                self.$contract,
                self.$abi,
                name,
                opts
              );
            },
            estimateGas: () => {
              return estimateContractTransactionGas(
                self.$contract,
                self.$abi,
                name,
                opts
              );
            }
          };
        };
      });
    }

    static new(...args) {
      const func = abi.find(func => func && func.type === "constructor");
      var constructorInputs = [];
      if (func) constructorInputs = func.inputs;

      var opts = argsToOpts(args, constructorInputs);

      opts.$abi = abi;
      opts.$byteCode = byteCode;

      return deployContract(opts).then(contract => {
        if (!contract) throw new Error("Empty contract");

        return new WrappedContract(
          (contract.options && contract.options.address) ||
            contract._address ||
            contract.address
        );
      });
    }
  };
}
