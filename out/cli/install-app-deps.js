#! /usr/bin/env node
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.installAppDeps = undefined;

var _bluebirdLst;

function _load_bluebirdLst() {
    return _bluebirdLst = require("bluebird-lst");
}

var _bluebirdLst2;

function _load_bluebirdLst2() {
    return _bluebirdLst2 = _interopRequireDefault(require("bluebird-lst"));
}

/** @internal */
let installAppDeps = exports.installAppDeps = (() => {
    var _ref = (0, (_bluebirdLst || _load_bluebirdLst()).coroutine)(function* (args) {
        try {
            (0, (_builderUtil || _load_builderUtil()).log)("electron-builder " + "0.0.0-semantic-release");
        } catch (e) {
            // error in dev mode without babel
            if (!(e instanceof ReferenceError)) {
                throw e;
            }
        }
        const projectDir = process.cwd();
        const packageMetadata = new (_lazyVal || _load_lazyVal()).Lazy(function () {
            return (0, (_readConfigFile || _load_readConfigFile()).orNullIfFileNotExist)((0, (_fsExtraP || _load_fsExtraP()).readJson)(_path.join(projectDir, "package.json")));
        });
        const config = yield (0, (_config || _load_config()).getConfig)(projectDir, null, null, packageMetadata);
        const muonVersion = config.muonVersion;
        const results = yield (_bluebirdLst2 || _load_bluebirdLst2()).default.all([(0, (_config || _load_config()).computeDefaultAppDirectory)(projectDir, (0, (_builderUtil || _load_builderUtil()).use)(config.directories, function (it) {
            return it.app;
        })), muonVersion == null ? (0, (_electronVersion || _load_electronVersion()).getElectronVersion)(projectDir, config, packageMetadata) : (_bluebirdLst2 || _load_bluebirdLst2()).default.resolve(muonVersion)]);
        // if two package.json — force full install (user wants to install/update app deps in addition to dev)
        yield (0, (_yarn || _load_yarn()).installOrRebuild)(config, results[0], {
            frameworkInfo: { version: results[1], useCustomDist: muonVersion == null },
            platform: args.platform,
            arch: args.arch,
            productionDeps: (0, (_packageDependencies || _load_packageDependencies()).createLazyProductionDeps)(results[0])
        }, results[0] !== projectDir);
    });

    return function installAppDeps(_x) {
        return _ref.apply(this, arguments);
    };
})();

exports.configureInstallAppDepsCommand = configureInstallAppDepsCommand;

var _builderUtil;

function _load_builderUtil() {
    return _builderUtil = require("builder-util");
}

var _promise;

function _load_promise() {
    return _promise = require("builder-util/out/promise");
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

var _readConfigFile;

function _load_readConfigFile() {
    return _readConfigFile = require("read-config-file");
}

var _yargs;

function _load_yargs() {
    return _yargs = _interopRequireDefault(require("yargs"));
}

var _config;

function _load_config() {
    return _config = require("../util/config");
}

var _electronVersion;

function _load_electronVersion() {
    return _electronVersion = require("../util/electronVersion");
}

var _packageDependencies;

function _load_packageDependencies() {
    return _packageDependencies = require("../util/packageDependencies");
}

var _yarn;

function _load_yarn() {
    return _yarn = require("../util/yarn");
}

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/** @internal */
function configureInstallAppDepsCommand(yargs) {
    // https://github.com/yargs/yargs/issues/760
    // demandOption is required to be set
    return yargs.option("platform", {
        choices: ["linux", "darwin", "win32"],
        default: process.platform,
        description: "The target platform"
    }).option("arch", {
        choices: ["ia32", "x64", "all"],
        default: process.arch,
        description: "The target arch"
    });
}
function main() {
    return installAppDeps(configureInstallAppDepsCommand((_yargs || _load_yargs()).default).argv);
}
if (process.mainModule === module) {
    (0, (_builderUtil || _load_builderUtil()).warn)("Please use as subcommand: electron-builder install-app-deps");
    main().catch((_promise || _load_promise()).printErrorAndExit);
}
//# sourceMappingURL=install-app-deps.js.map