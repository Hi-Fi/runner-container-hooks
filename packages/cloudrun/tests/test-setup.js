"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestHelper = void 0;
var k8s = __importStar(require("@kubernetes/client-node"));
var fs = __importStar(require("fs"));
var path = __importStar(require("path"));
var uuid_1 = require("uuid");
var kc = new k8s.KubeConfig();
kc.loadFromDefault();
var k8sApi = kc.makeApiClient(k8s.CoreV1Api);
var k8sStorageApi = kc.makeApiClient(k8s.StorageV1Api);
var TestHelper = /** @class */ (function () {
    function TestHelper() {
        this.tempDirPath = "".concat(__dirname, "/_temp/runner");
        this.podName = (0, uuid_1.v4)().replace(/-/g, '');
    }
    TestHelper.prototype.initialize = function () {
        return __awaiter(this, void 0, void 0, function () {
            var e_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        process.env['ACTIONS_RUNNER_POD_NAME'] = "".concat(this.podName);
                        process.env['RUNNER_WORKSPACE'] = "".concat(this.tempDirPath, "/_work/repo");
                        process.env['RUNNER_TEMP'] = "".concat(this.tempDirPath, "/_work/_temp");
                        process.env['GITHUB_WORKSPACE'] = "".concat(this.tempDirPath, "/_work/repo/repo");
                        process.env['ACTIONS_RUNNER_KUBERNETES_NAMESPACE'] = 'default';
                        fs.mkdirSync("".concat(this.tempDirPath, "/_work/repo/repo"), { recursive: true });
                        fs.mkdirSync("".concat(this.tempDirPath, "/externals"), { recursive: true });
                        fs.mkdirSync(process.env.RUNNER_TEMP, { recursive: true });
                        fs.copyFileSync(path.resolve("".concat(__dirname, "/../../../examples/example-script.sh")), "".concat(process.env.RUNNER_TEMP, "/example-script.sh"));
                        return [4 /*yield*/, this.cleanupK8sResources()];
                    case 1:
                        _a.sent();
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 5, , 6]);
                        return [4 /*yield*/, this.createTestVolume()];
                    case 3:
                        _a.sent();
                        return [4 /*yield*/, this.createTestJobPod()];
                    case 4:
                        _a.sent();
                        return [3 /*break*/, 6];
                    case 5:
                        e_1 = _a.sent();
                        console.log(e_1);
                        return [3 /*break*/, 6];
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    TestHelper.prototype.cleanup = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.cleanupK8sResources()];
                    case 1:
                        _b.sent();
                        fs.rmSync(this.tempDirPath, { recursive: true });
                        return [3 /*break*/, 3];
                    case 2:
                        _a = _b.sent();
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    TestHelper.prototype.cleanupK8sResources = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, k8sApi
                            .deleteNamespacedPersistentVolumeClaim("".concat(this.podName, "-work"), 'default', undefined, undefined, 0)
                            .catch(function (e) { })];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, k8sApi.deletePersistentVolume("".concat(this.podName, "-pv")).catch(function (e) { })];
                    case 2:
                        _a.sent();
                        return [4 /*yield*/, k8sStorageApi.deleteStorageClass('local-storage').catch(function (e) { })];
                    case 3:
                        _a.sent();
                        return [4 /*yield*/, k8sApi
                                .deleteNamespacedPod(this.podName, 'default', undefined, undefined, 0)
                                .catch(function (e) { })];
                    case 4:
                        _a.sent();
                        return [4 /*yield*/, k8sApi
                                .deleteNamespacedPod("".concat(this.podName, "-workflow"), 'default', undefined, undefined, 0)
                                .catch(function (e) { })];
                    case 5:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    TestHelper.prototype.createFile = function (fileName) {
        var filePath = "".concat(this.tempDirPath, "/").concat(fileName || (0, uuid_1.v4)());
        fs.writeFileSync(filePath, '');
        return filePath;
    };
    TestHelper.prototype.removeFile = function (fileName) {
        var filePath = "".concat(this.tempDirPath, "/").concat(fileName);
        fs.rmSync(filePath);
    };
    TestHelper.prototype.createTestJobPod = function () {
        return __awaiter(this, void 0, void 0, function () {
            var container, pod;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        container = {
                            name: 'nginx',
                            image: 'nginx:latest',
                            imagePullPolicy: 'IfNotPresent'
                        };
                        pod = {
                            metadata: {
                                name: this.podName
                            },
                            spec: {
                                restartPolicy: 'Never',
                                containers: [container]
                            }
                        };
                        return [4 /*yield*/, k8sApi.createNamespacedPod('default', pod)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    TestHelper.prototype.createTestVolume = function () {
        return __awaiter(this, void 0, void 0, function () {
            var sc, volume, volumeClaim;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        sc = {
                            metadata: {
                                name: 'local-storage'
                            },
                            provisioner: 'kubernetes.io/no-provisioner',
                            volumeBindingMode: 'Immediate'
                        };
                        return [4 /*yield*/, k8sStorageApi.createStorageClass(sc)];
                    case 1:
                        _a.sent();
                        volume = {
                            metadata: {
                                name: "".concat(this.podName, "-pv")
                            },
                            spec: {
                                storageClassName: 'local-storage',
                                capacity: {
                                    storage: '2Gi'
                                },
                                volumeMode: 'Filesystem',
                                accessModes: ['ReadWriteOnce'],
                                hostPath: {
                                    path: "".concat(this.tempDirPath, "/_work")
                                }
                            }
                        };
                        return [4 /*yield*/, k8sApi.createPersistentVolume(volume)];
                    case 2:
                        _a.sent();
                        volumeClaim = {
                            metadata: {
                                name: "".concat(this.podName, "-work")
                            },
                            spec: {
                                accessModes: ['ReadWriteOnce'],
                                volumeMode: 'Filesystem',
                                storageClassName: 'local-storage',
                                volumeName: "".concat(this.podName, "-pv"),
                                resources: {
                                    requests: {
                                        storage: '1Gi'
                                    }
                                }
                            }
                        };
                        return [4 /*yield*/, k8sApi.createNamespacedPersistentVolumeClaim('default', volumeClaim)];
                    case 3:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    TestHelper.prototype.getPrepareJobDefinition = function () {
        var prepareJob = JSON.parse(fs.readFileSync(path.resolve(__dirname + '/../../../examples/prepare-job.json'), 'utf8'));
        prepareJob.args.container.userMountVolumes = undefined;
        prepareJob.args.container.registry = null;
        prepareJob.args.services.forEach(function (s) {
            s.registry = null;
        });
        return prepareJob;
    };
    TestHelper.prototype.getRunScriptStepDefinition = function () {
        var runScriptStep = JSON.parse(fs.readFileSync(path.resolve(__dirname + '/../../../examples/run-script-step.json'), 'utf8'));
        runScriptStep.args.entryPointArgs[1] = "/__w/_temp/example-script.sh";
        return runScriptStep;
    };
    TestHelper.prototype.getRunContainerStepDefinition = function () {
        var runContainerStep = JSON.parse(fs.readFileSync(path.resolve(__dirname + '/../../../examples/run-container-step.json'), 'utf8'));
        runContainerStep.args.entryPointArgs[1] = "/__w/_temp/example-script.sh";
        runContainerStep.args.userMountVolumes = undefined;
        runContainerStep.args.registry = null;
        return runContainerStep;
    };
    return TestHelper;
}());
exports.TestHelper = TestHelper;
