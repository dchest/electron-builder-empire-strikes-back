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

var _builderUtilRuntime;

function _load_builderUtilRuntime() {
    return _builderUtilRuntime = require("builder-util-runtime");
}

var _binDownload;

function _load_binDownload() {
    return _binDownload = require("builder-util/out/binDownload");
}

var _fs;

function _load_fs() {
    return _fs = require("builder-util/out/fs");
}

var _ejs;

function _load_ejs() {
    return _ejs = _interopRequireWildcard(require("ejs"));
}

var _fsExtraP;

function _load_fsExtraP() {
    return _fsExtraP = require("fs-extra-p");
}

var _lazyVal;

function _load_lazyVal() {
    return _lazyVal = require("lazy-val");
}

var _path = _interopRequireWildcard(require("path"));

var _core;

function _load_core() {
    return _core = require("../core");
}

var _pathManager;

function _load_pathManager() {
    return _pathManager = require("../util/pathManager");
}

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const appImageVersion = process.platform === "darwin" ? "AppImage-17-06-17-mac" : "AppImage-09-07-16-linux";
//noinspection SpellCheckingInspection
const appImagePathPromise = process.platform === "darwin" ? (0, (_binDownload || _load_binDownload()).getBinFromGithub)("AppImage", "17-06-17-mac", "vIaikS8Z2dEnZXKSgtcTn4gimPHCclp+v62KV2Eh9EhxvOvpDFgR3FCgdOsON4EqP8PvnfifNtxgBixCfuQU0A==") : (0, (_binDownload || _load_binDownload()).getBin)("AppImage", appImageVersion, `https://dl.bintray.com/electron-userland/bin/${appImageVersion}.7z`, "ac324e90b502f4e995f6a169451dbfc911bb55c0077e897d746838e720ae0221");
const appRunTemplate = new (_lazyVal || _load_lazyVal()).Lazy((0, (_bluebirdLst || _load_bluebirdLst()).coroutine)(function* () {
    return (_ejs || _load_ejs()).compile((yield (0, (_fsExtraP || _load_fsExtraP()).readFile)(_path.join((0, (_pathManager || _load_pathManager()).getTemplatePath)("linux"), "AppRun.sh"), "utf-8")));
}));
class AppImageTarget extends (_core || _load_core()).Target {
    constructor(ignored, packager, helper, outDir) {
        super("appImage");
        this.packager = packager;
        this.helper = helper;
        this.outDir = outDir;
        this.options = Object.assign({}, this.packager.platformSpecificBuildOptions, this.packager.config[this.name]);
        // we add X-AppImage-BuildId to ensure that new desktop file will be installed
        this.desktopEntry = helper.computeDesktopEntry(this.options, "AppRun", null, {
            "X-AppImage-Version": `${packager.appInfo.buildVersion}`,
            "X-AppImage-BuildId": (_builderUtilRuntime || _load_builderUtilRuntime()).UUID.v1()
        });
    }
    build(appOutDir, arch) {
        var _this = this;

        return (0, (_bluebirdLst || _load_bluebirdLst()).coroutine)(function* () {
            (0, (_builderUtil || _load_builderUtil()).log)(`Building AppImage for arch ${(_builderUtil || _load_builderUtil()).Arch[arch]}`);
            const packager = _this.packager;
            // https://github.com/electron-userland/electron-builder/issues/775
            // https://github.com/electron-userland/electron-builder/issues/1726
            const artifactName = _this.options.artifactName == null ? packager.computeSafeArtifactName(null, "AppImage", arch, false) : packager.expandArtifactNamePattern(_this.options, "AppImage", arch);
            const resultFile = _path.join(_this.outDir, artifactName);
            yield (0, (_fs || _load_fs()).unlinkIfExists)(resultFile);
            const finalDesktopFilename = `${_this.packager.executableName}.desktop`;
            const appRunData = (yield appRunTemplate.value)({
                systemIntegration: _this.options.systemIntegration || "ask",
                desktopFileName: finalDesktopFilename,
                executableName: _this.packager.executableName,
                resourceName: `appimagekit-${_this.packager.executableName}`
            });
            const appRunFile = yield packager.getTempFile(".sh");
            yield (0, (_fsExtraP || _load_fsExtraP()).outputFile)(appRunFile, appRunData, {
                mode: "0755"
            });
            const desktopFile = yield _this.desktopEntry;
            const appImagePath = yield appImagePathPromise;
            const args = ["-joliet", "on", "-volid", "AppImage", "-dev", resultFile, "-padding", "0", "-map", appOutDir, "/usr/bin", "-map", appRunFile, "/AppRun",
            // we get executable name in the AppRun by desktop file name, so, must be named as executable
            "-map", desktopFile, `/${finalDesktopFilename}`];
            for (const [from, to] of yield _this.helper.icons) {
                args.push("-map", from, `/usr/share/icons/default/${to}`);
            }
            // must be after this.helper.icons call
            if (_this.helper.maxIconPath == null) {
                throw new Error("Icon is not provided");
            }
            args.push("-map", _this.helper.maxIconPath, "/.DirIcon");
            if (arch === (_builderUtil || _load_builderUtil()).Arch.x64 || arch === (_builderUtil || _load_builderUtil()).Arch.ia32) {
                // noinspection SpellCheckingInspection
                args.push("-map", _path.join((yield (0, (_binDownload || _load_binDownload()).getBinFromGithub)("appimage-packages", "29-09-17", "sMMu1L1tL4QbzvGDxh1pNiIFC+ARnIOVvVdM0d6FBRtSDl0rHXgZMVLiuIAEz6+bJ+daHvYfLlPo1Y8zS6FXaQ==")), arch === (_builderUtil || _load_builderUtil()).Arch.x64 ? "x86_64-linux-gnu" : "i386-linux-gnu"), "/usr/lib");
            }
            args.push("-chown_r", "0", "/", "--");
            args.push("-zisofs", `level=${process.env.ELECTRON_BUILDER_COMPRESSION_LEVEL || (packager.config.compression === "store" ? "0" : "9")}:block_size=128k:by_magic=off`);
            args.push("set_filter_r", "--zisofs", "/");
            if (_this.packager.packagerOptions.effectiveOptionComputed != null && (yield _this.packager.packagerOptions.effectiveOptionComputed([args, desktopFile]))) {
                return;
            }
            yield (0, (_builderUtil || _load_builderUtil()).exec)(process.arch !== "x64" || process.env.USE_SYSTEM_XORRISO === "true" || process.env.USE_SYSTEM_XORRISO === "" ? "xorriso" : _path.join(appImagePath, "xorriso"), args);
            yield new (_bluebirdLst2 || _load_bluebirdLst2()).default(function (resolve, reject) {
                const rd = (0, (_fsExtraP || _load_fsExtraP()).createReadStream)(_path.join(appImagePath, arch === (_builderUtil || _load_builderUtil()).Arch.ia32 ? "32" : "64", "runtime"));
                rd.on("error", reject);
                const wr = (0, (_fsExtraP || _load_fsExtraP()).createWriteStream)(resultFile, { flags: "r+" });
                wr.on("error", reject);
                wr.on("close", resolve);
                rd.pipe(wr);
            });
            const fd = yield (0, (_fsExtraP || _load_fsExtraP()).open)(resultFile, "r+");
            try {
                const magicData = Buffer.from([0x41, 0x49, 0x01]);
                yield (0, (_fsExtraP || _load_fsExtraP()).write)(fd, magicData, 0, magicData.length, 8);
            } finally {
                yield (0, (_fsExtraP || _load_fsExtraP()).close)(fd);
            }
            yield (0, (_fsExtraP || _load_fsExtraP()).chmod)(resultFile, "0755");
            packager.dispatchArtifactCreated(resultFile, _this, arch, packager.computeSafeArtifactName(artifactName, "AppImage", arch, false));
        })();
    }
}
exports.default = AppImageTarget; //# sourceMappingURL=appImage.js.map