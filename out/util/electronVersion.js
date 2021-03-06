"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.computeElectronVersion = exports.getElectronVersionFromInstalled = exports.getElectronVersion = undefined;

var _bluebirdLst;

function _load_bluebirdLst() {
    return _bluebirdLst = require("bluebird-lst");
}

let getElectronVersion = exports.getElectronVersion = (() => {
    var _ref = (0, (_bluebirdLst || _load_bluebirdLst()).coroutine)(function* (projectDir, config, projectMetadata = new (_lazyVal || _load_lazyVal()).Lazy(function () {
        return (0, (_readConfigFile || _load_readConfigFile()).orNullIfFileNotExist)((0, (_fsExtraP || _load_fsExtraP()).readJson)(_path.join(projectDir, "package.json")));
    })) {
        if (config == null) {
            config = yield (0, (_config || _load_config()).getConfig)(projectDir, null, null);
        }
        if (config.electronVersion != null) {
            return config.electronVersion;
        }
        return yield computeElectronVersion(projectDir, projectMetadata);
    });

    return function getElectronVersion(_x, _x2) {
        return _ref.apply(this, arguments);
    };
})();

let getElectronVersionFromInstalled = exports.getElectronVersionFromInstalled = (() => {
    var _ref2 = (0, (_bluebirdLst || _load_bluebirdLst()).coroutine)(function* (projectDir) {
        for (const name of ["electron", "electron-prebuilt", "electron-prebuilt-compile"]) {
            try {
                return (yield (0, (_fsExtraP || _load_fsExtraP()).readJson)(_path.join(projectDir, "node_modules", name, "package.json"))).version;
            } catch (e) {
                if (e.code !== "ENOENT") {
                    (0, (_builderUtil || _load_builderUtil()).warn)(`Cannot read electron version from ${name} package.json: ${e.message}`);
                }
            }
        }
        return null;
    });

    return function getElectronVersionFromInstalled(_x3) {
        return _ref2.apply(this, arguments);
    };
})();
/** @internal */


let computeElectronVersion = exports.computeElectronVersion = (() => {
    var _ref3 = (0, (_bluebirdLst || _load_bluebirdLst()).coroutine)(function* (projectDir, projectMetadata) {
        const result = yield getElectronVersionFromInstalled(projectDir);
        if (result != null) {
            return result;
        }
        const electronPrebuiltDep = findFromElectronPrebuilt((yield projectMetadata.value));
        if (electronPrebuiltDep == null || electronPrebuiltDep === "latest") {
            try {
                const releaseInfo = JSON.parse((yield (_nodeHttpExecutor || _load_nodeHttpExecutor()).httpExecutor.request({
                    hostname: "github.com",
                    path: "/electron/electron/releases/latest",
                    headers: {
                        Accept: "application/json"
                    }
                })));
                return releaseInfo.tag_name.startsWith("v") ? releaseInfo.tag_name.substring(1) : releaseInfo.tag_name;
            } catch (e) {
                (0, (_builderUtil || _load_builderUtil()).warn)(e);
            }
            throw new Error(`Cannot find electron dependency to get electron version in the '${_path.join(projectDir, "package.json")}'`);
        }
        const firstChar = electronPrebuiltDep[0];
        return firstChar === "^" || firstChar === "~" ? electronPrebuiltDep.substring(1) : electronPrebuiltDep;
    });

    return function computeElectronVersion(_x4, _x5) {
        return _ref3.apply(this, arguments);
    };
})();

var _builderUtil;

function _load_builderUtil() {
    return _builderUtil = require("builder-util");
}

var _nodeHttpExecutor;

function _load_nodeHttpExecutor() {
    return _nodeHttpExecutor = require("builder-util/out/nodeHttpExecutor");
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

var _config;

function _load_config() {
    return _config = require("./config");
}

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function findFromElectronPrebuilt(packageData) {
    for (const name of ["electron", "electron-prebuilt", "electron-prebuilt-compile"]) {
        const devDependencies = packageData.devDependencies;
        let dep = devDependencies == null ? null : devDependencies[name];
        if (dep == null) {
            const dependencies = packageData.dependencies;
            dep = dependencies == null ? null : dependencies[name];
        }
        if (dep != null) {
            return dep;
        }
    }
    return null;
}
//# sourceMappingURL=electronVersion.js.map