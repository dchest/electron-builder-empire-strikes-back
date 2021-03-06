"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.writeUpdateInfo = undefined;

var _bluebirdLst;

function _load_bluebirdLst() {
    return _bluebirdLst = require("bluebird-lst");
}

let getReleaseInfo = (() => {
    var _ref = (0, (_bluebirdLst || _load_bluebirdLst()).coroutine)(function* (packager) {
        const releaseInfo = Object.assign({}, packager.platformSpecificBuildOptions.releaseInfo || packager.config.releaseInfo);
        if (releaseInfo.releaseNotes == null) {
            const releaseNotesFile = yield packager.getResource(releaseInfo.releaseNotesFile, `release-notes-${packager.platform.buildConfigurationKey}.md`, `release-notes-${packager.platform.name}.md`, `release-notes-${packager.platform.nodeName}.md`, "release-notes.md");
            const releaseNotes = releaseNotesFile == null ? null : yield (0, (_fsExtraP || _load_fsExtraP()).readFile)(releaseNotesFile, "utf-8");
            // to avoid undefined in the file, check for null
            if (releaseNotes != null) {
                releaseInfo.releaseNotes = releaseNotes;
            }
        }
        delete releaseInfo.releaseNotesFile;
        return releaseInfo;
    });

    return function getReleaseInfo(_x) {
        return _ref.apply(this, arguments);
    };
})();

/** @internal */
let writeUpdateInfo = exports.writeUpdateInfo = (() => {
    var _ref2 = (0, (_bluebirdLst || _load_bluebirdLst()).coroutine)(function* (event, _publishConfigs) {
        const packager = event.packager;
        const publishConfigs = yield (0, (_PublishManager || _load_PublishManager()).getPublishConfigsForUpdateInfo)(packager, _publishConfigs, event.arch);
        if (publishConfigs == null || publishConfigs.length === 0) {
            return [];
        }
        const outDir = event.target.outDir;
        const version = packager.appInfo.version;
        const sha2 = new (_lazyVal || _load_lazyVal()).Lazy(function () {
            return (0, (_builderUtil || _load_builderUtil()).hashFile)(event.file, "sha256", "hex");
        });
        const isMac = packager.platform === (_core || _load_core()).Platform.MAC;
        const createdFiles = new Set();
        const sharedInfo = yield createUpdateInfo(version, event, (yield getReleaseInfo(packager)));
        const events = [];
        for (let publishConfig of publishConfigs) {
            if (publishConfig.provider === "bintray") {
                continue;
            }
            if (publishConfig.provider === "github" && "releaseType" in publishConfig) {
                publishConfig = Object.assign({}, publishConfig);
                delete publishConfig.releaseType;
            }
            let dir = outDir;
            if (publishConfigs.length > 1 && publishConfig !== publishConfigs[0]) {
                dir = _path.join(outDir, publishConfig.provider);
            }
            // spaces is a new publish provider, no need to keep backward compatibility
            let isElectronUpdater1xCompatibility = publishConfig.provider !== "spaces";
            let info = sharedInfo;
            // noinspection JSDeprecatedSymbols
            if (isElectronUpdater1xCompatibility && packager.platform === (_core || _load_core()).Platform.WINDOWS) {
                info = Object.assign({}, info);
                info.sha2 = yield sha2.value;
            }
            if (event.safeArtifactName != null && publishConfig.provider === "github") {
                info = Object.assign({}, info, { githubArtifactName: event.safeArtifactName });
            }
            for (const channel of computeChannelNames(packager, publishConfig)) {
                if (isMac && isElectronUpdater1xCompatibility) {
                    // write only for first channel (generateUpdatesFilesForAllChannels is a new functionality, no need to generate old mac update info file)
                    isElectronUpdater1xCompatibility = false;
                    yield writeOldMacInfo(publishConfig, outDir, dir, channel, createdFiles, version, packager);
                }
                const updateInfoFile = _path.join(dir, getUpdateInfoFileName(channel, packager, event.arch));
                if (createdFiles.has(updateInfoFile)) {
                    continue;
                }
                createdFiles.add(updateInfoFile);
                const fileContent = Buffer.from((0, (_jsYaml || _load_jsYaml()).safeDump)(info));
                yield (0, (_fsExtraP || _load_fsExtraP()).outputFile)(updateInfoFile, fileContent);
                // artifact should be uploaded only to designated publish provider
                events.push({
                    file: updateInfoFile,
                    fileContent,
                    arch: null,
                    packager,
                    target: null,
                    publishConfig
                });
            }
        }
        return events;
    });

    return function writeUpdateInfo(_x2, _x3) {
        return _ref2.apply(this, arguments);
    };
})();

let createUpdateInfo = (() => {
    var _ref3 = (0, (_bluebirdLst || _load_bluebirdLst()).coroutine)(function* (version, event, releaseInfo) {
        const customUpdateInfo = event.updateInfo;
        return Object.assign({ version, releaseDate: new Date().toISOString(), path: _path.basename(event.file) }, customUpdateInfo, { sha512: (customUpdateInfo == null ? null : customUpdateInfo.sha512) || (yield (0, (_builderUtil || _load_builderUtil()).hashFile)(event.file)) }, releaseInfo);
    });

    return function createUpdateInfo(_x4, _x5, _x6) {
        return _ref3.apply(this, arguments);
    };
})();
// backward compatibility - write json file


let writeOldMacInfo = (() => {
    var _ref4 = (0, (_bluebirdLst || _load_bluebirdLst()).coroutine)(function* (publishConfig, outDir, dir, channel, createdFiles, version, packager) {
        const isGitHub = publishConfig.provider === "github";
        const updateInfoFile = isGitHub && outDir === dir ? _path.join(dir, "github", `${channel}-mac.json`) : _path.join(dir, `${channel}-mac.json`);
        if (!createdFiles.has(updateInfoFile)) {
            createdFiles.add(updateInfoFile);
            yield (0, (_fsExtraP || _load_fsExtraP()).outputJson)(updateInfoFile, {
                version,
                releaseDate: new Date().toISOString(),
                url: (0, (_PublishManager || _load_PublishManager()).computeDownloadUrl)(publishConfig, packager.generateName2("zip", "mac", isGitHub), packager)
            }, { spaces: 2 });
            packager.info.dispatchArtifactCreated({
                file: updateInfoFile,
                arch: null,
                packager,
                target: null,
                publishConfig
            });
        }
    });

    return function writeOldMacInfo(_x7, _x8, _x9, _x10, _x11, _x12, _x13) {
        return _ref4.apply(this, arguments);
    };
})();
//# sourceMappingURL=updateUnfoBuilder.js.map


var _builderUtil;

function _load_builderUtil() {
    return _builderUtil = require("builder-util");
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

var _core;

function _load_core() {
    return _core = require("../core");
}

var _PublishManager;

function _load_PublishManager() {
    return _PublishManager = require("./PublishManager");
}

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function isGenerateUpdatesFilesForAllChannels(packager) {
    const value = packager.platformSpecificBuildOptions.generateUpdatesFilesForAllChannels;
    return value == null ? packager.config.generateUpdatesFilesForAllChannels : value;
}
/**
 if this is an "alpha" version, we need to generate only the "alpha" .yml file
 if this is a "beta" version, we need to generate both the "alpha" and "beta" .yml file
 if this is a "stable" version, we need to generate all the "alpha", "beta" and "stable" .yml file
 */
function computeChannelNames(packager, publishConfig) {
    const currentChannel = publishConfig.channel || "latest";
    // for GitHub should be pre-release way be used
    if (currentChannel === "alpha" || publishConfig.provider === "github" || !isGenerateUpdatesFilesForAllChannels(packager)) {
        return [currentChannel];
    }
    switch (currentChannel) {
        case "beta":
            return [currentChannel, "alpha"];
        case "latest":
            return [currentChannel, "alpha", "beta"];
        default:
            return [currentChannel];
    }
}
function getUpdateInfoFileName(channel, packager, arch) {
    const osSuffix = packager.platform === (_core || _load_core()).Platform.WINDOWS ? "" : `-${packager.platform.buildConfigurationKey}`;
    const archSuffix = arch != null && arch !== (_builderUtil || _load_builderUtil()).Arch.x64 && packager.platform === (_core || _load_core()).Platform.LINUX ? `-${(_builderUtil || _load_builderUtil()).Arch[arch]}` : "";
    return `${channel}${osSuffix}${archSuffix}.yml`;
}