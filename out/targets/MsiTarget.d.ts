import { Target } from "../core";
import { WinPackager } from "../winPackager";
import { Arch } from "builder-util";
import { MsiOptions } from "../";
export default class MsiTarget extends Target {
    private readonly packager;
    readonly outDir: string;
    readonly options: MsiOptions;
    constructor(packager: WinPackager, outDir: string);
    build(appOutDir: string, arch: Arch): Promise<void>;
    private writeManifest(templatePath, appOutDir, arch);
}
