import { HookData } from 'hooklib/lib';
export declare class TestHelper {
    private tempDirPath;
    private podName;
    constructor();
    initialize(): Promise<void>;
    cleanup(): Promise<void>;
    cleanupK8sResources(): Promise<void>;
    createFile(fileName?: string): string;
    removeFile(fileName: string): void;
    createTestJobPod(): Promise<void>;
    createTestVolume(): Promise<void>;
    getPrepareJobDefinition(): HookData;
    getRunScriptStepDefinition(): HookData;
    getRunContainerStepDefinition(): HookData;
}
