"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.Packager = undefined;

var _bluebirdLst;

function _load_bluebirdLst() {
    return _bluebirdLst = require("bluebird-lst");
}

var _bluebirdLst2;

function _load_bluebirdLst2() {
    return _bluebirdLst2 = _interopRequireDefault(require("bluebird-lst"));
}

exports.normalizePlatforms = normalizePlatforms;

var _builderUtil;

function _load_builderUtil() {
    return _builderUtil = require("builder-util");
}

var _promise;

function _load_promise() {
    return _promise = require("builder-util/out/promise");
}

var _events;

function _load_events() {
    return _events = require("events");
}

var _fsExtraP;

function _load_fsExtraP() {
    return _fsExtraP = require("fs-extra-p");
}

var _jsYaml;

function _load_jsYaml() {
    return _jsYaml = require("js-yaml");
}

var _lazyVal;

function _load_lazyVal() {
    return _lazyVal = require("lazy-val");
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

var _asar;

function _load_asar() {
    return _asar = require("./asar/asar");
}

var _core;

function _load_core() {
    return _core = require("./core");
}

var _platformPackager;

function _load_platformPackager() {
    return _platformPackager = require("./platformPackager");
}

var _targetFactory;

function _load_targetFactory() {
    return _targetFactory = require("./targets/targetFactory");
}

var _config;

function _load_config() {
    return _config = require("./util/config");
}

var _electronVersion;

function _load_electronVersion() {
    return _electronVersion = require("./util/electronVersion");
}

var _packageDependencies;

function _load_packageDependencies() {
    return _packageDependencies = require("./util/packageDependencies");
}

var _packageMetadata;

function _load_packageMetadata() {
    return _packageMetadata = require("./util/packageMetadata");
}

var _repositoryInfo;

function _load_repositoryInfo() {
    return _repositoryInfo = require("./util/repositoryInfo");
}

var _yarn;

function _load_yarn() {
    return _yarn = require("./util/yarn");
}

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function addHandler(emitter, event, handler) {
    emitter.on(event, handler);
}
class Packager {
    //noinspection JSUnusedGlobalSymbols
    constructor(options, cancellationToken) {
        this.cancellationToken = cancellationToken;
        this.isTwoPackageJsonProjectLayoutUsed = true;
        this.eventEmitter = new (_events || _load_events()).EventEmitter();
        this.tempDirManager = new (_builderUtil || _load_builderUtil()).TmpDir();
        this._repositoryInfo = new (_lazyVal || _load_lazyVal()).Lazy(() => (0, (_repositoryInfo || _load_repositoryInfo()).getRepositoryInfo)(this.projectDir, this.metadata, this.devMetadata));
        this.afterPackHandlers = [];
        this.debugLogger = new (_builderUtil || _load_builderUtil()).DebugLogger((_builderUtil || _load_builderUtil()).debug.enabled);
        this._productionDeps = null;
        if ("devMetadata" in options) {
            throw new Error("devMetadata in the options is deprecated, please use config instead");
        }
        if ("extraMetadata" in options) {
            throw new Error("extraMetadata in the options is deprecated, please use config.extraMetadata instead");
        }
        this.projectDir = options.projectDir == null ? process.cwd() : _path.resolve(options.projectDir);
        this.options = Object.assign({}, options, { prepackaged: options.prepackaged == null ? null : _path.resolve(this.projectDir, options.prepackaged) });
        try {
            (0, (_builderUtil || _load_builderUtil()).log)("electron-builder " + "0.0.0-semantic-release");
        } catch (e) {
            // error in dev mode without babel
            if (!(e instanceof ReferenceError)) {
                throw e;
            }
        }
    }
    get isPrepackedAppAsar() {
        return this._isPrepackedAppAsar;
    }
    get config() {
        return this._configuration;
    }
    get repositoryInfo() {
        return this._repositoryInfo.value;
    }
    get productionDeps() {
        let result = this._productionDeps;
        if (result == null) {
            result = (0, (_packageDependencies || _load_packageDependencies()).createLazyProductionDeps)(this.appDir);
            this._productionDeps = result;
        }
        return result;
    }
    addAfterPackHandler(handler) {
        this.afterPackHandlers.push(handler);
    }
    artifactCreated(handler) {
        addHandler(this.eventEmitter, "artifactCreated", handler);
        return this;
    }
    dispatchArtifactCreated(event) {
        this.eventEmitter.emit("artifactCreated", event);
    }
    build() {
        var _this = this;

        return (0, (_bluebirdLst || _load_bluebirdLst()).coroutine)(function* () {
            let configPath = null;
            let configFromOptions = _this.options.config;
            if (typeof configFromOptions === "string") {
                // it is a path to config file
                configPath = configFromOptions;
                configFromOptions = null;
            } else if (configFromOptions != null && configFromOptions.extends != null && configFromOptions.extends.includes(".")) {
                configPath = configFromOptions.extends;
            }
            const projectDir = _this.projectDir;
            const devPackageFile = _path.join(projectDir, "package.json");
            _this.devMetadata = yield (0, (_promise || _load_promise()).orNullIfFileNotExist)((0, (_packageMetadata || _load_packageMetadata()).readPackageJson)(devPackageFile));
            const devMetadata = _this.devMetadata;
            const config = yield (0, (_config || _load_config()).getConfig)(projectDir, configPath, configFromOptions, new (_lazyVal || _load_lazyVal()).Lazy(function () {
                return (_bluebirdLst2 || _load_bluebirdLst2()).default.resolve(devMetadata);
            }));
            if ((_builderUtil || _load_builderUtil()).debug.enabled) {
                (0, (_builderUtil || _load_builderUtil()).debug)(`Effective config:\n${(0, (_jsYaml || _load_jsYaml()).safeDump)(JSON.parse((0, (_builderUtil || _load_builderUtil()).safeStringifyJson)(config)))}`);
            }
            yield (0, (_config || _load_config()).validateConfig)(config, _this.debugLogger);
            _this._configuration = config;
            _this.appDir = yield (0, (_config || _load_config()).computeDefaultAppDirectory)(projectDir, (0, (_builderUtil || _load_builderUtil()).use)(config.directories, function (it) {
                return it.app;
            }));
            _this.isTwoPackageJsonProjectLayoutUsed = _this.appDir !== projectDir;
            const appPackageFile = _this.isTwoPackageJsonProjectLayoutUsed ? _path.join(_this.appDir, "package.json") : devPackageFile;
            const extraMetadata = config.extraMetadata;
            // tslint:disable:prefer-conditional-expression
            if (devMetadata != null && !_this.isTwoPackageJsonProjectLayoutUsed) {
                _this.metadata = devMetadata;
            } else {
                _this.metadata = yield _this.readProjectMetadataIfTwoPackageStructureOrPrepacked(appPackageFile);
            }
            (0, (_deepAssign || _load_deepAssign()).deepAssign)(_this.metadata, extraMetadata);
            if (_this.isTwoPackageJsonProjectLayoutUsed) {
                (0, (_builderUtil || _load_builderUtil()).debug)(`Two package.json structure is used (dev: ${devPackageFile}, app: ${appPackageFile})`);
            }
            (0, (_packageMetadata || _load_packageMetadata()).checkMetadata)(_this.metadata, devMetadata, appPackageFile, devPackageFile);
            if (config.electronVersion == null) {
                // for prepacked app asar no dev deps in the app.asar
                if (_this.isPrepackedAppAsar) {
                    config.electronVersion = yield (0, (_electronVersion || _load_electronVersion()).getElectronVersionFromInstalled)(projectDir);
                    if (config.electronVersion == null) {
                        throw new Error(`Cannot compute electron version for prepacked asar`);
                    }
                }
                config.electronVersion = yield (0, (_electronVersion || _load_electronVersion()).computeElectronVersion)(projectDir, new (_lazyVal || _load_lazyVal()).Lazy(function () {
                    return (_bluebirdLst2 || _load_bluebirdLst2()).default.resolve(_this.metadata);
                }));
            }
            _this.appInfo = new (_appInfo || _load_appInfo()).AppInfo(_this);
            const outDir = _path.resolve(_this.projectDir, (0, (_builderUtil || _load_builderUtil()).use)(_this.config.directories, function (it) {
                return it.output;
            }) || "dist");
            return {
                outDir,
                platformToTargets: yield (0, (_promise || _load_promise()).executeFinally)(_this.doBuild(outDir), (0, (_bluebirdLst || _load_bluebirdLst()).coroutine)(function* () {
                    if (_this.debugLogger.enabled) {
                        yield _this.debugLogger.save(_path.join(outDir, "electron-builder-debug.yml"));
                    }
                    yield _this.tempDirManager.cleanup();
                }))
            };
        })();
    }
    readProjectMetadataIfTwoPackageStructureOrPrepacked(appPackageFile) {
        var _this2 = this;

        return (0, (_bluebirdLst || _load_bluebirdLst()).coroutine)(function* () {
            let data = yield (0, (_promise || _load_promise()).orNullIfFileNotExist)((0, (_packageMetadata || _load_packageMetadata()).readPackageJson)(appPackageFile));
            if (data != null) {
                return data;
            }
            data = yield (0, (_promise || _load_promise()).orNullIfFileNotExist)((0, (_asar || _load_asar()).readAsarJson)(_path.join(_this2.projectDir, "app.asar"), "package.json"));
            if (data != null) {
                _this2._isPrepackedAppAsar = true;
                return data;
            }
            throw new Error(`Cannot find package.json in the ${_path.dirname(appPackageFile)}`);
        })();
    }
    doBuild(outDir) {
        var _this3 = this;

        return (0, (_bluebirdLst || _load_bluebirdLst()).coroutine)(function* () {
            const taskManager = new (_builderUtil || _load_builderUtil()).AsyncTaskManager(_this3.cancellationToken);
            const platformToTarget = new Map();
            const createdOutDirs = new Set();
            for (const [platform, archToType] of _this3.options.targets) {
                if (_this3.cancellationToken.cancelled) {
                    break;
                }
                if (platform === (_core || _load_core()).Platform.MAC && process.platform === (_core || _load_core()).Platform.WINDOWS.nodeName) {
                    throw new Error("Build for macOS is supported only on macOS, please see https://electron.build/multi-platform-build");
                }
                const packager = _this3.createHelper(platform);
                const nameToTarget = new Map();
                platformToTarget.set(platform, nameToTarget);
                for (const [arch, targetNames] of (0, (_targetFactory || _load_targetFactory()).computeArchToTargetNamesMap)(archToType, packager.platformSpecificBuildOptions, platform)) {
                    if (_this3.cancellationToken.cancelled) {
                        break;
                    }
                    yield _this3.installAppDependencies(platform, arch);
                    if (_this3.cancellationToken.cancelled) {
                        break;
                    }
                    const targetList = (0, (_targetFactory || _load_targetFactory()).createTargets)(nameToTarget, targetNames.length === 0 ? packager.defaultTarget : targetNames, outDir, packager);
                    const ourDirs = new Set();
                    for (const target of targetList) {
                        if (target instanceof (_targetFactory || _load_targetFactory()).NoOpTarget) {
                            continue;
                        }
                        const outDir = target.outDir;
                        if (createdOutDirs.has(outDir)) {
                            ourDirs.add(outDir);
                        }
                    }
                    if (ourDirs.size > 0) {
                        yield (_bluebirdLst2 || _load_bluebirdLst2()).default.map(Array.from(ourDirs).sort(), function (it) {
                            createdOutDirs.add(it);
                            return (0, (_fsExtraP || _load_fsExtraP()).ensureDir)(it);
                        });
                    }
                    yield packager.pack(outDir, arch, targetList, taskManager);
                }
                if (_this3.cancellationToken.cancelled) {
                    break;
                }
                for (const target of nameToTarget.values()) {
                    taskManager.addTask(target.finishBuild());
                }
            }
            yield taskManager.awaitTasks();
            return platformToTarget;
        })();
    }
    createHelper(platform) {
        if (this.options.platformPackagerFactory != null) {
            return this.options.platformPackagerFactory(this, platform);
        }
        switch (platform) {
            case (_core || _load_core()).Platform.MAC:
                {
                    const helperClass = require("./macPackager").default;
                    return new helperClass(this);
                }
            case (_core || _load_core()).Platform.WINDOWS:
                {
                    const helperClass = require("./winPackager").WinPackager;
                    return new helperClass(this);
                }
            case (_core || _load_core()).Platform.LINUX:
                return new (require("./linuxPackager").LinuxPackager)(this);
            default:
                throw new Error(`Unknown platform: ${platform}`);
        }
    }
    installAppDependencies(platform, arch) {
        var _this4 = this;

        return (0, (_bluebirdLst || _load_bluebirdLst()).coroutine)(function* () {
            if (_this4.options.prepackaged != null) {
                return;
            }
            const frameworkInfo = { version: _this4.config.muonVersion || _this4.config.electronVersion, useCustomDist: _this4.config.muonVersion == null };
            const config = _this4.config;
            if (config.nodeGypRebuild === true) {
                (0, (_builderUtil || _load_builderUtil()).log)(`Executing node-gyp rebuild for arch ${(_builderUtil || _load_builderUtil()).Arch[arch]}`);
                yield (0, (_builderUtil || _load_builderUtil()).exec)(process.platform === "win32" ? "node-gyp.cmd" : "node-gyp", ["rebuild"], {
                    env: (0, (_yarn || _load_yarn()).getGypEnv)(frameworkInfo, platform.nodeName, (_builderUtil || _load_builderUtil()).Arch[arch], true)
                });
            }
            if (config.npmRebuild === false) {
                (0, (_builderUtil || _load_builderUtil()).log)("Skip app dependencies rebuild because npmRebuild is set to false");
                return;
            }
            const beforeBuild = (0, (_platformPackager || _load_platformPackager()).resolveFunction)(config.beforeBuild);
            if (beforeBuild != null) {
                const performDependenciesInstallOrRebuild = yield beforeBuild({
                    appDir: _this4.appDir,
                    electronVersion: _this4.config.electronVersion,
                    platform,
                    arch: (_builderUtil || _load_builderUtil()).Arch[arch]
                });
                if (!performDependenciesInstallOrRebuild) {
                    return;
                }
            }
            if (config.buildDependenciesFromSource === true && platform.nodeName !== process.platform) {
                (0, (_builderUtil || _load_builderUtil()).log)("Skip app dependencies rebuild because platform is different and buildDependenciesFromSource is set to true");
            } else {
                yield (0, (_yarn || _load_yarn()).installOrRebuild)(config, _this4.appDir, {
                    frameworkInfo,
                    platform: platform.nodeName,
                    arch: (_builderUtil || _load_builderUtil()).Arch[arch],
                    productionDeps: _this4.productionDeps
                });
            }
        })();
    }
    afterPack(context) {
        const afterPack = (0, (_platformPackager || _load_platformPackager()).resolveFunction)(this.config.afterPack);
        const handlers = this.afterPackHandlers.slice();
        if (afterPack != null) {
            // user handler should be last
            handlers.push(afterPack);
        }
        return (_bluebirdLst2 || _load_bluebirdLst2()).default.each(handlers, it => it(context));
    }
}
exports.Packager = Packager;
function normalizePlatforms(rawPlatforms) {
    const platforms = rawPlatforms == null || Array.isArray(rawPlatforms) ? rawPlatforms : [rawPlatforms];
    if (platforms == null || platforms.length === 0) {
        return [(_core || _load_core()).Platform.fromString(process.platform)];
    } else if (platforms[0] === "all") {
        if (process.platform === (_core || _load_core()).Platform.MAC.nodeName) {
            return [(_core || _load_core()).Platform.MAC, (_core || _load_core()).Platform.LINUX, (_core || _load_core()).Platform.WINDOWS];
        } else if (process.platform === (_core || _load_core()).Platform.LINUX.nodeName) {
            // macOS code sign works only on macOS
            return [(_core || _load_core()).Platform.LINUX, (_core || _load_core()).Platform.WINDOWS];
        } else {
            return [(_core || _load_core()).Platform.WINDOWS];
        }
    } else {
        return platforms.map(it => it instanceof (_core || _load_core()).Platform ? it : (_core || _load_core()).Platform.fromString(it));
    }
}
//# sourceMappingURL=packager.js.map