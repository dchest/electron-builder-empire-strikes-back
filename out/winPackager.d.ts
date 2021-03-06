import { Arch } from "builder-util";
import { Lazy } from "lazy-val";
import { AfterPackContext } from "./configuration";
import { Platform, Target } from "./core";
import { RequestedExecutionLevel, WindowsConfiguration } from "./options/winOptions";
import { Packager } from "./packager";
import { PlatformPackager } from "./platformPackager";
import { CertificateFromStoreInfo, FileCodeSigningInfo } from "./windowsCodeSign";
import { VmManager } from "./parallels";
export declare class WinPackager extends PlatformPackager<WindowsConfiguration> {
    readonly cscInfo: Lazy<FileCodeSigningInfo | CertificateFromStoreInfo | null>;
    private _iconPath;
    readonly vm: Lazy<VmManager>;
    readonly computedPublisherSubjectOnWindowsOnly: Lazy<string | null>;
    readonly computedPublisherName: Lazy<string[] | null>;
    readonly isForceCodeSigningVerification: boolean;
    constructor(info: Packager);
    readonly defaultTarget: Array<string>;
    protected doGetCscPassword(): string | undefined;
    createTargets(targets: Array<string>, mapper: (name: string, factory: (outDir: string) => Target) => void): void;
    readonly platform: Platform;
    getIconPath(): Promise<string | null>;
    private getValidIconPath();
    sign(file: string, logMessagePrefix?: string): Promise<void>;
    private doSign(options);
    signAndEditResources(file: string, arch: Arch, outDir: string, internalName?: string | null, requestedExecutionLevel?: RequestedExecutionLevel | null): Promise<void>;
    protected postInitApp(packContext: AfterPackContext): Promise<void>;
    protected signApp(packContext: AfterPackContext): Promise<any>;
}
