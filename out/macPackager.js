"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _bluebirdLst;

function _load_bluebirdLst() {
    return _bluebirdLst = require("bluebird-lst");
}

var _bluebirdLst2;

function _load_bluebirdLst2() {
    return _bluebirdLst2 = _interopRequireDefault(require("bluebird-lst"));
}

var _builderUtil;

function _load_builderUtil() {
    return _builderUtil = require("builder-util");
}

var _electronOsxSign;

function _load_electronOsxSign() {
    return _electronOsxSign = require("electron-osx-sign");
}

var _fsExtraP;

function _load_fsExtraP() {
    return _fsExtraP = require("fs-extra-p");
}

var _path = _interopRequireWildcard(require("path"));

var _deepAssign;

function _load_deepAssign() {
    return _deepAssign = require("read-config-file/out/deepAssign");
}

var _appInfo;

function _load_appInfo() {
    return _appInfo = require("./appInfo");
}

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

var _dmg;

function _load_dmg() {
    return _dmg = require("./targets/dmg");
}

var _pkg;

function _load_pkg() {
    return _pkg = require("./targets/pkg");
}

var _targetFactory;

function _load_targetFactory() {
    return _targetFactory = require("./targets/targetFactory");
}

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class MacPackager extends (_platformPackager || _load_platformPackager()).PlatformPackager {
    constructor(info) {
        super(info);
        if (this.packagerOptions.cscLink == null || process.platform !== "darwin") {
            this.codeSigningInfo = (_bluebirdLst2 || _load_bluebirdLst2()).default.resolve({ keychainName: process.env.CSC_KEYCHAIN || null });
        } else {
            this.codeSigningInfo = (0, (_codeSign || _load_codeSign()).createKeychain)({
                tmpDir: info.tempDirManager,
                cscLink: this.packagerOptions.cscLink,
                cscKeyPassword: this.getCscPassword(),
                cscILink: this.packagerOptions.cscInstallerLink,
                cscIKeyPassword: this.packagerOptions.cscInstallerKeyPassword,
                currentDir: this.projectDir
            });
        }
    }
    get defaultTarget() {
        return ["zip", "dmg"];
    }
    prepareAppInfo(appInfo) {
        return new (_appInfo || _load_appInfo()).AppInfo(this.info, this.platformSpecificBuildOptions.bundleVersion);
    }
    getIconPath() {
        var _this = this;

        return (0, (_bluebirdLst || _load_bluebirdLst()).coroutine)(function* () {
            let iconPath = _this.platformSpecificBuildOptions.icon || _this.config.icon;
            if (iconPath != null && !iconPath.endsWith(".icns")) {
                iconPath += ".icns";
            }
            return iconPath == null ? yield _this.getDefaultIcon("icns") : yield _this.getResource(iconPath);
        })();
    }
    createTargets(targets, mapper) {
        for (const name of targets) {
            switch (name) {
                case (_core || _load_core()).DIR_TARGET:
                    break;
                case "dmg":
                    mapper("dmg", outDir => new (_dmg || _load_dmg()).DmgTarget(this, outDir));
                    break;
                case "pkg":
                    mapper("pkg", outDir => new (_pkg || _load_pkg()).PkgTarget(this, outDir));
                    break;
                default:
                    mapper(name, outDir => name === "mas" || name === "mas-dev" ? new (_targetFactory || _load_targetFactory()).NoOpTarget(name) : (0, (_targetFactory || _load_targetFactory()).createCommonTarget)(name, outDir, this));
                    break;
            }
        }
    }
    get platform() {
        return (_core || _load_core()).Platform.MAC;
    }
    pack(outDir, arch, targets, taskManager) {
        var _this2 = this;

        return (0, (_bluebirdLst || _load_bluebirdLst()).coroutine)(function* () {
            let nonMasPromise = null;
            const hasMas = targets.length !== 0 && targets.some(function (it) {
                return it.name === "mas" || it.name === "mas-dev";
            });
            const prepackaged = _this2.packagerOptions.prepackaged;
            if (!hasMas || targets.length > 1) {
                const appPath = prepackaged == null ? _path.join(_this2.computeAppOutDir(outDir, arch), `${_this2.appInfo.productFilename}.app`) : prepackaged;
                nonMasPromise = (prepackaged ? (_bluebirdLst2 || _load_bluebirdLst2()).default.resolve() : _this2.doPack(outDir, _path.dirname(appPath), _this2.platform.nodeName, arch, _this2.platformSpecificBuildOptions, targets)).then(function () {
                    return _this2.sign(appPath, null, null);
                }).then(function () {
                    return _this2.packageInDistributableFormat(appPath, (_builderUtil || _load_builderUtil()).Arch.x64, targets, taskManager);
                });
            }
            for (const target of targets) {
                const targetName = target.name;
                if (!(targetName === "mas" || targetName === "mas-dev")) {
                    continue;
                }
                const masBuildOptions = (0, (_deepAssign || _load_deepAssign()).deepAssign)({}, _this2.platformSpecificBuildOptions, _this2.config.mas);
                if (targetName === "mas-dev") {
                    (0, (_deepAssign || _load_deepAssign()).deepAssign)(masBuildOptions, _this2.config[targetName], {
                        type: "development"
                    });
                }
                const targetOutDir = _path.join(outDir, targetName);
                if (prepackaged == null) {
                    yield _this2.doPack(outDir, targetOutDir, "mas", arch, masBuildOptions, [target]);
                    yield _this2.sign(_path.join(targetOutDir, `${_this2.appInfo.productFilename}.app`), targetOutDir, masBuildOptions);
                } else {
                    yield _this2.sign(prepackaged, targetOutDir, masBuildOptions);
                }
            }
            if (nonMasPromise != null) {
                yield nonMasPromise;
            }
        })();
    }
    sign(appPath, outDir, masOptions) {
        var _this3 = this;

        return (0, (_bluebirdLst || _load_bluebirdLst()).coroutine)(function* () {
            if (!(0, (_codeSign || _load_codeSign()).isSignAllowed)()) {
                return;
            }
            const isMas = masOptions != null;
            const macOptions = _this3.platformSpecificBuildOptions;
            const qualifier = (isMas ? masOptions.identity : null) || macOptions.identity;
            if (!isMas && qualifier === null) {
                if (_this3.forceCodeSigning) {
                    throw new Error("identity explicitly is set to null, but forceCodeSigning is set to true");
                }
                (0, (_builderUtil || _load_builderUtil()).log)("identity explicitly is set to null, skipping macOS application code signing.");
                return;
            }
            const keychainName = (yield _this3.codeSigningInfo).keychainName;
            const explicitType = isMas ? masOptions.type : macOptions.type;
            const type = explicitType || "distribution";
            const isDevelopment = type === "development";
            const certificateType = getCertificateType(isMas, isDevelopment);
            let identity = yield (0, (_codeSign || _load_codeSign()).findIdentity)(certificateType, qualifier, keychainName);
            if (identity == null) {
                if (!isMas && !isDevelopment && explicitType !== "distribution") {
                    identity = yield (0, (_codeSign || _load_codeSign()).findIdentity)("Mac Developer", qualifier, keychainName);
                    if (identity != null) {
                        (0, (_builderUtil || _load_builderUtil()).warn)("Mac Developer is used to sign app — it is only for development and testing, not for production");
                    }
                }
                if (identity == null) {
                    yield (0, (_codeSign || _load_codeSign()).reportError)(isMas, certificateType, qualifier, keychainName, _this3.forceCodeSigning);
                    return;
                }
            }
            const signOptions = {
                "identity-validation": false,
                // https://github.com/electron-userland/electron-builder/issues/1699
                // kext are signed by the chipset manufacturers. You need a special certificate (only available on request) from Apple to be able to sign kext.
                ignore: function (file) {
                    return file.endsWith(".kext") || file.startsWith("/Contents/PlugIns", appPath.length);
                },
                identity: identity,
                type,
                platform: isMas ? "mas" : "darwin",
                version: _this3.config.electronVersion,
                app: appPath,
                keychain: keychainName || undefined,
                binaries: (isMas && masOptions != null ? masOptions.binaries : macOptions.binaries) || undefined,
                requirements: isMas || macOptions.requirements == null ? undefined : yield _this3.getResource(macOptions.requirements),
                "gatekeeper-assess": (_codeSign || _load_codeSign()).appleCertificatePrefixes.find(function (it) {
                    return identity.name.startsWith(it);
                }) != null
            };
            yield _this3.adjustSignOptions(signOptions, masOptions);
            yield (0, (_builderUtil || _load_builderUtil()).task)(`Signing app (identity: ${identity.hash} ${identity.name})`, _this3.doSign(signOptions));
            // https://github.com/electron-userland/electron-builder/issues/1196#issuecomment-312310209
            if (masOptions != null && !isDevelopment) {
                const certType = isDevelopment ? "Mac Developer" : "3rd Party Mac Developer Installer";
                const masInstallerIdentity = yield (0, (_codeSign || _load_codeSign()).findIdentity)(certType, masOptions.identity, keychainName);
                if (masInstallerIdentity == null) {
                    throw new Error(`Cannot find valid "${certType}" identity to sign MAS installer, please see https://electron.build/code-signing`);
                }
                const artifactName = _this3.expandArtifactNamePattern(masOptions, "pkg");
                const artifactPath = _path.join(outDir, artifactName);
                yield _this3.doFlat(appPath, artifactPath, masInstallerIdentity, keychainName);
                _this3.dispatchArtifactCreated(artifactPath, null, (_builderUtil || _load_builderUtil()).Arch.x64, _this3.computeSafeArtifactName(artifactName, "pkg"));
            }
        })();
    }
    adjustSignOptions(signOptions, masOptions) {
        var _this4 = this;

        return (0, (_bluebirdLst || _load_bluebirdLst()).coroutine)(function* () {
            const resourceList = yield _this4.resourceList;
            if (resourceList.includes(`entitlements.osx.plist`)) {
                throw new Error("entitlements.osx.plist is deprecated name, please use entitlements.mac.plist");
            }
            if (resourceList.includes(`entitlements.osx.inherit.plist`)) {
                throw new Error("entitlements.osx.inherit.plist is deprecated name, please use entitlements.mac.inherit.plist");
            }
            const customSignOptions = masOptions || _this4.platformSpecificBuildOptions;
            const entitlementsSuffix = masOptions == null ? "mac" : "mas";
            if (customSignOptions.entitlements == null) {
                const p = `entitlements.${entitlementsSuffix}.plist`;
                if (resourceList.includes(p)) {
                    signOptions.entitlements = _path.join(_this4.buildResourcesDir, p);
                }
            } else {
                signOptions.entitlements = customSignOptions.entitlements;
            }
            if (customSignOptions.entitlementsInherit == null) {
                const p = `entitlements.${entitlementsSuffix}.inherit.plist`;
                if (resourceList.includes(p)) {
                    signOptions["entitlements-inherit"] = _path.join(_this4.buildResourcesDir, p);
                }
            } else {
                signOptions["entitlements-inherit"] = customSignOptions.entitlementsInherit;
            }
        })();
    }
    //noinspection JSMethodCanBeStatic
    doSign(opts) {
        return (0, (_bluebirdLst || _load_bluebirdLst()).coroutine)(function* () {
            return (0, (_electronOsxSign || _load_electronOsxSign()).signAsync)(opts);
        })();
    }
    //noinspection JSMethodCanBeStatic
    doFlat(appPath, outFile, identity, keychain) {
        return (0, (_bluebirdLst || _load_bluebirdLst()).coroutine)(function* () {
            // productbuild doesn't created directory for out file
            yield (0, (_fsExtraP || _load_fsExtraP()).ensureDir)(_path.dirname(outFile));
            const args = (0, (_pkg || _load_pkg()).prepareProductBuildArgs)(identity, keychain);
            args.push("--component", appPath, "/Applications");
            args.push(outFile);
            return yield (0, (_builderUtil || _load_builderUtil()).exec)("productbuild", args);
        })();
    }
    getElectronSrcDir(dist) {
        return _path.resolve(this.projectDir, dist, this.electronDistMacOsAppName);
    }
    getElectronDestinationDir(appOutDir) {
        return _path.join(appOutDir, this.electronDistMacOsAppName);
    }
}
exports.default = MacPackager;
function getCertificateType(isMas, isDevelopment) {
    if (isDevelopment) {
        return "Mac Developer";
    }
    return isMas ? "3rd Party Mac Developer Application" : "Developer ID Application";
}
//# sourceMappingURL=macPackager.js.map