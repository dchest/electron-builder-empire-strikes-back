"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.NsisTarget = undefined;

var _bluebirdLst;

function _load_bluebirdLst() {
    return _bluebirdLst = require("bluebird-lst");
}

var _bluebirdLst2;

function _load_bluebirdLst2() {
    return _bluebirdLst2 = _interopRequireDefault(require("bluebird-lst"));
}

var _appPackageBuilder;

function _load_appPackageBuilder() {
    return _appPackageBuilder = require("app-package-builder");
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

var _debug2 = _interopRequireDefault(require("debug"));

var _fsExtraP;

function _load_fsExtraP() {
    return _fsExtraP = require("fs-extra-p");
}

var _lazyVal;

function _load_lazyVal() {
    return _lazyVal = require("lazy-val");
}

var _path = _interopRequireWildcard(require("path"));

var _sanitizeFilename;

function _load_sanitizeFilename() {
    return _sanitizeFilename = _interopRequireDefault(require("sanitize-filename"));
}

var _core;

function _load_core() {
    return _core = require("../../core");
}

var _platformPackager;

function _load_platformPackager() {
    return _platformPackager = require("../../platformPackager");
}

var _timer;

function _load_timer() {
    return _timer = require("../../util/timer");
}

var _archive;

function _load_archive() {
    return _archive = require("../archive");
}

var _nsisLang;

function _load_nsisLang() {
    return _nsisLang = require("./nsisLang");
}

var _nsisLicense;

function _load_nsisLicense() {
    return _nsisLicense = require("./nsisLicense");
}

var _nsisScriptGenerator;

function _load_nsisScriptGenerator() {
    return _nsisScriptGenerator = require("./nsisScriptGenerator");
}

var _nsisUtil;

function _load_nsisUtil() {
    return _nsisUtil = require("./nsisUtil");
}

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const debug = (0, _debug2.default)("electron-builder:nsis");
// noinspection SpellCheckingInspection
const ELECTRON_BUILDER_NS_UUID = (_builderUtilRuntime || _load_builderUtilRuntime()).UUID.parse("50e065bc-3134-11e6-9bab-38c9862bdaf3");
// noinspection SpellCheckingInspection
const nsisResourcePathPromise = new (_lazyVal || _load_lazyVal()).Lazy(() => (0, (_binDownload || _load_binDownload()).getBinFromGithub)("nsis-resources", "3.3.0", "4okc98BD0v9xDcSjhPVhAkBMqos+FvD/5/H72fTTIwoHTuWd2WdD7r+1j72hxd+ZXxq1y3FRW0x6Z3jR0VfpMw=="));
const USE_NSIS_BUILT_IN_COMPRESSOR = false;
class NsisTarget extends (_core || _load_core()).Target {
    constructor(packager, outDir, targetName, packageHelper) {
        super(targetName);
        this.packager = packager;
        this.outDir = outDir;
        this.packageHelper = packageHelper;
        /** @private */
        this.archs = new Map();
        this.packageHelper.refCount++;
        this.options = targetName === "portable" ? Object.create(null) : Object.assign({}, this.packager.config.nsis);
        if (targetName !== "nsis") {
            Object.assign(this.options, this.packager.config[targetName === "nsis-web" ? "nsisWeb" : targetName]);
        }
        const deps = packager.info.metadata.dependencies;
        if (deps != null && deps["electron-squirrel-startup"] != null) {
            (0, (_builderUtil || _load_builderUtil()).warn)('"electron-squirrel-startup" dependency is not required for NSIS');
        }
    }
    build(appOutDir, arch) {
        var _this = this;

        return (0, (_bluebirdLst || _load_bluebirdLst()).coroutine)(function* () {
            _this.archs.set(arch, appOutDir);
        })();
    }
    /** @private */
    buildAppPackage(appOutDir, arch) {
        var _this2 = this;

        return (0, (_bluebirdLst || _load_bluebirdLst()).coroutine)(function* () {
            const options = _this2.options;
            const packager = _this2.packager;
            const isDifferentialPackage = options.differentialPackage;
            const format = !isDifferentialPackage && options.useZip ? "zip" : "7z";
            const archiveFile = _path.join(_this2.outDir, `${packager.appInfo.sanitizedName}-${packager.appInfo.version}-${(_builderUtil || _load_builderUtil()).Arch[arch]}.nsis.${format}`);
            const archiveOptions = { withoutDir: true };
            let compression = packager.compression;
            const timer = (0, (_timer || _load_timer()).time)(`nsis package, ${(_builderUtil || _load_builderUtil()).Arch[arch]}`);
            if (isDifferentialPackage) {
                archiveOptions.solid = false;
                // our reader doesn't support compressed headers
                archiveOptions.isArchiveHeaderCompressed = false;
                /*
                 * dict size 64 MB: Full: 33,744.88 KB, To download: 17,630.3 KB (52%)
                 * dict size 16 MB: Full: 33,936.84 KB, To download: 16,175.9 KB (48%)
                 * dict size  8 MB: Full: 34,187.59 KB, To download:  8,229.9 KB (24%)
                 * dict size  4 MB: Full: 34,628.73 KB, To download: 3,782.97 KB (11%)
                        as we can see, if file changed in one place, all block is invalidated (and update size approximately equals to dict size)
                 */
                archiveOptions.dictSize = 4;
                // do not allow to change compression level to avoid different packages
                compression = "normal";
            }
            yield (0, (_archive || _load_archive()).archive)(compression, format, archiveFile, appOutDir, archiveOptions);
            timer.end();
            if (options.differentialPackage) {
                return yield (0, (_appPackageBuilder || _load_appPackageBuilder()).createDifferentialPackage)(archiveFile);
            } else {
                return yield (0, (_appPackageBuilder || _load_appPackageBuilder()).createPackageFileInfo)(archiveFile, 0);
            }
        })();
    }
    // noinspection JSUnusedGlobalSymbols
    finishBuild() {
        var _this3 = this;

        return (0, (_bluebirdLst || _load_bluebirdLst()).coroutine)(function* () {
            (0, (_builderUtil || _load_builderUtil()).log)(`Building ${_this3.name} installer (${Array.from(_this3.archs.keys()).map(function (it) {
                return (_builderUtil || _load_builderUtil()).Arch[it];
            }).join(" and ")})`);
            try {
                yield _this3.buildInstaller();
            } finally {
                yield _this3.packageHelper.finishBuild();
            }
        })();
    }
    get installerFilenamePattern() {
        // tslint:disable:no-invalid-template-strings
        return "${productName} " + (this.isPortable ? "" : "Setup ") + "${version}.${ext}";
    }
    get isPortable() {
        return this.name === "portable";
    }
    buildInstaller() {
        var _this4 = this;

        return (0, (_bluebirdLst || _load_bluebirdLst()).coroutine)(function* () {
            const isPortable = _this4.isPortable;
            const packager = _this4.packager;
            const appInfo = packager.appInfo;
            const version = appInfo.version;
            const options = _this4.options;
            const installerFilename = packager.expandArtifactNamePattern(options, "exe", null, _this4.installerFilenamePattern);
            const iconPath = (isPortable ? null : yield packager.getResource(options.installerIcon, "installerIcon.ico")) || (yield packager.getIconPath());
            const oneClick = options.oneClick !== false;
            const installerPath = _path.join(_this4.outDir, installerFilename);
            const guid = options.guid || (_builderUtilRuntime || _load_builderUtilRuntime()).UUID.v5(appInfo.id, ELECTRON_BUILDER_NS_UUID);
            const companyName = appInfo.companyName;
            const defines = {
                APP_ID: appInfo.id,
                APP_GUID: guid,
                PRODUCT_NAME: appInfo.productName,
                PRODUCT_FILENAME: appInfo.productFilename,
                APP_FILENAME: (!oneClick || options.perMachine === true) && /^[-_+0-9a-zA-Z ]+$/.test(appInfo.productFilename) ? appInfo.productFilename : appInfo.sanitizedName,
                APP_DESCRIPTION: appInfo.description,
                VERSION: version,
                PROJECT_DIR: packager.projectDir,
                BUILD_RESOURCES_DIR: packager.buildResourcesDir
            };
            if (companyName != null) {
                defines.COMPANY_NAME = companyName;
            }
            // electron uses product file name as app data, define it as well to remove on uninstall
            if (defines.APP_FILENAME !== appInfo.productFilename) {
                defines.APP_PRODUCT_FILENAME = appInfo.productFilename;
            }
            const commands = {
                OutFile: `"${installerPath}"`,
                VIProductVersion: appInfo.versionInWeirdWindowsForm,
                VIAddVersionKey: _this4.computeVersionKey(),
                Unicode: _this4.isUnicodeEnabled
            };
            if (iconPath != null) {
                if (isPortable) {
                    commands.Icon = `"${iconPath}"`;
                } else {
                    defines.MUI_ICON = iconPath;
                    defines.MUI_UNICON = iconPath;
                }
            }
            const packageFiles = {};
            if (USE_NSIS_BUILT_IN_COMPRESSOR && _this4.archs.size === 1) {
                defines.APP_BUILD_DIR = _this4.archs.get(_this4.archs.keys().next().value);
            } else {
                yield (_bluebirdLst2 || _load_bluebirdLst2()).default.map(_this4.archs.keys(), (() => {
                    var _ref = (0, (_bluebirdLst || _load_bluebirdLst()).coroutine)(function* (arch) {
                        const fileInfo = yield _this4.packageHelper.packArch(arch, _this4);
                        const file = fileInfo.path;
                        const defineKey = arch === (_builderUtil || _load_builderUtil()).Arch.x64 ? "APP_64" : "APP_32";
                        defines[defineKey] = file;
                        defines[`${defineKey}_NAME`] = _path.basename(file);
                        // nsis expect a hexadecimal string
                        defines[`${defineKey}_HASH`] = Buffer.from(fileInfo.sha512, "base64").toString("hex").toUpperCase();
                        if (fileInfo.blockMapData != null) {
                            const blockMapFile = yield packager.getTempFile(".yml");
                            yield (0, (_fsExtraP || _load_fsExtraP()).writeFile)(blockMapFile, fileInfo.blockMapData);
                            defines[`${defineKey}_BLOCK_MAP_FILE`] = blockMapFile;
                            delete fileInfo.blockMapData;
                        }
                        if (_this4.isWebInstaller) {
                            packager.dispatchArtifactCreated(file, _this4, arch);
                            packageFiles[(_builderUtil || _load_builderUtil()).Arch[arch]] = fileInfo;
                        }
                    });

                    return function (_x) {
                        return _ref.apply(this, arguments);
                    };
                })());
            }
            _this4.configureDefinesForAllTypeOfInstaller(defines);
            if (isPortable) {
                defines.REQUEST_EXECUTION_LEVEL = options.requestExecutionLevel || "user";
            } else {
                yield _this4.configureDefines(oneClick, defines);
            }
            if (packager.compression === "store") {
                commands.SetCompress = "off";
            } else {
                // investigate https://github.com/electron-userland/electron-builder/issues/2134#issuecomment-333286194
                // difference - 33.540 vs 33.601, only 61 KB
                commands.SetCompressor = "zlib";
                if (!_this4.isWebInstaller) {
                    defines.COMPRESS = "auto";
                }
            }
            debug(defines);
            debug(commands);
            if (packager.packagerOptions.effectiveOptionComputed != null && (yield packager.packagerOptions.effectiveOptionComputed([defines, commands]))) {
                return;
            }
            const sharedHeader = yield _this4.computeCommonInstallerScriptHeader();
            const script = isPortable ? yield (0, (_fsExtraP || _load_fsExtraP()).readFile)(_path.join((_nsisUtil || _load_nsisUtil()).nsisTemplatesDir, "portable.nsi"), "utf8") : yield _this4.computeScriptAndSignUninstaller(defines, commands, installerPath, sharedHeader);
            yield _this4.executeMakensis(defines, commands, sharedHeader + (yield _this4.computeFinalScript(script, true)));
            yield (_bluebirdLst2 || _load_bluebirdLst2()).default.all([packager.sign(installerPath), defines.UNINSTALLER_OUT_FILE == null ? (_bluebirdLst2 || _load_bluebirdLst2()).default.resolve() : (0, (_fsExtraP || _load_fsExtraP()).unlink)(defines.UNINSTALLER_OUT_FILE)]);
            let updateInfo = null;
            if (packageFiles != null) {
                const keys = Object.keys(packageFiles);
                if (keys.length > 0) {
                    const packages = {};
                    for (const arch of keys) {
                        const packageFileInfo = packageFiles[arch];
                        packages[arch] = Object.assign({}, packageFileInfo, { path: _path.basename(packageFileInfo.path) });
                    }
                    updateInfo = { packages };
                }
            }
            packager.info.dispatchArtifactCreated({
                file: installerPath,
                updateInfo,
                target: _this4,
                packager,
                arch: _this4.archs.size === 1 ? _this4.archs.keys().next().value : null,
                safeArtifactName: (0, (_platformPackager || _load_platformPackager()).isSafeGithubName)(installerFilename) ? installerFilename : _this4.generateGitHubInstallerName(),
                isWriteUpdateInfo: !_this4.isPortable
            });
        })();
    }
    generateGitHubInstallerName() {
        const appInfo = this.packager.appInfo;
        const classifier = appInfo.name.toLowerCase() === appInfo.name ? "setup-" : "Setup-";
        return `${appInfo.name}-${this.isPortable ? "" : classifier}${appInfo.version}.exe`;
    }
    get isUnicodeEnabled() {
        return this.options.unicode !== false;
    }
    get isWebInstaller() {
        return false;
    }
    computeScriptAndSignUninstaller(defines, commands, installerPath, sharedHeader) {
        var _this5 = this;

        return (0, (_bluebirdLst || _load_bluebirdLst()).coroutine)(function* () {
            const packager = _this5.packager;
            const customScriptPath = yield packager.getResource(_this5.options.script, "installer.nsi");
            const script = yield (0, (_fsExtraP || _load_fsExtraP()).readFile)(customScriptPath || _path.join((_nsisUtil || _load_nsisUtil()).nsisTemplatesDir, "installer.nsi"), "utf8");
            if (customScriptPath != null) {
                (0, (_builderUtil || _load_builderUtil()).log)("Custom NSIS script is used - uninstaller is not signed by electron-builder");
                return script;
            }
            // https://github.com/electron-userland/electron-builder/issues/2103
            // it is more safe and reliable to write uninstaller to our out dir
            const uninstallerPath = _path.join(_this5.outDir, `.__uninstaller-${_this5.name}-${_this5.packager.appInfo.sanitizedName}.exe`);
            const isWin = process.platform === "win32";
            defines.BUILD_UNINSTALLER = null;
            defines.UNINSTALLER_OUT_FILE = isWin ? uninstallerPath : _path.win32.join("Z:", uninstallerPath);
            yield _this5.executeMakensis(defines, commands, sharedHeader + (yield _this5.computeFinalScript(script, false)));
            yield (0, (_builderUtil || _load_builderUtil()).execWine)(installerPath, []);
            yield packager.sign(uninstallerPath, "  Signing NSIS uninstaller");
            delete defines.BUILD_UNINSTALLER;
            // platform-specific path, not wine
            defines.UNINSTALLER_OUT_FILE = uninstallerPath;
            return script;
        })();
    }
    computeVersionKey() {
        // Error: invalid VIProductVersion format, should be X.X.X.X
        // so, we must strip beta
        const localeId = this.options.language || "1033";
        const appInfo = this.packager.appInfo;
        const versionKey = [`/LANG=${localeId} ProductName "${appInfo.productName}"`, `/LANG=${localeId} ProductVersion "${appInfo.version}"`, `/LANG=${localeId} LegalCopyright "${appInfo.copyright}"`, `/LANG=${localeId} FileDescription "${appInfo.description}"`, `/LANG=${localeId} FileVersion "${appInfo.buildVersion}"`];
        (0, (_builderUtil || _load_builderUtil()).use)(this.packager.platformSpecificBuildOptions.legalTrademarks, it => versionKey.push(`/LANG=${localeId} LegalTrademarks "${it}"`));
        (0, (_builderUtil || _load_builderUtil()).use)(appInfo.companyName, it => versionKey.push(`/LANG=${localeId} CompanyName "${it}"`));
        return versionKey;
    }
    configureDefines(oneClick, defines) {
        const packager = this.packager;
        const options = this.options;
        const asyncTaskManager = new (_builderUtil || _load_builderUtil()).AsyncTaskManager(packager.info.cancellationToken);
        if (oneClick) {
            defines.ONE_CLICK = null;
            if (options.runAfterFinish !== false) {
                defines.RUN_AFTER_FINISH = null;
            }
            asyncTaskManager.add((0, (_bluebirdLst || _load_bluebirdLst()).coroutine)(function* () {
                const installerHeaderIcon = yield packager.getResource(options.installerHeaderIcon, "installerHeaderIcon.ico");
                if (installerHeaderIcon != null) {
                    defines.HEADER_ICO = installerHeaderIcon;
                }
            }));
        } else {
            asyncTaskManager.add((0, (_bluebirdLst || _load_bluebirdLst()).coroutine)(function* () {
                const installerHeader = yield packager.getResource(options.installerHeader, "installerHeader.bmp");
                if (installerHeader != null) {
                    defines.MUI_HEADERIMAGE = null;
                    defines.MUI_HEADERIMAGE_RIGHT = null;
                    defines.MUI_HEADERIMAGE_BITMAP = installerHeader;
                }
            }));
            asyncTaskManager.add((0, (_bluebirdLst || _load_bluebirdLst()).coroutine)(function* () {
                const bitmap = (yield packager.getResource(options.installerSidebar, "installerSidebar.bmp")) || "${NSISDIR}\\Contrib\\Graphics\\Wizard\\nsis3-metro.bmp";
                defines.MUI_WELCOMEFINISHPAGE_BITMAP = bitmap;
                defines.MUI_UNWELCOMEFINISHPAGE_BITMAP = (yield packager.getResource(options.uninstallerSidebar, "uninstallerSidebar.bmp")) || bitmap;
            }));
            if (options.allowElevation !== false) {
                defines.MULTIUSER_INSTALLMODE_ALLOW_ELEVATION = null;
            }
        }
        if (options.perMachine === true) {
            defines.INSTALL_MODE_PER_ALL_USERS = null;
        }
        if (!oneClick || options.perMachine === true) {
            defines.INSTALL_MODE_PER_ALL_USERS_REQUIRED = null;
        }
        if (options.allowToChangeInstallationDirectory) {
            if (oneClick) {
                throw new Error("allowToChangeInstallationDirectory makes sense only for assisted installer (please set oneClick to false)");
            }
            defines.allowToChangeInstallationDirectory = null;
        }
        if (options.menuCategory != null && options.menuCategory !== false) {
            let menu;
            if (options.menuCategory === true) {
                const companyName = packager.appInfo.companyName;
                if (companyName == null) {
                    throw new Error(`Please specify "author" in the application package.json — it is required because "menuCategory" is set to true.`);
                }
                menu = (0, (_sanitizeFilename || _load_sanitizeFilename()).default)(companyName);
            } else {
                menu = options.menuCategory.split(/[\/\\]/).map(it => (0, (_sanitizeFilename || _load_sanitizeFilename()).default)(it)).join("\\");
            }
            if (!(0, (_builderUtil || _load_builderUtil()).isEmptyOrSpaces)(menu)) {
                defines.MENU_FILENAME = menu;
            }
        }
        defines.SHORTCUT_NAME = (0, (_builderUtil || _load_builderUtil()).isEmptyOrSpaces)(options.shortcutName) ? defines.PRODUCT_FILENAME : packager.expandMacro(options.shortcutName);
        if (options.deleteAppDataOnUninstall) {
            defines.DELETE_APP_DATA_ON_UNINSTALL = null;
        }
        asyncTaskManager.add((0, (_bluebirdLst || _load_bluebirdLst()).coroutine)(function* () {
            const uninstallerIcon = yield packager.getResource(options.uninstallerIcon, "uninstallerIcon.ico");
            if (uninstallerIcon != null) {
                // we don't need to copy MUI_UNICON (defaults to app icon), so, we have 2 defines
                defines.UNINSTALLER_ICON = uninstallerIcon;
                defines.MUI_UNICON = uninstallerIcon;
            }
        }));
        defines.UNINSTALL_DISPLAY_NAME = packager.expandMacro(options.uninstallDisplayName || "${productName} ${version}", null, {}, false);
        if (options.createDesktopShortcut === false) {
            defines.DO_NOT_CREATE_DESKTOP_SHORTCUT = null;
        }
        if (options.displayLanguageSelector === true) {
            defines.DISPLAY_LANG_SELECTOR = null;
        }
        return asyncTaskManager.awaitTasks();
    }
    configureDefinesForAllTypeOfInstaller(defines) {
        const options = this.options;
        if (!this.isWebInstaller && defines.APP_BUILD_DIR == null) {
            if (options.useZip) {
                defines.ZIP_COMPRESSION = null;
            }
            defines.COMPRESSION_METHOD = options.useZip ? "zip" : "7z";
        }
    }
    executeMakensis(defines, commands, script) {
        var _this6 = this;

        return (0, (_bluebirdLst || _load_bluebirdLst()).coroutine)(function* () {
            const args = _this6.options.warningsAsErrors === false ? [] : ["-WX"];
            for (const name of Object.keys(defines)) {
                const value = defines[name];
                if (value == null) {
                    args.push(`-D${name}`);
                } else {
                    args.push(`-D${name}=${value}`);
                }
            }
            for (const name of Object.keys(commands)) {
                const value = commands[name];
                if (Array.isArray(value)) {
                    for (const c of value) {
                        args.push(`-X${name} ${c}`);
                    }
                } else {
                    args.push(`-X${name} ${value}`);
                }
            }
            args.push("-");
            if (_this6.packager.debugLogger.enabled) {
                _this6.packager.debugLogger.add("nsis.script", script);
            }
            const nsisPath = yield (_nsisUtil || _load_nsisUtil()).NSIS_PATH.value;
            const command = _path.join(nsisPath, process.platform === "darwin" ? "mac" : process.platform === "win32" ? "Bin" : "linux", process.platform === "win32" ? "makensis.exe" : "makensis");
            yield (0, (_builderUtil || _load_builderUtil()).spawnAndWrite)(command, args, script, {
                // we use NSIS_CONFIG_CONST_DATA_PATH=no to build makensis on Linux, but in any case it doesn't use stubs as MacOS/Windows version, so, we explicitly set NSISDIR
                env: Object.assign({}, process.env, { NSISDIR: nsisPath }),
                cwd: (_nsisUtil || _load_nsisUtil()).nsisTemplatesDir
            }, debug.enabled);
        })();
    }
    computeCommonInstallerScriptHeader() {
        var _this7 = this;

        return (0, (_bluebirdLst || _load_bluebirdLst()).coroutine)(function* () {
            const packager = _this7.packager;
            const options = _this7.options;
            const scriptGenerator = new (_nsisScriptGenerator || _load_nsisScriptGenerator()).NsisScriptGenerator();
            const langConfigurator = new (_nsisLang || _load_nsisLang()).LangConfigurator(options);
            scriptGenerator.include(_path.join((_nsisUtil || _load_nsisUtil()).nsisTemplatesDir, "include", "StdUtils.nsh"));
            const includeDir = _path.join((_nsisUtil || _load_nsisUtil()).nsisTemplatesDir, "include");
            scriptGenerator.addIncludeDir(includeDir);
            scriptGenerator.flags(["updated", "force-run", "keep-shortcuts", "no-desktop-shortcut", "delete-app-data"]);
            (0, (_nsisLang || _load_nsisLang()).createAddLangsMacro)(scriptGenerator, langConfigurator);
            const taskManager = new (_builderUtil || _load_builderUtil()).AsyncTaskManager(packager.info.cancellationToken);
            const pluginArch = _this7.isUnicodeEnabled ? "x86-unicode" : "x86-ansi";
            taskManager.add((0, (_bluebirdLst || _load_bluebirdLst()).coroutine)(function* () {
                scriptGenerator.addPluginDir(pluginArch, _path.join((yield nsisResourcePathPromise.value), "plugins", pluginArch));
            }));
            taskManager.add((0, (_bluebirdLst || _load_bluebirdLst()).coroutine)(function* () {
                const userPluginDir = _path.join(packager.buildResourcesDir, pluginArch);
                const stat = yield (0, (_fs || _load_fs()).statOrNull)(userPluginDir);
                if (stat != null && stat.isDirectory()) {
                    scriptGenerator.addPluginDir(pluginArch, userPluginDir);
                }
            }));
            taskManager.addTask((0, (_nsisLang || _load_nsisLang()).addCustomMessageFileInclude)("messages.yml", packager, scriptGenerator, langConfigurator));
            if (!_this7.isPortable) {
                if (options.oneClick === false) {
                    taskManager.addTask((0, (_nsisLang || _load_nsisLang()).addCustomMessageFileInclude)("assistedMessages.yml", packager, scriptGenerator, langConfigurator));
                }
                taskManager.add((0, (_bluebirdLst || _load_bluebirdLst()).coroutine)(function* () {
                    const customInclude = yield packager.getResource(_this7.options.include, "installer.nsh");
                    if (customInclude != null) {
                        scriptGenerator.addIncludeDir(packager.buildResourcesDir);
                        scriptGenerator.include(customInclude);
                    }
                }));
            }
            yield taskManager.awaitTasks();
            return scriptGenerator.build();
        })();
    }
    computeFinalScript(originalScript, isInstaller) {
        var _this8 = this;

        return (0, (_bluebirdLst || _load_bluebirdLst()).coroutine)(function* () {
            const packager = _this8.packager;
            const options = _this8.options;
            const langConfigurator = new (_nsisLang || _load_nsisLang()).LangConfigurator(options);
            const scriptGenerator = new (_nsisScriptGenerator || _load_nsisScriptGenerator()).NsisScriptGenerator();
            const taskManager = new (_builderUtil || _load_builderUtil()).AsyncTaskManager(packager.info.cancellationToken);
            if (isInstaller) {
                // http://stackoverflow.com/questions/997456/nsis-license-file-based-on-language-selection
                taskManager.add(function () {
                    return (0, (_nsisLicense || _load_nsisLicense()).computeLicensePage)(packager, options, scriptGenerator, langConfigurator.langs);
                });
            }
            yield taskManager.awaitTasks();
            if (_this8.isPortable) {
                return scriptGenerator.build() + originalScript;
            }
            const fileAssociations = packager.fileAssociations;
            if (fileAssociations.length !== 0) {
                if (options.perMachine !== true) {
                    // https://github.com/electron-userland/electron-builder/issues/772
                    throw new Error(`Please set perMachine to true — file associations works on Windows only if installed for all users`);
                }
                scriptGenerator.include(_path.join(_path.join((_nsisUtil || _load_nsisUtil()).nsisTemplatesDir, "include"), "FileAssociation.nsh"));
                if (isInstaller) {
                    const registerFileAssociationsScript = new (_nsisScriptGenerator || _load_nsisScriptGenerator()).NsisScriptGenerator();
                    for (const item of fileAssociations) {
                        const extensions = (0, (_builderUtil || _load_builderUtil()).asArray)(item.ext).map((_platformPackager || _load_platformPackager()).normalizeExt);
                        for (const ext of extensions) {
                            const customIcon = yield packager.getResource((0, (_builderUtil || _load_builderUtil()).getPlatformIconFileName)(item.icon, false), `${extensions[0]}.ico`);
                            let installedIconPath = "$appExe,0";
                            if (customIcon != null) {
                                installedIconPath = `$INSTDIR\\resources\\${_path.basename(customIcon)}`;
                                registerFileAssociationsScript.file(installedIconPath, customIcon);
                            }
                            const icon = `"${installedIconPath}"`;
                            const commandText = `"Open with ${packager.appInfo.productName}"`;
                            const command = '"$appExe $\\"%1$\\""';
                            registerFileAssociationsScript.insertMacro("APP_ASSOCIATE", `"${ext}" "${item.name || ext}" "${item.description || ""}" ${icon} ${commandText} ${command}`);
                        }
                    }
                    scriptGenerator.macro("registerFileAssociations", registerFileAssociationsScript);
                } else {
                    const unregisterFileAssociationsScript = new (_nsisScriptGenerator || _load_nsisScriptGenerator()).NsisScriptGenerator();
                    for (const item of fileAssociations) {
                        for (const ext of (0, (_builderUtil || _load_builderUtil()).asArray)(item.ext)) {
                            unregisterFileAssociationsScript.insertMacro("APP_UNASSOCIATE", `"${(0, (_platformPackager || _load_platformPackager()).normalizeExt)(ext)}" "${item.name || ext}"`);
                        }
                    }
                    scriptGenerator.macro("unregisterFileAssociations", unregisterFileAssociationsScript);
                }
            }
            return scriptGenerator.build() + originalScript;
        })();
    }
}
exports.NsisTarget = NsisTarget; //# sourceMappingURL=nsis.js.map