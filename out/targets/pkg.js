"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.PkgTarget = undefined;

var _bluebirdLst;

function _load_bluebirdLst() {
    return _bluebirdLst = require("bluebird-lst");
}

var _bluebirdLst2;

function _load_bluebirdLst2() {
    return _bluebirdLst2 = _interopRequireDefault(require("bluebird-lst"));
}

exports.prepareProductBuildArgs = prepareProductBuildArgs;

var _builderUtil;

function _load_builderUtil() {
    return _builderUtil = require("builder-util");
}

var _fs;

function _load_fs() {
    return _fs = require("builder-util/out/fs");
}

var _fsExtraP;

function _load_fsExtraP() {
    return _fsExtraP = require("fs-extra-p");
}

var _path = _interopRequireWildcard(require("path"));

var _codeSign;

function _load_codeSign() {
    return _codeSign = require("../codeSign");
}

var _core;

function _load_core() {
    return _core = require("../core");
}

var _mac;

function _load_mac() {
    return _mac = require("../packager/mac");
}

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const certType = "Developer ID Installer";
// http://www.shanekirk.com/2013/10/creating-flat-packages-in-osx/
// to use --scripts, we must build .app bundle separately using pkgbuild
// productbuild --scripts doesn't work (because scripts in this case not added to our package)
// https://github.com/electron-userland/electron-osx-sign/issues/96#issuecomment-274986942
class PkgTarget extends (_core || _load_core()).Target {
    constructor(packager, outDir) {
        super("pkg");
        this.packager = packager;
        this.outDir = outDir;
        this.options = Object.assign({ allowAnywhere: true, allowCurrentUserHome: true, allowRootDirectory: true }, this.packager.config.pkg);
    }
    build(appPath, arch) {
        var _this = this;

        return (0, (_bluebirdLst || _load_bluebirdLst()).coroutine)(function* () {
            const packager = _this.packager;
            const options = _this.options;
            const appInfo = packager.appInfo;
            const keychainName = (yield packager.codeSigningInfo).keychainName;
            const appOutDir = _this.outDir;
            // https://developer.apple.com/library/content/documentation/DeveloperTools/Reference/DistributionDefinitionRef/Chapters/Distribution_XML_Ref.html
            const distInfoFile = _path.join(appOutDir, "distribution.xml");
            const innerPackageFile = _path.join(appOutDir, `${(0, (_mac || _load_mac()).filterCFBundleIdentifier)(appInfo.id)}.pkg`);
            const identity = (yield (_bluebirdLst2 || _load_bluebirdLst2()).default.all([(0, (_codeSign || _load_codeSign()).findIdentity)(certType, options.identity || packager.platformSpecificBuildOptions.identity, keychainName), _this.customizeDistributionConfiguration(distInfoFile, appPath), _this.buildComponentPackage(appPath, innerPackageFile)]))[0];
            if (identity == null && packager.forceCodeSigning) {
                throw new Error(`Cannot find valid "${certType}" to sign standalone installer, please see https://electron.build/code-signing`);
            }
            const artifactName = packager.expandArtifactNamePattern(options, "pkg");
            const artifactPath = _path.join(appOutDir, artifactName);
            const args = prepareProductBuildArgs(identity, keychainName);
            args.push("--distribution", distInfoFile);
            args.push(artifactPath);
            (0, (_builderUtil || _load_builderUtil()).use)(options.productbuild, function (it) {
                return args.push(...it);
            });
            yield (0, (_builderUtil || _load_builderUtil()).exec)("productbuild", args, {
                cwd: appOutDir
            });
            yield (_bluebirdLst2 || _load_bluebirdLst2()).default.all([(0, (_fsExtraP || _load_fsExtraP()).unlink)(innerPackageFile), (0, (_fsExtraP || _load_fsExtraP()).unlink)(distInfoFile)]);
            packager.dispatchArtifactCreated(artifactPath, _this, arch, packager.computeSafeArtifactName(artifactName, "pkg", arch));
        })();
    }
    customizeDistributionConfiguration(distInfoFile, appPath) {
        var _this2 = this;

        return (0, (_bluebirdLst || _load_bluebirdLst()).coroutine)(function* () {
            yield (0, (_builderUtil || _load_builderUtil()).exec)("productbuild", ["--synthesize", "--component", appPath, distInfoFile], {
                cwd: _this2.outDir
            });
            const options = _this2.options;
            let distInfo = yield (0, (_fsExtraP || _load_fsExtraP()).readFile)(distInfoFile, "utf-8");
            const insertIndex = distInfo.lastIndexOf("</installer-gui-script>");
            distInfo = distInfo.substring(0, insertIndex) + `    <domains enable_anywhere="${options.allowAnywhere}" enable_currentUserHome="${options.allowCurrentUserHome}" enable_localSystem="${options.allowRootDirectory}" />\n` + distInfo.substring(insertIndex);
            (0, (_builderUtil || _load_builderUtil()).debug)(distInfo);
            yield (0, (_fsExtraP || _load_fsExtraP()).writeFile)(distInfoFile, distInfo);
        })();
    }
    buildComponentPackage(appPath, outFile) {
        var _this3 = this;

        return (0, (_bluebirdLst || _load_bluebirdLst()).coroutine)(function* () {
            const options = _this3.options;
            const args = ["--component", appPath];
            (0, (_builderUtil || _load_builderUtil()).use)(_this3.options.installLocation || "/Applications", function (it) {
                return args.push("--install-location", it);
            });
            if (options.scripts != null) {
                args.push("--scripts", _path.resolve(_this3.packager.buildResourcesDir, options.scripts));
            } else if (options.scripts !== null) {
                const dir = _path.join(_this3.packager.buildResourcesDir, "pkg-scripts");
                const stat = yield (0, (_fs || _load_fs()).statOrNull)(dir);
                if (stat != null && stat.isDirectory()) {
                    args.push("--scripts", dir);
                }
            }
            args.push(outFile);
            yield (0, (_builderUtil || _load_builderUtil()).exec)("pkgbuild", args);
        })();
    }
}
exports.PkgTarget = PkgTarget;
function prepareProductBuildArgs(identity, keychain) {
    const args = [];
    if (identity != null) {
        args.push("--sign", identity.hash);
        if (keychain != null) {
            args.push("--keychain", keychain);
        }
    }
    return args;
}
//# sourceMappingURL=pkg.js.map