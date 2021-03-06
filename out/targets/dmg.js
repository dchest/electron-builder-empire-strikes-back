"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.DmgTarget = undefined;

var _bluebirdLst;

function _load_bluebirdLst() {
    return _bluebirdLst = require("bluebird-lst");
}

let createStageDmg = (() => {
    var _ref = (0, (_bluebirdLst || _load_bluebirdLst()).coroutine)(function* (tempDmg, appPath, volumeName) {
        //noinspection SpellCheckingInspection
        const imageArgs = addVerboseIfNeed(["create", "-srcfolder", appPath, "-volname", volumeName, "-anyowners", "-nospotlight", "-format", "UDRW"]);
        if (yield (0, (_macosVersion || _load_macosVersion()).isMacOsHighSierra)()) {
            // imageArgs.push("-fs", "APFS")
            imageArgs.push("-fs", "HFS+", "-fsargs", "-c c=64,a=16,e=16");
        } else {
            imageArgs.push("-fs", "HFS+", "-fsargs", "-c c=64,a=16,e=16");
        }
        imageArgs.push(tempDmg);
        yield (0, (_builderUtil || _load_builderUtil()).spawn)("hdiutil", imageArgs);
        return tempDmg;
    });

    return function createStageDmg(_x, _x2, _x3) {
        return _ref.apply(this, arguments);
    };
})();

let computeAssetSize = (() => {
    var _ref2 = (0, (_bluebirdLst || _load_bluebirdLst()).coroutine)(function* (cancellationToken, dmgFile, specification, backgroundFile) {
        const asyncTaskManager = new (_builderUtil || _load_builderUtil()).AsyncTaskManager(cancellationToken);
        asyncTaskManager.addTask((0, (_fsExtraP || _load_fsExtraP()).stat)(dmgFile));
        if (specification.icon != null) {
            asyncTaskManager.addTask((0, (_fs || _load_fs()).statOrNull)(specification.icon));
        }
        if (backgroundFile != null) {
            asyncTaskManager.addTask((0, (_fsExtraP || _load_fsExtraP()).stat)(backgroundFile));
        }
        let result = 32 * 1024;
        for (const stat of yield asyncTaskManager.awaitTasks()) {
            if (stat != null) {
                result += stat.size;
            }
        }
        return result;
    });

    return function computeAssetSize(_x4, _x5, _x6, _x7) {
        return _ref2.apply(this, arguments);
    };
})();

let customizeDmg = (() => {
    var _ref3 = (0, (_bluebirdLst || _load_bluebirdLst()).coroutine)(function* (volumePath, specification, packager, backgroundFile, backgroundFilename) {
        const asyncTaskManager = new (_builderUtil || _load_builderUtil()).AsyncTaskManager(packager.info.cancellationToken);
        if (backgroundFile != null) {
            asyncTaskManager.addTask((0, (_fs || _load_fs()).copyFile)(backgroundFile, _path.join(volumePath, ".background", backgroundFilename)));
        }
        const window = specification.window;
        const env = Object.assign({}, process.env, { volumePath, appFileName: `${packager.appInfo.productFilename}.app`, iconSize: specification.iconSize || 80, iconTextSize: specification.iconTextSize || 12, windowX: window.x, windowY: window.y, VERSIONER_PERL_PREFER_32_BIT: "true" });
        if (specification.icon == null) {
            delete env.volumeIcon;
        } else {
            const volumeIcon = `${volumePath}/.VolumeIcon.icns`;
            asyncTaskManager.addTask((0, (_fs || _load_fs()).copyFile)((yield packager.getResource(specification.icon)), volumeIcon));
            env.volumeIcon = volumeIcon;
        }
        if (specification.backgroundColor != null || specification.background == null) {
            env.backgroundColor = specification.backgroundColor || "#ffffff";
            env.windowWidth = (window.width || 540).toString();
            env.windowHeight = (window.height || 380).toString();
        } else {
            delete env.backgroundColor;
            if (window.width == null) {
                delete env.windowWidth;
            } else {
                env.windowWidth = window.width.toString();
            }
            if (window.height == null) {
                delete env.windowHeight;
            } else {
                env.windowHeight = window.height.toString();
            }
            env.backgroundFilename = backgroundFilename;
        }
        yield (0, (_dmgUtil || _load_dmgUtil()).applyProperties)((yield computeDmgEntries(specification, volumePath, packager, asyncTaskManager)), env, asyncTaskManager, packager);
        return packager.packagerOptions.effectiveOptionComputed == null || !(yield packager.packagerOptions.effectiveOptionComputed({ volumePath, specification, packager }));
    });

    return function customizeDmg(_x8, _x9, _x10, _x11, _x12) {
        return _ref3.apply(this, arguments);
    };
})();

let computeDmgEntries = (() => {
    var _ref4 = (0, (_bluebirdLst || _load_bluebirdLst()).coroutine)(function* (specification, volumePath, packager, asyncTaskManager) {
        let result = "";
        for (const c of specification.contents) {
            if (c.path != null && c.path.endsWith(".app") && c.type !== "link") {
                (0, (_builderUtil || _load_builderUtil()).warn)(`Do not specify path for application: "${c.path}". Actual path to app will be used instead.`);
            }
            const entryPath = c.path || `${packager.appInfo.productFilename}.app`;
            const entryName = c.name || _path.basename(entryPath);
            result += `&makeEntries("${entryName}", Iloc_xy => [ ${c.x}, ${c.y} ]),\n`;
            if (c.type === "link") {
                asyncTaskManager.addTask((0, (_builderUtil || _load_builderUtil()).exec)("ln", ["-s", `/${entryPath.startsWith("/") ? entryPath.substring(1) : entryPath}`, `${volumePath}/${entryName}`]));
            } else if (!(0, (_builderUtil || _load_builderUtil()).isEmptyOrSpaces)(c.path) && (c.type === "file" || c.type === "dir")) {
                const source = yield packager.getResource(c.path);
                if (source == null) {
                    (0, (_builderUtil || _load_builderUtil()).warn)(`${entryPath} doesn't exist`);
                    continue;
                }
                const destination = `${volumePath}/${entryName}`;
                asyncTaskManager.addTask(c.type === "dir" || (yield (0, (_fsExtraP || _load_fsExtraP()).stat)(source)).isDirectory() ? (0, (_fs || _load_fs()).copyDir)(source, destination) : (0, (_fs || _load_fs()).copyFile)(source, destination));
            }
        }
        return result;
    });

    return function computeDmgEntries(_x13, _x14, _x15, _x16) {
        return _ref4.apply(this, arguments);
    };
})();
//# sourceMappingURL=dmg.js.map


var _builderUtil;

function _load_builderUtil() {
    return _builderUtil = require("builder-util");
}

var _fs;

function _load_fs() {
    return _fs = require("builder-util/out/fs");
}

var _dmgLicense;

function _load_dmgLicense() {
    return _dmgLicense = require("dmg-builder/out/dmgLicense");
}

var _dmgUtil;

function _load_dmgUtil() {
    return _dmgUtil = require("dmg-builder/out/dmgUtil");
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

var _sanitizeFilename;

function _load_sanitizeFilename() {
    return _sanitizeFilename = _interopRequireDefault(require("sanitize-filename"));
}

var _codeSign;

function _load_codeSign() {
    return _codeSign = require("../codeSign");
}

var _core;

function _load_core() {
    return _core = require("../core");
}

var _macosVersion;

function _load_macosVersion() {
    return _macosVersion = require("builder-util/out/macosVersion");
}

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

class DmgTarget extends (_core || _load_core()).Target {
    constructor(packager, outDir) {
        super("dmg");
        this.packager = packager;
        this.outDir = outDir;
        this.options = this.packager.config.dmg || Object.create(null);
    }
    build(appPath, arch) {
        var _this = this;

        return (0, (_bluebirdLst || _load_bluebirdLst()).coroutine)(function* () {
            const packager = _this.packager;
            (0, (_builderUtil || _load_builderUtil()).log)("Building DMG");
            const specification = yield _this.computeDmgOptions();
            const volumeName = (0, (_sanitizeFilename || _load_sanitizeFilename()).default)(_this.computeVolumeName(specification.title));
            const tempDmg = yield createStageDmg((yield packager.getTempFile(".dmg")), appPath, volumeName);
            // https://github.com/electron-userland/electron-builder/issues/2115
            const backgroundFilename = specification.background == null ? null : _path.basename(specification.background);
            const backgroundFile = backgroundFilename == null ? null : _path.resolve(packager.info.projectDir, specification.background);
            const finalSize = yield computeAssetSize(packager.info.cancellationToken, tempDmg, specification, backgroundFile);
            yield (0, (_builderUtil || _load_builderUtil()).exec)("hdiutil", ["resize", "-size", finalSize.toString(), tempDmg]);
            const volumePath = _path.join("/Volumes", volumeName);
            if (yield (0, (_fs || _load_fs()).exists)(volumePath)) {
                (0, (_builderUtil || _load_builderUtil()).debug)("Unmounting previous disk image");
                yield (0, (_dmgUtil || _load_dmgUtil()).detach)(volumePath);
            }
            if (!(yield (0, (_dmgUtil || _load_dmgUtil()).attachAndExecute)(tempDmg, true, function () {
                return customizeDmg(volumePath, specification, packager, backgroundFile, backgroundFilename);
            }))) {
                return;
            }
            // tslint:disable-next-line:no-invalid-template-strings
            const artifactName = packager.expandArtifactNamePattern(packager.config.dmg, "dmg", null, "${productName}-" + (packager.platformSpecificBuildOptions.bundleShortVersion || "${version}") + ".${ext}");
            const artifactPath = _path.join(_this.outDir, artifactName);
            // dmg file must not exist otherwise hdiutil failed (https://github.com/electron-userland/electron-builder/issues/1308#issuecomment-282847594), so, -ov must be specified
            const args = ["convert", tempDmg, "-ov", "-format", specification.format, "-o", artifactPath];
            if (specification.format === "UDZO") {
                args.push("-imagekey", `zlib-level=${process.env.ELECTRON_BUILDER_COMPRESSION_LEVEL || "9"}`);
            }
            yield (0, (_builderUtil || _load_builderUtil()).spawn)("hdiutil", addVerboseIfNeed(args));
            if (_this.options.internetEnabled) {
                yield (0, (_builderUtil || _load_builderUtil()).exec)("hdiutil", addVerboseIfNeed(["internet-enable"]).concat(artifactPath));
            }
            const licenseData = yield (0, (_dmgLicense || _load_dmgLicense()).addLicenseToDmg)(packager, artifactPath);
            if (packager.packagerOptions.effectiveOptionComputed != null) {
                yield packager.packagerOptions.effectiveOptionComputed({ licenseData });
            }
            yield _this.signDmg(artifactPath);
            _this.packager.dispatchArtifactCreated(artifactPath, _this, arch, packager.computeSafeArtifactName(artifactName, "dmg"));
        })();
    }
    signDmg(artifactPath) {
        var _this2 = this;

        return (0, (_bluebirdLst || _load_bluebirdLst()).coroutine)(function* () {
            if (!(0, (_codeSign || _load_codeSign()).isSignAllowed)(false)) {
                return;
            }
            if (!(yield (0, (_builderUtil || _load_builderUtil()).isCanSignDmg)())) {
                (0, (_builderUtil || _load_builderUtil()).warn)("At least macOS 10.11.5 is required to sign DMG, please update OS.");
            }
            const packager = _this2.packager;
            const qualifier = packager.platformSpecificBuildOptions.identity;
            // explicitly disabled if set to null
            if (qualifier === null) {
                // macPackager already somehow handle this situation, so, here just return
                return;
            }
            const keychainName = (yield packager.codeSigningInfo).keychainName;
            const certificateType = "Developer ID Application";
            let identity = yield (0, (_codeSign || _load_codeSign()).findIdentity)(certificateType, qualifier, keychainName);
            if (identity == null) {
                identity = yield (0, (_codeSign || _load_codeSign()).findIdentity)("Mac Developer", qualifier, keychainName);
                if (identity == null) {
                    return;
                }
            }
            const args = ["--sign", identity.hash];
            if (keychainName != null) {
                args.push("--keychain", keychainName);
            }
            args.push(artifactPath);
            yield (0, (_builderUtil || _load_builderUtil()).exec)("codesign", args);
        })();
    }
    computeVolumeName(custom) {
        const appInfo = this.packager.appInfo;
        const shortVersion = this.packager.platformSpecificBuildOptions.bundleShortVersion || appInfo.version;
        if (custom == null) {
            return `${appInfo.productFilename} ${shortVersion}`;
        }
        return custom.replace(/\${shortVersion}/g, shortVersion).replace(/\${version}/g, appInfo.version).replace(/\${name}/g, appInfo.name).replace(/\${productName}/g, appInfo.productName);
    }
    // public to test
    computeDmgOptions() {
        var _this3 = this;

        return (0, (_bluebirdLst || _load_bluebirdLst()).coroutine)(function* () {
            // appdmg
            const appdmgWindow = _this3.options.window || {};
            const oldPosition = appdmgWindow.position;
            const oldSize = appdmgWindow.size;
            const oldIconSize = _this3.options["icon-size"];
            const oldBackgroundColor = _this3.options["background-color"];
            if (oldPosition != null) {
                (0, (_builderUtil || _load_builderUtil()).warn)("dmg.window.position is deprecated, please use dmg.window instead");
            }
            if (oldSize != null) {
                (0, (_builderUtil || _load_builderUtil()).warn)("dmg.window.size is deprecated, please use dmg.window instead");
            }
            if (oldIconSize != null) {
                (0, (_builderUtil || _load_builderUtil()).warn)("dmg.icon-size is deprecated, please use dmg.iconSize instead");
            }
            if (oldBackgroundColor != null) {
                (0, (_builderUtil || _load_builderUtil()).warn)("dmg.background-color is deprecated, please use dmg.backgroundColor instead");
            }
            const packager = _this3.packager;
            const specification = (0, (_deepAssign || _load_deepAssign()).deepAssign)({
                window: {
                    x: 400,
                    y: 100
                },
                iconSize: oldIconSize,
                backgroundColor: oldBackgroundColor,
                icon: "icon" in _this3.options ? undefined : yield packager.getIconPath()
            }, _this3.options, oldPosition == null ? null : {
                window: {
                    x: oldPosition.x,
                    y: oldPosition.y
                }
            }, oldSize == null ? null : {
                window: {
                    width: oldSize.width,
                    height: oldSize.height
                }
            });
            if (specification.icon != null && (0, (_builderUtil || _load_builderUtil()).isEmptyOrSpaces)(specification.icon)) {
                throw new Error("dmg.icon cannot be specified as empty string");
            }
            if (specification.backgroundColor != null) {
                if (specification.background != null) {
                    throw new Error("Both dmg.backgroundColor and dmg.background are specified — please set the only one");
                }
                specification.backgroundColor = (0, (_dmgUtil || _load_dmgUtil()).computeBackgroundColor)(specification.backgroundColor);
            } else if (!("background" in specification)) {
                specification.background = yield (0, (_dmgUtil || _load_dmgUtil()).computeBackground)(packager);
            }
            if (specification.format == null) {
                if (process.env.ELECTRON_BUILDER_COMPRESSION_LEVEL != null) {
                    specification.format = "UDZO";
                } else if (packager.compression === "store") {
                    specification.format = "UDRO";
                } else {
                    specification.format = packager.compression === "maximum" ? "UDBZ" : "UDZO";
                }
            }
            if (specification.contents == null) {
                specification.contents = [{
                    x: 130, y: 220
                }, {
                    x: 410, y: 220, type: "link", path: "/Applications"
                }];
            }
            return specification;
        })();
    }
}
exports.DmgTarget = DmgTarget;

function addVerboseIfNeed(args) {
    if (process.env.DEBUG_DMG === "true") {
        args.push("-verbose");
    }
    return args;
}