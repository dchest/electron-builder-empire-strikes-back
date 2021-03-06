"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.WinPackager = undefined;

var _bluebirdLst;

function _load_bluebirdLst() {
    return _bluebirdLst = require("bluebird-lst");
}

var _bluebirdLst2;

function _load_bluebirdLst2() {
    return _bluebirdLst2 = _interopRequireDefault(require("bluebird-lst"));
}

let checkIcon = (() => {
    var _ref3 = (0, (_bluebirdLst || _load_bluebirdLst()).coroutine)(function* (file) {
        const fd = yield (0, (_fsExtraP || _load_fsExtraP()).open)(file, "r");
        const buffer = Buffer.allocUnsafe(512);
        try {
            yield (0, (_fsExtraP || _load_fsExtraP()).read)(fd, buffer, 0, buffer.length, 0);
        } finally {
            yield (0, (_fsExtraP || _load_fsExtraP()).close)(fd);
        }
        if (!isIco(buffer)) {
            throw new Error(`Windows icon is not valid ico file, please fix "${file}"`);
        }
        const sizes = parseIco(buffer);
        for (const size of sizes) {
            if (size.w >= 256 && size.h >= 256) {
                return;
            }
        }
        throw new Error(`Windows icon size must be at least 256x256, please fix "${file}"`);
    });

    return function checkIcon(_x) {
        return _ref3.apply(this, arguments);
    };
})();

let extractCommonNameUsingOpenssl = (() => {
    var _ref4 = (0, (_bluebirdLst || _load_bluebirdLst()).coroutine)(function* (password, certPath) {
        const result = yield (0, (_builderUtil || _load_builderUtil()).exec)("openssl", ["pkcs12", "-nokeys", "-nodes", "-passin", `pass:${password}`, "-nomacver", "-clcerts", "-in", certPath], { timeout: 30 * 1000 }, debugOpenssl.enabled);
        const match = result.match(/^subject.*\/CN=([^\/\n]+)/m);
        if (match == null || match[1] == null) {
            throw new Error(`Cannot extract common name from p12: ${result}`);
        } else {
            return match[1];
        }
    });

    return function extractCommonNameUsingOpenssl(_x2, _x3) {
        return _ref4.apply(this, arguments);
    };
})();
//# sourceMappingURL=winPackager.js.map


var _builderUtil;

function _load_builderUtil() {
    return _builderUtil = require("builder-util");
}

var _builderUtilRuntime;

function _load_builderUtilRuntime() {
    return _builderUtilRuntime = require("builder-util-runtime");
}

var _crypto;

function _load_crypto() {
    return _crypto = require("crypto");
}

var _debug2 = _interopRequireDefault(require("debug"));

var _fsExtraP;

function _load_fsExtraP() {
    return _fsExtraP = require("fs-extra-p");
}

var _isCi;

function _load_isCi() {
    return _isCi = _interopRequireDefault(require("is-ci"));
}

var _lazyVal;

function _load_lazyVal() {
    return _lazyVal = require("lazy-val");
}

var _path = _interopRequireWildcard(require("path"));

var _codeSign;

function _load_codeSign() {
    return _codeSign = require("./codeSign");
}

var _core;

function _load_core() {
    return _core = require("./core");
}

var _platformPackager;

function _load_platformPackager() {
    return _platformPackager = require("./platformPackager");
}

var _nsis;

function _load_nsis() {
    return _nsis = require("./targets/nsis/nsis");
}

var _nsisUtil;

function _load_nsisUtil() {
    return _nsisUtil = require("./targets/nsis/nsisUtil");
}

var _WebInstallerTarget;

function _load_WebInstallerTarget() {
    return _WebInstallerTarget = require("./targets/nsis/WebInstallerTarget");
}

var _targetFactory;

function _load_targetFactory() {
    return _targetFactory = require("./targets/targetFactory");
}

var _cacheManager;

function _load_cacheManager() {
    return _cacheManager = require("./util/cacheManager");
}

var _flags;

function _load_flags() {
    return _flags = require("./util/flags");
}

var _timer;

function _load_timer() {
    return _timer = require("./util/timer");
}

var _windowsCodeSign;

function _load_windowsCodeSign() {
    return _windowsCodeSign = require("./windowsCodeSign");
}

var _parallels;

function _load_parallels() {
    return _parallels = require("./parallels");
}

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class WinPackager extends (_platformPackager || _load_platformPackager()).PlatformPackager {
    constructor(info) {
        var _this;

        _this = super(info);
        this.cscInfo = new (_lazyVal || _load_lazyVal()).Lazy(() => {
            const platformSpecificBuildOptions = this.platformSpecificBuildOptions;
            if (platformSpecificBuildOptions.certificateSubjectName != null || platformSpecificBuildOptions.certificateSha1 != null) {
                if (platformSpecificBuildOptions.sign != null) {
                    return (_bluebirdLst2 || _load_bluebirdLst2()).default.resolve(null);
                }
                return this.vm.value.then(vm => (0, (_windowsCodeSign || _load_windowsCodeSign()).getCertificateFromStoreInfo)(platformSpecificBuildOptions, vm));
            }
            const certificateFile = platformSpecificBuildOptions.certificateFile;
            if (certificateFile != null) {
                const certificatePassword = this.getCscPassword();
                return (_bluebirdLst2 || _load_bluebirdLst2()).default.resolve({
                    file: certificateFile,
                    password: certificatePassword == null ? null : certificatePassword.trim()
                });
            }
            const cscLink = process.env.WIN_CSC_LINK || this.packagerOptions.cscLink;
            if (cscLink == null) {
                return (_bluebirdLst2 || _load_bluebirdLst2()).default.resolve(null);
            }
            return (0, (_codeSign || _load_codeSign()).downloadCertificate)(cscLink, this.info.tempDirManager, this.projectDir).then(path => {
                return {
                    file: path,
                    password: this.getCscPassword()
                };
            });
        });
        this._iconPath = new (_lazyVal || _load_lazyVal()).Lazy(() => this.getValidIconPath());
        this.vm = new (_lazyVal || _load_lazyVal()).Lazy(() => process.platform === "win32" ? (_bluebirdLst2 || _load_bluebirdLst2()).default.resolve(new (_parallels || _load_parallels()).VmManager()) : (0, (_parallels || _load_parallels()).getWindowsVm)(this.debugLogger));
        this.computedPublisherSubjectOnWindowsOnly = new (_lazyVal || _load_lazyVal()).Lazy((0, (_bluebirdLst || _load_bluebirdLst()).coroutine)(function* () {
            const cscInfo = yield _this.cscInfo.value;
            if (cscInfo == null) {
                return null;
            }
            if ("subject" in cscInfo) {
                return cscInfo.subject;
            }
            const vm = yield _this.vm.value;
            const info = cscInfo;
            const certFile = vm.toVmFile(info.file);
            // https://github.com/electron-userland/electron-builder/issues/1735
            const args = info.password ? [`(Get-PfxData "${certFile}" -Password (ConvertTo-SecureString -String "${info.password}" -Force -AsPlainText)).EndEntityCertificates.Subject`] : [`(Get-PfxCertificate "${certFile}").Subject`];
            return yield vm.exec("powershell.exe", args, { timeout: 30 * 1000 }).then(function (it) {
                return it.trim();
            });
        }));
        this.computedPublisherName = new (_lazyVal || _load_lazyVal()).Lazy((0, (_bluebirdLst || _load_bluebirdLst()).coroutine)(function* () {
            let publisherName = _this.platformSpecificBuildOptions.publisherName;
            if (publisherName === null) {
                return null;
            }
            const cscInfo = yield _this.cscInfo.value;
            if (cscInfo == null) {
                return null;
            }
            if ("subject" in cscInfo) {
                return (0, (_builderUtil || _load_builderUtil()).asArray)((0, (_builderUtilRuntime || _load_builderUtilRuntime()).parseDn)(cscInfo.subject).get("CN"));
            }
            const cscFile = cscInfo.file;
            if (publisherName == null && cscFile != null) {
                if (process.platform === "win32") {
                    try {
                        const subject = yield _this.computedPublisherSubjectOnWindowsOnly.value;
                        const commonName = subject == null ? null : (0, (_builderUtilRuntime || _load_builderUtilRuntime()).parseDn)(subject).get("CN");
                        if (commonName) {
                            return (0, (_builderUtil || _load_builderUtil()).asArray)(commonName);
                        }
                    } catch (e) {
                        (0, (_builderUtil || _load_builderUtil()).warn)(`Cannot get publisher name using powershell: ${e.message}`);
                    }
                }
                try {
                    publisherName = yield extractCommonNameUsingOpenssl(cscInfo.password || "", cscFile);
                } catch (e) {
                    throw new Error(`Cannot extract publisher name from code signing certificate, please file issue. As workaround, set win.publisherName: ${e.stack || e}`);
                }
            }
            return publisherName == null ? null : (0, (_builderUtil || _load_builderUtil()).asArray)(publisherName);
        }));
    }
    get isForceCodeSigningVerification() {
        return this.platformSpecificBuildOptions.verifyUpdateCodeSignature !== false;
    }
    get defaultTarget() {
        return ["nsis"];
    }
    doGetCscPassword() {
        return this.platformSpecificBuildOptions.certificatePassword || process.env.WIN_CSC_KEY_PASSWORD || super.doGetCscPassword();
    }
    createTargets(targets, mapper) {
        let copyElevateHelper;
        const getCopyElevateHelper = () => {
            if (copyElevateHelper == null) {
                copyElevateHelper = new (_nsisUtil || _load_nsisUtil()).CopyElevateHelper();
            }
            return copyElevateHelper;
        };
        let helper;
        const getHelper = () => {
            if (helper == null) {
                helper = new (_nsisUtil || _load_nsisUtil()).AppPackageHelper(getCopyElevateHelper());
            }
            return helper;
        };
        for (const name of targets) {
            if (name === (_core || _load_core()).DIR_TARGET) {
                continue;
            }
            if (name === "nsis" || name === "portable") {
                mapper(name, outDir => new (_nsis || _load_nsis()).NsisTarget(this, outDir, name, getHelper()));
            } else if (name === "nsis-web") {
                // package file format differs from nsis target
                mapper(name, outDir => new (_WebInstallerTarget || _load_WebInstallerTarget()).WebInstallerTarget(this, _path.join(outDir, name), name, new (_nsisUtil || _load_nsisUtil()).AppPackageHelper(getCopyElevateHelper())));
            } else {
                const targetClass = (() => {
                    switch (name) {
                        case "squirrel":
                            try {
                                return require("electron-builder-squirrel-windows").default;
                            } catch (e) {
                                throw new Error(`Module electron-builder-squirrel-windows must be installed in addition to build Squirrel.Windows: ${e.stack || e}`);
                            }
                        case "appx":
                            return require("./targets/AppxTarget").default;
                        case "msi":
                            return require("./targets/MsiTarget").default;
                        default:
                            return null;
                    }
                })();
                mapper(name, outDir => targetClass === null ? (0, (_targetFactory || _load_targetFactory()).createCommonTarget)(name, outDir, this) : new targetClass(this, outDir, name));
            }
        }
    }
    get platform() {
        return (_core || _load_core()).Platform.WINDOWS;
    }
    getIconPath() {
        return this._iconPath.value;
    }
    getValidIconPath() {
        var _this2 = this;

        return (0, (_bluebirdLst || _load_bluebirdLst()).coroutine)(function* () {
            let iconPath = _this2.platformSpecificBuildOptions.icon || _this2.config.icon;
            if (iconPath != null && !iconPath.endsWith(".ico")) {
                iconPath += ".ico";
            }
            iconPath = iconPath == null ? yield _this2.getDefaultIcon("ico") : _path.resolve(_this2.projectDir, iconPath);
            if (iconPath == null) {
                return null;
            }
            yield checkIcon(iconPath);
            return iconPath;
        })();
    }
    sign(file, logMessagePrefix) {
        var _this3 = this;

        return (0, (_bluebirdLst || _load_bluebirdLst()).coroutine)(function* () {
            const signOptions = {
                path: file,
                name: _this3.appInfo.productName,
                site: yield _this3.appInfo.computePackageUrl(),
                options: _this3.platformSpecificBuildOptions
            };
            const cscInfo = yield _this3.cscInfo.value;
            if (cscInfo == null) {
                if (_this3.platformSpecificBuildOptions.sign != null) {
                    yield (0, (_windowsCodeSign || _load_windowsCodeSign()).sign)(signOptions, _this3);
                } else if (_this3.forceCodeSigning) {
                    throw new Error(`App is not signed and "forceCodeSigning" is set to true, please ensure that code signing configuration is correct, please see https://electron.build/code-signing`);
                }
                return;
            }
            if (logMessagePrefix == null) {
                logMessagePrefix = `Signing ${_path.basename(file)}`;
            }
            if ("file" in cscInfo) {
                (0, (_builderUtil || _load_builderUtil()).log)(`${logMessagePrefix} (certificate file: "${cscInfo.file}")`);
            } else {
                const info = cscInfo;
                (0, (_builderUtil || _load_builderUtil()).log)(`${logMessagePrefix} (subject: "${info.subject}", thumbprint: "${info.thumbprint}", store: ${info.store} (${info.isLocalMachineStore ? "local machine" : "current user"}))`);
            }
            yield _this3.doSign(Object.assign({}, signOptions, { cscInfo, options: Object.assign({}, _this3.platformSpecificBuildOptions) }));
        })();
    }
    doSign(options) {
        var _this4 = this;

        return (0, (_bluebirdLst || _load_bluebirdLst()).coroutine)(function* () {
            for (let i = 0; i < 3; i++) {
                try {
                    yield (0, (_windowsCodeSign || _load_windowsCodeSign()).sign)(options, _this4);
                    break;
                } catch (e) {
                    // https://github.com/electron-userland/electron-builder/issues/1414
                    const message = e.message;
                    if (message != null && message.includes("Couldn't resolve host name")) {
                        (0, (_builderUtil || _load_builderUtil()).warn)(`Cannot sign, attempt ${i + 1}: ${message}`);
                        continue;
                    }
                    throw e;
                }
            }
        })();
    }
    signAndEditResources(file, arch, outDir, internalName, requestedExecutionLevel) {
        var _this5 = this;

        return (0, (_bluebirdLst || _load_bluebirdLst()).coroutine)(function* () {
            const appInfo = _this5.appInfo;
            const files = [];
            const args = [file, "--set-version-string", "FileDescription", appInfo.productName, "--set-version-string", "ProductName", appInfo.productName, "--set-version-string", "LegalCopyright", appInfo.copyright, "--set-file-version", appInfo.buildVersion, "--set-product-version", appInfo.versionInWeirdWindowsForm];
            if (internalName != null) {
                args.push("--set-version-string", "InternalName", internalName, "--set-version-string", "OriginalFilename", "");
            }
            if (requestedExecutionLevel != null && requestedExecutionLevel !== "asInvoker") {
                args.push("--set-requested-execution-level", requestedExecutionLevel);
            }
            (0, (_builderUtil || _load_builderUtil()).use)(appInfo.companyName, function (it) {
                return args.push("--set-version-string", "CompanyName", it);
            });
            (0, (_builderUtil || _load_builderUtil()).use)(_this5.platformSpecificBuildOptions.legalTrademarks, function (it) {
                return args.push("--set-version-string", "LegalTrademarks", it);
            });
            const iconPath = yield _this5.getIconPath();
            (0, (_builderUtil || _load_builderUtil()).use)(iconPath, function (it) {
                files.push(it);
                args.push("--set-icon", it);
            });
            const config = _this5.config;
            const cscInfoForCacheDigest = !(0, (_flags || _load_flags()).isBuildCacheEnabled)() || (_isCi || _load_isCi()).default || config.electronDist != null ? null : yield _this5.cscInfo.value;
            let buildCacheManager = null;
            // resources editing doesn't change executable for the same input and executed quickly - no need to complicate
            if (cscInfoForCacheDigest != null) {
                const cscFile = cscInfoForCacheDigest.file;
                if (cscFile != null) {
                    files.push(cscFile);
                }
                const timer = (0, (_timer || _load_timer()).time)("executable cache");
                const hash = (0, (_crypto || _load_crypto()).createHash)("sha512");
                hash.update(config.electronVersion || "no electronVersion");
                hash.update(config.muonVersion || "no muonVersion");
                hash.update(JSON.stringify(_this5.platformSpecificBuildOptions));
                hash.update(JSON.stringify(args));
                hash.update(_this5.platformSpecificBuildOptions.certificateSha1 || "no certificateSha1");
                hash.update(_this5.platformSpecificBuildOptions.certificateSubjectName || "no subjectName");
                buildCacheManager = new (_cacheManager || _load_cacheManager()).BuildCacheManager(outDir, file, arch);
                if (yield buildCacheManager.copyIfValid((yield (0, (_cacheManager || _load_cacheManager()).digest)(hash, files)))) {
                    timer.end();
                    return;
                }
                timer.end();
            }
            const timer = (0, (_timer || _load_timer()).time)("wine&sign");
            yield (0, (_builderUtil || _load_builderUtil()).execWine)(_path.join((yield (0, (_windowsCodeSign || _load_windowsCodeSign()).getSignVendorPath)()), "rcedit.exe"), args);
            yield _this5.sign(file);
            timer.end();
            if (buildCacheManager != null) {
                yield buildCacheManager.save();
            }
        })();
    }
    postInitApp(packContext) {
        var _this6 = this;

        return (0, (_bluebirdLst || _load_bluebirdLst()).coroutine)(function* () {
            const executable = _path.join(packContext.appOutDir, `${_this6.appInfo.productFilename}.exe`);
            yield (0, (_fsExtraP || _load_fsExtraP()).rename)(_path.join(packContext.appOutDir, `${_this6.electronDistExecutableName}.exe`), executable);
        })();
    }
    signApp(packContext) {
        const exeFileName = `${this.appInfo.productFilename}.exe`;
        return this.signAndEditResources(_path.join(packContext.appOutDir, exeFileName), packContext.arch, packContext.outDir, _path.basename(exeFileName, ".exe"), this.platformSpecificBuildOptions.requestedExecutionLevel);
    }
}
exports.WinPackager = WinPackager;

function parseIco(buffer) {
    if (!isIco(buffer)) {
        throw new Error("buffer is not ico");
    }
    const n = buffer.readUInt16LE(4);
    const result = new Array(n);
    for (let i = 0; i < n; i++) {
        result[i] = {
            w: buffer.readUInt8(6 + i * 16) || 256,
            h: buffer.readUInt8(7 + i * 16) || 256
        };
    }
    return result;
}
function isIco(buffer) {
    return buffer.readUInt16LE(0) === 0 && buffer.readUInt16LE(2) === 1;
}
const debugOpenssl = (0, _debug2.default)("electron-builder:openssl");