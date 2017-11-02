const ethTx = require("../..");
const { HashStore } = require("../../build/contracts");

var hashStoreInstance = null;

const HashStoreContract = ethTx.wrapContract(HashStore.abi, HashStore.byteCode);

function connect() {
  if (typeof web3 !== "undefined") return ethTx.useConnection(web3);
  else if (location.protocol == "file:")
    throw new Error("Can't connect to the Ethereum net from a local file://");
  else {
    return ethTx.connect();
  }
}

function init() {
  connect()
    .then(() => {
      setStatus("Web3 has been loaded");

      // setTimeout(deploy, 3000)
      setInterval(displayHash, 3000);
      return displayHash();
    })
    .catch(err => {
      alert(err.message);
      setStatus(err.message);
    });
}

function setStatus(text) {
  $("#status").text("Status: " + text);
}

function deploy() {
  if (!confirm("Do you want to deploy the contract?")) return;

  ethTx
    .getAccounts()
    .then(accounts => {
      if (!accounts || !accounts.length)
        throw new Error("Please, unlock your web3 wallet or create an account");

      const initialHash = "0x1234";
      setStatus("Deploying HashStore");

      return HashStoreContract.new(initialHash);
    })
    .then(instance => {
      hashStoreInstance = instance;

      setStatus("Deployed: " + instance.$address);
    })
    .catch(err => {
      if (err && err.message == "No accounts are available")
        setStatus("Please, unlock your web3 wallet or create an account");
      else alert(err.message);

      setStatus(err.message);
    });
}

function attachToContract() {
  if (!hashStoreInstance) {
    const address = "0x8af4943ED2744c229976D94045854dc5e374479a";
    hashStoreInstance = new HashStoreContract(address);
  }
}

function displayHash() {
  attachToContract();

  return hashStoreInstance
    .getHash()
    .call()
    .then(hash => {
      $("#hash").text("Current Hash: " + hash);
    })
    .catch(err => {
      alert(err.message);
      setStatus(err.message);
    });
}

function setHash(hash) {
  attachToContract();

  hashStoreInstance
    .setHash(hash)
    .send({})
    .then(result => {
      console.log(result);
      setStatus("Updated the hash to " + hash);

      return displayHash();
    })
    .catch(err => {
      alert(err.message);
      setStatus(err.message);
    });
}

function clearHash() {
  const params = {
    to: hashStoreInstance.$address,
    value: 10 // wei
  };

  ethTx
    .sendTransaction(params)
    .then(result => {
      return displayHash();
    })
    .catch(err => {
      alert(err.message);
      setStatus(err.message);
    });
}

// INIT

init();

$("#deploy").click(() => deploy());
$("#set-1234").click(() => setHash("0x1234"));
$("#set-5678").click(() => setHash("0x5678"));
$("#set-90ab").click(() => setHash("0x90ab"));
$("#set-cdef").click(() => setHash("0xcdef"));
$("#clear").click(() => clearHash());
