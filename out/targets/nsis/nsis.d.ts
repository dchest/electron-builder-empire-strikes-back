import { Arch } from "builder-util";
import { PackageFileInfo } from "builder-util-runtime";
import { Target } from "../../core";
import { WinPackager } from "../../winPackager";
import { NsisOptions } from "./nsisOptions";
import { AppPackageHelper } from "./nsisUtil";
export declare class NsisTarget extends Target {
    protected readonly packager: WinPackager;
    readonly outDir: string;
    protected readonly packageHelper: AppPackageHelper;
    readonly options: NsisOptions;
    /** @private */
    readonly archs: Map<Arch, string>;
    constructor(packager: WinPackager, outDir: string, targetName: string, packageHelper: AppPackageHelper);
    build(appOutDir: string, arch: Arch): Promise<void>;
    /** @private */
    buildAppPackage(appOutDir: string, arch: Arch): Promise<PackageFileInfo>;
    finishBuild(): Promise<any>;
    protected readonly installerFilenamePattern: string;
    private readonly isPortable;
    private buildInstaller();
    protected generateGitHubInstallerName(): string;
    private readonly isUnicodeEnabled;
    readonly isWebInstaller: boolean;
    private computeScriptAndSignUninstaller(defines, commands, installerPath, sharedHeader);
    private computeVersionKey();
    protected configureDefines(oneClick: boolean, defines: any): Promise<any>;
    private configureDefinesForAllTypeOfInstaller(defines);
    private executeMakensis(defines, commands, script);
    private computeCommonInstallerScriptHeader();
    private computeFinalScript(originalScript, isInstaller);
}
