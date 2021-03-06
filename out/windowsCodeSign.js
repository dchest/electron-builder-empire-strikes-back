"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.getCertificateFromStoreInfo = exports.sign = undefined;

var _bluebirdLst;

function _load_bluebirdLst() {
    return _bluebirdLst = require("bluebird-lst");
}

let sign = exports.sign = (() => {
    var _ref = (0, (_bluebirdLst || _load_bluebirdLst()).coroutine)(function* (options, packager) {
        let hashes = options.options.signingHashAlgorithms;
        // msi does not support dual-signing
        if (options.path.endsWith(".msi")) {
            hashes = [hashes != null && !hashes.includes("sha1") ? "sha256" : "sha1"];
        } else if (options.path.endsWith(".appx")) {
            hashes = ["sha256"];
        } else if (hashes == null) {
            hashes = ["sha1", "sha256"];
        } else {
            hashes = Array.isArray(hashes) ? hashes : [hashes];
        }
        function defaultExecutor(configuration) {
            return doSign(configuration, packager);
        }
        const executor = (0, (_platformPackager || _load_platformPackager()).resolveFunction)(options.options.sign) || defaultExecutor;
        let isNest = false;
        for (const hash of hashes) {
            const taskConfiguration = Object.assign({}, options, { hash, isNest });
            yield executor(Object.assign({}, taskConfiguration, { computeSignToolArgs: function (isWin) {
                    return computeSignToolArgs(taskConfiguration, isWin);
                } }));
            isNest = true;
            if (taskConfiguration.resultOutputPath != null) {
                yield (0, (_fsExtraP || _load_fsExtraP()).rename)(taskConfiguration.resultOutputPath, options.path);
            }
        }
    });

    return function sign(_x, _x2) {
        return _ref.apply(this, arguments);
    };
})();

let getCertificateFromStoreInfo = exports.getCertificateFromStoreInfo = (() => {
    var _ref2 = (0, (_bluebirdLst || _load_bluebirdLst()).coroutine)(function* (options, vm) {
        const certificateSubjectName = options.certificateSubjectName;
        const certificateSha1 = options.certificateSha1;
        // ExcludeProperty doesn't work, so, we cannot exclude RawData, it is ok
        // powershell can return object if the only item
        const rawResult = yield vm.exec("powershell.exe", ["Get-ChildItem -Recurse Cert: -CodeSigningCert | Select-Object -Property Subject,PSParentPath,Thumbprint | ConvertTo-Json -Compress"]);
        const certList = rawResult.length === 0 ? [] : (0, (_builderUtil || _load_builderUtil()).asArray)(JSON.parse(rawResult));
        for (const certInfo of certList) {
            if (certificateSubjectName != null) {
                if (!certInfo.Subject.includes(certificateSubjectName)) {
                    continue;
                }
            } else if (certInfo.Thumbprint !== certificateSha1) {
                continue;
            }
            const parentPath = certInfo.PSParentPath;
            const store = parentPath.substring(parentPath.lastIndexOf("\\") + 1);
            (0, (_builderUtil || _load_builderUtil()).debug)(`Auto-detect certificate store ${store} (PSParentPath: ${parentPath})`);
            // https://github.com/electron-userland/electron-builder/issues/1717
            const isLocalMachineStore = parentPath.includes("Certificate::LocalMachine");
            (0, (_builderUtil || _load_builderUtil()).debug)(`Auto-detect using of LocalMachine store`);
            return {
                thumbprint: certInfo.Thumbprint,
                subject: certInfo.Subject,
                store,
                isLocalMachineStore
            };
        }
        throw new Error(`Cannot find certificate ${certificateSubjectName || certificateSha1}, all certs: ${rawResult}`);
    });

    return function getCertificateFromStoreInfo(_x3, _x4) {
        return _ref2.apply(this, arguments);
    };
})();

let doSign = (() => {
    var _ref3 = (0, (_bluebirdLst || _load_bluebirdLst()).coroutine)(function* (configuration, packager) {
        // https://github.com/electron-userland/electron-builder/pull/1944
        const timeout = parseInt(process.env.SIGNTOOL_TIMEOUT, 10) || 10 * 60 * 1000;
        let tool;
        let args;
        let env = process.env;
        let vm;
        if (configuration.path.endsWith(".appx") || !("file" in configuration.cscInfo) /* certificateSubjectName and other such options */) {
                vm = yield packager.vm.value;
                const vendorPath = yield getSignVendorPath();
                tool = _path.join(vendorPath, "windows-10", process.arch, "signtool.exe");
                args = computeSignToolArgs(configuration, true, vm);
            } else {
            vm = new (_parallels || _load_parallels()).VmManager();
            const toolInfo = yield getToolPath();
            tool = toolInfo.path;
            args = configuration.computeSignToolArgs(process.platform === "win32");
            if (toolInfo.env != null) {
                env = toolInfo.env;
            }
        }
        yield vm.exec(tool, args, { timeout, env });
    });

    return function doSign(_x5, _x6) {
        return _ref3.apply(this, arguments);
    };
})();
// on windows be aware of http://stackoverflow.com/a/32640183/1910191


let getToolPath = (() => {
    var _ref4 = (0, (_bluebirdLst || _load_bluebirdLst()).coroutine)(function* () {
        if ((0, (_flags || _load_flags()).isUseSystemSigncode)()) {
            return { path: "osslsigncode" };
        }
        const result = process.env.SIGNTOOL_PATH;
        if (result) {
            return { path: result };
        }
        const vendorPath = yield getSignVendorPath();
        if (process.platform === "win32") {
            // use modern signtool on Windows Server 2012 R2 to be able to sign AppX
            if (isOldWin6()) {
                return { path: _path.join(vendorPath, "windows-6", "signtool.exe") };
            } else {
                return { path: _path.join(vendorPath, "windows-10", process.arch, "signtool.exe") };
            }
        } else if (process.platform === "darwin") {
            let suffix = null;
            try {
                if (yield (0, (_builderUtil || _load_builderUtil()).isMacOsSierra)()) {
                    const toolDirPath = _path.join(vendorPath, process.platform, "10.12");
                    return {
                        path: _path.join(toolDirPath, "osslsigncode"),
                        env: (0, (_bundledTool || _load_bundledTool()).computeToolEnv)([_path.join(toolDirPath, "lib")])
                    };
                } else if ((_isCi || _load_isCi()).default) {
                    // not clear for what we do this instead of using version detection
                    suffix = "ci";
                }
            } catch (e) {
                (0, (_builderUtil || _load_builderUtil()).warn)(`${e.stack || e}`);
            }
            return { path: _path.join(vendorPath, process.platform, `${suffix == null ? "" : `${suffix}/`}osslsigncode`) };
        } else {
            return { path: _path.join(vendorPath, process.platform, "osslsigncode") };
        }
    });

    return function getToolPath() {
        return _ref4.apply(this, arguments);
    };
})();
//# sourceMappingURL=windowsCodeSign.js.map


exports.getSignVendorPath = getSignVendorPath;
exports.isOldWin6 = isOldWin6;

var _builderUtil;

function _load_builderUtil() {
    return _builderUtil = require("builder-util");
}

var _binDownload;

function _load_binDownload() {
    return _binDownload = require("builder-util/out/binDownload");
}

var _bundledTool;

function _load_bundledTool() {
    return _bundledTool = require("builder-util/out/bundledTool");
}

var _fsExtraP;

function _load_fsExtraP() {
    return _fsExtraP = require("fs-extra-p");
}

var _isCi;

function _load_isCi() {
    return _isCi = _interopRequireDefault(require("is-ci"));
}

var _os;

function _load_os() {
    return _os = _interopRequireWildcard(require("os"));
}

var _path = _interopRequireWildcard(require("path"));

var _platformPackager;

function _load_platformPackager() {
    return _platformPackager = require("./platformPackager");
}

var _flags;

function _load_flags() {
    return _flags = require("./util/flags");
}

var _parallels;

function _load_parallels() {
    return _parallels = require("./parallels");
}

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function getSignVendorPath() {
    //noinspection SpellCheckingInspection
    return (0, (_binDownload || _load_binDownload()).getBinFromGithub)("winCodeSign", "1.9.0", "cyhO9Mv5MTP2o9dwk/+qs0KvuO9CbDhjEJXA2ujpvhcsk5zmc+zY9iqiWXVzOuibTLYNC3qZiuFlJrrCT2kldw==");
}
function computeSignToolArgs(options, isWin, vm = new (_parallels || _load_parallels()).VmManager()) {
    const inputFile = vm.toVmFile(options.path);
    const outputPath = isWin ? inputFile : getOutputPath(inputFile, options.hash);
    if (!isWin) {
        options.resultOutputPath = outputPath;
    }
    const args = isWin ? ["sign"] : ["-in", inputFile, "-out", outputPath];
    if (process.env.ELECTRON_BUILDER_OFFLINE !== "true") {
        const timestampingServiceUrl = options.options.timeStampServer || "http://timestamp.verisign.com/scripts/timstamp.dll";
        if (isWin) {
            args.push(options.isNest || options.hash === "sha256" ? "/tr" : "/t", options.isNest || options.hash === "sha256" ? options.options.rfc3161TimeStampServer || "http://timestamp.comodoca.com/rfc3161" : timestampingServiceUrl);
        } else {
            args.push("-t", timestampingServiceUrl);
        }
    }
    const certificateFile = options.cscInfo.file;
    if (certificateFile == null) {
        const cscInfo = options.cscInfo;
        const subjectName = cscInfo.thumbprint;
        if (!isWin) {
            throw new Error(`${subjectName == null ? "certificateSha1" : "certificateSubjectName"} supported only on Windows`);
        }
        args.push("/sha1", cscInfo.thumbprint);
        args.push("/s", cscInfo.store);
        if (cscInfo.isLocalMachineStore) {
            args.push("/sm");
        }
    } else {
        const certExtension = _path.extname(certificateFile);
        if (certExtension === ".p12" || certExtension === ".pfx") {
            args.push(isWin ? "/f" : "-pkcs12", vm.toVmFile(certificateFile));
        } else {
            throw new Error(`Please specify pkcs12 (.p12/.pfx) file, ${certificateFile} is not correct`);
        }
    }
    if (!isWin || options.hash !== "sha1") {
        args.push(isWin ? "/fd" : "-h", options.hash);
        if (isWin && process.env.ELECTRON_BUILDER_OFFLINE !== "true") {
            args.push("/td", "sha256");
        }
    }
    if (options.name) {
        args.push(isWin ? "/d" : "-n", options.name);
    }
    if (options.site) {
        args.push(isWin ? "/du" : "-i", options.site);
    }
    // msi does not support dual-signing
    if (options.isNest) {
        args.push(isWin ? "/as" : "-nest");
    }
    const password = options.cscInfo == null ? null : options.cscInfo.password;
    if (password) {
        args.push(isWin ? "/p" : "-pass", password);
    }
    if (options.options.additionalCertificateFile) {
        args.push(isWin ? "/ac" : "-ac", vm.toVmFile(options.options.additionalCertificateFile));
    }
    if (isWin) {
        // must be last argument
        args.push(inputFile);
    }
    return args;
}
function getOutputPath(inputPath, hash) {
    const extension = _path.extname(inputPath);
    return _path.join(_path.dirname(inputPath), `${_path.basename(inputPath, extension)}-signed-${hash}${extension}`);
}
/** @internal */
function isOldWin6() {
    const winVersion = (_os || _load_os()).release();
    return winVersion.startsWith("6.") && !winVersion.startsWith("6.3");
}