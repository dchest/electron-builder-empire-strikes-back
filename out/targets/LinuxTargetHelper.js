"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.LinuxTargetHelper = exports.installPrefix = undefined;

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

var _fs;

function _load_fs() {
    return _fs = require("builder-util/out/fs");
}

var _fsExtraP;

function _load_fsExtraP() {
    return _fsExtraP = require("fs-extra-p");
}

var _path = _interopRequireWildcard(require("path"));

var _pathManager;

function _load_pathManager() {
    return _pathManager = require("../util/pathManager");
}

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const installPrefix = exports.installPrefix = "/opt";
class LinuxTargetHelper {
    constructor(packager) {
        this.packager = packager;
        this.maxIconPath = null;
        this.icons = this.computeDesktopIcons();
    }
    // must be name without spaces and other special characters, but not product name used
    computeDesktopIcons() {
        var _this = this;

        return (0, (_bluebirdLst || _load_bluebirdLst()).coroutine)(function* () {
            const packager = _this.packager;
            const customIconSetDir = packager.platformSpecificBuildOptions.icon;
            if (customIconSetDir != null) {
                let iconDir = _path.resolve(packager.buildResourcesDir, customIconSetDir);
                const stat = yield (0, (_fs || _load_fs()).statOrNull)(iconDir);
                if (stat == null || !stat.isDirectory()) {
                    iconDir = _path.resolve(packager.projectDir, customIconSetDir);
                }
                try {
                    return yield _this.iconsFromDir(iconDir);
                } catch (e) {
                    if (e.code === "ENOENT") {
                        throw new Error(`Icon set directory ${iconDir} doesn't exist`);
                    } else if (e.code === "ENOTDIR") {
                        throw new Error(`linux.icon must be set to an icon set directory, but ${iconDir} is not a directory. Please see https://electron.build/configuration/configuration#LinuxBuildOptions-icon`);
                    } else {
                        throw e;
                    }
                }
            }
            const resourceList = yield packager.resourceList;
            if (resourceList.includes("icons")) {
                return yield _this.iconsFromDir(_path.join(packager.buildResourcesDir, "icons"));
            } else {
                return yield _this.createFromIcns((yield packager.info.tempDirManager.createTempDir({ suffix: ".iconset" })));
            }
        })();
    }
    iconsFromDir(iconDir) {
        var _this2 = this;

        return (0, (_bluebirdLst || _load_bluebirdLst()).coroutine)(function* () {
            const mappings = [];
            let maxSize = 0;
            for (const file of yield (0, (_fsExtraP || _load_fsExtraP()).readdir)(iconDir)) {
                if (file.endsWith(".png") || file.endsWith(".PNG")) {
                    // If parseInt encounters a character that is not a numeral in the specified radix,
                    // it returns the integer value parsed up to that point
                    try {
                        const sizeString = file.match(/\d+/);
                        const size = sizeString == null ? 0 : parseInt(sizeString[0], 10);
                        if (size > 0) {
                            const iconPath = `${iconDir}/${file}`;
                            mappings.push([iconPath, `${size}x${size}/apps/${_this2.packager.executableName}.png`]);
                            if (size > maxSize) {
                                maxSize = size;
                                _this2.maxIconPath = iconPath;
                            }
                        }
                    } catch (e) {
                        console.error(e);
                    }
                }
            }
            if (mappings.length === 0) {
                throw new Error(`Icon set directory ${iconDir} doesn't contain icons`);
            }
            return mappings;
        })();
    }
    getIcns() {
        var _this3 = this;

        return (0, (_bluebirdLst || _load_bluebirdLst()).coroutine)(function* () {
            const build = _this3.packager.config;
            let iconPath = (build.mac || {}).icon || build.icon;
            if (iconPath != null && !iconPath.endsWith(".icns")) {
                iconPath += ".icns";
            }
            return iconPath == null ? yield _this3.packager.getDefaultIcon("icns") : _path.resolve(_this3.packager.projectDir, iconPath);
        })();
    }
    getDescription(options) {
        return options.description || this.packager.appInfo.description;
    }
    computeDesktopEntry(targetSpecificOptions, exec, destination, extra) {
        var _this4 = this;

        return (0, (_bluebirdLst || _load_bluebirdLst()).coroutine)(function* () {
            if (exec != null && exec.length === 0) {
                throw new Error("Specified exec is emptyd");
            }
            const appInfo = _this4.packager.appInfo;
            const productFilename = appInfo.productFilename;
            const desktopMeta = Object.assign({ Name: appInfo.productName, Comment: _this4.getDescription(targetSpecificOptions), Exec: exec == null ? `"${installPrefix}/${productFilename}/${_this4.packager.executableName}" %U` : exec, Terminal: "false", Type: "Application", Icon: _this4.packager.executableName }, extra, targetSpecificOptions.desktop);
            let category = targetSpecificOptions.category;
            if ((0, (_builderUtil || _load_builderUtil()).isEmptyOrSpaces)(category)) {
                const macCategory = (_this4.packager.config.mac || {}).category;
                if (macCategory != null) {
                    category = macToLinuxCategory[macCategory];
                }
                if (category == null) {
                    // https://github.com/develar/onshape-desktop-shell/issues/48
                    let message = "Application category is not set for Linux (linux.category).\nPlease see https://electron.build/configuration/configuration#LinuxBuildOptions-category";
                    if (macCategory != null) {
                        message += `\n Cannot map mac category "${macCategory}" to Linux. If possible mapping is known for you, please file issue to add it.`;
                    }
                    (0, (_builderUtil || _load_builderUtil()).warn)(message);
                    category = "Utility";
                }
            }
            desktopMeta.Categories = `${category}${category.endsWith(";") ? "" : ";"}`;
            let data = `[Desktop Entry]`;
            for (const name of Object.keys(desktopMeta)) {
                const value = desktopMeta[name];
                data += `\n${name}=${value}`;
            }
            data += "\n";
            const tempFile = destination || (yield _this4.packager.getTempFile(`${productFilename}.desktop`));
            yield (0, (_fsExtraP || _load_fsExtraP()).outputFile)(tempFile, data);
            return tempFile;
        })();
    }
    createFromIcns(tempDir) {
        var _this5 = this;

        return (0, (_bluebirdLst || _load_bluebirdLst()).coroutine)(function* () {
            const iconPath = yield _this5.getIcns();
            if (iconPath == null) {
                return yield _this5.iconsFromDir(_path.join((0, (_pathManager || _load_pathManager()).getTemplatePath)("linux"), "electron-icons"));
            }
            if (process.platform === "darwin") {
                yield (0, (_builderUtil || _load_builderUtil()).exec)("iconutil", ["--convert", "iconset", "--output", tempDir, iconPath]);
                const iconFiles = yield (0, (_fsExtraP || _load_fsExtraP()).readdir)(tempDir);
                const imagePath = iconFiles.includes("icon_512x512.png") ? _path.join(tempDir, "icon_512x512.png") : _path.join(tempDir, "icon_256x256.png");
                _this5.maxIconPath = imagePath;
                function resize(size) {
                    const filename = `icon_${size}x${size}.png`;
                    return iconFiles.includes(filename) ? (_bluebirdLst2 || _load_bluebirdLst2()).default.resolve() : resizeImage(imagePath, _path.join(tempDir, filename), size, size);
                }
                const promises = [resize(24), resize(96)];
                promises.push(resize(16));
                promises.push(resize(48));
                promises.push(resize(64));
                promises.push(resize(128));
                yield (_bluebirdLst2 || _load_bluebirdLst2()).default.all(promises);
                return _this5.createMappings(tempDir);
            } else {
                const output = yield (0, (_builderUtil || _load_builderUtil()).exec)("icns2png", ["-x", "-o", tempDir, iconPath]);
                (0, (_builderUtil || _load_builderUtil()).debug)(output);
                //noinspection UnnecessaryLocalVariableJS
                const has256 = output.includes("ic08");
                const imagePath = _path.join(tempDir, has256 ? "icon_256x256x32.png" : "icon_128x128x32.png");
                _this5.maxIconPath = imagePath;
                function resize(size) {
                    return resizeImage(imagePath, _path.join(tempDir, `icon_${size}x${size}x32.png`), size, size);
                }
                const promises = [resize(24), resize(96)];
                if (!output.includes("is32")) {
                    promises.push(resize(16));
                }
                if (!output.includes("ih32")) {
                    promises.push(resize(48));
                }
                if (!output.toString().includes("icp6")) {
                    promises.push(resize(64));
                }
                if (has256 && !output.includes("it32")) {
                    promises.push(resize(128));
                }
                yield (_bluebirdLst2 || _load_bluebirdLst2()).default.all(promises);
                return _this5.createMappings(tempDir);
            }
        })();
    }
    createMappings(tempDir) {
        const name = this.packager.executableName;
        function createMapping(size) {
            return [process.platform === "darwin" ? `${tempDir}/icon_${size}x${size}.png` : `${tempDir}/icon_${size}x${size}x32.png`, `${size}x${size}/apps/${name}.png`];
        }
        return [createMapping("16"), createMapping("24"), createMapping("32"), createMapping("48"), createMapping("64"), createMapping("96"), createMapping("128"), createMapping("256"), createMapping("512")];
    }
}
exports.LinuxTargetHelper = LinuxTargetHelper;
const macToLinuxCategory = {
    "public.app-category.graphics-design": "Graphics",
    "public.app-category.developer-tools": "Development",
    "public.app-category.education": "Education",
    "public.app-category.games": "Game",
    "public.app-category.video": "Video;AudioVideo",
    "public.app-category.utilities": "Utility",
    "public.app-category.social-networking": "Chat"
};
function resizeImage(imagePath, result, w, h) {
    if (process.platform === "darwin") {
        return (0, (_builderUtil || _load_builderUtil()).exec)("sips", ["--resampleHeightWidth", h.toString(10), w.toString(10), imagePath, "--out", result]);
    } else {
        const sizeArg = `${w}x${h}`;
        return (0, (_builderUtil || _load_builderUtil()).exec)("gm", ["convert", "-size", sizeArg, imagePath, "-resize", sizeArg, result]);
    }
}
//# sourceMappingURL=LinuxTargetHelper.js.map