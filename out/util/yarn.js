"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.rebuild = exports.installOrRebuild = undefined;

var _bluebirdLst;

function _load_bluebirdLst() {
    return _bluebirdLst = require("bluebird-lst");
}

var _bluebirdLst2;

function _load_bluebirdLst2() {
    return _bluebirdLst2 = _interopRequireDefault(require("bluebird-lst"));
}

/** @internal */
let installOrRebuild = exports.installOrRebuild = (() => {
    var _ref = (0, (_bluebirdLst || _load_bluebirdLst()).coroutine)(function* (config, appDir, options, forceInstall = false) {
        const effectiveOptions = Object.assign({ buildFromSource: config.buildDependenciesFromSource === true, additionalArgs: (0, (_builderUtil || _load_builderUtil()).asArray)(config.npmArgs) }, options);
        if (forceInstall || !(yield (0, (_fs || _load_fs()).exists)(_path.join(appDir, "node_modules")))) {
            yield installDependencies(appDir, effectiveOptions);
        } else {
            yield rebuild(appDir, effectiveOptions);
        }
    });

    return function installOrRebuild(_x, _x2, _x3) {
        return _ref.apply(this, arguments);
    };
})();

/** @internal */
let rebuild = exports.rebuild = (() => {
    var _ref2 = (0, (_bluebirdLst || _load_bluebirdLst()).coroutine)(function* (appDir, options) {
        const nativeDeps = yield (_bluebirdLst2 || _load_bluebirdLst2()).default.filter((yield options.productionDeps.value), function (it) {
            return (0, (_fs || _load_fs()).exists)(_path.join(it.path, "binding.gyp"));
        }, { concurrency: 8 });
        if (nativeDeps.length === 0) {
            (0, (_builderUtil || _load_builderUtil()).log)(`No native production dependencies`);
            return;
        }
        const platform = options.platform || process.platform;
        const arch = options.arch || process.arch;
        const additionalArgs = options.additionalArgs;
        (0, (_builderUtil || _load_builderUtil()).log)(`Rebuilding native production dependencies for ${platform}:${arch}`);
        let execPath = process.env.npm_execpath || process.env.NPM_CLI_JS;
        const isYarn = isYarnPath(execPath);
        const execArgs = [];
        if (execPath == null) {
            execPath = getPackageToolPath();
        } else {
            execArgs.push(execPath);
            execPath = process.env.npm_node_execpath || process.env.NODE_EXE || "node";
        }
        const env = getGypEnv(options.frameworkInfo, platform, arch, options.buildFromSource === true);
        if (isYarn) {
            execArgs.push("run", "install", "--");
            if (additionalArgs != null) {
                execArgs.push(...additionalArgs);
            }
            yield (_bluebirdLst2 || _load_bluebirdLst2()).default.map(nativeDeps, function (dep) {
                (0, (_builderUtil || _load_builderUtil()).log)(`Rebuilding native dependency ${dep.name}`);
                return (0, (_builderUtil || _load_builderUtil()).spawn)(execPath, execArgs, {
                    cwd: dep.path,
                    env
                }).catch(function (error) {
                    if (dep.optional) {
                        (0, (_builderUtil || _load_builderUtil()).warn)(`Cannot build optional native dep ${dep.name}`);
                    } else {
                        throw error;
                    }
                });
            }, { concurrency: process.platform === "win32" ? 1 : 2 });
        } else {
            execArgs.push("rebuild");
            if (additionalArgs != null) {
                execArgs.push(...additionalArgs);
            }
            execArgs.push(...nativeDeps.map(function (it) {
                return `${it.name}@${it.version}`;
            }));
            yield (0, (_builderUtil || _load_builderUtil()).spawn)(execPath, execArgs, {
                cwd: appDir,
                env
            });
        }
    });

    return function rebuild(_x4, _x5) {
        return _ref2.apply(this, arguments);
    };
})();
//# sourceMappingURL=yarn.js.map


exports.getGypEnv = getGypEnv;

var _builderUtil;

function _load_builderUtil() {
    return _builderUtil = require("builder-util");
}

var _fs;

function _load_fs() {
    return _fs = require("builder-util/out/fs");
}

var _os;

function _load_os() {
    return _os = require("os");
}

var _path = _interopRequireWildcard(require("path"));

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function getElectronGypCacheDir() {
    return _path.join((0, (_os || _load_os()).homedir)(), ".electron-gyp");
}
/** @internal */
function getGypEnv(frameworkInfo, platform, arch, buildFromSource) {
    if (!frameworkInfo.useCustomDist) {
        return Object.assign({}, process.env, { npm_config_arch: arch, npm_config_target_arch: arch, npm_config_platform: platform, npm_config_build_from_source: buildFromSource });
    }
    // https://github.com/nodejs/node-gyp/issues/21
    return Object.assign({}, process.env, { npm_config_disturl: "https://atom.io/download/electron", npm_config_target: frameworkInfo.version, npm_config_runtime: "electron", npm_config_arch: arch, npm_config_target_arch: arch, npm_config_platform: platform,
        // required for node-pre-gyp
        npm_config_target_platform: platform, npm_config_fallback_to_build: true, npm_config_build_from_source: buildFromSource, npm_config_devdir: getElectronGypCacheDir() });
}
function installDependencies(appDir, options) {
    const platform = options.platform || process.platform;
    const arch = options.arch || process.arch;
    const additionalArgs = options.additionalArgs;
    (0, (_builderUtil || _load_builderUtil()).log)(`Installing app dependencies for ${platform}:${arch} to ${appDir}`);
    let execPath = process.env.npm_execpath || process.env.NPM_CLI_JS;
    const execArgs = ["install", "--production"];
    if (!isYarnPath(execPath)) {
        if (process.env.NPM_NO_BIN_LINKS === "true") {
            execArgs.push("--no-bin-links");
        }
        execArgs.push("--cache-min", "999999999");
    }
    if (execPath == null) {
        execPath = getPackageToolPath();
    } else {
        execArgs.unshift(execPath);
        execPath = process.env.npm_node_execpath || process.env.NODE_EXE || "node";
    }
    if (additionalArgs != null) {
        execArgs.push(...additionalArgs);
    }
    return (0, (_builderUtil || _load_builderUtil()).spawn)(execPath, execArgs, {
        cwd: appDir,
        env: getGypEnv(options.frameworkInfo, platform, arch, options.buildFromSource === true)
    });
}
function getPackageToolPath() {
    if (process.env.FORCE_YARN === "true") {
        return process.platform === "win32" ? "yarn.cmd" : "yarn";
    } else {
        return process.platform === "win32" ? "npm.cmd" : "npm";
    }
}
function isYarnPath(execPath) {
    return process.env.FORCE_YARN === "true" || execPath != null && _path.basename(execPath).startsWith("yarn");
}