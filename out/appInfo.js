"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.AppInfo = undefined;

var _bluebirdLst;

function _load_bluebirdLst() {
    return _bluebirdLst = require("bluebird-lst");
}

var _builderUtil;

function _load_builderUtil() {
    return _builderUtil = require("builder-util");
}

var _sanitizeFilename;

function _load_sanitizeFilename() {
    return _sanitizeFilename = _interopRequireDefault(require("sanitize-filename"));
}

var _semver;

function _load_semver() {
    return _semver = require("semver");
}

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class AppInfo {
    constructor(info, buildVersion) {
        this.info = info;
        this.description = (0, (_builderUtil || _load_builderUtil()).smarten)(this.info.metadata.description || "");
        this.version = info.metadata.version;
        if (buildVersion == null) {
            buildVersion = info.config.buildVersion;
        }
        this.buildNumber = process.env.BUILD_NUMBER || process.env.TRAVIS_BUILD_NUMBER || process.env.APPVEYOR_BUILD_NUMBER || process.env.CIRCLE_BUILD_NUM || process.env.BUILD_BUILDNUMBER;
        if (buildVersion == null) {
            buildVersion = this.version;
            if (!(0, (_builderUtil || _load_builderUtil()).isEmptyOrSpaces)(this.buildNumber)) {
                buildVersion += `.${this.buildNumber}`;
            }
            this.buildVersion = buildVersion;
        } else {
            this.buildVersion = buildVersion;
        }
        this.productName = info.config.productName || info.metadata.productName || info.metadata.name;
        this.productFilename = (0, (_sanitizeFilename || _load_sanitizeFilename()).default)(this.productName);
    }
    get channel() {
        const prereleaseInfo = (0, (_semver || _load_semver()).prerelease)(this.version);
        if (prereleaseInfo != null && prereleaseInfo.length > 0) {
            return prereleaseInfo[0];
        }
        return null;
    }
    get versionInWeirdWindowsForm() {
        const parsedVersion = new (_semver || _load_semver()).SemVer(this.version);
        return `${parsedVersion.major}.${parsedVersion.minor}.${parsedVersion.patch}.${this.buildNumber || "0"}`;
    }
    get notNullDevMetadata() {
        return this.info.devMetadata || {};
    }
    get companyName() {
        const author = this.info.metadata.author || this.notNullDevMetadata.author;
        return author == null ? null : author.name;
    }
    get id() {
        let appId;
        if (this.info.config.appId != null) {
            appId = this.info.config.appId;
        }
        const generateDefaultAppId = () => {
            return `com.electron.${this.info.metadata.name.toLowerCase()}`;
        };
        if (appId != null && (appId === "your.id" || (0, (_builderUtil || _load_builderUtil()).isEmptyOrSpaces)(appId))) {
            const incorrectAppId = appId;
            appId = generateDefaultAppId();
            (0, (_builderUtil || _load_builderUtil()).warn)(`Do not use "${incorrectAppId}" as appId, "${appId}" will be used instead`);
        }
        return appId == null ? generateDefaultAppId() : appId;
    }
    get name() {
        return this.info.metadata.name;
    }
    get sanitizedName() {
        return (0, (_sanitizeFilename || _load_sanitizeFilename()).default)(this.name);
    }
    get copyright() {
        const copyright = this.info.config.copyright;
        if (copyright != null) {
            return copyright;
        }
        return `Copyright © ${new Date().getFullYear()} ${this.companyName || this.productName}`;
    }
    computePackageUrl() {
        var _this = this;

        return (0, (_bluebirdLst || _load_bluebirdLst()).coroutine)(function* () {
            const url = _this.info.metadata.homepage || _this.notNullDevMetadata.homepage;
            if (url != null) {
                return url;
            }
            const info = yield _this.info.repositoryInfo;
            return info == null || info.type !== "github" ? null : `https://${info.domain}/${info.user}/${info.project}`;
        })();
    }
}
exports.AppInfo = AppInfo; //# sourceMappingURL=appInfo.js.map