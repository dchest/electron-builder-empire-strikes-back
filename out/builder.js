"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.build = undefined;

var _bluebirdLst;

function _load_bluebirdLst() {
    return _bluebirdLst = require("bluebird-lst");
}

var _bluebirdLst2;

function _load_bluebirdLst2() {
    return _bluebirdLst2 = _interopRequireDefault(require("bluebird-lst"));
}

let build = exports.build = (() => {
    var _ref = (0, (_bluebirdLst || _load_bluebirdLst()).coroutine)(function* (rawOptions) {
        const options = normalizeOptions(rawOptions || {});
        if (options.cscLink === undefined && !(0, (_builderUtil || _load_builderUtil()).isEmptyOrSpaces)(process.env.CSC_LINK)) {
            options.cscLink = process.env.CSC_LINK;
        }
        if (options.cscInstallerLink === undefined && !(0, (_builderUtil || _load_builderUtil()).isEmptyOrSpaces)(process.env.CSC_INSTALLER_LINK)) {
            options.cscInstallerLink = process.env.CSC_INSTALLER_LINK;
        }
        if (options.cscKeyPassword === undefined && !(0, (_builderUtil || _load_builderUtil()).isEmptyOrSpaces)(process.env.CSC_KEY_PASSWORD)) {
            options.cscKeyPassword = process.env.CSC_KEY_PASSWORD;
        }
        if (options.cscInstallerKeyPassword === undefined && !(0, (_builderUtil || _load_builderUtil()).isEmptyOrSpaces)(process.env.CSC_INSTALLER_KEY_PASSWORD)) {
            options.cscInstallerKeyPassword = process.env.CSC_INSTALLER_KEY_PASSWORD;
        }
        const cancellationToken = new (_builderUtilRuntime || _load_builderUtilRuntime()).CancellationToken();
        const packager = new (_packager || _load_packager()).Packager(options, cancellationToken);
        // because artifact event maybe dispatched several times for different publish providers
        const artifactPaths = new Set();
        packager.artifactCreated(function (event) {
            if (event.file != null) {
                artifactPaths.add(event.file);
            }
        });
        const publishManager = new (_PublishManager || _load_PublishManager()).PublishManager(packager, options, cancellationToken);
        process.on("SIGINT", function () {
            (0, (_builderUtil || _load_builderUtil()).warn)("Cancelled by SIGINT");
            cancellationToken.cancel();
            publishManager.cancelTasks();
        });
        return yield (0, (_promise || _load_promise()).executeFinally)(packager.build().then(function () {
            return Array.from(artifactPaths);
        }), function (errorOccurred) {
            if (errorOccurred) {
                publishManager.cancelTasks();
                return (_bluebirdLst2 || _load_bluebirdLst2()).default.resolve(null);
            } else {
                return publishManager.awaitTasks();
            }
        });
    });

    return function build(_x) {
        return _ref.apply(this, arguments);
    };
})();
/**
 * @private
 * @internal
 */


exports.normalizeOptions = normalizeOptions;
exports.coerceTypes = coerceTypes;
exports.createTargets = createTargets;
exports.configureBuildCommand = configureBuildCommand;

var _builderUtil;

function _load_builderUtil() {
    return _builderUtil = require("builder-util");
}

var _builderUtilRuntime;

function _load_builderUtilRuntime() {
    return _builderUtilRuntime = require("builder-util-runtime");
}

var _promise;

function _load_promise() {
    return _promise = require("builder-util/out/promise");
}

var _chalk;

function _load_chalk() {
    return _chalk = require("chalk");
}

var _deepAssign;

function _load_deepAssign() {
    return _deepAssign = require("read-config-file/out/deepAssign");
}

var _core;

function _load_core() {
    return _core = require("./core");
}

var _packager;

function _load_packager() {
    return _packager = require("./packager");
}

var _PublishManager;

function _load_PublishManager() {
    return _PublishManager = require("./publish/PublishManager");
}

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/** @internal */
function normalizeOptions(args) {
    if (args.targets != null) {
        return args;
    }
    if (args.draft != null || args.prerelease != null) {
        (0, (_builderUtil || _load_builderUtil()).warn)("--draft and --prerelease is deprecated, please set releaseType (http://electron.build/configuration/publish#GithubOptions-releaseType) in the GitHub publish options instead");
    }
    let targets = new Map();
    function processTargets(platform, types) {
        function commonArch(currentIfNotSpecified) {
            if (platform === (_core || _load_core()).Platform.MAC) {
                return args.x64 || currentIfNotSpecified ? [(_builderUtil || _load_builderUtil()).Arch.x64] : [];
            }
            const result = Array();
            if (args.x64) {
                result.push((_builderUtil || _load_builderUtil()).Arch.x64);
            }
            if (args.armv7l) {
                result.push((_builderUtil || _load_builderUtil()).Arch.armv7l);
            }
            if (args.ia32) {
                result.push((_builderUtil || _load_builderUtil()).Arch.ia32);
            }
            return result.length === 0 && currentIfNotSpecified ? [(0, (_builderUtil || _load_builderUtil()).archFromString)(process.arch)] : result;
        }
        if (args.platform != null) {
            throw new Error(`--platform cannot be used if --${platform.buildConfigurationKey} is passed`);
        }
        if (args.arch != null) {
            throw new Error(`--arch cannot be used if --${platform.buildConfigurationKey} is passed`);
        }
        let archToType = targets.get(platform);
        if (archToType == null) {
            archToType = new Map();
            targets.set(platform, archToType);
        }
        if (types.length === 0) {
            const defaultTargetValue = args.dir ? [(_core || _load_core()).DIR_TARGET] : [];
            for (const arch of commonArch(args.dir === true)) {
                archToType.set(arch, defaultTargetValue);
            }
            return;
        }
        for (const type of types) {
            const suffixPos = type.lastIndexOf(":");
            if (suffixPos > 0) {
                (0, (_builderUtil || _load_builderUtil()).addValue)(archToType, (0, (_builderUtil || _load_builderUtil()).archFromString)(type.substring(suffixPos + 1)), type.substring(0, suffixPos));
            } else {
                for (const arch of commonArch(true)) {
                    (0, (_builderUtil || _load_builderUtil()).addValue)(archToType, arch, type);
                }
            }
        }
    }
    if (args.mac != null) {
        processTargets((_core || _load_core()).Platform.MAC, args.mac);
    }
    if (args.linux != null) {
        processTargets((_core || _load_core()).Platform.LINUX, args.linux);
    }
    if (args.win != null) {
        processTargets((_core || _load_core()).Platform.WINDOWS, args.win);
    }
    if (targets.size === 0) {
        if (args.platform == null && args.arch == null) {
            processTargets((_core || _load_core()).Platform.current(), []);
        } else {
            targets = createTargets((0, (_packager || _load_packager()).normalizePlatforms)(args.platform), args.dir ? (_core || _load_core()).DIR_TARGET : null, args.arch);
        }
    }
    const result = Object.assign({}, args);
    result.targets = targets;
    delete result.dir;
    delete result.mac;
    delete result.linux;
    delete result.win;
    delete result.platform;
    delete result.arch;
    const r = result;
    delete r.em;
    delete r.m;
    delete r.o;
    delete r.l;
    delete r.w;
    delete r.windows;
    delete r.macos;
    delete r.$0;
    delete r._;
    delete r.version;
    delete r.help;
    delete r.c;
    delete result.ia32;
    delete result.x64;
    delete result.armv7l;
    if (result.project != null && result.projectDir == null) {
        result.projectDir = result.project;
    }
    delete result.project;
    let config = result.config;
    const extraMetadata = result.extraMetadata;
    delete result.extraMetadata;
    // config is array when combining dot-notation values with a config file value (#2016)
    if (Array.isArray(config)) {
        const newConfig = {};
        for (const configItem of config) {
            if (typeof configItem === "object") {
                (0, (_deepAssign || _load_deepAssign()).deepAssign)(newConfig, configItem);
            } else if (typeof configItem === "string") {
                newConfig.extends = configItem;
            }
        }
        config = newConfig;
        result.config = newConfig;
    }
    if (extraMetadata != null) {
        if (typeof config === "string") {
            // transform to object and specify path to config as extends
            config = {
                extends: config,
                extraMetadata
            };
            result.config = config;
        } else if (config == null) {
            config = {};
            result.config = config;
        }
        config.extraMetadata = extraMetadata;
    }
    if (config != null && typeof config !== "string") {
        if (config.extraMetadata != null) {
            coerceTypes(config.extraMetadata);
        }
        if (config.mac != null) {
            // ability to disable code sign using -c.mac.identity=null
            coerceValue(config.mac, "identity");
        }
    }
    return result;
}
function coerceValue(host, key) {
    const value = host[key];
    if (value === "true") {
        host[key] = true;
    } else if (value === "false") {
        host[key] = false;
    } else if (value === "null") {
        host[key] = null;
    } else if (key === "version" && typeof value === "number") {
        host[key] = value.toString();
    } else if (value != null && typeof value === "object") {
        coerceTypes(value);
    }
}
/** @private */
function coerceTypes(host) {
    for (const key of Object.getOwnPropertyNames(host)) {
        coerceValue(host, key);
    }
    return host;
}
function createTargets(platforms, type, arch) {
    const targets = new Map();
    for (const platform of platforms) {
        const archs = platform === (_core || _load_core()).Platform.MAC ? [(_builderUtil || _load_builderUtil()).Arch.x64] : arch === "all" ? [(_builderUtil || _load_builderUtil()).Arch.x64, (_builderUtil || _load_builderUtil()).Arch.ia32] : [(0, (_builderUtil || _load_builderUtil()).archFromString)(arch == null ? process.arch : arch)];
        const archToType = new Map();
        targets.set(platform, archToType);
        for (const arch of archs) {
            archToType.set(arch, type == null ? [] : [type]);
        }
    }
    return targets;
}
function configureBuildCommand(yargs) {
    const publishGroup = "Publishing:";
    const buildGroup = "Building:";
    const deprecated = "Deprecated:";
    return yargs.option("mac", {
        group: buildGroup,
        alias: ["m", "o", "macos"],
        description: `Build for macOS, accepts target list (see ${(0, (_chalk || _load_chalk()).underline)("https://goo.gl/5uHuzj")}).`,
        type: "array"
    }).option("linux", {
        group: buildGroup,
        alias: "l",
        description: `Build for Linux, accepts target list (see ${(0, (_chalk || _load_chalk()).underline)("https://goo.gl/4vwQad")})`,
        type: "array"
    }).option("win", {
        group: buildGroup,
        alias: ["w", "windows"],
        description: `Build for Windows, accepts target list (see ${(0, (_chalk || _load_chalk()).underline)("https://goo.gl/jYsTEJ")})`,
        type: "array"
    }).option("x64", {
        group: buildGroup,
        description: "Build for x64",
        type: "boolean"
    }).option("ia32", {
        group: buildGroup,
        description: "Build for ia32",
        type: "boolean"
    }).option("armv7l", {
        group: buildGroup,
        description: "Build for armv7l",
        type: "boolean"
    }).option("dir", {
        group: buildGroup,
        description: "Build unpacked dir. Useful to test.",
        type: "boolean"
    }).option("publish", {
        group: publishGroup,
        alias: "p",
        description: `Publish artifacts (to GitHub Releases), see ${(0, (_chalk || _load_chalk()).underline)("https://goo.gl/tSFycD")}`,
        choices: ["onTag", "onTagOrDraft", "always", "never", undefined]
    }).option("draft", {
        group: deprecated,
        description: "Please set releaseType in the GitHub publish options instead",
        type: "boolean",
        default: undefined
    }).option("prerelease", {
        group: deprecated,
        description: "Please set releaseType in the GitHub publish options instead",
        type: "boolean",
        default: undefined
    }).option("platform", {
        group: deprecated,
        description: "The target platform (preferred to use --mac, --win or --linux)",
        choices: ["mac", "win", "linux", "darwin", "win32", "all", undefined]
    }).option("arch", {
        group: deprecated,
        description: "The target arch (preferred to use --x64 or --ia32)",
        choices: ["ia32", "x64", "all", undefined]
    }).option("extraMetadata", {
        alias: ["em"],
        group: buildGroup,
        description: "Deprecated. Use -c.extraMetadata."
    }).option("prepackaged", {
        alias: ["pd"],
        group: buildGroup,
        description: "The path to prepackaged app (to pack in a distributable format)"
    }).option("projectDir", {
        alias: ["project"],
        group: buildGroup,
        description: "The path to project directory. Defaults to current working directory."
    }).option("config", {
        alias: ["c"],
        group: buildGroup,
        description: "The path to an electron-builder config. Defaults to `electron-builder.yml` (or `json`, or `json5`), see " + (0, (_chalk || _load_chalk()).underline)("https://goo.gl/YFRJOM")
    }).group(["help", "version"], "Other:").example("electron-builder -mwl", "build for macOS, Windows and Linux").example("electron-builder --linux deb tar.xz", "build deb and tar.xz for Linux").example("electron-builder --win --ia32", "build for Windows ia32").example("electron-builder --em.foo=bar", "set package.json property `foo` to `bar`").example("electron-builder --config.nsis.unicode=false", "configure unicode options for NSIS");
}
//# sourceMappingURL=builder.js.map