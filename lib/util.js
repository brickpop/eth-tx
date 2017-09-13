module.exports = {
  prependFileNameToken,
  handleErrorLines
};

function prependFileNameToken(file) {
  return "\n//File: " + file + "\n";
}

// Find the original file (before bundling) that originated every one of the errors found

function handleErrorLines(bundledContractSrc, errors) {
  var lines = bundledContractSrc.split("\n");
  if (!bundledContractSrc || !errors || !errors.length) return [];

  errors.forEach((error, idx) => {
    var rErrPos = new RegExp(":([0-9]+):([0-9]+):");
    var errPos = rErrPos.exec(error);
    var lineNum = errPos ? parseInt(errPos[1]) - 1 : -1;
    var offset = 1;
    var filePattern = new RegExp("//File: (.*)", "");
    var fileInfo;

    while (offset <= lineNum) {
      fileInfo = filePattern.exec(lines[lineNum - offset]);
      if (fileInfo) {
        errors[idx] = error.replace(
          rErrPos,
          fileInfo[1] + " :" + offset + ":" + errPos[2] + ":"
        );
        break;
      }
      offset++;
    }
  });
  return errors;
}
