"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.readPackageJson = undefined;

var _bluebirdLst;

function _load_bluebirdLst() {
    return _bluebirdLst = require("bluebird-lst");
}

/** @internal */
let readPackageJson = exports.readPackageJson = (() => {
    var _ref = (0, (_bluebirdLst || _load_bluebirdLst()).coroutine)(function* (file) {
        const data = yield (0, (_fsExtraP || _load_fsExtraP()).readJson)(file);
        yield authors(file, data);
        normalizeData(data);
        return data;
    });

    return function readPackageJson(_x) {
        return _ref.apply(this, arguments);
    };
})();

let authors = (() => {
    var _ref2 = (0, (_bluebirdLst || _load_bluebirdLst()).coroutine)(function* (file, data) {
        if (data.contributors != null) {
            return;
        }
        let authorData;
        try {
            authorData = yield (0, (_fsExtraP || _load_fsExtraP()).readFile)(_path.resolve(_path.dirname(file), "AUTHORS"), "utf8");
        } catch (ignored) {
            return;
        }
        data.contributors = authorData.split(/\r?\n/g).map(function (it) {
            return it.replace(/^\s*#.*$/, "").trim();
        });
    });

    return function authors(_x2, _x3) {
        return _ref2.apply(this, arguments);
    };
})();
/** @internal */


exports.checkMetadata = checkMetadata;

var _builderUtil;

function _load_builderUtil() {
    return _builderUtil = require("builder-util");
}

var _fsExtraP;

function _load_fsExtraP() {
    return _fsExtraP = require("fs-extra-p");
}

var _path = _interopRequireWildcard(require("path"));

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

const normalizeData = require("normalize-package-data");function checkMetadata(metadata, devMetadata, appPackageFile, devAppPackageFile) {
    const errors = [];
    const reportError = missedFieldName => {
        errors.push(`Please specify '${missedFieldName}' in the package.json (${appPackageFile})`);
    };
    const checkNotEmpty = (name, value) => {
        if ((0, (_builderUtil || _load_builderUtil()).isEmptyOrSpaces)(value)) {
            reportError(name);
        }
    };
    if (metadata.directories != null) {
        errors.push(`"directories" in the root is deprecated, please specify in the "build"`);
    }
    checkNotEmpty("name", metadata.name);
    if ((0, (_builderUtil || _load_builderUtil()).isEmptyOrSpaces)(metadata.description)) {
        (0, (_builderUtil || _load_builderUtil()).warn)(`description is missed in the package.json (${appPackageFile})`);
    }
    if (!metadata.author) {
        (0, (_builderUtil || _load_builderUtil()).warn)(`author is missed in the package.json (${appPackageFile})`);
    }
    checkNotEmpty("version", metadata.version);
    if (devMetadata != null) {
        checkDependencies(devMetadata.dependencies, errors);
    }
    if (metadata !== devMetadata) {
        checkDependencies(metadata.dependencies, errors);
        if (metadata.build != null) {
            errors.push(`'build' in the application package.json (${appPackageFile}) is not supported since 3.0 anymore. Please move 'build' into the development package.json (${devAppPackageFile})`);
        }
    }
    const devDependencies = metadata.devDependencies;
    if (devDependencies != null && "electron-rebuild" in devDependencies) {
        (0, (_builderUtil || _load_builderUtil()).log)('electron-rebuild not required if you use electron-builder, please consider to remove excess dependency from devDependencies\n\nTo ensure your native dependencies are always matched electron version, simply add script `"postinstall": "electron-builder install-app-deps" to your `package.json`');
    }
    if (errors.length > 0) {
        throw new Error(errors.join("\n"));
    }
}
function checkDependencies(dependencies, errors) {
    if (dependencies == null) {
        return;
    }
    const deps = ["electron", "electron-prebuilt", "electron-rebuild"];
    if (process.env.ALLOW_ELECTRON_BUILDER_AS_PRODUCTION_DEPENDENCY !== "true") {
        deps.push("electron-builder");
    }
    for (const name of deps) {
        if (name in dependencies) {
            errors.push(`Package "${name}" is only allowed in "devDependencies". ` + `Please remove it from the "dependencies" section in your package.json.`);
        }
    }
}
//# sourceMappingURL=packageMetadata.js.map