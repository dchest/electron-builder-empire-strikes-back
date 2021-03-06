"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.getPublishConfigs = exports.getPublishConfigsForUpdateInfo = exports.getAppUpdatePublishConfiguration = exports.PublishManager = undefined;

var _bluebirdLst;

function _load_bluebirdLst() {
    return _bluebirdLst = require("bluebird-lst");
}

var _bluebirdLst2;

function _load_bluebirdLst2() {
    return _bluebirdLst2 = _interopRequireDefault(require("bluebird-lst"));
}

let getAppUpdatePublishConfiguration = exports.getAppUpdatePublishConfiguration = (() => {
    var _ref2 = (0, (_bluebirdLst || _load_bluebirdLst()).coroutine)(function* (packager, arch) {
        const publishConfigs = yield getPublishConfigsForUpdateInfo(packager, (yield getPublishConfigs(packager, null, arch)), arch);
        if (publishConfigs == null || publishConfigs.length === 0) {
            return null;
        }
        let publishConfig = publishConfigs[0];
        if (packager.platform === (_index || _load_index()).Platform.WINDOWS && publishConfig.publisherName == null) {
            const winPackager = packager;
            if (winPackager.isForceCodeSigningVerification) {
                const publisherName = yield winPackager.computedPublisherName.value;
                if (publisherName != null) {
                    publishConfig = Object.assign({}, publishConfig, { publisherName });
                }
            }
        }
        return publishConfig;
    });

    return function getAppUpdatePublishConfiguration(_x2, _x3) {
        return _ref2.apply(this, arguments);
    };
})();

let getPublishConfigsForUpdateInfo = exports.getPublishConfigsForUpdateInfo = (() => {
    var _ref3 = (0, (_bluebirdLst || _load_bluebirdLst()).coroutine)(function* (packager, publishConfigs, arch) {
        if (publishConfigs === null) {
            return null;
        }
        if (publishConfigs.length === 0) {
            debug("getPublishConfigsForUpdateInfo: no publishConfigs, detect using repository info");
            // https://github.com/electron-userland/electron-builder/issues/925#issuecomment-261732378
            // default publish config is github, file should be generated regardless of publish state (user can test installer locally or manage the release process manually)
            const repositoryInfo = yield packager.info.repositoryInfo;
            debug(`getPublishConfigsForUpdateInfo: ${(0, (_builderUtil || _load_builderUtil()).safeStringifyJson)(repositoryInfo)}`);
            if (repositoryInfo != null && repositoryInfo.type === "github") {
                const resolvedPublishConfig = yield getResolvedPublishConfig(packager, { provider: repositoryInfo.type }, arch, false);
                if (resolvedPublishConfig != null) {
                    debug(`getPublishConfigsForUpdateInfo: resolve to publish config ${(0, (_builderUtil || _load_builderUtil()).safeStringifyJson)(resolvedPublishConfig)}`);
                    return [resolvedPublishConfig];
                }
            }
        }
        return publishConfigs;
    });

    return function getPublishConfigsForUpdateInfo(_x4, _x5, _x6) {
        return _ref3.apply(this, arguments);
    };
})();

let getPublishConfigs = exports.getPublishConfigs = (() => {
    var _ref4 = (0, (_bluebirdLst || _load_bluebirdLst()).coroutine)(function* (packager, targetSpecificOptions, arch) {
        let publishers;
        // check build.nsis (target)
        if (targetSpecificOptions != null) {
            publishers = targetSpecificOptions.publish;
            // if explicitly set to null - do not publish
            if (publishers === null) {
                return null;
            }
        }
        // check build.win (platform)
        if (publishers == null) {
            publishers = packager.platformSpecificBuildOptions.publish;
            if (publishers === null) {
                return null;
            }
        }
        if (publishers == null) {
            publishers = packager.config.publish;
            if (publishers === null) {
                return null;
            }
        }
        if (publishers == null) {
            let serviceName = null;
            if (!(0, (_builderUtil || _load_builderUtil()).isEmptyOrSpaces)(process.env.GH_TOKEN)) {
                serviceName = "github";
            } else if (!(0, (_builderUtil || _load_builderUtil()).isEmptyOrSpaces)(process.env.BT_TOKEN)) {
                serviceName = "bintray";
            }
            if (serviceName != null) {
                debug(`Detect ${serviceName} as publish provider`);
                return [yield getResolvedPublishConfig(packager, { provider: serviceName }, arch)];
            }
        }
        if (publishers == null) {
            return [];
        }
        debug(`Explicit publish provider: ${(0, (_builderUtil || _load_builderUtil()).safeStringifyJson)(publishers)}`);
        return yield (_bluebirdLst2 || _load_bluebirdLst2()).default.map((0, (_builderUtil || _load_builderUtil()).asArray)(publishers), function (it) {
            return getResolvedPublishConfig(packager, typeof it === "string" ? { provider: it } : it, arch);
        });
    });

    return function getPublishConfigs(_x7, _x8, _x9) {
        return _ref4.apply(this, arguments);
    };
})();

let getResolvedPublishConfig = (() => {
    var _ref5 = (0, (_bluebirdLst || _load_bluebirdLst()).coroutine)(function* (packager, options, arch, errorIfCannot = true) {
        let getInfo = (() => {
            var _ref6 = (0, (_bluebirdLst || _load_bluebirdLst()).coroutine)(function* () {
                const info = yield packager.info.repositoryInfo;
                if (info != null) {
                    return info;
                }
                const message = `Cannot detect repository by .git/config. Please specify "repository" in the package.json (https://docs.npmjs.com/files/package.json#repository).\nPlease see https://electron.build/configuration/publish`;
                if (errorIfCannot) {
                    throw new Error(message);
                } else {
                    (0, (_builderUtil || _load_builderUtil()).warn)(message);
                    return null;
                }
            });

            return function getInfo() {
                return _ref6.apply(this, arguments);
            };
        })();

        options = Object.assign(Object.create(null), options);
        expandPublishConfig(options, packager, arch);
        let channelFromAppVersion = null;
        if (options.channel == null && isDetectUpdateChannel(packager)) {
            channelFromAppVersion = packager.appInfo.channel;
        }
        const provider = options.provider;
        if (provider === "generic") {
            const o = options;
            if (o.url == null) {
                throw new Error(`Please specify "url" for "generic" update server`);
            }
            if (channelFromAppVersion != null) {
                o.channel = channelFromAppVersion;
            }
            return options;
        }
        const providerClass = requireProviderClass(options.provider);
        if (providerClass != null && providerClass.checkAndResolveOptions != null) {
            yield providerClass.checkAndResolveOptions(options, channelFromAppVersion);
            return options;
        }
        const isGithub = provider === "github";
        if (!isGithub && provider !== "bintray") {
            return options;
        }
        let owner = isGithub ? options.owner : options.owner;
        let project = isGithub ? options.repo : options.package;
        if (isGithub && owner == null && project != null) {
            const index = project.indexOf("/");
            if (index > 0) {
                const repo = project;
                project = repo.substring(0, index);
                owner = repo.substring(index + 1);
            }
        }

        if (!owner || !project) {
            debug(`Owner or project is not specified explicitly for ${provider}, call getInfo: owner: ${owner}, project: ${project}`);
            const info = yield getInfo();
            if (info == null) {
                return null;
            }
            if (!owner) {
                owner = info.user;
            }
            if (!project) {
                project = info.project;
            }
        }
        if (isGithub) {
            if (options.token != null && !options.private) {
                (0, (_builderUtil || _load_builderUtil()).warn)('"token" specified in the github publish options. It should be used only for [setFeedURL](module:electron-updater/out/AppUpdater.AppUpdater+setFeedURL).');
            }
            return Object.assign({ owner, repo: project }, options);
        } else {
            return Object.assign({ owner, package: project }, options);
        }
    });

    return function getResolvedPublishConfig(_x10, _x11, _x12) {
        return _ref5.apply(this, arguments);
    };
})();
//# sourceMappingURL=PublishManager.js.map


exports.createPublisher = createPublisher;
exports.computeDownloadUrl = computeDownloadUrl;

var _builderUtil;

function _load_builderUtil() {
    return _builderUtil = require("builder-util");
}

var _builderUtilRuntime;

function _load_builderUtilRuntime() {
    return _builderUtilRuntime = require("builder-util-runtime");
}

var _debug2 = _interopRequireDefault(require("debug"));

var _electronPublish;

function _load_electronPublish() {
    return _electronPublish = require("electron-publish");
}

var _BintrayPublisher;

function _load_BintrayPublisher() {
    return _BintrayPublisher = require("electron-publish/out/BintrayPublisher");
}

var _gitHubPublisher;

function _load_gitHubPublisher() {
    return _gitHubPublisher = require("electron-publish/out/gitHubPublisher");
}

var _multiProgress;

function _load_multiProgress() {
    return _multiProgress = require("electron-publish/out/multiProgress");
}

var _fsExtraP;

function _load_fsExtraP() {
    return _fsExtraP = require("fs-extra-p");
}

var _isCi;

function _load_isCi() {
    return _isCi = _interopRequireDefault(require("is-ci"));
}

var _jsYaml;

function _load_jsYaml() {
    return _jsYaml = require("js-yaml");
}

var _path = _interopRequireWildcard(require("path"));

var _url;

function _load_url() {
    return _url = _interopRequireWildcard(require("url"));
}

var _index;

function _load_index() {
    return _index = require("../index");
}

var _updateUnfoBuilder;

function _load_updateUnfoBuilder() {
    return _updateUnfoBuilder = require("./updateUnfoBuilder");
}

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const publishForPrWarning = "There are serious security concerns with PUBLISH_FOR_PULL_REQUEST=true (see the  CircleCI documentation (https://circleci.com/docs/1.0/fork-pr-builds/) for details)" + "\nIf you have SSH keys, sensitive env vars or AWS credentials stored in your project settings and untrusted forks can make pull requests against your repo, then this option isn't for you.";
const debug = (0, _debug2.default)("electron-builder:publish");
class PublishManager {
    constructor(packager, publishOptions, cancellationToken) {
        this.packager = packager;
        this.publishOptions = publishOptions;
        this.cancellationToken = cancellationToken;
        this.nameToPublisher = new Map();
        this.progress = process.stdout.isTTY ? new (_multiProgress || _load_multiProgress()).MultiProgress() : null;
        this.postponedArtifactCreatedEvents = [];
        this.taskManager = new (_builderUtil || _load_builderUtil()).AsyncTaskManager(cancellationToken);
        const forcePublishForPr = process.env.PUBLISH_FOR_PULL_REQUEST === "true";
        if (!(0, (_builderUtil || _load_builderUtil()).isPullRequest)() || forcePublishForPr) {
            if (publishOptions.publish === undefined) {
                if (process.env.npm_lifecycle_event === "release") {
                    publishOptions.publish = "always";
                } else {
                    const tag = (0, (_electronPublish || _load_electronPublish()).getCiTag)();
                    if (tag != null) {
                        (0, (_builderUtil || _load_builderUtil()).log)(`Tag ${tag} is defined, so artifacts will be published`);
                        publishOptions.publish = "onTag";
                    } else if ((_isCi || _load_isCi()).default) {
                        (0, (_builderUtil || _load_builderUtil()).log)("CI detected, so artifacts will be published if draft release exists");
                        publishOptions.publish = "onTagOrDraft";
                    }
                }
            }
            const publishPolicy = publishOptions.publish;
            this.isPublish = publishPolicy != null && publishOptions.publish !== "never" && (publishPolicy !== "onTag" || (0, (_electronPublish || _load_electronPublish()).getCiTag)() != null);
            if (this.isPublish && forcePublishForPr) {
                (0, (_builderUtil || _load_builderUtil()).warn)(publishForPrWarning);
            }
        } else if (publishOptions.publish !== "never") {
            (0, (_builderUtil || _load_builderUtil()).log)("Current build is a part of pull request, publishing will be skipped" + "\nSet env PUBLISH_FOR_PULL_REQUEST to true to force code signing." + `\n${publishForPrWarning}`);
        }
        packager.addAfterPackHandler((() => {
            var _ref = (0, (_bluebirdLst || _load_bluebirdLst()).coroutine)(function* (event) {
                const packager = event.packager;
                if (event.electronPlatformName === "darwin") {
                    if (!event.targets.some(function (it) {
                        return it.name === "zip";
                    })) {
                        return;
                    }
                } else if (packager.platform === (_index || _load_index()).Platform.WINDOWS) {
                    if (!event.targets.some(function (it) {
                        return isSuitableWindowsTarget(it, null);
                    })) {
                        return;
                    }
                } else {
                    return;
                }
                const publishConfig = yield getAppUpdatePublishConfiguration(packager, event.arch);
                if (publishConfig != null) {
                    yield (0, (_fsExtraP || _load_fsExtraP()).writeFile)(_path.join(packager.getResourcesDir(event.appOutDir), "app-update.yml"), (0, (_jsYaml || _load_jsYaml()).safeDump)(publishConfig));
                }
            });

            return function (_x) {
                return _ref.apply(this, arguments);
            };
        })());
        packager.artifactCreated(event => this.taskManager.addTask(this.artifactCreated(event)));
    }
    artifactCreated(event) {
        var _this = this;

        return (0, (_bluebirdLst || _load_bluebirdLst()).coroutine)(function* () {
            const packager = event.packager;
            const target = event.target;
            const publishConfigs = event.publishConfig == null ? yield getPublishConfigs(packager, target == null ? null : target.options, event.arch) : [event.publishConfig];
            if (debug.enabled) {
                debug(`artifactCreated (isPublish: ${_this.isPublish}): ${(0, (_builderUtil || _load_builderUtil()).safeStringifyJson)(event, new Set(["packager"]))},\n  publishConfigs: ${(0, (_builderUtil || _load_builderUtil()).safeStringifyJson)(publishConfigs)}`);
            }
            const eventFile = event.file;
            if (publishConfigs == null) {
                if (_this.isPublish) {
                    debug(`${eventFile} is not published: no publish configs`);
                }
                return;
            }
            if (_this.isPublish) {
                for (const publishConfig of publishConfigs) {
                    if (publishConfig.provider === "generic") {
                        continue;
                    }
                    if (_this.cancellationToken.cancelled) {
                        debug(`${eventFile} is not published: cancelled`);
                        break;
                    }
                    const publisher = _this.getOrCreatePublisher(publishConfig, packager);
                    if (publisher == null) {
                        debug(`${eventFile} is not published: publisher is null, ${(0, (_builderUtil || _load_builderUtil()).safeStringifyJson)(publishConfig)}`);
                        continue;
                    }
                    _this.taskManager.addTask(publisher.upload(event));
                }
            }
            if (target != null && eventFile != null && !_this.cancellationToken.cancelled) {
                if (packager.platform === (_index || _load_index()).Platform.MAC && target.name === "zip" || packager.platform === (_index || _load_index()).Platform.WINDOWS && isSuitableWindowsTarget(target, event) || packager.platform === (_index || _load_index()).Platform.LINUX && event.isWriteUpdateInfo) {
                    _this.taskManager.addTask((0, (_updateUnfoBuilder || _load_updateUnfoBuilder()).writeUpdateInfo)(event, publishConfigs).then(function (it) {
                        return _this.postponedArtifactCreatedEvents.push(...it);
                    }));
                }
            }
        })();
    }
    getOrCreatePublisher(publishConfig, platformPackager) {
        // to not include token into cache key
        const providerCacheKey = (0, (_builderUtil || _load_builderUtil()).safeStringifyJson)(publishConfig);
        let publisher = this.nameToPublisher.get(providerCacheKey);
        if (publisher == null) {
            publisher = createPublisher(this, platformPackager.info.metadata.version, publishConfig, this.publishOptions);
            this.nameToPublisher.set(providerCacheKey, publisher);
            (0, (_builderUtil || _load_builderUtil()).log)(`Publishing to ${publisher}`);
        }
        return publisher;
    }
    cancelTasks() {
        this.taskManager.cancelTasks();
        this.nameToPublisher.clear();
    }
    // noinspection InfiniteRecursionJS
    awaitTasks() {
        var _this2 = this;

        return (0, (_bluebirdLst || _load_bluebirdLst()).coroutine)(function* () {
            yield _this2.taskManager.awaitTasks();
            if (!_this2.cancellationToken.cancelled) {
                if (_this2.postponedArtifactCreatedEvents.length === 0) {
                    return;
                }
                const events = _this2.postponedArtifactCreatedEvents.slice();
                _this2.postponedArtifactCreatedEvents.length = 0;
                for (const event of events) {
                    _this2.packager.dispatchArtifactCreated(event);
                }
                yield _this2.awaitTasks();
            }
        })();
    }
}
exports.PublishManager = PublishManager;
function createPublisher(context, version, publishConfig, options) {
    if (debug.enabled) {
        debug(`Create publisher: ${(0, (_builderUtil || _load_builderUtil()).safeStringifyJson)(publishConfig)}`);
    }
    const provider = publishConfig.provider;
    switch (provider) {
        case "github":
            return new (_gitHubPublisher || _load_gitHubPublisher()).GitHubPublisher(context, publishConfig, version, options);
        case "bintray":
            return new (_BintrayPublisher || _load_BintrayPublisher()).BintrayPublisher(context, publishConfig, version, options);
        case "generic":
            return null;
        default:
            const clazz = requireProviderClass(provider);
            return clazz == null ? null : new clazz(context, publishConfig);
    }
}
function requireProviderClass(provider) {
    switch (provider) {
        case "github":
            return (_gitHubPublisher || _load_gitHubPublisher()).GitHubPublisher;
        case "bintray":
            return (_BintrayPublisher || _load_BintrayPublisher()).BintrayPublisher;
        case "generic":
            return null;
        case "spaces":
            return require(`electron-publisher-s3/out/${provider}Publisher`).default;
        default:
            return require(`electron-publisher-${provider}`).default;
    }
}
function computeDownloadUrl(publishConfiguration, fileName, packager) {
    if (publishConfiguration.provider === "generic") {
        const baseUrlString = publishConfiguration.url;
        if (fileName == null) {
            return baseUrlString;
        }
        const baseUrl = (_url || _load_url()).parse(baseUrlString);
        return (_url || _load_url()).format(Object.assign({}, baseUrl, { pathname: _path.posix.resolve(baseUrl.pathname || "/", encodeURI(fileName)) }));
    }
    let baseUrl;
    if (publishConfiguration.provider === "github") {
        const gh = publishConfiguration;
        baseUrl = `${(0, (_builderUtilRuntime || _load_builderUtilRuntime()).githubUrl)(gh)}/${gh.owner}/${gh.repo}/releases/download/${gh.vPrefixedTagName === false ? "" : "v"}${packager.appInfo.version}`;
    } else {
        baseUrl = (0, (_builderUtilRuntime || _load_builderUtilRuntime()).getS3LikeProviderBaseUrl)(publishConfiguration);
    }
    if (fileName == null) {
        return baseUrl;
    }
    return `${baseUrl}/${encodeURI(fileName)}`;
}

function isSuitableWindowsTarget(target, event) {
    if (event != null && !event.isWriteUpdateInfo) {
        return false;
    }
    if (target.name === "appx" && target.options != null && target.options.electronUpdaterAware) {
        return true;
    }
    return target.name === "nsis" || target.name.startsWith("nsis-");
}
function expandPublishConfig(options, packager, arch) {
    for (const name of Object.keys(options)) {
        const value = options[name];
        if (typeof value === "string") {
            const expanded = packager.expandMacro(value, arch == null ? null : (_builderUtil || _load_builderUtil()).Arch[arch]);
            if (expanded !== value) {
                options[name] = expanded;
            }
        }
    }
}
function isDetectUpdateChannel(packager) {
    const value = packager.platformSpecificBuildOptions.detectUpdateChannel;
    return value == null ? packager.config.detectUpdateChannel !== false : value;
}