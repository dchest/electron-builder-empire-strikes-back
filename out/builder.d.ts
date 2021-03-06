import { Arch } from "builder-util";
import { PublishOptions } from "electron-publish";
import { Platform } from "./core";
import { PackagerOptions } from "./packagerApi";
export interface CliOptions extends PackagerOptions, PublishOptions {
    mac?: Array<string>;
    linux?: Array<string>;
    win?: Array<string>;
    arch?: string;
    x64?: boolean;
    ia32?: boolean;
    armv7l?: boolean;
    dir?: boolean;
    platform?: string;
    project?: string;
    extraMetadata?: any;
}
/** @private */
export declare function coerceTypes(host: any): any;
export declare function createTargets(platforms: Array<Platform>, type?: string | null, arch?: string | null): Map<Platform, Map<Arch, Array<string>>>;
export declare function build(rawOptions?: CliOptions): Promise<Array<string>>;
