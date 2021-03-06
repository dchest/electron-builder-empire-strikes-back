"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.getProductionDependencies = undefined;

var _bluebirdLst;

function _load_bluebirdLst() {
    return _bluebirdLst = require("bluebird-lst");
}

var _bluebirdLst2;

function _load_bluebirdLst2() {
    return _bluebirdLst2 = _interopRequireDefault(require("bluebird-lst"));
}

/** @internal */
let getProductionDependencies = exports.getProductionDependencies = (() => {
    var _ref = (0, (_bluebirdLst || _load_bluebirdLst()).coroutine)(function* (folder) {
        const sorted = [];
        computeSortedPaths((yield computeDependencies(folder)), sorted, false);
        return sorted;
    });

    return function getProductionDependencies(_x) {
        return _ref.apply(this, arguments);
    };
})();

let readNodeModulesDir = (() => {
    var _ref2 = (0, (_bluebirdLst || _load_bluebirdLst()).coroutine)(function* (dir) {
        let files;
        try {
            files = (yield (0, (_fsExtraP || _load_fsExtraP()).readdir)(dir)).filter(function (it) {
                return !it.startsWith(".") && !knownAlwaysIgnoredDevDeps.has(it);
            });
        } catch (e) {
            // error indicates that nothing is installed here
            return null;
        }
        files.sort();
        const scopes = files.filter(function (it) {
            return it.startsWith("@");
        });
        if (scopes.length === 0) {
            return files;
        }
        const result = files.filter(function (it) {
            return !it.startsWith("@");
        });
        const scopeFileList = yield (_bluebirdLst2 || _load_bluebirdLst2()).default.map(scopes, function (it) {
            return (0, (_fsExtraP || _load_fsExtraP()).readdir)(_path.join(dir, it));
        });
        for (let i = 0; i < scopes.length; i++) {
            const list = scopeFileList[i];
            list.sort();
            for (const file of list) {
                if (!file.startsWith(".")) {
                    result.push(`${scopes[i]}/${file}`);
                }
            }
        }
        return result;
    });

    return function readNodeModulesDir(_x2) {
        return _ref2.apply(this, arguments);
    };
})();
//# sourceMappingURL=packageDependencies.js.map


exports.createLazyProductionDeps = createLazyProductionDeps;

var _builderUtil;

function _load_builderUtil() {
    return _builderUtil = require("builder-util");
}

var _fs;

function _load_fs() {
    return _fs = require("builder-util/out/fs");
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

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const knownAlwaysIgnoredDevDeps = new Set(["electron-builder-tslint-config", "electron-download", "electron-forge", "electron-packager", "electron-compilers", "jest", "jest-cli", "prebuild-install", "nan", "electron-webpack", "electron-webpack-ts", "electron-webpack-vue", "react-scripts", "@types"]);
function createLazyProductionDeps(projectDir) {
    return new (_lazyVal || _load_lazyVal()).Lazy(() => getProductionDependencies(projectDir));
}
function computeDependencies(folder) {
    return new Collector().collect(folder);
}
const ignoredProperties = new Set(["description", "author", "bugs", "engines", "repository", "build", "main", "license", "homepage", "scripts", "maintainers", "contributors", "keywords", "devDependencies", "files", "typings", "types"]);
function readJson(file) {
    return (0, (_fsExtraP || _load_fsExtraP()).readFile)(file, "utf-8").then(it => JSON.parse(it, (key, value) => ignoredProperties.has(key) ? undefined : value));
}
function computeSortedPaths(parent, result, isExtraneous) {
    const dependencies = parent.dependencies;
    if (dependencies == null) {
        return;
    }
    for (const dep of dependencies.values()) {
        if (dep.extraneous === isExtraneous) {
            result.push(dep);
            computeSortedPaths(dep, result, isExtraneous);
        }
    }
}
class Collector {
    constructor() {
        this.pathToMetadata = new Map();
        this.unresolved = new Set();
    }
    collect(dir) {
        var _this = this;

        return (0, (_bluebirdLst || _load_bluebirdLst()).coroutine)(function* () {
            const rootDependency = yield readJson(_path.join(dir, "package.json"));
            yield _this.readInstalled(_path.join(dir, "node_modules"), rootDependency, rootDependency.name);
            _this.unmarkExtraneous(rootDependency);
            if (_this.unresolved.size > 0) {
                if ((_builderUtil || _load_builderUtil()).debug.enabled) {
                    (0, (_builderUtil || _load_builderUtil()).debug)(`Unresolved dependencies after first round: ${Array.from(_this.unresolved).join(", ")}`);
                }
                yield _this.resolveUnresolvedHoisted(rootDependency, dir);
            }
            return rootDependency;
        })();
    }
    resolveUnresolvedHoisted(rootDependency, dir) {
        var _this2 = this;

        return (0, (_bluebirdLst || _load_bluebirdLst()).coroutine)(function* () {
            let nameToMetadata = rootDependency.dependencies;
            if (nameToMetadata == null) {
                rootDependency.dependencies = new Map();
                nameToMetadata = rootDependency.dependencies;
            }
            let parentDir = dir;
            do {
                parentDir = _path.dirname(parentDir);
                if (parentDir === "" || parentDir.endsWith("/") || parentDir.endsWith("\\")) {
                    const message = `Unresolved node modules: ${Array.from(_this2.unresolved).join(", ")}`;
                    if ((0, (_builderUtil || _load_builderUtil()).isEnvTrue)(process.env.ELECTRON_BUILDER_ALLOW_UNRESOLVED_DEPENDENCIES)) {
                        (0, (_builderUtil || _load_builderUtil()).warn)(message);
                    } else {
                        throw new Error(message);
                    }
                    break;
                }
                const parentNodeModulesDir = parentDir + _path.sep + "node_modules";
                const dirStat = yield (0, (_fs || _load_fs()).statOrNull)(parentNodeModulesDir);
                if (dirStat == null || !dirStat.isDirectory()) {
                    continue;
                }
                const unresolved = Array.from(_this2.unresolved);
                _this2.unresolved.clear();
                const resolved = yield (_bluebirdLst2 || _load_bluebirdLst2()).default.map(unresolved, function (it) {
                    return _this2.readChildPackage(it, parentNodeModulesDir, rootDependency).catch(function (e) {
                        if (e.code === "ENOENT") {
                            return null;
                        } else {
                            throw e;
                        }
                    });
                }, (_fs || _load_fs()).CONCURRENCY);
                for (const dep of resolved) {
                    if (dep != null) {
                        nameToMetadata.set(dep.realName, dep);
                    }
                }
                _this2.unmarkExtraneous(rootDependency);
            } while (_this2.unresolved.size > 0);
        })();
    }
    readInstalled(nodeModulesDir, dependency, name) {
        var _this3 = this;

        return (0, (_bluebirdLst || _load_bluebirdLst()).coroutine)(function* () {
            dependency.realName = name;
            dependency.directDependencyNames = dependency.dependencies == null ? null : Object.keys(dependency.dependencies);
            // mark as extraneous at this point.
            // this will be un-marked in unmarkExtraneous, where we mark as not-extraneous everything that is required in some way from the root object.
            dependency.extraneous = true;
            dependency.optional = true;
            if (dependency.dependencies == null && dependency.optionalDependencies == null) {
                // package has only dev or peer dependencies - no need to check child node_module
                dependency.dependencies = null;
                return;
            }
            const childModules = yield readNodeModulesDir(nodeModulesDir);
            if (childModules == null) {
                dependency.dependencies = null;
                return;
            }
            const deps = yield (_bluebirdLst2 || _load_bluebirdLst2()).default.map(childModules, function (it) {
                return _this3.readChildPackage(it, nodeModulesDir, dependency);
            }, (_fs || _load_fs()).CONCURRENCY);
            if (deps.length === 0) {
                dependency.dependencies = null;
                return;
            }
            const nameToMetadata = new Map();
            for (const dep of deps) {
                if (dep != null) {
                    nameToMetadata.set(dep.realName, dep);
                }
            }
            dependency.dependencies = nameToMetadata;
        })();
    }
    readChildPackage(name, nodeModulesDir, parent) {
        var _this4 = this;

        return (0, (_bluebirdLst || _load_bluebirdLst()).coroutine)(function* () {
            const rawDir = _path.join(nodeModulesDir, name);
            let dir = rawDir;
            const stat = yield (0, (_fsExtraP || _load_fsExtraP()).lstat)(dir);
            const isSymbolicLink = stat.isSymbolicLink();
            if (isSymbolicLink) {
                dir = yield (0, (_promise || _load_promise()).orNullIfFileNotExist)((0, (_fsExtraP || _load_fsExtraP()).realpath)(dir));
                if (dir == null) {
                    (0, (_builderUtil || _load_builderUtil()).debug)(`Broken symlink ${rawDir}`);
                    return null;
                }
            }
            const processed = _this4.pathToMetadata.get(dir);
            if (processed != null) {
                return processed;
            }
            const metadata = yield (0, (_promise || _load_promise()).orNullIfFileNotExist)(readJson(_path.join(dir, "package.json")));
            if (metadata == null) {
                return null;
            }
            if (isSymbolicLink) {
                metadata.link = dir;
                metadata.stat = stat;
            } else {
                metadata.parent = parent;
            }
            metadata.path = rawDir;
            // do not add root project to result
            _this4.pathToMetadata.set(dir, metadata);
            yield _this4.readInstalled(dir + _path.sep + "node_modules", metadata, name);
            return metadata;
        })();
    }
    unmark(deps, obj, unsetOptional) {
        for (const name of deps) {
            const dep = this.findDep(obj, name);
            if (dep != null) {
                if (unsetOptional) {
                    dep.optional = false;
                }
                if (dep.extraneous) {
                    this.unmarkExtraneous(dep);
                }
            }
        }
    }
    unmarkExtraneous(obj) {
        // Mark all non-required deps as extraneous.
        // start from the root object and mark as non-extraneous all modules
        // that haven't been previously flagged as extraneous then propagate to all their dependencies
        obj.extraneous = false;
        if (obj.directDependencyNames != null) {
            this.unmark(obj.directDependencyNames, obj, true);
        }
        if (obj.peerDependencies != null) {
            this.unmark(Object.keys(obj.peerDependencies), obj, true);
        }
        if (obj.optionalDependencies != null) {
            this.unmark(Object.keys(obj.optionalDependencies), obj, false);
        }
    }
    // find the one that will actually be loaded by require() so we can make sure it's valid
    findDep(obj, name) {
        if (isIgnoredDep(name)) {
            return null;
        }
        let r = obj;
        let found = null;
        while (r != null && found == null) {
            // if r is a valid choice, then use that.
            // kinda weird if a pkg depends on itself, but after the first iteration of this loop, it indicates a dep cycle.
            found = r.dependencies == null ? null : r.dependencies.get(name);
            if (found == null && r.realName === name) {
                found = r;
            }
            r = r.link == null ? r.parent : null;
        }
        if (found == null) {
            this.unresolved.add(name);
        }
        return found;
    }
}
function isIgnoredDep(name) {
    return knownAlwaysIgnoredDevDeps.has(name) || name.startsWith("@types/");
}