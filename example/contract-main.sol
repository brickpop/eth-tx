pragma solidity ^0.4.15;

import "./contract-lib.sol";

contract HashStore is Owned {
    bytes public storedHash;

    function HashStore(bytes _initialHash) {
        storedHash = _initialHash;
    }

    function setHash(bytes _newHash) onlyOwner {
        storedHash = _newHash;
    }

    function getHash() constant returns (bytes) {
        return storedHash;
    }

    function () payable {
        if (msg.value >= 10 wei) {
            storedHash = "";
        }
    }
}
