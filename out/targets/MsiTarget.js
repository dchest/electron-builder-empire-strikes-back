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

var _core;

function _load_core() {
    return _core = require("../core");
}

var _builderUtil;

function _load_builderUtil() {
    return _builderUtil = require("builder-util");
}

var _fsExtraP;

function _load_fsExtraP() {
    return _fsExtraP = require("fs-extra-p");
}

var _pathManager;

function _load_pathManager() {
    return _pathManager = require("../util/pathManager");
}

var _path = _interopRequireWildcard(require("path"));

var _deepAssign;

function _load_deepAssign() {
    return _deepAssign = require("read-config-file/out/deepAssign");
}

var _targetUtil;

function _load_targetUtil() {
    return _targetUtil = require("./targetUtil");
}

var _builderUtilRuntime;

function _load_builderUtilRuntime() {
    return _builderUtilRuntime = require("builder-util-runtime");
}

var _fs;

function _load_fs() {
    return _fs = require("builder-util/out/fs");
}

var _crypto;

function _load_crypto() {
    return _crypto = require("crypto");
}

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const ELECTRON_BUILDER_UPGRADE_CODE_NS_UUID = (_builderUtilRuntime || _load_builderUtilRuntime()).UUID.parse("d752fe43-5d44-44d5-9fc9-6dd1bf19d5cc");
const ELECTRON_BUILDER_COMPONENT_KEY_PATH_NS_UUID = (_builderUtilRuntime || _load_builderUtilRuntime()).UUID.parse("a1fd0bba-2e5e-48dd-8b0e-caa943b1b0c9");
const ROOT_DIR_ID = "APPLICATIONFOLDER";
class MsiTarget extends (_core || _load_core()).Target {
    constructor(packager, outDir) {
        super("msi");
        this.packager = packager;
        this.outDir = outDir;
        this.options = (0, (_deepAssign || _load_deepAssign()).deepAssign)({
            perMachine: true
        }, this.packager.platformSpecificBuildOptions, this.packager.config.msi);
    }
    build(appOutDir, arch) {
        var _this = this;

        return (0, (_bluebirdLst || _load_bluebirdLst()).coroutine)(function* () {
            const packager = _this.packager;
            const vm = yield packager.vm.value;
            const stageDir = yield (0, (_targetUtil || _load_targetUtil()).createHelperDir)(_this, arch);
            const projectFile = stageDir.getTempFile("project.wxs");
            const objectFile = stageDir.getTempFile("project.wixobj");
            yield (0, (_fsExtraP || _load_fsExtraP()).writeFile)(projectFile, (yield _this.writeManifest((0, (_pathManager || _load_pathManager()).getTemplatePath)("msi"), appOutDir, arch)));
            // const vendorPath = "/Users/develar/Library/Caches/electron-builder/wix"
            const vendorPath = "C:\\Program Files (x86)\\WiX Toolset v4.0\\bin";
            const candleArgs = ["-arch", arch === (_builderUtil || _load_builderUtil()).Arch.ia32 ? "x86" : arch === (_builderUtil || _load_builderUtil()).Arch.armv7l ? "arm" : "x64", "-out", vm.toVmFile(objectFile), `-dappDir=${"C:\\Users\\develar\\win-unpacked"}`, "-pedantic"];
            if (_this.options.warningsAsErrors !== false) {
                candleArgs.push("-wx");
            }
            candleArgs.push(vm.toVmFile(projectFile));
            yield vm.exec(vm.toVmFile(_path.join(vendorPath, "candle.exe")), candleArgs);
            const artifactName = packager.expandArtifactNamePattern(_this.options, "msi", arch);
            const artifactPath = _path.join(_this.outDir, artifactName);
            // noinspection SpellCheckingInspection
            const lightArgs = ["-out", vm.toVmFile(artifactPath), "-pedantic", "-v",
            // https://github.com/wixtoolset/issues/issues/5169
            "-spdb", `-dappDir=${"C:\\Users\\develar\\win-unpacked"}`];
            if (_this.options.warningsAsErrors !== false) {
                lightArgs.push("-wx");
            }
            if (_this.options.oneClick === false) {
                // lightArgs.push("-ext", vm.toVmFile(path.join(vendorPath, "WixUIExtension.dll")))
                lightArgs.push("-ext", "WixUIExtension");
            }
            lightArgs.push(vm.toVmFile(objectFile));
            yield vm.exec(vm.toVmFile(_path.join(vendorPath, "light.exe")), lightArgs);
            yield stageDir.cleanup();
            packager.info.dispatchArtifactCreated({
                file: artifactPath,
                packager,
                arch,
                safeArtifactName: packager.computeSafeArtifactName(artifactName, "msi"),
                target: _this,
                isWriteUpdateInfo: false
            });
        })();
    }
    writeManifest(templatePath, appOutDir, arch) {
        var _this2 = this;

        return (0, (_bluebirdLst || _load_bluebirdLst()).coroutine)(function* () {
            const appInfo = _this2.packager.appInfo;
            const registryKeyPathId = (_builderUtilRuntime || _load_builderUtilRuntime()).UUID.v5(appInfo.id, ELECTRON_BUILDER_COMPONENT_KEY_PATH_NS_UUID);
            const dirNames = new Set();
            let dirs = "";
            const fileSpace = " ".repeat(6);
            let isRootDirAddedToRemoveTable = false;
            const files = yield (_bluebirdLst2 || _load_bluebirdLst2()).default.map((0, (_fs || _load_fs()).walk)(appOutDir), function (file) {
                let packagePath = file.substring(appOutDir.length + 1);
                if (_path.sep !== "\\") {
                    packagePath = packagePath.replace(/\//g, "\\");
                }
                let isAddRemoveFolder = false;
                const lastSlash = packagePath.lastIndexOf("\\");
                const fileName = lastSlash > 0 ? packagePath.substring(lastSlash + 1) : packagePath;
                let directoryId = null;
                let dirName = "";
                // Wix Directory.FileSource doesn't work - https://stackoverflow.com/questions/21519388/wix-filesource-confusion
                if (lastSlash > 0) {
                    // This Name attribute may also define multiple directories using the inline directory syntax.
                    // For example, "ProgramFilesFolder:\My Company\My Product\bin" would create a reference to a Directory element with Id="ProgramFilesFolder" then create directories named "My Company" then "My Product" then "bin" nested beneath each other.
                    // This syntax is a shortcut to defining each directory in an individual Directory element.
                    dirName = packagePath.substring(0, lastSlash);
                    // add U (user) suffix just to be sure that will be not overwrite system WIX directory ids.
                    directoryId = `${dirName.toLowerCase()}_u`;
                    if (!dirNames.has(dirName)) {
                        isAddRemoveFolder = true;
                        dirNames.add(dirName);
                        dirs += `    <Directory Id="${directoryId}" Name="${ROOT_DIR_ID}:\\${dirName}\\"/>\n`;
                    }
                } else if (!isRootDirAddedToRemoveTable) {
                    isRootDirAddedToRemoveTable = true;
                    isAddRemoveFolder = true;
                }
                // since RegistryValue can be part of Component, *** *** *** *** *** *** *** *** *** wix cannot auto generate guid
                // https://stackoverflow.com/questions/1405100/change-my-component-guid-in-wix
                let result = `<Component${directoryId === null ? "" : ` Directory="${directoryId}"`} Guid="${(_builderUtilRuntime || _load_builderUtilRuntime()).UUID.v5(packagePath, ELECTRON_BUILDER_COMPONENT_KEY_PATH_NS_UUID).toUpperCase()}">`;
                if (!_this2.options.perMachine) {
                    // https://stackoverflow.com/questions/16119708/component-testcomp-installs-to-user-profile-it-must-use-a-registry-key-under-hk
                    result += `\n${fileSpace}  <RegistryValue Root="HKCU" Key="Software\\${registryKeyPathId}" Name="${packagePath}" Value="${appInfo.version}" Type="string" KeyPath="yes"/>`;
                    if (isAddRemoveFolder) {
                        // https://stackoverflow.com/questions/3290576/directory-xx-is-in-the-user-profile-but-is-not-listed-in-the-removefile-table
                        result += `\n${fileSpace}  <RemoveFolder Id="${hashString2(dirName, packagePath)}" On="uninstall"/>`;
                    }
                }
                // Id="${hashString(packagePath)}"
                result += `\n${fileSpace}  <File Name="${fileName}" Source="$(var.appDir)\\${packagePath}" ReadOnly="yes"`;
                if (_this2.options.perMachine) {
                    result += ' KeyPath="yes"';
                }
                result += `/>\n${fileSpace}</Component>`;
                return result;
            });
            return (yield (0, (_fsExtraP || _load_fsExtraP()).readFile)(_path.join(templatePath, "template.wxs"), "utf8")).replace(/\$\{([a-zA-Z0-9]+)\}/g, function (match, p1) {
                const options = _this2.options;
                switch (p1) {
                    // wix in the name because special wix format can be used in the name
                    case "installationDirectoryWixName":
                        const name = /^[-_+0-9a-zA-Z ]+$/.test(appInfo.productFilename) ? appInfo.productFilename : appInfo.sanitizedName;
                        if (options.perMachine) {
                            return name;
                        }
                        return `LocalAppDataFolder:\\Programs\\${name}\\`;
                    case "productName":
                        return appInfo.productName;
                    case "manufacturer":
                        const companyName = appInfo.companyName;
                        if (!companyName) {
                            (0, (_builderUtil || _load_builderUtil()).warn)(`Manufacturer is not set for MSI — please set "author" in the package.json`);
                        }
                        return companyName || appInfo.productName;
                    case "upgradeCode":
                        return (options.upgradeCode || (_builderUtilRuntime || _load_builderUtilRuntime()).UUID.v5(appInfo.id, ELECTRON_BUILDER_UPGRADE_CODE_NS_UUID)).toUpperCase();
                    case "version":
                        return appInfo.versionInWeirdWindowsForm;
                    case "compressionLevel":
                        const compression = _this2.packager.compression;
                        return compression === "store" ? "none" : "high";
                    case "uiRef":
                        return options.oneClick === false ? '<UIRef Id="WixUI_Advanced" />' : "";
                    case "dirs":
                        return dirs;
                    case "files":
                        return fileSpace + files.join(`\n${fileSpace}`);
                    case "programFilesId":
                        if (options.perMachine) {
                            // https://stackoverflow.com/questions/1929038/compilation-error-ice80-the-64bitcomponent-uses-32bitdirectory
                            return arch === (_builderUtil || _load_builderUtil()).Arch.x64 ? "ProgramFiles64Folder" : "ProgramFilesFolder";
                        } else {
                            return "LocalAppDataFolder";
                        }
                    default:
                        throw new Error(`Macro ${p1} is not defined`);
                }
            });
        })();
    }
}
exports.default = MsiTarget; // function hashString(s: string) {
//   const hash = createHash("md5")
//   hash.update(s)
//   return hash.digest("hex")
// }

const nullByteBuffer = Buffer.from([0]);
function hashString2(s, s2) {
    const hash = (0, (_crypto || _load_crypto()).createHash)("md5");
    hash.update(s);
    hash.update(nullByteBuffer);
    hash.update(s2);
    return hash.digest("hex");
}
//# sourceMappingURL=MsiTarget.js.map