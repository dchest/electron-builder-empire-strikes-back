"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.AsarPackager = undefined;

var _bluebirdLst;

function _load_bluebirdLst() {
    return _bluebirdLst = require("bluebird-lst");
}

var _bluebirdLst2;

function _load_bluebirdLst2() {
    return _bluebirdLst2 = _interopRequireDefault(require("bluebird-lst"));
}

let order = (() => {
    var _ref2 = (0, (_bluebirdLst || _load_bluebirdLst()).coroutine)(function* (filenames, orderingFile, src) {
        const orderingFiles = (yield (0, (_fsExtraP || _load_fsExtraP()).readFile)(orderingFile, "utf8")).split("\n").map(function (line) {
            if (line.indexOf(":") !== -1) {
                line = line.split(":").pop();
            }
            line = line.trim();
            if (line[0] === "/") {
                line = line.slice(1);
            }
            return line;
        });
        const ordering = [];
        for (const file of orderingFiles) {
            const pathComponents = file.split(_path.sep);
            for (const pathComponent of pathComponents) {
                ordering.push(_path.join(src, pathComponent));
            }
        }
        const sortedFiles = [];
        let missing = 0;
        const total = filenames.length;
        for (const file of ordering) {
            if (!sortedFiles.includes(file) && filenames.includes(file)) {
                sortedFiles.push(file);
            }
        }
        for (const file of filenames) {
            if (!sortedFiles.includes(file)) {
                sortedFiles.push(file);
                missing += 1;
            }
        }
        (0, (_builderUtil || _load_builderUtil()).log)(`Ordering file has ${(total - missing) / total * 100}% coverage.`);
        return sortedFiles;
    });

    return function order(_x3, _x4, _x5) {
        return _ref2.apply(this, arguments);
    };
})();
//# sourceMappingURL=asarUtil.js.map


exports.copyFileOrData = copyFileOrData;

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

var _appFileCopier;

function _load_appFileCopier() {
    return _appFileCopier = require("../util/appFileCopier");
}

var _asar;

function _load_asar() {
    return _asar = require("./asar");
}

var _unpackDetector;

function _load_unpackDetector() {
    return _unpackDetector = require("./unpackDetector");
}

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const pickle = require("chromium-pickle-js");
/** @internal */
class AsarPackager {
    constructor(src, destination, options, unpackPattern) {
        this.src = src;
        this.destination = destination;
        this.options = options;
        this.unpackPattern = unpackPattern;
        this.fs = new (_asar || _load_asar()).AsarFilesystem(this.src);
        this.outFile = _path.join(destination, "app.asar");
    }
    // sort files to minimize file change (i.e. asar file is not changed dramatically on small change)
    pack(fileSets, packager) {
        var _this = this;

        return (0, (_bluebirdLst || _load_bluebirdLst()).coroutine)(function* () {
            if (_this.options.ordering != null) {
                // ordering doesn't support transformed files, but ordering is not used functionality - wait user report to fix it
                yield order(fileSets[0].files, _this.options.ordering, fileSets[0].src);
            }
            yield (0, (_fsExtraP || _load_fsExtraP()).ensureDir)(_path.dirname(_this.outFile));
            const unpackedFileIndexMap = new Map();
            for (const fileSet of fileSets) {
                unpackedFileIndexMap.set(fileSet, (yield _this.createPackageFromFiles(fileSet, packager.info)));
            }
            yield _this.writeAsarFile(fileSets, unpackedFileIndexMap);
        })();
    }
    createPackageFromFiles(fileSet, packager) {
        var _this2 = this;

        return (0, (_bluebirdLst || _load_bluebirdLst()).coroutine)(function* () {
            const metadata = fileSet.metadata;
            // search auto unpacked dir
            const unpackedDirs = new Set();
            const unpackedDest = `${_this2.outFile}.unpacked`;
            const rootForAppFilesWithoutAsar = _path.join(_this2.destination, "app");
            if (_this2.options.smartUnpack !== false) {
                yield (0, (_unpackDetector || _load_unpackDetector()).detectUnpackedDirs)(fileSet, unpackedDirs, unpackedDest, rootForAppFilesWithoutAsar);
            }
            const dirToCreateForUnpackedFiles = new Set(unpackedDirs);
            const correctDirNodeUnpackedFlag = (() => {
                var _ref = (0, (_bluebirdLst || _load_bluebirdLst()).coroutine)(function* (filePathInArchive, dirNode) {
                    for (const dir of unpackedDirs) {
                        if (filePathInArchive.length > dir.length + 2 && filePathInArchive[dir.length] === _path.sep && filePathInArchive.startsWith(dir)) {
                            dirNode.unpacked = true;
                            unpackedDirs.add(filePathInArchive);
                            // not all dirs marked as unpacked after first iteration - because node module dir can be marked as unpacked after processing node module dir content
                            // e.g. node-notifier/example/advanced.js processed, but only on process vendor/terminal-notifier.app module will be marked as unpacked
                            yield (0, (_fsExtraP || _load_fsExtraP()).ensureDir)(_path.join(unpackedDest, filePathInArchive));
                            break;
                        }
                    }
                });

                return function correctDirNodeUnpackedFlag(_x, _x2) {
                    return _ref.apply(this, arguments);
                };
            })();
            const transformedFiles = fileSet.transformedFiles;
            const taskManager = new (_builderUtil || _load_builderUtil()).AsyncTaskManager(packager.cancellationToken);
            const fileCopier = new (_fs || _load_fs()).FileCopier();
            let currentDirNode = null;
            let currentDirPath = null;
            const unpackedFileIndexSet = new Set();
            for (let i = 0, n = fileSet.files.length; i < n; i++) {
                const file = fileSet.files[i];
                const stat = metadata.get(file);
                if (stat == null) {
                    continue;
                }
                const pathInArchive = _path.relative(rootForAppFilesWithoutAsar, (0, (_appFileCopier || _load_appFileCopier()).getDestinationPath)(file, fileSet));
                if (stat.isSymbolicLink()) {
                    _this2.fs.getOrCreateNode(pathInArchive).link = stat.relativeLink;
                    continue;
                }
                let fileParent = _path.dirname(pathInArchive);
                if (fileParent === ".") {
                    fileParent = "";
                }
                if (currentDirPath !== fileParent) {
                    if (fileParent.startsWith("..")) {
                        throw new Error(`Internal error: path must not start with "..": ${fileParent}`);
                    }
                    currentDirPath = fileParent;
                    currentDirNode = _this2.fs.getOrCreateNode(fileParent);
                    // do not check for root
                    if (fileParent !== "" && !currentDirNode.unpacked) {
                        if (unpackedDirs.has(fileParent)) {
                            currentDirNode.unpacked = true;
                        } else {
                            yield correctDirNodeUnpackedFlag(fileParent, currentDirNode);
                        }
                    }
                }
                const dirNode = currentDirNode;
                const newData = transformedFiles == null ? null : transformedFiles.get(i);
                const isUnpacked = dirNode.unpacked || _this2.unpackPattern != null && _this2.unpackPattern(file, stat);
                _this2.fs.addFileNode(file, dirNode, newData == null ? stat.size : Buffer.byteLength(newData), isUnpacked, stat);
                if (isUnpacked) {
                    if (!dirNode.unpacked && !dirToCreateForUnpackedFiles.has(fileParent)) {
                        dirToCreateForUnpackedFiles.add(fileParent);
                        yield (0, (_fsExtraP || _load_fsExtraP()).ensureDir)(_path.join(unpackedDest, fileParent));
                    }
                    const unpackedFile = _path.join(unpackedDest, pathInArchive);
                    taskManager.addTask(copyFileOrData(fileCopier, newData, file, unpackedFile, stat));
                    if (taskManager.tasks.length > (_fs || _load_fs()).MAX_FILE_REQUESTS) {
                        yield taskManager.awaitTasks();
                    }
                    unpackedFileIndexSet.add(i);
                }
            }
            if (taskManager.tasks.length > 0) {
                yield taskManager.awaitTasks();
            }
            return unpackedFileIndexSet;
        })();
    }
    writeAsarFile(fileSets, unpackedFileIndexMap) {
        return new (_bluebirdLst2 || _load_bluebirdLst2()).default((resolve, reject) => {
            const headerPickle = pickle.createEmpty();
            headerPickle.writeString(JSON.stringify(this.fs.header));
            const headerBuf = headerPickle.toBuffer();
            const sizePickle = pickle.createEmpty();
            sizePickle.writeUInt32(headerBuf.length);
            const sizeBuf = sizePickle.toBuffer();
            const writeStream = (0, (_fsExtraP || _load_fsExtraP()).createWriteStream)(this.outFile);
            writeStream.on("error", reject);
            writeStream.on("close", resolve);
            writeStream.write(sizeBuf);
            let fileSetIndex = 0;
            let files = fileSets[0].files;
            let metadata = fileSets[0].metadata;
            let transformedFiles = fileSets[0].transformedFiles;
            let unpackedFileIndexSet = unpackedFileIndexMap.get(fileSets[0]);
            const w = index => {
                while (true) {
                    if (index >= files.length) {
                        if (++fileSetIndex >= fileSets.length) {
                            writeStream.end();
                            return;
                        } else {
                            files = fileSets[fileSetIndex].files;
                            metadata = fileSets[fileSetIndex].metadata;
                            transformedFiles = fileSets[fileSetIndex].transformedFiles;
                            unpackedFileIndexSet = unpackedFileIndexMap.get(fileSets[fileSetIndex]);
                            index = 0;
                        }
                    }
                    if (!unpackedFileIndexSet.has(index)) {
                        break;
                    }
                    index++;
                }
                const data = transformedFiles == null ? null : transformedFiles.get(index);
                const file = files[index];
                if (data !== null && data !== undefined) {
                    writeStream.write(data, () => w(index + 1));
                    return;
                }
                // https://github.com/yarnpkg/yarn/pull/3539
                const stat = metadata.get(file);
                if (stat != null && stat.size < 4 * 1024 * 1024) {
                    (0, (_fsExtraP || _load_fsExtraP()).readFile)(file).then(it => {
                        writeStream.write(it, () => w(index + 1));
                    }).catch(reject);
                } else {
                    const readStream = (0, (_fsExtraP || _load_fsExtraP()).createReadStream)(file);
                    readStream.on("error", reject);
                    readStream.once("end", () => w(index + 1));
                    readStream.pipe(writeStream, {
                        end: false
                    });
                }
            };
            writeStream.write(headerBuf, () => w(0));
        });
    }
}
exports.AsarPackager = AsarPackager;
function copyFileOrData(fileCopier, data, source, destination, stats) {
    if (data == null) {
        return fileCopier.copy(source, destination, stats);
    } else {
        return (0, (_fsExtraP || _load_fsExtraP()).writeFile)(destination, data);
    }
}