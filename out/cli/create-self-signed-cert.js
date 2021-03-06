"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.createSelfSignedCert = undefined;

var _bluebirdLst;

function _load_bluebirdLst() {
    return _bluebirdLst = require("bluebird-lst");
}

/** @internal */
let createSelfSignedCert = exports.createSelfSignedCert = (() => {
    var _ref = (0, (_bluebirdLst || _load_bluebirdLst()).coroutine)(function* (publisher) {
        const tmpDir = new (_builderUtil || _load_builderUtil()).TmpDir();
        const targetDir = process.cwd();
        const tempPrefix = _path.join((yield tmpDir.getTempDir()), (0, (_sanitizeFilename || _load_sanitizeFilename()).default)(publisher));
        const cer = `${tempPrefix}.cer`;
        const pvk = `${tempPrefix}.pvk`;
        (0, (_builderUtil || _load_builderUtil()).log)((0, (_chalk || _load_chalk()).bold)('When asked to enter a password ("Create Private Key Password"), please select "None".'));
        try {
            yield (0, (_fsExtraP || _load_fsExtraP()).ensureDir)(_path.dirname(tempPrefix));
            const vendorPath = _path.join((yield (0, (_windowsCodeSign || _load_windowsCodeSign()).getSignVendorPath)()), "windows-10", process.arch);
            yield (0, (_builderUtil || _load_builderUtil()).exec)(_path.join(vendorPath, "makecert.exe"), ["-r", "-h", "0", "-n", `CN=${(0, (_AppxTarget || _load_AppxTarget()).quoteString)(publisher)}`, "-eku", "1.3.6.1.5.5.7.3.3", "-pe", "-sv", pvk, cer]);
            const pfx = _path.join(targetDir, `${(0, (_sanitizeFilename || _load_sanitizeFilename()).default)(publisher)}.pfx`);
            yield (0, (_fs || _load_fs()).unlinkIfExists)(pfx);
            yield (0, (_builderUtil || _load_builderUtil()).exec)(_path.join(vendorPath, "pvk2pfx.exe"), ["-pvk", pvk, "-spc", cer, "-pfx", pfx]);
            (0, (_builderUtil || _load_builderUtil()).log)(`${pfx} created. Please see https://electron.build/code-signing how to use it to sign.`);
            const certLocation = "Cert:\\LocalMachine\\TrustedPeople";
            (0, (_builderUtil || _load_builderUtil()).log)(`${pfx} will be imported into ${certLocation} Operation will be succeed only if runned from root. Otherwise import file manually.`);
            yield (0, (_builderUtil || _load_builderUtil()).spawn)("powershell.exe", ["Import-PfxCertificate", "-FilePath", `"${pfx}"`, "-CertStoreLocation", ""]);
        } finally {
            yield tmpDir.cleanup();
        }
    });

    return function createSelfSignedCert(_x) {
        return _ref.apply(this, arguments);
    };
})();
//# sourceMappingURL=create-self-signed-cert.js.map


var _builderUtil;

function _load_builderUtil() {
    return _builderUtil = require("builder-util");
}

var _fs;

function _load_fs() {
    return _fs = require("builder-util/out/fs");
}

var _chalk;

function _load_chalk() {
    return _chalk = require("chalk");
}

var _fsExtraP;

function _load_fsExtraP() {
    return _fsExtraP = require("fs-extra-p");
}

var _path = _interopRequireWildcard(require("path"));

var _sanitizeFilename;

function _load_sanitizeFilename() {
    return _sanitizeFilename = _interopRequireDefault(require("sanitize-filename"));
}

var _AppxTarget;

function _load_AppxTarget() {
    return _AppxTarget = require("../targets/AppxTarget");
}

var _windowsCodeSign;

function _load_windowsCodeSign() {
    return _windowsCodeSign = require("../windowsCodeSign");
}

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }