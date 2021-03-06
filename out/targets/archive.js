"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.archive = exports.tar = undefined;

var _bluebirdLst;

function _load_bluebirdLst() {
    return _bluebirdLst = require("bluebird-lst");
}

var _bluebirdLst2;

function _load_bluebirdLst2() {
    return _bluebirdLst2 = _interopRequireDefault(require("bluebird-lst"));
}

/** @internal */
let tar = exports.tar = (() => {
    var _ref = (0, (_bluebirdLst || _load_bluebirdLst()).coroutine)(function* (compression, format, outFile, dirToArchive, isMacApp, tempDirManager) {
        const tarFile = yield tempDirManager.getTempFile({ suffix: ".tar" });
        const tarArgs = (0, (_builderUtil || _load_builderUtil()).debug7zArgs)("a");
        tarArgs.push(tarFile);
        tarArgs.push(_path.basename(dirToArchive));
        yield (_bluebirdLst2 || _load_bluebirdLst2()).default.all([(0, (_builderUtil || _load_builderUtil()).exec)((_zipBin || _load_zipBin()).path7za, tarArgs, { cwd: _path.dirname(dirToArchive) }),
        // remove file before - 7z doesn't overwrite file, but update
        (0, (_fs || _load_fs()).unlinkIfExists)(outFile)]);
        if (!isMacApp) {
            yield (0, (_builderUtil || _load_builderUtil()).exec)((_zipBin || _load_zipBin()).path7za, ["rn", tarFile, _path.basename(dirToArchive), _path.basename(outFile, `.${format}`)]);
        }
        if (format === "tar.lz") {
            // noinspection SpellCheckingInspection
            let lzipPath = "lzip";
            if (process.platform === "darwin") {
                lzipPath = _path.join((yield (0, (_bundledTool || _load_bundledTool()).getLinuxToolsPath)()), "bin", lzipPath);
            }
            yield (0, (_builderUtil || _load_builderUtil()).exec)(lzipPath, [compression === "store" ? "-1" : "-9", "--keep" /* keep (don't delete) input files */, tarFile]);
            // bloody lzip creates file in the same dir where input file with postfix `.lz`, option --output doesn't work
            yield (0, (_fsExtraP || _load_fsExtraP()).move)(`${tarFile}.lz`, outFile);
            return;
        }
        const args = compute7zCompressArgs(compression, format === "tar.xz" ? "xz" : format === "tar.bz2" ? "bzip2" : "gzip", { isRegularFile: true });
        args.push(outFile, tarFile);
        yield (0, (_builderUtil || _load_builderUtil()).exec)((_zipBin || _load_zipBin()).path7za, args, {
            cwd: _path.dirname(dirToArchive)
        }, (_builderUtil || _load_builderUtil()).debug7z.enabled);
    });

    return function tar(_x, _x2, _x3, _x4, _x5, _x6) {
        return _ref.apply(this, arguments);
    };
})();

// 7z is very fast, so, use ultra compression
/** @internal */
let archive = exports.archive = (() => {
    var _ref2 = (0, (_bluebirdLst || _load_bluebirdLst()).coroutine)(function* (compression, format, outFile, dirToArchive, options = {}) {
        const args = compute7zCompressArgs(compression, format, options);
        // remove file before - 7z doesn't overwrite file, but update
        yield (0, (_fs || _load_fs()).unlinkIfExists)(outFile);
        args.push(outFile, options.listFile == null ? options.withoutDir ? "." : _path.basename(dirToArchive) : `@${options.listFile}`);
        if (options.excluded != null) {
            args.push(...options.excluded);
        }
        try {
            yield (0, (_builderUtil || _load_builderUtil()).exec)((_zipBin || _load_zipBin()).path7za, args, {
                cwd: options.withoutDir ? dirToArchive : _path.dirname(dirToArchive)
            }, (_builderUtil || _load_builderUtil()).debug7z.enabled);
        } catch (e) {
            if (e.code === "ENOENT" && !(yield (0, (_fs || _load_fs()).exists)(dirToArchive))) {
                throw new Error(`Cannot create archive: "${dirToArchive}" doesn't exist`);
            } else {
                throw e;
            }
        }
        return outFile;
    });

    return function archive(_x7, _x8, _x9, _x10) {
        return _ref2.apply(this, arguments);
    };
})();
//# sourceMappingURL=archive.js.map


exports.compute7zCompressArgs = compute7zCompressArgs;

var _zipBin;

function _load_zipBin() {
    return _zipBin = require("7zip-bin");
}

var _builderUtil;

function _load_builderUtil() {
    return _builderUtil = require("builder-util");
}

var _fs;

function _load_fs() {
    return _fs = require("builder-util/out/fs");
}

var _path = _interopRequireWildcard(require("path"));

var _bundledTool;

function _load_bundledTool() {
    return _bundledTool = require("builder-util/out/bundledTool");
}

var _fsExtraP;

function _load_fsExtraP() {
    return _fsExtraP = require("fs-extra-p");
}

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function compute7zCompressArgs(compression, format, options = {}) {
    let storeOnly = compression === "store";
    const args = (0, (_builderUtil || _load_builderUtil()).debug7zArgs)("a");
    let isLevelSet = false;
    if (process.env.ELECTRON_BUILDER_COMPRESSION_LEVEL != null) {
        storeOnly = false;
        args.push(`-mx=${process.env.ELECTRON_BUILDER_COMPRESSION_LEVEL}`);
        isLevelSet = true;
    }
    if (format === "zip" && compression === "maximum") {
        // http://superuser.com/a/742034
        args.push("-mfb=258", "-mpass=15");
    }
    if (!isLevelSet && !storeOnly) {
        args.push("-mx=9");
    }
    if (options.dictSize != null) {
        args.push(`-md=${options.dictSize}m`);
    }
    // https://sevenzip.osdn.jp/chm/cmdline/switches/method.htm#7Z
    // https://stackoverflow.com/questions/27136783/7zip-produces-different-output-from-identical-input
    // tc and ta are off by default, but to be sure, we explicitly set it to off
    // disable "Stores NTFS timestamps for files: Modification time, Creation time, Last access time." to produce the same archive for the same data
    if (!options.isRegularFile) {
        args.push("-mtc=off");
    }
    if (format === "7z" || format.endsWith(".7z")) {
        if (options.solid === false) {
            args.push("-ms=off");
        }
        if (options.isArchiveHeaderCompressed === false) {
            args.push("-mhc=off");
        }
        // args valid only for 7z
        // -mtm=off disable "Stores last Modified timestamps for files."
        args.push("-mtm=off", "-mta=off");
    }
    if (options.method != null) {
        args.push(`-mm=${options.method}`);
    } else if (!options.isRegularFile && (format === "zip" || storeOnly)) {
        args.push(`-mm=${storeOnly ? "Copy" : "Deflate"}`);
    }
    if (format === "zip") {
        // -mcu switch:  7-Zip uses UTF-8, if there are non-ASCII symbols.
        // because default mode: 7-Zip uses UTF-8, if the local code page doesn't contain required symbols.
        // but archive should be the same regardless where produced
        args.push("-mcu");
    }
    return args;
}